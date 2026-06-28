// Real health math. Only auth/data sync is mocked elsewhere.

export type Sex = "male" | "female";
export type ActivityLevel = "sedentary" | "light" | "moderate" | "active" | "very_active";

export interface Profile {
  name: string;
  age: number;
  sex: Sex;
  heightCm: number;
  weightKg: number;
  goalWeightKg: number;
  startingWeightKg: number;
  activity: ActivityLevel;
  neckCm?: number;
  waistCm?: number;
  hipCm?: number;
  // FR-15: the calculated calorie target (TDEE - 500) must be
  // editable/overridable by the user. When set, this value wins over the
  // calculated default. Cleared back to undefined to return to "auto".
  calorieTargetOverride?: number;
}

export const ACTIVITY_MULTIPLIER: Record<ActivityLevel, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  very_active: 1.9,
};

export function bmi(weightKg: number, heightCm: number) {
  const m = heightCm / 100;
  return weightKg / (m * m);
}

export function bmiCategory(v: number): string {
  if (v < 18.5) return "Underweight";
  if (v < 25) return "Normal";
  if (v < 30) return "Overweight";
  return "Obese";
}

// Mifflin-St Jeor
export function bmr(p: Pick<Profile, "weightKg" | "heightCm" | "age" | "sex">) {
  const base = 10 * p.weightKg + 6.25 * p.heightCm - 5 * p.age;
  return p.sex === "male" ? base + 5 : base - 161;
}

export function tdee(p: Pick<Profile, "weightKg" | "heightCm" | "age" | "sex" | "activity">) {
  return bmr(p) * ACTIVITY_MULTIPLIER[p.activity];
}

// Calculated default calorie target (TDEE - 500), floored at 1200 kcal.
export const calculatedCalorieTarget = (p: Profile) => Math.max(1200, tdee(p) - 500);

// FR-15: actual calorie target used throughout the app — the user's manual
// override if they've set one, otherwise the calculated default.
export const calorieTarget = (p: Profile) =>
  typeof p.calorieTargetOverride === "number" && p.calorieTargetOverride > 0
    ? p.calorieTargetOverride
    : calculatedCalorieTarget(p);

export const proteinTargetG = (p: Profile) => 1.8 * p.weightKg;
export const fiberTargetG = (p: Profile) => 14 * (calorieTarget(p) / 1000);
export const waterTargetMl = (p: Profile) => 35 * p.weightKg;
export const omega3TargetG = () => 1.6;

// US Navy body fat %
export function bodyFatPctUSNavy(p: Profile): number | null {
  if (!p.neckCm || !p.waistCm) return null;
  if (p.sex === "male") {
    return 495 / (1.0324 - 0.19077 * Math.log10(p.waistCm - p.neckCm) + 0.15456 * Math.log10(p.heightCm)) - 450;
  }
  if (!p.hipCm) return null;
  return 495 / (1.29579 - 0.35004 * Math.log10(p.waistCm + p.hipCm - p.neckCm) + 0.22100 * Math.log10(p.heightCm)) - 450;
}

// Devine ideal weight (kg)
export function idealWeightDevine(p: Pick<Profile, "heightCm" | "sex">): number {
  const inchesOver5ft = Math.max(0, p.heightCm / 2.54 - 60);
  return p.sex === "male" ? 50 + 2.3 * inchesOver5ft : 45.5 + 2.3 * inchesOver5ft;
}

// Boer lean body mass
export function leanBodyMassBoer(p: Pick<Profile, "weightKg" | "heightCm" | "sex">): number {
  return p.sex === "male"
    ? 0.407 * p.weightKg + 0.267 * p.heightCm - 19.2
    : 0.252 * p.weightKg + 0.473 * p.heightCm - 48.3;
}

export function fatMass(p: Profile): number | null {
  const bf = bodyFatPctUSNavy(p);
  return bf === null ? null : (bf / 100) * p.weightKg;
}

// MET-based calorie burn
export function caloriesBurned(met: number, weightKg: number, minutes: number) {
  return met * weightKg * (minutes / 60);
}

export const WORKOUT_METS: Record<string, number> = {
  jogging: 7.0,
  jump_rope: 12.3,
  swimming: 8.0,
  gym: 6.0,
  cycling: 7.5,
  hiit: 9.0,
  yoga: 3.0,
  calisthenics: 5.5,
};

export function workoutLabel(type: string) {
  return type
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export function goalProgressPct(p: Profile): number {
  const total = p.startingWeightKg - p.goalWeightKg;
  if (Math.abs(total) < 0.01) return 100;
  const done = p.startingWeightKg - p.weightKg;
  return Math.max(0, Math.min(100, (done / total) * 100));
}

// Goal ETA from recent weight rate of change (last N entries)
export function goalETA(
  p: Profile,
  weights: { date: string; weightKg: number }[],
): { days: number; date: Date } | null {
  if (weights.length < 2) return null;
  const sorted = [...weights].sort((a, b) => a.date.localeCompare(b.date));
  const first = sorted[0];
  const last = sorted[sorted.length - 1];
  const days = (new Date(last.date).getTime() - new Date(first.date).getTime()) / 86400000;
  if (days <= 0) return null;
  const ratePerDay = (last.weightKg - first.weightKg) / days; // negative for fat loss
  const remaining = p.goalWeightKg - p.weightKg;
  if (Math.sign(remaining) !== Math.sign(ratePerDay) || ratePerDay === 0) return null;
  const etaDays = Math.round(remaining / ratePerDay);
  if (etaDays <= 0 || etaDays > 365 * 5) return null;
  return { days: etaDays, date: new Date(Date.now() + etaDays * 86400000) };
}

export function isoDate(d: Date | string = new Date()): string {
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toISOString().slice(0, 10);
}

// Walks back day-by-day from today while the date is present in `dates`.
// Pure ISO-string comparisons (no manual month/day arithmetic), so this is
// correct across month and year boundaries (NFR-07).
export function streakDays(dates: string[]): number {
  if (!dates.length) return 0;
  const set = new Set(dates);
  let count = 0;
  let cur = new Date();
  while (set.has(isoDate(cur))) {
    count++;
    cur = new Date(cur.getTime() - 86400000);
  }
  return count;
}