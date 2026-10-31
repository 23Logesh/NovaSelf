import * as XLSX from "xlsx";
import { Capacitor } from "@capacitor/core";
import { Directory, Filesystem } from "@capacitor/filesystem";
import { Share } from "@capacitor/share";
import type { AppState } from "./store";
import { OPTIONAL_NUTRIENTS } from "./types";
import {
  bmi, bmiCategory, bmr, tdee, calorieTarget, calculatedCalorieTarget,
  proteinTargetG, fiberTargetG, waterTargetMl, omega3TargetG,
  bodyFatPctUSNavy, fatMass, idealWeightDevine, leanBodyMassBoer,
  goalProgressPct, workoutLabel, isoDate,
} from "./calculations";

type Cell = string | number | boolean | null | undefined;

const yn = (b: boolean) => (b ? "Yes" : "No");
const r1 = (n: number) => Math.round(n * 10) / 10;

function sheet(headers: string[], rows: Cell[][]): XLSX.WorkSheet {
  const ws = XLSX.utils.aoa_to_sheet([headers, ...rows.map((r) => r.map((c) => c ?? ""))]);
  ws["!cols"] = headers.map((h, i) => ({
    wch: Math.min(
      42,
      Math.max(h.length, ...rows.map((r) => String(r[i] ?? "").length), 8) + 2,
    ),
  }));
  return ws;
}

export function buildWorkbook(s: AppState): XLSX.WorkBook {
  const wb = XLSX.utils.book_new();
  const add = (name: string, ws: XLSX.WorkSheet) => XLSX.utils.book_append_sheet(wb, ws, name);
  const p = s.profile;
  const byDate = <T extends { date: string }>(a: T[]) => [...a].sort((x, y) => x.date.localeCompare(y.date));
  const days = byDate(s.days);
  const supName = (id: string) => s.supplements.find((x) => x.id === id);
  const bookTitle = (id: string) => s.books.find((x) => x.id === id)?.title ?? "Unknown book";

  // ── Profile + computed body numbers ───────────────────────────────────────
  const bf = bodyFatPctUSNavy(p);
  const fm = fatMass(p);
  add("Profile", sheet(["Field", "Value"], [
    ["Name", p.name],
    ["Age", p.age],
    ["Sex", p.sex],
    ["Height (cm)", p.heightCm],
    ["Weight (kg)", p.weightKg],
    ["Goal weight (kg)", p.goalWeightKg],
    ["Starting weight (kg)", p.startingWeightKg],
    ["Activity level", p.activity],
    ["Neck (cm)", p.neckCm],
    ["Waist (cm)", p.waistCm],
    ["Hip (cm)", p.hipCm],
    ["Calorie target override (kcal)", p.calorieTargetOverride],
    ["— Calculated —", ""],
    ["BMI", r1(bmi(p.weightKg, p.heightCm))],
    ["BMI category", bmiCategory(bmi(p.weightKg, p.heightCm))],
    ["BMR (kcal/day)", Math.round(bmr(p))],
    ["TDEE (kcal/day)", Math.round(tdee(p))],
    ["Calorie target used (kcal)", Math.round(calorieTarget(p))],
    ["Calorie target auto (TDEE - 500, min 1200)", Math.round(calculatedCalorieTarget(p))],
    ["Protein target (g)", Math.round(proteinTargetG(p))],
    ["Fiber target (g)", Math.round(fiberTargetG(p))],
    ["Water target (ml)", Math.round(waterTargetMl(p))],
    ["Omega-3 target (g)", omega3TargetG()],
    ["Ideal weight - Devine (kg)", r1(idealWeightDevine(p))],
    ["Lean body mass - Boer (kg)", r1(leanBodyMassBoer(p))],
    ["Body fat % - US Navy", bf === null ? "" : r1(bf)],
    ["Fat mass (kg)", fm === null ? "" : r1(fm)],
    ["Goal progress (%)", r1(goalProgressPct(p))],
  ]));

  // ── Daily summary ─────────────────────────────────────────────────────────
  add("Daily Summary", sheet(
    ["Date", "Weight (kg)", "Foods", "Calories", "Protein (g)", "Fiber (g)", "Water (ml)", "Workouts", "Burned (kcal)"],
    days.map((d) => [
      d.date, d.weightKg,
      d.foods.length,
      d.foods.reduce((a, f) => a + f.calories, 0),
      d.foods.reduce((a, f) => a + f.protein, 0),
      d.foods.reduce((a, f) => a + f.fiber, 0),
      d.water.reduce((a, w) => a + w.ml, 0),
      d.workouts.length,
      Math.round(d.workouts.reduce((a, w) => a + w.caloriesBurned, 0)),
    ]),
  ));

  // ── Food log (all built-in + custom nutrients, whether enabled or not) ────
  const custom = s.settings.customNutrients;
  add("Food Log", sheet(
    [
      "Date", "Food", "Calories", "Protein (g)", "Fiber (g)",
      ...OPTIONAL_NUTRIENTS.map((n) => `${n.label} (${n.unit})`),
      ...custom.map((n) => `${n.name} (${n.unit})`),
    ],
    days.flatMap((d) =>
      d.foods.map((f) => [
        d.date, f.name, f.calories, f.protein, f.fiber,
        ...OPTIONAL_NUTRIENTS.map((n) => (f as unknown as Record<string, number | undefined>)[n.key]),
        ...custom.map((n) => f.customFields?.[n.id]),
      ]),
    ),
  ));

  add("Water Log", sheet(["Date", "Amount (ml)"],
    days.flatMap((d) => d.water.map((w) => [d.date, w.ml]))));

  add("Workout Log", sheet(
    ["Date", "Type", "Duration (min)", "Calories burned", "Custom MET", "Notes"],
    days.flatMap((d) => d.workouts.map((w) => [
      d.date, workoutLabel(w.type), w.durationMin, Math.round(w.caloriesBurned), w.customMet, w.notes,
    ])),
  ));

  add("Weight Log", sheet(["Date", "Weight (kg)"],
    days.filter((d) => typeof d.weightKg === "number").map((d) => [d.date, d.weightKg])));

  // ── Plans ─────────────────────────────────────────────────────────────────
  add("Diet Plan", sheet(
    ["Phase", "Meal", "Food", "Calories", "Protein (g)", "Fiber (g)"],
    s.dietPhases.flatMap((ph) => ph.items.map((i) => [ph.name, i.meal, i.food, i.calories, i.protein, i.fiber])),
  ));

  add("Mess Menu", sheet(["Day", "Meal", "Item"], s.mess.map((m) => [m.day, m.meal, m.item])));

  add("Workout Plan", sheet(
    ["Phase", "Day", "Exercise", "Sets", "Reps", "Duration (min)", "Notes"],
    s.workoutPhases.flatMap((ph) =>
      ph.days.flatMap((d) => d.exercises.map((e) => [ph.name, d.name, e.name, e.sets, e.reps, e.durationMin, e.notes]))),
  ));

  // ── Daily check-ins ───────────────────────────────────────────────────────
  add("Skin & Hair", sheet(
    ["Date", "Face wash", "Moisturizer", "Sunscreen", "Hair oil", "Scalp massage",
     "Oiliness (1-5)", "Hair fall (1-5)", "New pimples", "Dark patch change", "Notes"],
    byDate(s.skinLogs).map((k) => [
      k.date, yn(k.faceWash), yn(k.moisturizer), yn(k.sunscreen), yn(k.hairOil), yn(k.scalpMassage),
      k.oiliness, k.hairFall, k.pimples, yn(k.darkPatchChange), k.notes,
    ]),
  ));

  add("Sleep", sheet(
    ["Date (woke up)", "Bed time", "Wake time", "Duration (h)", "Quality (1-5)", "Notes"],
    byDate(s.sleepLogs).map((k) => [k.date, k.bedTime, k.wakeTime, k.durationHours, k.quality, k.notes]),
  ));

  // ── Supplements ───────────────────────────────────────────────────────────
  add("Supplements", sheet(["Name", "Unit", "Stock", "Default dose"],
    s.supplements.map((x) => [x.name, x.unit, x.stock, x.defaultDose])));

  add("Supplement Intake", sheet(
    ["Date", "Supplement", "Amount", "Unit"],
    byDate(s.intakes).map((i) => [i.date, supName(i.supplementId)?.name ?? "Deleted supplement", i.amount, supName(i.supplementId)?.unit]),
  ));

  // ── Books ─────────────────────────────────────────────────────────────────
  add("Books", sheet(
    ["Title", "Author", "Total pages", "Pages read", "Progress (%)", "Completed"],
    s.books.map((b) => [
      b.title, b.author, b.totalPages, b.pagesRead,
      b.totalPages ? r1((b.pagesRead / b.totalPages) * 100) : 0, yn(b.completed),
    ]),
  ));

  add("Reading Sessions", sheet(
    ["Date", "Book", "Pages", "Minutes", "Notes"],
    byDate(s.readingSessions).map((x) => [x.date, bookTitle(x.bookId), x.pages, x.minutes, x.notes]),
  ));

  // ── Settings + chat ───────────────────────────────────────────────────────
  add("Settings", sheet(["Setting", "Value"], [
    ["Theme", s.settings.theme],
    ["Ollama URL", s.settings.ollamaUrl],
    ...OPTIONAL_NUTRIENTS.map((n) => [`Track ${n.label}`, yn(!!s.settings.enabledNutrients[n.key])] as Cell[]),
    ...custom.map((n) => [`Custom nutrient: ${n.name} (${n.unit})`, yn(s.settings.enabledCustomNutrients[n.id] ?? true)] as Cell[]),
  ]));

  add("Chat", sheet(["Time", "Role", "Message"],
    s.chat.map((m) => [new Date(m.ts).toLocaleString(), m.role, m.content])));

  return wb;
}

/** Builds the .xlsx and hands it to the user: Android share sheet (Save to
 *  Drive / Files / WhatsApp…) on the phone, a normal download in a browser. */
export async function exportToExcel(state: AppState): Promise<string> {
  const wb = buildWorkbook(state);
  const fileName = `NovaSelf-export-${isoDate()}.xlsx`;

  if (Capacitor.isNativePlatform()) {
    const base64 = XLSX.write(wb, { bookType: "xlsx", type: "base64" });
    const { uri } = await Filesystem.writeFile({ path: fileName, data: base64, directory: Directory.Cache });
    await Share.share({ title: "NovaSelf export", dialogTitle: "Save or share your NovaSelf export", url: uri });
  } else {
    XLSX.writeFile(wb, fileName);
  }
  return fileName;
}

/** UI-safe wrapper: ignores the user dismissing the share sheet, alerts on real errors. */
export async function runExport(state: AppState): Promise<boolean> {
  try {
    await exportToExcel(state);
    return true;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (/cancel/i.test(msg)) return false;
    alert(`Export failed: ${msg}`);
    return false;
  }
}