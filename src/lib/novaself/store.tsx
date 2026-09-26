import {
  createContext, useContext, useEffect, useMemo, useRef, useState, useCallback, type ReactNode,
} from "react";
import type {
  AppSettings, Book, ChatMessage, CustomNutrient, DayLog, DietPhase, MessItem,
  ReadingSession, SkinLog, SleepLog, Supplement, SupplementIntake, WorkoutPhase,
} from "./types";
import type { Profile } from "./calculations";
import { isoDate } from "./calculations";
import {
  defaultBooks, defaultDays, defaultDietPhases, defaultIntakes, defaultMess, defaultProfile,
  defaultReading, defaultSettings, defaultSkinLogs, defaultSleepLogs, defaultSupplements,
  defaultWorkoutPhases, emptyUserState,
} from "./mockData";
import { goToGoogleLogin, fetchAccessToken, signOutOfGoogle } from "./googleAuth";
import {
  ensureUserSheet, loadStateFromSheet, saveStateToSheet, syncToSheet as _syncToSheet,
  pullRemoteChanges, type SheetHandle,
} from "./googleSheets";

export type { SheetHandle };

export interface GoogleAccount {
  email: string;
  name: string;
}

export interface AppState {
  signedIn: boolean;
  onboarded: boolean;
  googleAccount: GoogleAccount | null;
  profile: Profile;
  profileUpdatedAt: number;
  settings: AppSettings;
  settingsUpdatedAt: number;
  days: DayLog[];
  dietPhases: DietPhase[];
  mess: MessItem[];
  workoutPhases: WorkoutPhase[];
  skinLogs: SkinLog[];
  sleepLogs: SleepLog[];
  supplements: Supplement[];
  intakes: SupplementIntake[];
  books: Book[];
  readingSessions: ReadingSession[];
  chat: ChatMessage[];
}

interface AppActions {
  signInGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  reconnectGoogle: () => Promise<void>;
  restoreSession: () => Promise<boolean>;
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
  upsertSleep: (s: SleepLog) => void;
  setSupplements: (s: Supplement[]) => void;
  logIntake: (i: SupplementIntake) => void;
  removeIntake: (intakeId: string) => void;
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
  sessionExpired: boolean;
}

type Ctx = AppState & AppActions;
const AppCtx = createContext<Ctx | null>(null);

const STORAGE_KEY = "novaself.v1";
const SHEET_HANDLE_KEY = "novaself.sheetHandle";

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
    profileUpdatedAt: 0,
    settings: defaultSettings,
    settingsUpdatedAt: 0,
    days: defaultDays,
    dietPhases: defaultDietPhases,
    mess: defaultMess,
    workoutPhases: defaultWorkoutPhases,
    skinLogs: defaultSkinLogs,
    sleepLogs: defaultSleepLogs,
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
  const [sessionExpired, setSessionExpired] = useState(false);

  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const stateRef = useRef<AppState>(state);
  useEffect(() => { stateRef.current = state; }, [state]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      console.log("[store] ✓ Saved to localStorage");
    } catch (e) {
      console.error("[store] ✗ localStorage save failed:", e);
    }
  }, [state]);

  useEffect(() => {
    if (!state.signedIn || !sheetHandle) return;

    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);

    saveTimerRef.current = setTimeout(async () => {
      console.log("[store] Auto-save: debounce fired, checking token…");

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
        setSessionExpired(false);
      } catch (err) {
        console.error("[store] ✗ Auto-save to Sheet failed (token may have expired mid-session):", err);
        _memAccessToken = null;
        setSessionExpired(true);
      }
    }, 2500);

    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, [state, sheetHandle]);

  useEffect(() => {
    if (!state.signedIn || !sheetHandle) return;

    let cancelled = false;

    const tryPull = async () => {
      if (!_memAccessToken) return;
      try {
        const merged = await pullRemoteChanges(sheetHandle, _memAccessToken, stateRef.current);
        if (merged && !cancelled) {
          console.log("[store] Pulled remote changes from another device — merging in");
          setState((s) => ({ ...s, ...merged }));
        }
      } catch (err) {
        console.warn("[store] Background pull failed (will retry):", err);
      }
    };

    const onVisibility = () => {
      if (document.visibilityState === "visible") tryPull();
    };
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("focus", tryPull);
    const interval = setInterval(tryPull, 45_000);

    tryPull();

    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("focus", tryPull);
      clearInterval(interval);
    };
  }, [state.signedIn, sheetHandle]);

  useEffect(() => {
    if (typeof document === "undefined") return;
    const root = document.documentElement;
    root.classList.toggle("light", state.settings.theme === "light");
    root.classList.toggle("dark", state.settings.theme === "dark");
  }, [state.settings.theme]);

  const reconnectGoogle = useCallback(async () => {
    console.log("[store] reconnectGoogle: fetching fresh access token from backend…");
    try {
      const authResult = await fetchAccessToken();
      if (!authResult) {
        console.warn("[store] reconnectGoogle: no valid backend session — user must sign in fully");
        return;
      }
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
      console.error("[store] reconnectGoogle: ✗ token fetch or flush failed:", err);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sheetHandle]);

  const restoreSession = useCallback(async (): Promise<boolean> => {
    const authResult = await fetchAccessToken();
    if (!authResult) {
      console.log("[store] restoreSession: no valid backend session");
      return false;
    }
    _memAccessToken = authResult.accessToken;

    const googleAccount: GoogleAccount = { email: authResult.email, name: authResult.name };

    if (sheetHandle) {
      console.log("[store] restoreSession: ✓ token restored for existing sheet handle");
      setSessionExpired(false);
      setState((s) => ({ ...s, googleAccount, signedIn: true }));
      return true;
    }

    try {
      const { handle, isNewlyCreated } = await ensureUserSheet(authResult.accessToken);
      _memSheetHandle = handle;
      setSheetHandle(handle);
      storeSheetHandle(handle);
      setSessionExpired(false);

      if (isNewlyCreated) {
        setState((s) => ({
          ...s,
          ...emptyUserState(),
          settings: s.settings,
          googleAccount,
          signedIn: true,
          onboarded: false,
        }));
        return true;
      }

      let sheetState: Partial<AppState> | null = null;
      try {
        sheetState = await loadStateFromSheet(handle, authResult.accessToken);
      } catch (err) {
        console.error("[store] restoreSession: ✗ loadStateFromSheet threw:", err);
      }

      const loadReturnedData = (sheetState?.days && sheetState.days.length > 0) || !!sheetState?.profile;

      if (loadReturnedData) {
        setState((s) => ({
          ...s,
          ...(sheetState ?? {}),
          settings: { ...defaultSettings, ...(sheetState?.settings ?? {}) },
          googleAccount,
          signedIn: true,
          onboarded: true,
        }));
      } else {
        setSheetLoadWarning(
          "Couldn't load your data from Google Sheets right now (network issue). " +
          "Your local data is safe — tap Sync in Settings to retry.",
        );
        setState((s) => ({ ...s, googleAccount, signedIn: true }));
      }
      return true;
    } catch (err) {
      console.error("[store] restoreSession: ✗ ensureUserSheet failed:", err);
      return false;
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
      restoreSession,

      signInGoogle: async () => {
        console.log("[store] signInGoogle: redirecting to backend OAuth login…");
        goToGoogleLogin();
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
        setState((s) => ({
          ...s,
          profile: { ...s.profile, ...p },
          profileUpdatedAt: Date.now(),
          onboarded: true,
        })),

      updateSettings: (sp) =>
        setState((s) => ({
          ...s,
          settings: { ...s.settings, ...sp },
          settingsUpdatedAt: Date.now(),
        })),

      toggleNutrient: (key) =>
        setState((s) => ({
          ...s,
          settingsUpdatedAt: Date.now(),
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
          settingsUpdatedAt: Date.now(),
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
            settingsUpdatedAt: Date.now(),
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
          settingsUpdatedAt: Date.now(),
          settings: {
            ...s.settings,
            enabledCustomNutrients: {
              ...s.settings.enabledCustomNutrients,
              [id]: !s.settings.enabledCustomNutrients[id],
            },
          },
        })),

      clearOllamaUrl: () =>
        setState((s) => ({
          ...s,
          settings: { ...s.settings, ollamaUrl: "" },
          settingsUpdatedAt: Date.now(),
        })),

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

      upsertSleep: (log) =>
        setState((s) => ({
          ...s,
          sleepLogs: [log, ...s.sleepLogs.filter((x) => x.date !== log.date)],
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

      removeIntake: (intakeId) =>
        setState((s) => {
          const target = s.intakes.find((i) => i.id === intakeId);
          if (!target) return s;
          return {
            ...s,
            intakes: s.intakes.filter((i) => i.id !== intakeId),
            supplements: s.supplements.map((sup) =>
              sup.id === target.supplementId
                ? { ...sup, stock: sup.stock + target.amount }
                : sup,
            ),
          };
        }),

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
  }, [state, sheetHandle, sheetLoadWarning, sessionExpired, reconnectGoogle, restoreSession]);

  return <AppCtx.Provider value={value}>{children}</AppCtx.Provider>;
}

export function useApp(): Ctx {
  const c = useContext(AppCtx);
  if (!c) throw new Error("useApp must be used within AppProvider");
  return c;
}

export const today = () => isoDate(new Date());