import {
  createContext, useContext, useEffect, useMemo, useState, type ReactNode,
} from "react";
import type {
  AppSettings, Book, ChatMessage, CustomNutrient, DayLog, DietPhase, MessItem,
  ReadingSession, SkinLog, SleepLog, Supplement, SupplementIntake, WorkoutPhase,
} from "./types";
import type { Profile } from "./calculations";
import { isoDate } from "./calculations";
import { defaultSettings, emptyUserState } from "./mockData";

export interface AppState {
  onboarded: boolean;
  profile: Profile;
  settings: AppSettings;
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
}

type Ctx = AppState & AppActions;
const AppCtx = createContext<Ctx | null>(null);

// Same key as the web app. All data lives on the device (WebView local storage).
const STORAGE_KEY = "novaself.v1";

// A fresh install starts empty (same as a brand-new account in the web app),
// then the Welcome screen collects the profile.
function baseState(): AppState {
  return {
    onboarded: false,
    ...emptyUserState(),
    settings: defaultSettings,
  };
}

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

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppState>(() => loadInitial());

  // Persist every change locally.
  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
      console.error("[store] local save failed:", e);
    }
  }, [state]);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("light", state.settings.theme === "light");
    root.classList.toggle("dark", state.settings.theme === "dark");
  }, [state.settings.theme]);

  const value = useMemo<Ctx>(() => {
    const update = (patch: Partial<AppState>) => setState((s) => ({ ...s, ...patch }));

    return {
      ...state,

      saveProfile: (p) =>
        setState((s) => ({
          ...s,
          profile: { ...s.profile, ...p },
          onboarded: true,
        })),

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

      resetAll: () => setState(baseState()),
    };
  }, [state]);

  return <AppCtx.Provider value={value}>{children}</AppCtx.Provider>;
}

export function useApp(): Ctx {
  const c = useContext(AppCtx);
  if (!c) throw new Error("useApp must be used within AppProvider");
  return c;
}

export const today = () => isoDate(new Date());