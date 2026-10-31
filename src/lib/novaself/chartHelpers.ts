import type { AppState } from "./store";
import { isoDate } from "./calculations";
import type { TrendDataPoint } from "@/components/novaself/MiniTrendChart";

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function getPast7Days(): { date: string; dayName: string }[] {
  const result: { date: string; dayName: string }[] = [];
  const now = new Date();
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 86400000);
    result.push({
      date: isoDate(d),
      dayName: DAY_NAMES[d.getDay()],
    });
  }
  return result;
}

export function getFoodTrend(state: AppState): TrendDataPoint[] {
  const days7 = getPast7Days();
  return days7.map(({ date, dayName }) => {
    const day = state.days.find((d) => d.date === date);
    const cals = day ? day.foods.reduce((sum, f) => sum + f.calories, 0) : 0;
    return { date, dayName, value: cals };
  });
}

export function getWaterTrend(state: AppState): TrendDataPoint[] {
  const days7 = getPast7Days();
  return days7.map(({ date, dayName }) => {
    const day = state.days.find((d) => d.date === date);
    const ml = day ? day.water.reduce((sum, w) => sum + w.ml, 0) : 0;
    return { date, dayName, value: ml };
  });
}

export function getWorkoutTrend(state: AppState): TrendDataPoint[] {
  const days7 = getPast7Days();
  return days7.map(({ date, dayName }) => {
    const day = state.days.find((d) => d.date === date);
    const burn = day ? Math.round(day.workouts.reduce((sum, w) => sum + w.caloriesBurned, 0)) : 0;
    return { date, dayName, value: burn };
  });
}

export function getWeightTrend(state: AppState): TrendDataPoint[] {
  const days7 = getPast7Days();
  return days7.map(({ date, dayName }) => {
    const day = state.days.find((d) => d.date === date);
    const weight = day && typeof day.weightKg === "number" ? day.weightKg : 0;
    return { date, dayName, value: weight };
  });
}

export function getSupplementTrend(state: AppState): TrendDataPoint[] {
  const days7 = getPast7Days();
  return days7.map(({ date, dayName }) => {
    const count = state.intakes.filter((i) => i.date === date).length;
    return { date, dayName, value: count };
  });
}

export function getSkinTrend(state: AppState): TrendDataPoint[] {
  const days7 = getPast7Days();
  return days7.map(({ date, dayName }) => {
    const log = state.skinLogs.find((s) => s.date === date);
    let count = 0;
    if (log) {
      if (log.faceWash) count++;
      if (log.moisturizer) count++;
      if (log.sunscreen) count++;
      if (log.hairOil) count++;
      if (log.scalpMassage) count++;
    }
    return { date, dayName, value: count };
  });
}

export function getSleepTrend(state: AppState): TrendDataPoint[] {
  const days7 = getPast7Days();
  return days7.map(({ date, dayName }) => {
    const log = state.sleepLogs.find((s) => s.date === date);
    const hours = log && typeof log.durationHours === "number" ? Math.round(log.durationHours * 10) / 10 : 0;
    return { date, dayName, value: hours };
  });
}

export function getReadingTrend(state: AppState): TrendDataPoint[] {
  const days7 = getPast7Days();
  return days7.map(({ date, dayName }) => {
    const pages = state.readingSessions
      .filter((s) => s.date === date)
      .reduce((sum, s) => sum + s.pages, 0);
    return { date, dayName, value: pages };
  });
}
