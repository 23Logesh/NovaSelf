// ============================================================================
// Daily timeline builder
// ============================================================================
//
// Merges all tracked categories for a given ISO date into a flat list of
// display-ready entries for the "Today's Timeline" feed on the Dashboard.
//
// ORDERING NOTE: Entries are sorted by category in a fixed logical order
// (workouts → food → water → supplements → skin → reading) because individual
// entry types don't store a time-of-day timestamp — only a date. Within each
// category the original insertion order is preserved.
//
// If a `loggedAt: number` (unix ms) field is ever added to the entry types and
// stamped at creation time, replace the category-order sort below with a simple
// numeric sort on `loggedAt` and make category order the tie-breaker. The rest
// of this function is unchanged.
// ============================================================================

import type { AppState } from "./store";

export type TimelineCategory =
  | "workout"
  | "food"
  | "water"
  | "supplement"
  | "skin"
  | "reading";

export interface TimelineEntry {
  /** Stable key for React reconciliation. */
  id: string;
  category: TimelineCategory;
  /** Primary one-line description shown in the feed. */
  label: string;
  /** Optional secondary detail (notes, fiber, duration, etc.). */
  detail?: string;
}

// The fixed display order when true timestamps aren't available.
const CATEGORY_ORDER: TimelineCategory[] = [
  "workout",
  "food",
  "water",
  "supplement",
  "skin",
  "reading",
];

/**
 * Build a flat list of timeline entries for a given ISO date (yyyy-mm-dd),
 * merging workouts, food, water, supplements, skin log, and reading sessions.
 *
 * Accepts only the AppState slices it needs so callers can pass any compatible
 * object — useful for testing or future per-date detail views.
 */
export function buildDailyTimeline(
  date: string,
    state: Pick<
    AppState,
    | "days"
    | "skinLogs"
    | "intakes"
    | "supplements"
    | "readingSessions"
    | "books"
    >,
): TimelineEntry[] {
  const entries: TimelineEntry[] = [];

  const day = state.days.find((d) => d.date === date);

  // ── Workouts ──────────────────────────────────────────────────────────────
  for (const w of day?.workouts ?? []) {
    const typeName = w.type
      .replace(/_/g, " ")
      .replace(/\b\w/g, (c) => c.toUpperCase());
    entries.push({
      id: `workout-${w.id}`,
      category: "workout",
      label: `${typeName} — ${w.durationMin} min, ~${Math.round(w.caloriesBurned)} kcal burned`,
      detail: w.notes || undefined,
    });
  }

  // ── Food ──────────────────────────────────────────────────────────────────
  for (const f of day?.foods ?? []) {
    const parts = [`${f.calories} kcal`, `${f.protein}g protein`];
    if (f.fiber > 0) parts.push(`${f.fiber}g fiber`);
    entries.push({
      id: `food-${f.id}`,
      category: "food",
      label: f.name,
      detail: parts.join(" · "),
    });
  }

  // ── Water ─────────────────────────────────────────────────────────────────
  for (const w of day?.water ?? []) {
    entries.push({
      id: `water-${w.id}`,
      category: "water",
      label: `Drank ${w.ml} ml water`,
    });
  }

  // ── Supplements ───────────────────────────────────────────────────────────
  const todayIntakes = state.intakes.filter((i) => i.date === date);
  for (const intake of todayIntakes) {
    const sup = state.supplements.find((s) => s.id === intake.supplementId);
    if (!sup) continue;
    entries.push({
      id: `supplement-${intake.id}`,
      category: "supplement",
      label: `Took ${intake.amount}${sup.unit} ${sup.name}`,
    });
  }

  // ── Skin & Hair ───────────────────────────────────────────────────────────
  const skinLog = state.skinLogs.find((s) => s.date === date);
  if (skinLog) {
    const done: string[] = [];
    if (skinLog.faceWash) done.push("face wash");
    if (skinLog.moisturizer) done.push("moisturizer");
    if (skinLog.sunscreen) done.push("sunscreen");
    if (skinLog.hairOil) done.push("hair oil");
    if (skinLog.scalpMassage) done.push("scalp massage");

    entries.push({
      id: `skin-${date}`,
      category: "skin",
      label:
        done.length > 0
          ? `Skin & hair — ${done.join(", ")}`
          : "Skin & hair check-in",
      detail: skinLog.notes || undefined,
    });
  }

  // ── Reading ───────────────────────────────────────────────────────────────
  const todaySessions = state.readingSessions.filter((s) => s.date === date);
  for (const session of todaySessions) {
    const book = state.books.find((b) => b.id === session.bookId);
    const bookTitle = book?.title ?? "Unknown book";
    entries.push({
      id: `reading-${session.id}`,
      category: "reading",
      label: `Read ${session.pages} page${session.pages === 1 ? "" : "s"} of ${bookTitle}`,
      detail: session.minutes > 0 ? `${session.minutes} min` : undefined,
    });
  }

  // Sort by canonical category order. Within each category, original insertion
  // order is preserved (Array.sort is stable in all modern JS engines).
  const orderOf = (cat: TimelineCategory) => CATEGORY_ORDER.indexOf(cat);
  entries.sort((a, b) => orderOf(a.category) - orderOf(b.category));

  return entries;
}