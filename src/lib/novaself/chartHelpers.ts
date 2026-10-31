import type { AppState } from "./store";
import { isoDate } from "./calculations";
import type { TrendDataPoint } from "@/components/novaself/MiniTrendChart";

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function formatDateDDMMYY(isoStr: string): string {
  const parts = isoStr.split("-");
  if (parts.length === 3) {
    return `${parts[2]}_${parts[1]}_${parts[0].slice(2)}`;
  }
  return isoStr;
}

export function getPastDays(daysCount: number): { date: string; dayName: string; formattedDate: string }[] {
  const result: { date: string; dayName: string; formattedDate: string }[] = [];
  const now = new Date();
  for (let i = daysCount - 1; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 86400000);
    const iso = isoDate(d);
    const dayLabel = i === 0 ? "Today" : DAY_NAMES[d.getDay()];
    result.push({
      date: iso,
      dayName: dayLabel,
      formattedDate: formatDateDDMMYY(iso),
    });
  }
  return result;
}

export function getFoodTrend(state: AppState, daysCount: number = 7): TrendDataPoint[] {
  const daysArr = getPastDays(daysCount);
  return daysArr.map(({ date, dayName, formattedDate }) => {
    const day = state.days.find((d) => d.date === date);
    const cals = day ? day.foods.reduce((sum, f) => sum + f.calories, 0) : 0;
    return { date, dayName, formattedDate, value: cals };
  });
}

export function getWaterTrend(state: AppState, daysCount: number = 7): TrendDataPoint[] {
  const daysArr = getPastDays(daysCount);
  return daysArr.map(({ date, dayName, formattedDate }) => {
    const day = state.days.find((d) => d.date === date);
    const ml = day ? day.water.reduce((sum, w) => sum + w.ml, 0) : 0;
    return { date, dayName, formattedDate, value: ml };
  });
}

export function getWorkoutTrend(state: AppState, daysCount: number = 7): TrendDataPoint[] {
  const daysArr = getPastDays(daysCount);
  return daysArr.map(({ date, dayName, formattedDate }) => {
    const day = state.days.find((d) => d.date === date);
    const burn = day ? Math.round(day.workouts.reduce((sum, w) => sum + w.caloriesBurned, 0)) : 0;
    return { date, dayName, formattedDate, value: burn };
  });
}

export function getWeightTrend(state: AppState, daysCount: number = 7): TrendDataPoint[] {
  const daysArr = getPastDays(daysCount);
  return daysArr.map(({ date, dayName, formattedDate }) => {
    const day = state.days.find((d) => d.date === date);
    const weight = day && typeof day.weightKg === "number" ? day.weightKg : 0;
    return { date, dayName, formattedDate, value: weight };
  });
}

export function getSupplementTrend(state: AppState, daysCount: number = 7): TrendDataPoint[] {
  const daysArr = getPastDays(daysCount);
  return daysArr.map(({ date, dayName, formattedDate }) => {
    const count = state.intakes.filter((i) => i.date === date).length;
    return { date, dayName, formattedDate, value: count };
  });
}

export function getSkinTrend(state: AppState, daysCount: number = 7): TrendDataPoint[] {
  const daysArr = getPastDays(daysCount);
  return daysArr.map(({ date, dayName, formattedDate }) => {
    const log = state.skinLogs.find((s) => s.date === date);
    let count = 0;
    if (log) {
      if (log.faceWash) count++;
      if (log.moisturizer) count++;
      if (log.sunscreen) count++;
      if (log.hairOil) count++;
      if (log.scalpMassage) count++;
    }
    return { date, dayName, formattedDate, value: count };
  });
}

export function getSleepTrend(state: AppState, daysCount: number = 7): TrendDataPoint[] {
  const daysArr = getPastDays(daysCount);
  return daysArr.map(({ date, dayName, formattedDate }) => {
    const log = state.sleepLogs.find((s) => s.date === date);
    const hours = log && typeof log.durationHours === "number" ? Math.round(log.durationHours * 10) / 10 : 0;
    return { date, dayName, formattedDate, value: hours };
  });
}

export function getReadingTrend(state: AppState, daysCount: number = 7): TrendDataPoint[] {
  const daysArr = getPastDays(daysCount);
  return daysArr.map(({ date, dayName, formattedDate }) => {
    const pages = state.readingSessions
      .filter((s) => s.date === date)
      .reduce((sum, s) => sum + s.pages, 0);
    return { date, dayName, formattedDate, value: pages };
  });
}
