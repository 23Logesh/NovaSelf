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
import { goToGoogleLogin, signOutOfGoogle } from "./googleAuth";
import { fetchMe, fetchState, syncState, pickSyncable } from "./stateApi";

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
  sheetLoadWarning: string | null;
  clearSheetLoadWarning: () => void;
  sessionExpired: boolean;
}

type Ctx = AppState & AppActions;
const AppCtx = createContext<Ctx | null>(null);

const STORAGE_KEY = "novaself.v1";

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

/** True when a and b agree on every field the backend syncs — used to skip a
 *  no-op setState after a sync so the autosave effect doesn't loop forever. */
function syncableEqual(a: AppState, b: AppState): boolean {
  return JSON.stringify(pickSyncable(a)) === JSON.stringify(pickSyncable(b));
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppState>(() => loadInitial());
  const [sheetLoadWarning, setSheetLoadWarning] = useState<string | null>(null);
  const [sessionExpired, setSessionExpired] = useState(false);

  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const stateRef = useRef<AppState>(state);
  useEffect(() => { stateRef.current = state; }, [state]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
      console.error("[store] localStorage save failed:", e);
    }
  }, [state]);

  useEffect(() => {
    if (typeof document === "undefined") return;
    const root = document.documentElement;
    root.classList.toggle("light", state.settings.theme === "light");
    root.classList.toggle("dark", state.settings.theme === "dark");
  }, [state.settings.theme]);

  /** The one and only path that talks to the backend for data. Push local
   *  state, adopt whatever comes back (the merged truth — may include
   *  another device's edits). Used by autosave, focus, and the poll interval. */
  const doSync = useCallback(async () => {
    try {
      const result = await syncState(pickSyncable(stateRef.current));
      if (!result) {
        setSessionExpired(true);
        return;
      }
      setSessionExpired(false);
      setState((s) => {
        const next = { ...s, ...(result.data as Partial<AppState>) };
        return syncableEqual(s, next) ? s : next; // bail out on no-op to avoid re-triggering the effect
      });
    } catch (err) {
      console.warn("[store] sync failed (will retry):", err);
    }
  }, []);

  // Debounced autosave on local edits.
  useEffect(() => {
    if (!state.signedIn) return;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(doSync, 3000);
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, [state, doSync]);

  // Pick up other devices' edits on focus / tab-visible / a timer.
  useEffect(() => {
    if (!state.signedIn) return;
    const onVisibility = () => { if (document.visibilityState === "visible") doSync(); };
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("focus", doSync);
    const interval = setInterval(doSync, 45_000);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("focus", doSync);
      clearInterval(interval);
    };
  }, [state.signedIn, doSync]);

  const reconnectGoogle = useCallback(async () => {
    const me = await fetchMe();
    if (!me) {
      // Refresh token itself is dead server-side — only a full re-login fixes this.
      goToGoogleLogin();
      return;
    }
    await doSync();
  }, [doSync]);

  const restoreSession = useCallback(async (): Promise<boolean> => {
    const me = await fetchMe();
    if (!me) return false;
    const googleAccount: GoogleAccount = { email: me.email, name: me.name };

    try {
      const result = await fetchState();
      if (!result) return false;
      setSessionExpired(false);

      if (result.isNewlyCreated) {
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

      setState((s) => ({
        ...s,
        ...(result.data as Partial<AppState>),
        settings: { ...defaultSettings, ...((result.data as Partial<AppState>).settings ?? {}) },
        googleAccount,
        signedIn: true,
        onboarded: true,
      }));
      return true;
    } catch (err) {
      console.error("[store] restoreSession: fetchState failed:", err);
      setSheetLoadWarning(
        "Couldn't reach the server to load your data (network issue). " +
        "Your local data is safe — it'll sync automatically once the connection is back.",
      );
      setState((s) => ({ ...s, googleAccount, signedIn: true }));
      return true;
    }
  }, []);

  const value = useMemo<Ctx>(() => {
    const update = (patch: Partial<AppState>) => setState((s) => ({ ...s, ...patch }));

    return {
      ...state,
      sheetLoadWarning,
      sessionExpired,
      clearSheetLoadWarning: () => setSheetLoadWarning(null),
      reconnectGoogle,
      restoreSession,

      signInGoogle: async () => {
        goToGoogleLogin();
      },

      signOut: async () => {
        await signOutOfGoogle();
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
        setSheetLoadWarning(null);
        setSessionExpired(false);
        setState(baseState());
      },

      saveData: doSync,
      loadData: doSync,
      syncToSheet: doSync,
    };
  }, [state, sheetLoadWarning, sessionExpired, reconnectGoogle, restoreSession, doSync]);

  return <AppCtx.Provider value={value}>{children}</AppCtx.Provider>;
}

export function useApp(): Ctx {
  const c = useContext(AppCtx);
  if (!c) throw new Error("useApp must be used within AppProvider");
  return c;
}

export const today = () => isoDate(new Date());