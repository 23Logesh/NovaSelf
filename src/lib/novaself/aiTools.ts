import type { AppState } from "./store";
import { isoDate, calorieTarget, proteinTargetG, waterTargetMl, bmi, bmiCategory } from "./calculations";
import type { DayLog, MealType } from "./types";

type Args = Record<string, any>;
export type ToolResult = { state: AppState; result: Record<string, unknown> };
type Impl = (s: AppState, a: Args) => ToolResult;

const uid = () => Math.random().toString(36).slice(2, 10);
const todayStr = () => isoDate(new Date());
const dateOf = (a: Args): string => (/^\d{4}-\d{2}-\d{2}$/.test(a.date ?? "") ? a.date : todayStr());
const ok = (state: AppState, result: Record<string, unknown> = {}): ToolResult => ({ state, result: { ok: true, ...result } });
const fail = (state: AppState, error: string): ToolResult => ({ state, result: { ok: false, error } });
const n = (v: unknown, d = 0) => (typeof v === "number" && isFinite(v) ? v : d);
const same = (a: unknown, b: unknown) => String(a ?? "").trim().toLowerCase() === String(b ?? "").trim().toLowerCase();

function withDay(s: AppState, date: string, fn: (d: DayLog) => DayLog): AppState {
  const d = s.days.find((x) => x.date === date) ?? { date, foods: [], water: [], workouts: [] };
  const days = [...s.days.filter((x) => x.date !== date), fn(d)].sort((a, b) => a.date.localeCompare(b.date));
  return { ...s, days };
}

function removeFromDays(s: AppState, key: "foods" | "water" | "workouts", id: string): ToolResult {
  let found = false;
  const days = s.days.map((d) => {
    const list = d[key] as { id: string }[];
    const next = list.filter((x) => x.id !== id);
    if (next.length === list.length) return d;
    found = true;
    return { ...d, [key]: next };
  });
  return found ? ok({ ...s, days }, { deleted: id }) : fail(s, "id not found, call get_data first");
}

const IMPL: Record<string, Impl> = {
  get_data: (s, a) => {
    const from = a.from ?? isoDate(new Date(Date.now() - 6 * 864e5));
    const to = a.to ?? todayStr();
    const inRange = (x: { date: string }) => x.date >= from && x.date <= to;
    switch (a.section) {
      case "profile": return ok(s, { profile: s.profile });
      case "days": return ok(s, { days: s.days.filter(inRange) });
      case "sleep": return ok(s, { sleep: s.sleepLogs.filter(inRange) });
      case "skin": return ok(s, { skin: s.skinLogs.filter(inRange) });
      case "supplements": return ok(s, { supplements: s.supplements, intakes: s.intakes.filter(inRange) });
      case "books": return ok(s, { books: s.books, sessions: s.readingSessions.filter(inRange) });
      case "diet_plan": return ok(s, { phases: s.dietPhases, mess: s.mess });
      case "workout_plan": return ok(s, { phases: s.workoutPhases });
      case "settings": {
        const { aiApiKey, ollamaUrl, aiProvider, aiModel, ...safe } = s.settings;
        return ok(s, { settings: safe });
      }
      default: return fail(s, "unknown section");
    }
  },

  add_food: (s, a) => {
    if (!a.name) return fail(s, "name required");
    const id = uid();
    const entry = {
      id, name: String(a.name), calories: n(a.calories), protein: n(a.protein), fiber: n(a.fiber),
      mealType: a.mealType as MealType | undefined,
      carbs: a.carbs, fat: a.fat, sugar: a.sugar, sodium: a.sodium,
    };
    const date = dateOf(a);
    return ok(withDay(s, date, (d) => ({ ...d, foods: [...d.foods, entry] })), { id, date });
  },
  delete_food: (s, a) => removeFromDays(s, "foods", a.id),

  add_water: (s, a) => {
    const ml = n(a.ml);
    if (ml <= 0 || ml > 5000) return fail(s, "ml must be 1-5000");
    const id = uid();
    const date = dateOf(a);
    return ok(withDay(s, date, (d) => ({ ...d, water: [...d.water, { id, ml }] })), { id, date });
  },
  delete_water: (s, a) => removeFromDays(s, "water", a.id),

  add_workout: (s, a) => {
    const durationMin = n(a.durationMin);
    if (!a.type || durationMin <= 0) return fail(s, "type and durationMin required");
    const caloriesBurned = a.caloriesBurned != null
      ? n(a.caloriesBurned)
      : Math.round(6 * (s.profile.weightKg || 70) * (durationMin / 60));
    const id = uid();
    const date = dateOf(a);
    const w = { id, type: String(a.type), durationMin, caloriesBurned, notes: a.notes };
    return ok(withDay(s, date, (d) => ({ ...d, workouts: [...d.workouts, w] })), { id, date, caloriesBurned });
  },
  delete_workout: (s, a) => removeFromDays(s, "workouts", a.id),

  log_weight: (s, a) => {
    const kg = n(a.kg);
    if (kg < 20 || kg > 400) return fail(s, "invalid kg");
    const date = dateOf(a);
    let next = withDay(s, date, (d) => ({ ...d, weightKg: kg }));
    const latest = next.days[next.days.length - 1]?.date ?? date;
    if (date >= latest) next = { ...next, profile: { ...next.profile, weightKg: kg } };
    return ok(next, { date, kg });
  },

  update_profile: (s, a) => {
    const allowed = ["name", "age", "sex", "heightCm", "goalWeightKg", "activity", "neckCm", "waistCm", "hipCm", "calorieTargetOverride"];
    const patch: Args = {};
    for (const k of allowed) if (a[k] !== undefined && a[k] !== null) patch[k] = a[k];
    if (a.clearCalorieOverride) patch.calorieTargetOverride = undefined;
    if (!Object.keys(patch).length) return fail(s, "nothing to update");
    return ok({ ...s, profile: { ...s.profile, ...patch } }, { updated: Object.keys(patch) });
  },

  log_sleep: (s, a) => {
    const date = dateOf(a);
    const log = {
      date, bedTime: a.bedTime, wakeTime: a.wakeTime, durationHours: a.durationHours,
      quality: n(a.quality, 3), notes: a.notes,
    };
    return ok({ ...s, sleepLogs: [log, ...s.sleepLogs.filter((x) => x.date !== date)] }, { date });
  },
  delete_sleep: (s, a) => {
    const date = dateOf(a);
    return ok({ ...s, sleepLogs: s.sleepLogs.filter((x) => x.date !== date) }, { date });
  },

  log_skin: (s, a) => {
    const date = dateOf(a);
    const b = (v: unknown) => v === true;
    const log = {
      date, faceWash: b(a.faceWash), moisturizer: b(a.moisturizer), sunscreen: b(a.sunscreen),
      hairOil: b(a.hairOil), scalpMassage: b(a.scalpMassage),
      oiliness: n(a.oiliness, 0), hairFall: n(a.hairFall, 0), pimples: n(a.pimples, 0),
      darkPatchChange: b(a.darkPatchChange), notes: a.notes,
    };
    return ok({ ...s, skinLogs: [log, ...s.skinLogs.filter((x) => x.date !== date)] }, { date });
  },
  delete_skin: (s, a) => {
    const date = dateOf(a);
    return ok({ ...s, skinLogs: s.skinLogs.filter((x) => x.date !== date) }, { date });
  },

  add_supplement: (s, a) => {
    if (!a.name) return fail(s, "name required");
    const sup = { id: uid(), name: String(a.name), unit: String(a.unit ?? "pcs"), stock: n(a.stock), defaultDose: n(a.defaultDose, 1) };
    return ok({ ...s, supplements: [...s.supplements, sup] }, { id: sup.id });
  },
  log_supplement_intake: (s, a) => {
    const sup = s.supplements.find((x) => x.id === a.supplementId || same(x.name, a.name));
    if (!sup) return fail(s, "supplement not found, use get_data supplements");
    const amount = n(a.amount, sup.defaultDose);
    const intake = { id: uid(), supplementId: sup.id, date: dateOf(a), amount };
    return ok({
      ...s,
      intakes: [intake, ...s.intakes],
      supplements: s.supplements.map((x) => (x.id === sup.id ? { ...x, stock: Math.max(0, x.stock - amount) } : x)),
    }, { id: intake.id, remainingStock: Math.max(0, sup.stock - amount) });
  },
  delete_supplement_intake: (s, a) => {
    const t = s.intakes.find((i) => i.id === a.id);
    if (!t) return fail(s, "id not found");
    return ok({
      ...s,
      intakes: s.intakes.filter((i) => i.id !== a.id),
      supplements: s.supplements.map((x) => (x.id === t.supplementId ? { ...x, stock: x.stock + t.amount } : x)),
    }, { deleted: a.id });
  },

  add_book: (s, a) => {
    if (!a.title) return fail(s, "title required");
    const b = { id: uid(), title: String(a.title), author: String(a.author ?? ""), totalPages: n(a.totalPages, 1), pagesRead: 0, completed: false };
    return ok({ ...s, books: [...s.books, b] }, { id: b.id });
  },
  log_reading: (s, a) => {
    const book = s.books.find((x) => x.id === a.bookId || same(x.title, a.title));
    if (!book) return fail(s, "book not found");
    const pages = n(a.pages);
    const session = { id: uid(), bookId: book.id, date: dateOf(a), pages, minutes: n(a.minutes), notes: a.notes };
    const pagesRead = Math.min(book.totalPages, book.pagesRead + pages);
    return ok({
      ...s,
      readingSessions: [session, ...s.readingSessions],
      books: s.books.map((x) => (x.id === book.id ? { ...x, pagesRead, completed: pagesRead >= x.totalPages } : x)),
    }, { pagesRead });
  },

  add_diet_item: (s, a) => {
    if (!a.phaseName || !a.food) return fail(s, "phaseName and food required");
    const item = { id: uid(), meal: String(a.meal ?? "meal"), food: String(a.food), calories: n(a.calories), protein: n(a.protein), fiber: n(a.fiber) };
    const exists = s.dietPhases.some((p) => same(p.name, a.phaseName));
    const dietPhases = exists
      ? s.dietPhases.map((p) => (same(p.name, a.phaseName) ? { ...p, items: [...p.items, item] } : p))
      : [...s.dietPhases, { id: uid(), name: String(a.phaseName), items: [item] }];
    return ok({ ...s, dietPhases }, { id: item.id });
  },
  remove_diet_item: (s, a) => {
    let found = false;
    const dietPhases = s.dietPhases.map((p) => {
      const items = p.items.filter((i) => i.id !== a.id);
      if (items.length !== p.items.length) found = true;
      return { ...p, items };
    });
    return found ? ok({ ...s, dietPhases }, { deleted: a.id }) : fail(s, "id not found");
  },

  add_plan_exercise: (s, a) => {
    if (!a.phaseName || !a.dayName || !a.name) return fail(s, "phaseName, dayName, name required");
    const ex = { id: uid(), name: String(a.name), sets: a.sets, reps: a.reps, durationMin: a.durationMin, notes: a.notes };
    let phases = [...s.workoutPhases];
    let pi = phases.findIndex((p) => same(p.name, a.phaseName));
    if (pi < 0) { phases.push({ id: uid(), name: String(a.phaseName), days: [] }); pi = phases.length - 1; }
    const phase = phases[pi];
    let days = [...phase.days];
    let di = days.findIndex((d) => same(d.name, a.dayName));
    if (di < 0) { days.push({ id: uid(), name: String(a.dayName), exercises: [] }); di = days.length - 1; }
    days[di] = { ...days[di], exercises: [...days[di].exercises, ex] };
    phases[pi] = { ...phase, days };
    return ok({ ...s, workoutPhases: phases }, { id: ex.id });
  },
  remove_plan_exercise: (s, a) => {
    let found = false;
    const workoutPhases = s.workoutPhases.map((p) => ({
      ...p,
      days: p.days.map((d) => {
        const exercises = d.exercises.filter((e) => e.id !== a.id);
        if (exercises.length !== d.exercises.length) found = true;
        return { ...d, exercises };
      }),
    }));
    return found ? ok({ ...s, workoutPhases }, { deleted: a.id }) : fail(s, "id not found");
  },
  update_plan_exercise: (s, a) => {
    let found = false;
    const workoutPhases = s.workoutPhases.map((p) => ({
      ...p,
      days: p.days.map((d) => ({
        ...d,
        exercises: d.exercises.map((e) => {
          if (e.id !== a.id) return e;
          found = true;
          return {
            ...e,
            name: a.name ?? e.name,
            sets: a.sets ?? e.sets,
            reps: a.reps ?? e.reps,
            durationMin: a.durationMin ?? e.durationMin,
            notes: a.notes ?? e.notes,
          };
        }),
      })),
    }));
    return found ? ok({ ...s, workoutPhases }, { updated: a.id }) : fail(s, "id not found");
  },
  remove_plan_day: (s, a) => {
    let found = false;
    const workoutPhases = s.workoutPhases.map((p) => {
      const days = p.days.filter((d) => d.id !== a.id);
      if (days.length !== p.days.length) found = true;
      return { ...p, days };
    });
    return found ? ok({ ...s, workoutPhases }, { deleted: a.id }) : fail(s, "id not found");
  },

  update_settings: (s, a) => {
    const patch: Args = {};
    if (["cyber", "dark", "light", "system"].includes(a.theme)) patch.theme = a.theme;
    if (["fat_loss", "muscle_gain", "maintenance"].includes(a.goalMode)) patch.goalMode = a.goalMode;
    if (!Object.keys(patch).length) return fail(s, "nothing valid to update");
    return ok({ ...s, settings: { ...s.settings, ...patch } }, { updated: Object.keys(patch) });
  },
};

export function runTool(s: AppState, name: string, args: Args): ToolResult {
  const impl = IMPL[name];
  if (!impl) return fail(s, `unknown tool ${name}`);
  try { return impl(s, args ?? {}); } catch (e) { return fail(s, String(e)); }
}

const str = (description: string) => ({ type: "STRING", description });
const num = (description: string) => ({ type: "NUMBER", description });
const bool = (description: string) => ({ type: "BOOLEAN", description });
const obj = (properties: Record<string, unknown>, required: string[] = []) => ({ type: "OBJECT", properties, required });
const DATE = str("YYYY-MM-DD. Omit for today.");

export const toolDeclarations = [
  { name: "get_data", description: "Read app data in detail. Use when the snapshot is not enough (older dates, plans, sleep, skin, supplements, books).",
    parameters: obj({ section: { type: "STRING", enum: ["profile", "days", "sleep", "skin", "supplements", "books", "diet_plan", "workout_plan", "settings"] }, from: str("YYYY-MM-DD, default 6 days ago"), to: str("YYYY-MM-DD, default today") }, ["section"]) },
  { name: "add_food", description: "Log a food entry. Estimate nutrition if the user did not give numbers.",
    parameters: obj({ name: str("food name"), calories: num("kcal"), protein: num("g"), fiber: num("g"), carbs: num("g"), fat: num("g"), sugar: num("g"), sodium: num("mg"), mealType: { type: "STRING", enum: ["breakfast", "lunch", "dinner", "snack"] }, date: DATE }, ["name", "calories", "protein"]) },
  { name: "delete_food", description: "Delete one food entry by id.", parameters: obj({ id: str("entry id") }, ["id"]) },
  { name: "add_water", description: "Log water intake.", parameters: obj({ ml: num("millilitres"), date: DATE }, ["ml"]) },
  { name: "delete_water", description: "Delete one water entry by id.", parameters: obj({ id: str("entry id") }, ["id"]) },
  { name: "add_workout", description: "Log a workout. Estimate caloriesBurned if unknown.",
    parameters: obj({ type: str("e.g. gym, running"), durationMin: num("minutes"), caloriesBurned: num("kcal"), notes: str("notes"), date: DATE }, ["type", "durationMin"]) },
  { name: "delete_workout", description: "Delete one workout entry by id.", parameters: obj({ id: str("entry id") }, ["id"]) },
  { name: "log_weight", description: "Record body weight.", parameters: obj({ kg: num("kg"), date: DATE }, ["kg"]) },
  { name: "update_profile", description: "Update profile fields (height, goal weight, age, activity, calorie override...).",
    parameters: obj({ name: str("name"), age: num("years"), sex: { type: "STRING", enum: ["male", "female"] }, heightCm: num("cm"), goalWeightKg: num("kg"), activity: { type: "STRING", enum: ["sedentary", "light", "moderate", "active", "very_active"] }, neckCm: num("cm"), waistCm: num("cm"), hipCm: num("cm"), calorieTargetOverride: num("kcal/day"), clearCalorieOverride: bool("return to auto calorie target") }) },
  { name: "log_sleep", description: "Create or replace the sleep log for a date.",
    parameters: obj({ date: DATE, bedTime: str("HH:mm"), wakeTime: str("HH:mm"), durationHours: num("hours"), quality: num("quality score as used by the app"), notes: str("notes") }) },
  { name: "delete_sleep", description: "Delete the sleep log of a date.", parameters: obj({ date: DATE }) },
  { name: "log_skin", description: "Create or replace the skin/hair check-in for a date.",
    parameters: obj({ date: DATE, faceWash: bool(""), moisturizer: bool(""), sunscreen: bool(""), hairOil: bool(""), scalpMassage: bool(""), oiliness: num("score"), hairFall: num("score"), pimples: num("count"), darkPatchChange: bool(""), notes: str("") }) },
  { name: "delete_skin", description: "Delete the skin check-in of a date.", parameters: obj({ date: DATE }) },
  { name: "add_supplement", description: "Add a supplement to the stock list.", parameters: obj({ name: str(""), unit: str("e.g. caps"), stock: num("units in stock"), defaultDose: num("units per dose") }, ["name"]) },
  { name: "log_supplement_intake", description: "Log taking a supplement (reduces stock).", parameters: obj({ name: str("supplement name"), supplementId: str("or id"), amount: num("units, default dose"), date: DATE }) },
  { name: "delete_supplement_intake", description: "Delete an intake by id (restores stock).", parameters: obj({ id: str("intake id") }, ["id"]) },
  { name: "add_book", description: "Add a book.", parameters: obj({ title: str(""), author: str(""), totalPages: num("") }, ["title"]) },
  { name: "log_reading", description: "Log a reading session.", parameters: obj({ title: str("book title"), bookId: str("or id"), pages: num(""), minutes: num(""), notes: str(""), date: DATE }, ["pages"]) },
  { name: "add_diet_item", description: "Add a food to a diet plan phase (phase is created if missing).", parameters: obj({ phaseName: str(""), meal: str("e.g. Breakfast"), food: str(""), calories: num(""), protein: num(""), fiber: num("") }, ["phaseName", "food"]) },
  { name: "remove_diet_item", description: "Remove a diet plan item by id.", parameters: obj({ id: str("") }, ["id"]) },
  { name: "add_plan_exercise", description: "Add an exercise to a workout plan day (phase and day are created if missing).", parameters: obj({ phaseName: str(""), dayName: str("e.g. Push Day"), name: str(""), sets: num(""), reps: num(""), durationMin: num(""), notes: str("") }, ["phaseName", "dayName", "name"]) },
  { name: "remove_plan_exercise", description: "Remove a workout plan exercise by id.", parameters: obj({ id: str("") }, ["id"]) },
  { name: "update_plan_exercise", description: "Update an existing exercise in a workout plan by id.", parameters: obj({ id: str("exercise id"), name: str("name"), sets: num("sets"), reps: num("reps"), durationMin: num("duration in minutes"), notes: str("notes") }, ["id"]) },
  { name: "remove_plan_day", description: "Remove a workout day from a workout plan phase by day id.", parameters: obj({ id: str("day id") }, ["id"]) },
  { name: "update_settings", description: "Change theme or goal mode only.", parameters: obj({ theme: { type: "STRING", enum: ["cyber", "dark", "light", "system"] }, goalMode: { type: "STRING", enum: ["fat_loss", "muscle_gain", "maintenance"] } }) },
];

export function buildContext(s: AppState): string {
  const p = s.profile;
  const t = todayStr();
  const sum = (d: DayLog | undefined) => ({
    kcal: d?.foods.reduce((a, f) => a + f.calories, 0) ?? 0,
    protein: Math.round(d?.foods.reduce((a, f) => a + f.protein, 0) ?? 0),
    waterMl: d?.water.reduce((a, w) => a + w.ml, 0) ?? 0,
    workoutMin: d?.workouts.reduce((a, w) => a + w.durationMin, 0) ?? 0,
    burned: d?.workouts.reduce((a, w) => a + w.caloriesBurned, 0) ?? 0,
  });
  const td = s.days.find((x) => x.date === t);
  const b = p.heightCm && p.weightKg ? bmi(p.weightKg, p.heightCm) : null;
  return JSON.stringify({
    today: t,
    profile: p,
    bmi: b ? { value: +b.toFixed(1), category: bmiCategory(b) } : null,
    targets: { kcal: Math.round(calorieTarget(p)), proteinG: Math.round(proteinTargetG(p)), waterMl: Math.round(waterTargetMl(p)) },
    goalMode: s.settings.goalMode,
    todayTotals: sum(td),
    todayEntries: {
      foods: td?.foods.map((f) => ({ id: f.id, name: f.name, kcal: f.calories, protein: f.protein })) ?? [],
      water: td?.water ?? [],
      workouts: td?.workouts.map((w) => ({ id: w.id, type: w.type, min: w.durationMin, kcal: w.caloriesBurned })) ?? [],
    },
    last7days: s.days.slice(-7).map((d) => ({ date: d.date, ...sum(d), weightKg: d.weightKg })),
    counts: { sleepLogs: s.sleepLogs.length, skinLogs: s.skinLogs.length, supplements: s.supplements.length, books: s.books.length, dietPhases: s.dietPhases.map((x) => x.name), workoutPhases: s.workoutPhases.map((x) => x.name) },
  });
}

export const SYSTEM_PROMPT = `You are NovaSelf Coach, a friendly, concise fitness coach inside the user's tracking app. You can read and edit the app's data using tools.
Rules:
- To change data you MUST call a tool. Never say you logged, changed or deleted something unless the tool returned ok:true.
- Use the APP DATA snapshot first. Call get_data only for older or detailed data.
- For deletes, use the exact id from the snapshot or get_data. If more than one item would be deleted, ask the user to confirm in text first. Never delete everything.
- If the user sends a food photo or nutrition label, estimate the nutrition, log it with add_food, and say it is an estimate.
- Ask a question only when a required value is truly missing. Otherwise act, then summarize in 1-3 short lines.
- Do medical diagnosis? No. Give general fitness guidance and suggest a doctor for medical issues.
- Use today's date from the snapshot when the user says today, yesterday, etc.`;
