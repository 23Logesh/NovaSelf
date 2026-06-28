import {
  createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode,
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
  // Custom nutrient actions
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
      // Merge defaultSettings so new fields (customNutrients, enabledCustomNutrients)
      // are present even for users whose stored settings pre-date this feature.
      const merged = {
        ...baseState(),
        ...parsed,
        settings: { ...defaultSettings, ...parsed.settings },
      };
      return merged;
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

  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch {}
  }, [state]);

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
      sheetLoadWarning,
      clearSheetLoadWarning: () => setSheetLoadWarning(null),

      signInGoogle: async () => {
        const authResult = await signInWithGoogle();
        _memAccessToken = authResult.accessToken;

        const { handle, isNewlyCreated } = await ensureUserSheet(authResult.accessToken);
        _memSheetHandle = handle;
        setSheetHandle(handle);
        storeSheetHandle(handle);

        if (isNewlyCreated) {
          update({
            ...emptyUserState(),
            // Carry over device-level preferences (theme, nutrient toggles,
            // custom nutrients, ollamaUrl) — these are not personal health data.
            settings: state.settings,
            signedIn: true,
            onboarded: false,
          });
          return;
        }

        let sheetState: Partial<AppState> | null = null;
        try {
          sheetState = await loadStateFromSheet(handle, authResult.accessToken);
        } catch (err) {
          console.error("[store] signInGoogle: loadStateFromSheet threw on existing sheet:", err);
        }

        const loadReturnedData =
          (sheetState?.days && sheetState.days.length > 0) || !!sheetState?.profile;

        if (loadReturnedData) {
          update({
            ...(sheetState ?? {}),
            // Merge settings so new fields don't disappear for returning users
            // whose Sheet settings were saved before customNutrients existed.
            settings: { ...defaultSettings, ...(sheetState?.settings ?? {}) },
            signedIn: true,
            onboarded: true,
          });
        } else {
          console.warn(
            "[store] signInGoogle: existing Sheet returned empty data. " +
            "This is likely a transient fetch error. Local state preserved.",
          );
          setSheetLoadWarning(
            "Couldn't load your data from Google Sheets right now (network issue). " +
            "Your local data is safe — tap Sync in Settings to retry.",
          );
          update({ signedIn: true });
        }
      },

      signOut: async () => {
        await signOutOfGoogle();
        _memAccessToken = null;
        _memSheetHandle = null;
        setSheetHandle(null);
        storeSheetHandle(null);
        setSheetLoadWarning(null);
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

      addCustomNutrient: (n) =>
        setState((s) => ({
          ...s,
          settings: {
            ...s.settings,
            customNutrients: [...s.settings.customNutrients, n],
            // Default new nutrients to enabled so they immediately appear in the log.
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
        _memAccessToken = null;
        _memSheetHandle = null;
        setSheetHandle(null);
        storeSheetHandle(null);
        setSheetLoadWarning(null);
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
  }, [state, sheetHandle, sheetLoadWarning]);

  return <AppCtx.Provider value={value}>{children}</AppCtx.Provider>;
}

export function useApp(): Ctx {
  const c = useContext(AppCtx);
  if (!c) throw new Error("useApp must be used within AppProvider");
  return c;
}

export const today = () => isoDate(new Date());