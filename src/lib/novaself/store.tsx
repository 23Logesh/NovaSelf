import {
  createContext, useContext, useEffect, useMemo, useRef, useState, useCallback, type ReactNode,
} from "react";
import type {
  AppSettings, Book, ChatMessage, CustomNutrient, DayLog, DietPhase, MessItem,
  ReadingSession, SkinLog, Supplement, SupplementIntake, WorkoutPhase,
} from "./types";
import type { Profile } from "./calculations";
import { isoDate } from "./calculations";
import {
  defaultBooks, defaultDays, defaultDietPhases, defaultIntakes, defaultMess, defaultProfile,
  defaultReading, defaultSettings, defaultSkinLogs, defaultSupplements, defaultWorkoutPhases,
  emptyUserState,
} from "./mockData";
import { signInWithGoogle, signOutOfGoogle } from "./googleAuth";
import {
  ensureUserSheet, loadStateFromSheet, saveStateToSheet, syncToSheet as _syncToSheet,
  type SheetHandle,
} from "./googleSheets";

export type { SheetHandle };

export interface GoogleAccount {
  email: string;
  name: string;
}

export interface AppState {
  signedIn: boolean;
  onboarded: boolean;
  /** Google profile from the most recent successful sign-in. Null when signed out. */
  googleAccount: GoogleAccount | null;
  profile: Profile;
  settings: AppSettings;
  days: DayLog[];
  dietPhases: DietPhase[];
  mess: MessItem[];
  workoutPhases: WorkoutPhase[];
  skinLogs: SkinLog[];
  supplements: Supplement[];
  intakes: SupplementIntake[];
  books: Book[];
  readingSessions: ReadingSession[];
  chat: ChatMessage[];
}

interface AppActions {
  signInGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  reconnectGoogle: () => Promise<void>; // Re-auth from user gesture; flushes pending changes
  saveProfile: (p: Partial<Profile>) => void;
  updateSettings: (s: Partial<AppSettings>) => void;
  toggleNutrient: (key: keyof AppSettings["enabledNutrients"]) => void;
  addCustomNutrient: (n: CustomNutrient) => void;
  removeCustomNutrient: (id: string) => void;
  toggleCustomNutrient: (id: string) => void;
  clearOllamaUrl: () => void;
  upsertDay: (day: DayLog) => void;
  getDay: (date: string) => DayLog;
  logWeight: (date: string, weightKg: number) => void;
  setDietPhases: (d: DietPhase[]) => void;
  setMess: (m: MessItem[]) => void;
  setWorkoutPhases: (p: WorkoutPhase[]) => void;
  upsertSkin: (s: SkinLog) => void;
  setSupplements: (s: Supplement[]) => void;
  logIntake: (i: SupplementIntake) => void;
  setBooks: (b: Book[]) => void;
  logReading: (s: ReadingSession) => void;
  sendChat: (text: string) => void;
  resetAll: () => void;
  saveData: () => void;
  loadData: () => void;
  syncToSheet: () => void;
  sheetHandle: SheetHandle | null;
  sheetLoadWarning: string | null;
  clearSheetLoadWarning: () => void;
  /** True when the Google session has expired and the user needs to reconnect. */
  sessionExpired: boolean;
}

type Ctx = AppState & AppActions;
const AppCtx = createContext<Ctx | null>(null);

const STORAGE_KEY = "novaself.v1";
const SHEET_HANDLE_KEY = "novaself.sheetHandle";

// ---------------------------------------------------------------------------
// _memAccessToken: the ONLY place the current access token lives at runtime.
// It is a module-level variable (in-memory only, never persisted).
// After a page reload it is null — this is expected. The auto-save effect
// checks this directly and will NOT call getValidAccessToken() or trigger any
// interactive popup. Instead it sets sessionExpired so the user is informed.
// ---------------------------------------------------------------------------
let _memAccessToken: string | null = null;
let _memSheetHandle: SheetHandle | null = null;

function loadInitial(): AppState {
  if (typeof window === "undefined") return baseState();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        ...baseState(),
        ...parsed,
        settings: { ...defaultSettings, ...parsed.settings },
      };
    }
  } catch {}
  return baseState();
}

function loadStoredSheetHandle(): SheetHandle | null {
  try {
    const raw = window.localStorage.getItem(SHEET_HANDLE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function storeSheetHandle(h: SheetHandle | null) {
  if (h) {
    localStorage.setItem(SHEET_HANDLE_KEY, JSON.stringify(h));
  } else {
    localStorage.removeItem(SHEET_HANDLE_KEY);
  }
}

function baseState(): AppState {
  return {
    signedIn: false,
    onboarded: false,
    googleAccount: null,
    profile: defaultProfile,
    settings: defaultSettings,
    days: defaultDays,
    dietPhases: defaultDietPhases,
    mess: defaultMess,
    workoutPhases: defaultWorkoutPhases,
    skinLogs: defaultSkinLogs,
    supplements: defaultSupplements,
    intakes: defaultIntakes,
    books: defaultBooks,
    readingSessions: defaultReading,
    chat: [],
  };
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppState>(() => loadInitial());
  const [sheetHandle, setSheetHandle] = useState<SheetHandle | null>(() => loadStoredSheetHandle());
  const [sheetLoadWarning, setSheetLoadWarning] = useState<string | null>(null);
  // sessionExpired: true when we have a sheet handle but the in-memory token
  // is gone (page reload or natural expiry). Cleared after successful reconnect.
  const [sessionExpired, setSessionExpired] = useState(false);

  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Keep a stable ref to current state so the reconnect flush always sends latest data.
  const stateRef = useRef<AppState>(state);
  useEffect(() => { stateRef.current = state; }, [state]);

  // ---------------------------------------------------------------------------
  // Persist to localStorage on every state change (always reliable).
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      console.log("[store] ✓ Saved to localStorage");
    } catch (e) {
      console.error("[store] ✗ localStorage save failed:", e);
    }
  }, [state]);

  // ---------------------------------------------------------------------------
  // Debounced auto-save to Google Sheets.
  //
  // DESIGN: This effect NEVER calls getValidAccessToken() and NEVER triggers
  // an interactive OAuth popup. It only uses _memAccessToken (in-memory).
  // If the token is absent (page reload, expiry), it sets sessionExpired=true
  // so a visible banner appears. localStorage has already saved everything.
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (!state.signedIn || !sheetHandle) return;

    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);

    saveTimerRef.current = setTimeout(async () => {
      console.log("[store] Auto-save: debounce fired, checking token…");

      // CRITICAL: check in-memory token directly. Never call getValidAccessToken()
      // here — that can trigger an interactive popup automatically.
      if (!_memAccessToken) {
        console.warn(
          "[store] Auto-save: no in-memory token (session expired or page reloaded). " +
          "All changes are safe in localStorage. Showing reconnect banner.",
        );
        setSessionExpired(true);
        return;
      }

      console.log("[store] Auto-save: token present, attempting Sheet save…");
      try {
        await saveStateToSheet(sheetHandle, _memAccessToken, state);
        console.log("[store] ✓ Auto-save to Sheet succeeded");
        // Clear the expired flag if it was set from a prior failed attempt
        // that has since been resolved (reconnect sets the token, then flushes,
        // then state changes again — we clear here on success).
        setSessionExpired(false);
      } catch (err) {
        console.error("[store] ✗ Auto-save to Sheet failed (token may have expired mid-session):", err);
        // Invalidate the in-memory token so next attempt shows the banner
        // rather than hammering a bad token repeatedly.
        _memAccessToken = null;
        setSessionExpired(true);
      }
    }, 2500);

    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, [state, sheetHandle]);

  // ---------------------------------------------------------------------------
  // Theme sync
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (typeof document === "undefined") return;
    const root = document.documentElement;
    root.classList.toggle("light", state.settings.theme === "light");
    root.classList.toggle("dark", state.settings.theme === "dark");
  }, [state.settings.theme]);

  // ---------------------------------------------------------------------------
  // reconnectGoogle: called ONLY from an explicit user button press.
  // Runs an interactive OAuth flow, stores the fresh token, then immediately
  // flushes the current state to the Sheet so nothing buffered in localStorage
  // is lost.
  // ---------------------------------------------------------------------------
  const reconnectGoogle = useCallback(async () => {
    console.log("[store] reconnectGoogle: starting interactive re-auth…");
    try {
      const authResult = await signInWithGoogle();
      _memAccessToken = authResult.accessToken;
      console.log("[store] reconnectGoogle: ✓ fresh token obtained");

      const currentHandle = sheetHandle;
      if (!currentHandle) {
        console.warn("[store] reconnectGoogle: no sheet handle — user must sign in fully");
        return;
      }

      console.log("[store] reconnectGoogle: flushing buffered state to Sheet…");
      await saveStateToSheet(currentHandle, _memAccessToken, stateRef.current);
      console.log("[store] reconnectGoogle: ✓ flush complete");

      setSessionExpired(false);
    } catch (err) {
      console.error("[store] reconnectGoogle: ✗ re-auth or flush failed:", err);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sheetHandle]);

  const value = useMemo<Ctx>(() => {
    const update = (patch: Partial<AppState>) => setState((s) => ({ ...s, ...patch }));

    return {
      ...state,
      sheetHandle,
      sheetLoadWarning,
      sessionExpired,
      clearSheetLoadWarning: () => setSheetLoadWarning(null),
      reconnectGoogle,

      signInGoogle: async () => {
        console.log("[store] signInGoogle: starting interactive sign-in…");
        const authResult = await signInWithGoogle();
        _memAccessToken = authResult.accessToken;
        console.log("[store] signInGoogle: ✓ token obtained");

        const googleAccount: GoogleAccount = {
          email: authResult.email,
          name: authResult.name,
        };

        const { handle, isNewlyCreated } = await ensureUserSheet(authResult.accessToken);
        _memSheetHandle = handle;
        setSheetHandle(handle);
        storeSheetHandle(handle);
        setSessionExpired(false);
        console.log("[store] signInGoogle: sheet handle stored, isNewlyCreated=", isNewlyCreated);

        if (isNewlyCreated) {
          update({
            ...emptyUserState(),
            settings: state.settings,
            googleAccount,
            signedIn: true,
            onboarded: false,
          });
          return;
        }

        let sheetState: Partial<AppState> | null = null;
        try {
          console.log("[store] signInGoogle: loading state from Sheet…");
          sheetState = await loadStateFromSheet(handle, authResult.accessToken);
          console.log("[store] signInGoogle: ✓ Sheet state loaded");
        } catch (err) {
          console.error("[store] signInGoogle: ✗ loadStateFromSheet threw:", err);
        }

        const loadReturnedData =
          (sheetState?.days && sheetState.days.length > 0) || !!sheetState?.profile;

        if (loadReturnedData) {
          update({
            ...(sheetState ?? {}),
            settings: { ...defaultSettings, ...(sheetState?.settings ?? {}) },
            googleAccount,
            signedIn: true,
            onboarded: true,
          });
        } else {
          console.warn(
            "[store] signInGoogle: existing Sheet returned empty data. " +
            "Likely a transient fetch error. Local state preserved.",
          );
          setSheetLoadWarning(
            "Couldn't load your data from Google Sheets right now (network issue). " +
            "Your local data is safe — tap Sync in Settings to retry.",
          );
          update({ googleAccount, signedIn: true });
        }
      },

      signOut: async () => {
        console.log("[store] signOut");
        await signOutOfGoogle();
        _memAccessToken = null;
        _memSheetHandle = null;
        setSheetHandle(null);
        storeSheetHandle(null);
        setSheetLoadWarning(null);
        setSessionExpired(false);
        update({ signedIn: false, onboarded: false, googleAccount: null });
      },

      saveProfile: (p) =>
        setState((s) => ({ ...s, profile: { ...s.profile, ...p }, onboarded: true })),

      updateSettings: (sp) =>
        setState((s) => ({ ...s, settings: { ...s.settings, ...sp } })),

      toggleNutrient: (key) =>
        setState((s) => ({
          ...s,
          settings: {
            ...s.settings,
            enabledNutrients: {
              ...s.settings.enabledNutrients,
              [key]: !s.settings.enabledNutrients[key],
            },
          },
        })),

      addCustomNutrient: (n) =>
        setState((s) => ({
          ...s,
          settings: {
            ...s.settings,
            customNutrients: [...s.settings.customNutrients, n],
            enabledCustomNutrients: { ...s.settings.enabledCustomNutrients, [n.id]: true },
          },
        })),

      removeCustomNutrient: (id) =>
        setState((s) => {
          const { [id]: _removed, ...restEnabled } = s.settings.enabledCustomNutrients;
          return {
            ...s,
            settings: {
              ...s.settings,
              customNutrients: s.settings.customNutrients.filter((n) => n.id !== id),
              enabledCustomNutrients: restEnabled,
            },
          };
        }),

      toggleCustomNutrient: (id) =>
        setState((s) => ({
          ...s,
          settings: {
            ...s.settings,
            enabledCustomNutrients: {
              ...s.settings.enabledCustomNutrients,
              [id]: !s.settings.enabledCustomNutrients[id],
            },
          },
        })),

      clearOllamaUrl: () =>
        setState((s) => ({ ...s, settings: { ...s.settings, ollamaUrl: "" } })),

      upsertDay: (day) =>
        setState((s) => {
          const others = s.days.filter((d) => d.date !== day.date);
          return { ...s, days: [...others, day].sort((a, b) => a.date.localeCompare(b.date)) };
        }),

      getDay: (date) =>
        state.days.find((d) => d.date === date) ?? {
          date, foods: [], water: [], workouts: [],
        },

      logWeight: (date, weightKg) =>
        setState((s) => {
          const existing = s.days.find((d) => d.date === date) ?? { date, foods: [], water: [], workouts: [] };
          const others = s.days.filter((d) => d.date !== date);
          const days = [...others, { ...existing, weightKg }].sort((a, b) => a.date.localeCompare(b.date));
          const isMostRecent = date >= (days[days.length - 1]?.date ?? date);
          return {
            ...s,
            days,
            profile: isMostRecent ? { ...s.profile, weightKg } : s.profile,
          };
        }),

      setDietPhases: (dietPhases) => update({ dietPhases }),
      setMess: (mess) => update({ mess }),
      setWorkoutPhases: (workoutPhases) => update({ workoutPhases }),

      upsertSkin: (log) =>
        setState((s) => ({
          ...s,
          skinLogs: [log, ...s.skinLogs.filter((x) => x.date !== log.date)],
        })),

      setSupplements: (supplements) => update({ supplements }),

      logIntake: (intake) =>
        setState((s) => ({
          ...s,
          intakes: [intake, ...s.intakes],
          supplements: s.supplements.map((sup) =>
            sup.id === intake.supplementId
              ? { ...sup, stock: Math.max(0, sup.stock - intake.amount) }
              : sup,
          ),
        })),

      setBooks: (books) => update({ books }),

      logReading: (session) =>
        setState((s) => {
          const sessions = [session, ...s.readingSessions];
          const books = s.books.map((b) => {
            if (b.id !== session.bookId) return b;
            const pagesRead = Math.min(b.totalPages, b.pagesRead + session.pages);
            return { ...b, pagesRead, completed: pagesRead >= b.totalPages };
          });
          return { ...s, books, readingSessions: sessions };
        }),

      sendChat: (text) =>
        setState((s) => {
          const userMsg: ChatMessage = {
            id: Math.random().toString(36).slice(2),
            role: "user",
            content: text,
            ts: Date.now(),
          };
          const reply: ChatMessage = {
            id: Math.random().toString(36).slice(2),
            role: "assistant",
            content: `(echo) ${text}`,
            ts: Date.now() + 1,
          };
          return { ...s, chat: [...s.chat, userMsg, reply] };
        }),

      resetAll: () => {
        console.log("[store] resetAll");
        _memAccessToken = null;
        _memSheetHandle = null;
        setSheetHandle(null);
        storeSheetHandle(null);
        setSheetLoadWarning(null);
        setSessionExpired(false);
        setState(baseState());
      },

      // saveData, loadData, syncToSheet: also NEVER call getValidAccessToken().
      // They check _memAccessToken directly and return early with a clear log
      // if it's absent. The user must reconnect via the banner first.

      saveData: async () => {
        if (!sheetHandle) { console.warn("[store] saveData: no sheet handle, skipping"); return; }
        console.log("[store] saveData: checking in-memory token…");
        if (!_memAccessToken) {
          console.warn("[store] saveData: no token — session expired. Use reconnect.");
          setSessionExpired(true);
          return;
        }
        console.log("[store] saveData: attempting Sheet save…");
        try {
          await saveStateToSheet(sheetHandle, _memAccessToken, state);
          console.log("[store] ✓ saveData: Sheet save succeeded");
        } catch (err) {
          console.error("[store] ✗ saveData: Sheet save failed:", err);
          _memAccessToken = null;
          setSessionExpired(true);
        }
      },

      loadData: async () => {
        if (!sheetHandle) { console.warn("[store] loadData: no sheet handle, skipping"); return; }
        console.log("[store] loadData: checking in-memory token…");
        if (!_memAccessToken) {
          console.warn("[store] loadData: no token — session expired. Use reconnect.");
          setSessionExpired(true);
          return;
        }
        console.log("[store] loadData: loading from Sheet…");
        try {
          const sheetState = await loadStateFromSheet(sheetHandle, _memAccessToken);
          if (sheetState) {
            update(sheetState);
            console.log("[store] ✓ loadData: Sheet state loaded");
          }
        } catch (err) {
          console.error("[store] ✗ loadData: failed:", err);
        }
      },

      syncToSheet: async () => {
        if (!sheetHandle) { console.warn("[store] syncToSheet: no sheet handle, skipping"); return; }
        console.log("[store] syncToSheet: checking in-memory token…");
        if (!_memAccessToken) {
          console.warn("[store] syncToSheet: no token — session expired. Use reconnect.");
          setSessionExpired(true);
          return;
        }
        console.log("[store] syncToSheet: syncing…");
        try {
          await _syncToSheet(sheetHandle, _memAccessToken, state);
          console.log("[store] ✓ syncToSheet: succeeded");
        } catch (err) {
          console.error("[store] ✗ syncToSheet: failed:", err);
          _memAccessToken = null;
          setSessionExpired(true);
        }
      },
    };
  }, [state, sheetHandle, sheetLoadWarning, sessionExpired, reconnectGoogle]);

  return <AppCtx.Provider value={value}>{children}</AppCtx.Provider>;
}

export function useApp(): Ctx {
  const c = useContext(AppCtx);
  if (!c) throw new Error("useApp must be used within AppProvider");
  return c;
}

export const today = () => isoDate(new Date());