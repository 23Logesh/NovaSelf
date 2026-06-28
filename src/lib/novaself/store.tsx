import {
  createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode,
} from "react";
import type {
  AppSettings, Book, ChatMessage, DayLog, DietPhase, MessItem, ReadingSession,
  SkinLog, Supplement, SupplementIntake, WorkoutPhase,
} from "./types";
import type { Profile } from "./calculations";
import { isoDate } from "./calculations";
import {
  defaultBooks, defaultDays, defaultDietPhases, defaultIntakes, defaultMess, defaultProfile,
  defaultReading, defaultSettings, defaultSkinLogs, defaultSupplements, defaultWorkoutPhases,
  emptyUserState,
} from "./mockData";
import { signInWithGoogle, signOutOfGoogle, getValidAccessToken } from "./googleAuth";
import {
  ensureUserSheet, loadStateFromSheet, saveStateToSheet, syncToSheet as _syncToSheet,
  type SheetHandle,
} from "./googleSheets";

export type { SheetHandle };

export interface AppState {
  signedIn: boolean;
  onboarded: boolean;
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
  saveProfile: (p: Partial<Profile>) => void;
  updateSettings: (s: Partial<AppSettings>) => void;
  toggleNutrient: (key: keyof AppSettings["enabledNutrients"]) => void;
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
  /** Resolved spreadsheet handle for the current user — null if not signed in. */
  sheetHandle: SheetHandle | null;
}

type Ctx = AppState & AppActions;
const AppCtx = createContext<Ctx | null>(null);

const STORAGE_KEY = "novaself.v1";
// We persist the SheetHandle (spreadsheetId + webViewLink) but never the accessToken.
const SHEET_HANDLE_KEY = "novaself.sheetHandle";

// ---------------------------------------------------------------------------
// In-memory OAuth state (never persisted)
// ---------------------------------------------------------------------------
let _memAccessToken: string | null = null;
let _memSheetHandle: SheetHandle | null = null;

// ---------------------------------------------------------------------------
// localStorage helpers
// ---------------------------------------------------------------------------
function loadInitial(): AppState {
  if (typeof window === "undefined") return baseState();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) return { ...baseState(), ...JSON.parse(raw) };
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

/**
 * Pre-sign-in default state. Mock data intentionally included here so the
 * unauthenticated welcome screen has something to render. This is NEVER
 * written to a real Sheet — see signInGoogle() below.
 */
function baseState(): AppState {
  return {
    signedIn: false,
    onboarded: false,
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

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------
export function AppProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppState>(() => loadInitial());
  const [sheetHandle, setSheetHandle] = useState<SheetHandle | null>(() => loadStoredSheetHandle());

  // Debounce ref for auto-save.
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Persist to localStorage on every state change.
  useEffect(() => {
    if (typeof window === "undefined") return;
    try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch {}
  }, [state]);

  // Debounced auto-save to Google Sheets (2.5s after last change).
  // Only runs when signed in and we have a handle.
  useEffect(() => {
    if (!state.signedIn || !sheetHandle) return;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(async () => {
      try {
        const token = _memAccessToken ?? await getValidAccessToken();
        await saveStateToSheet(sheetHandle, token, state);
      } catch (err) {
        console.warn("[store] Auto-save to Sheets failed:", err);
      }
    }, 2500);
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, [state, sheetHandle]);

  // Theme class.
  useEffect(() => {
    if (typeof document === "undefined") return;
    const root = document.documentElement;
    root.classList.toggle("light", state.settings.theme === "light");
    root.classList.toggle("dark", state.settings.theme === "dark");
  }, [state.settings.theme]);

  const value = useMemo<Ctx>(() => {
    const update = (patch: Partial<AppState>) => setState((s) => ({ ...s, ...patch }));

    return {
      ...state,
      sheetHandle,

      signInGoogle: async () => {
        // Must be called from a real user gesture (button click).
        const authResult = await signInWithGoogle();
        _memAccessToken = authResult.accessToken;

        // Ensure the user's Sheet exists (creates it if this is their first sign-in).
        const handle = await ensureUserSheet(authResult.accessToken);
        _memSheetHandle = handle;
        setSheetHandle(handle);
        storeSheetHandle(handle);

        // Load whatever's already in the Sheet.
        const sheetState = await loadStateFromSheet(handle, authResult.accessToken);

        // Detect a brand-new Sheet: no days AND no saved profile means the Sheet
        // was just created and has never had real data written to it. In that case
        // we must NOT carry forward the pre-sign-in mock data — reset to a genuine
        // empty baseline so no fake entries end up in the user's Sheet.
        const isNewSheet =
          (!sheetState?.days || sheetState.days.length === 0) &&
          !sheetState?.profile;

        if (isNewSheet) {
          // New user: empty slate. Preserve only device-level settings (theme,
          // nutrient toggles, ollamaUrl) — those are not personal data.
          update({
            ...emptyUserState(),
            settings: state.settings,
            signedIn: true,
            onboarded: false,
          });
        } else {
          // Returning user: fully hydrate from Sheet data. Any key missing from
          // sheetState falls back to the current (possibly stale) local value —
          // that's intentional, Sheet is source of truth for what it has.
          update({
            ...(sheetState ?? {}),
            signedIn: true,
          });
        }
      },

      signOut: async () => {
        await signOutOfGoogle();
        _memAccessToken = null;
        _memSheetHandle = null;
        setSheetHandle(null);
        storeSheetHandle(null);
        update({ signedIn: false, onboarded: false });
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
        _memAccessToken = null;
        _memSheetHandle = null;
        setSheetHandle(null);
        storeSheetHandle(null);
        setState(baseState());
      },

      saveData: async () => {
        if (!sheetHandle) return;
        try {
          const token = _memAccessToken ?? await getValidAccessToken();
          await saveStateToSheet(sheetHandle, token, state);
        } catch (err) {
          console.error("[store] saveData failed:", err);
        }
      },

      loadData: async () => {
        if (!sheetHandle) return;
        try {
          const token = _memAccessToken ?? await getValidAccessToken();
          const sheetState = await loadStateFromSheet(sheetHandle, token);
          if (sheetState) update(sheetState);
        } catch (err) {
          console.error("[store] loadData failed:", err);
        }
      },

      syncToSheet: async () => {
        if (!sheetHandle) return;
        try {
          const token = _memAccessToken ?? await getValidAccessToken();
          await _syncToSheet(sheetHandle, token, state);
        } catch (err) {
          console.error("[store] syncToSheet failed:", err);
        }
      },
    };
  }, [state, sheetHandle]);

  return <AppCtx.Provider value={value}>{children}</AppCtx.Provider>;
}

export function useApp(): Ctx {
  const c = useContext(AppCtx);
  if (!c) throw new Error("useApp must be used within AppProvider");
  return c;
}

export const today = () => isoDate(new Date());