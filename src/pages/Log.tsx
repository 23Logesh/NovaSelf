import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Droplets, Dumbbell, Salad, Plus, X, Scale, Pill, Sparkles, BookOpen, Moon, Copy } from "lucide-react";
import { toast } from "sonner";
import { NCard } from "@/components/novaself/NCard";
import { SectionHeader } from "@/components/novaself/SectionHeader";
import { SupplementIntakePanel } from "@/components/novaself/SupplementIntakePanel";
import { SkinCheckIn } from "@/components/novaself/SkinCheckIn";
import { SleepCheckIn } from "@/components/novaself/SleepCheckIn";
import { ReadingSessionForm } from "@/components/novaself/ReadingSessionForm";
import { MiniTrendChart } from "@/components/novaself/MiniTrendChart";
import { CompareDays } from "@/components/novaself/CompareDays";
import { useApp, today } from "@/lib/novaself/store";
import { caloriesBurned, WORKOUT_METS, workoutLabel, calorieTarget, waterTargetMl, isoDate } from "@/lib/novaself/calculations";
import { OPTIONAL_NUTRIENTS, COMMON_FOOD_PRESETS, type MealType } from "@/lib/novaself/types";
import type { FoodEntry, WorkoutEntry, DayLog } from "@/lib/novaself/types";
import {
  getFoodTrend, getWaterTrend, getWorkoutTrend, getWeightTrend,
  getSupplementTrend, getSkinTrend, getSleepTrend, getReadingTrend,
} from "@/lib/novaself/chartHelpers";

const uid = () => Math.random().toString(36).slice(2, 10);

type Tab = "food" | "water" | "workout" | "weight" | "supplements" | "skin" | "sleep" | "books";

const TABS: [Tab, string, React.ComponentType<{ className?: string }>][] = [
  ["food", "Food", Salad],
  ["water", "Water", Droplets],
  ["workout", "Workout", Dumbbell],
  ["weight", "Weight", Scale],
  ["supplements", "Supps", Pill],
  ["skin", "Skin", Sparkles],
  ["sleep", "Sleep", Moon],
  ["books", "Books", BookOpen],
];

export default function LogPage() {
  const [params, setParams] = useSearchParams();
  const date = params.get("date") || today();
  const { getDay, upsertDay, logWeight, settings, profile } = useApp();
  const day = getDay(date);

  const urlTab = (params.get("tab") as Tab) || "food";
  const [tab, setTab] = useState<Tab>(urlTab);

  useEffect(() => {
    const paramTab = params.get("tab") as Tab;
    if (paramTab && TABS.some(([t]) => t === paramTab)) {
      setTab(paramTab);
    }
  }, [params]);

  function update(patch: Partial<DayLog>) {
    upsertDay({ ...day, ...patch });
  }

  const appState = useApp();

  return (
    <div className="space-y-6">
      <SectionHeader
        eyebrow="Daily log"
        title={date === today() ? "Today" : "Editing past day"}
        description="Editing any past date overwrites that date's entry — no duplicates."
        action={
          <input
            type="date"
            value={date}
            onChange={(e) => setParams({ date: e.target.value })}
            className="rounded-xl border border-border bg-[var(--surface)] px-3 py-2 text-sm"
          />
        }
      />

      {/* Historical Day Comparison Analytics Matrix */}
      <CompareDays />

      {/* Tab bar — scrollable on mobile so all 8 fit */}
      <div className="overflow-x-auto">
        <div className="flex min-w-max gap-1.5 rounded-full border border-border bg-[var(--surface)] p-1">
          {TABS.map(([k, label, Icon]) => (
            <button
              key={k}
              onClick={() => setTab(k)}
              className={`flex items-center justify-center gap-1.5 rounded-full px-3 py-2 text-sm transition whitespace-nowrap ${
                tab === k
                  ? "bg-[var(--electric)] text-[var(--primary-foreground)] shadow-[0_0_18px_var(--electric)]"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className="h-4 w-4" />
              {label}
            </button>
          ))}
        </div>
      </div>

      {tab === "food" && (
        <div className="space-y-4">
          <MiniTrendChart
            title="Calorie History"
            subtitle="Daily caloric intake trend"
            data7={getFoodTrend(appState, 7)}
            data30={getFoodTrend(appState, 30)}
            data90={getFoodTrend(appState, 90)}
            data365={getFoodTrend(appState, 365)}
            goal={calorieTarget(profile)}
            unit="kcal"
            color="var(--electric)"
          />
          <FoodTab
            day={day}
            update={update}
            enabledNutrients={settings.enabledNutrients}
            customNutrients={settings.customNutrients}
            enabledCustomNutrients={settings.enabledCustomNutrients}
          />
        </div>
      )}
      {tab === "water" && (
        <div className="space-y-4">
          <MiniTrendChart
            title="Hydration History"
            subtitle="Daily water intake trend"
            data7={getWaterTrend(appState, 7)}
            data30={getWaterTrend(appState, 30)}
            data90={getWaterTrend(appState, 90)}
            data365={getWaterTrend(appState, 365)}
            goal={waterTargetMl(profile)}
            unit="ml"
            color="var(--electric)"
          />
          <WaterTab day={day} update={update} />
        </div>
      )}
      {tab === "workout" && (
        <div className="space-y-4">
          <MiniTrendChart
            title="Workout Burn History"
            subtitle="Calories burned during exercises"
            data7={getWorkoutTrend(appState, 7)}
            data30={getWorkoutTrend(appState, 30)}
            data90={getWorkoutTrend(appState, 90)}
            data365={getWorkoutTrend(appState, 365)}
            unit="kcal"
            color="var(--neon)"
          />
          <WorkoutTab day={day} update={update} weightKg={profile.weightKg} />
        </div>
      )}
      {tab === "weight" && (
        <div className="space-y-4">
          <MiniTrendChart
            title="Weight Log History"
            subtitle="Recorded body weight trend"
            data7={getWeightTrend(appState, 7)}
            data30={getWeightTrend(appState, 30)}
            data90={getWeightTrend(appState, 90)}
            data365={getWeightTrend(appState, 365)}
            goal={profile.goalWeightKg}
            unit="kg"
            color="var(--electric)"
          />
          <WeightTab
            date={date}
            currentWeightKg={day.weightKg ?? profile.weightKg}
            onSave={(kg) => logWeight(date, kg)}
          />
        </div>
      )}
      {tab === "supplements" && (
        <div className="space-y-4">
          <MiniTrendChart
            title="Supplement Intakes"
            subtitle="Total doses taken per day"
            data7={getSupplementTrend(appState, 7)}
            data30={getSupplementTrend(appState, 30)}
            data90={getSupplementTrend(appState, 90)}
            data365={getSupplementTrend(appState, 365)}
            unit="doses"
            color="var(--electric)"
          />
          <NCard>
            <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted-foreground">Today's supplements</h3>
            <SupplementIntakePanel />
          </NCard>
        </div>
      )}
      {tab === "skin" && (
        <div className="space-y-4">
          <MiniTrendChart
            title="Skin & Hair Care Score"
            subtitle="Completed checklist items per day (0–5)"
            data7={getSkinTrend(appState, 7)}
            data30={getSkinTrend(appState, 30)}
            data90={getSkinTrend(appState, 90)}
            data365={getSkinTrend(appState, 365)}
            goal={5}
            unit="tasks"
            color="var(--neon)"
          />
          <SkinCheckIn />
        </div>
      )}
      {tab === "sleep" && (
        <div className="space-y-4">
          <MiniTrendChart
            title="Sleep Duration"
            subtitle="Hours slept per night"
            data7={getSleepTrend(appState, 7)}
            data30={getSleepTrend(appState, 30)}
            data90={getSleepTrend(appState, 90)}
            data365={getSleepTrend(appState, 365)}
            goal={8}
            unit="hrs"
            color="var(--electric)"
          />
          <SleepCheckIn />
        </div>
      )}
      {tab === "books" && (
        <div className="space-y-4">
          <MiniTrendChart
            title="Reading Volume"
            subtitle="Pages read per day"
            data7={getReadingTrend(appState, 7)}
            data30={getReadingTrend(appState, 30)}
            data90={getReadingTrend(appState, 90)}
            data365={getReadingTrend(appState, 365)}
            unit="pages"
            color="var(--electric)"
          />
          <ReadingSessionForm />
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// FoodTab — updated to render custom nutrients alongside built-ins
// ---------------------------------------------------------------------------
function defaultMealType(): MealType {
  const h = new Date().getHours();
  if (h < 11) return "breakfast";
  if (h < 16) return "lunch";
  if (h < 20) return "dinner";
  return "snack";
}

function FoodTab({
  day,
  update,
  enabledNutrients,
  customNutrients,
  enabledCustomNutrients,
}: {
  day: DayLog;
  update: (p: Partial<DayLog>) => void;
  enabledNutrients: Record<string, boolean>;
  customNutrients: import("@/lib/novaself/types").CustomNutrient[];
  enabledCustomNutrients: Record<string, boolean>;
}) {
  const { getDay } = useApp();
  const enabledBuiltin = OPTIONAL_NUTRIENTS.filter((n) => enabledNutrients[n.key]);
  const enabledCustom = customNutrients.filter((n) => enabledCustomNutrients[n.id] ?? true);
  const hasOptional = enabledBuiltin.length > 0 || enabledCustom.length > 0;

  const blank: FoodEntry = { id: uid(), name: "", calories: 0, protein: 0, fiber: 0, mealType: defaultMealType() };
  const [draft, setDraft] = useState<FoodEntry>(blank);

  function add() {
    if (!draft.name.trim()) return;
    update({ foods: [...day.foods, { ...draft, id: uid() }] });
    setDraft({ ...blank, id: uid() });
  }

  function removeFood(f: FoodEntry) {
    const nextFoods = day.foods.filter((x) => x.id !== f.id);
    update({ foods: nextFoods });
    toast("Food item removed", {
      action: {
        label: "Undo",
        onClick: () => update({ foods: [...nextFoods, f] }),
      },
    });
  }

  function copyYesterdaysMeals() {
    const yesterdayDate = isoDate(new Date(Date.now() - 86400000));
    const yesterdayDay = getDay(yesterdayDate);
    if (!yesterdayDay || yesterdayDay.foods.length === 0) {
      toast.error("No meals found in yesterday's log.");
      return;
    }
    const copiedFoods = yesterdayDay.foods.map((f) => ({ ...f, id: uid() }));
    update({ foods: [...day.foods, ...copiedFoods] });
    toast.success(`Copied ${copiedFoods.length} meal(s) from yesterday!`);
  }

  function setCustomField(id: string, value: number) {
    setDraft((d) => ({
      ...d,
      customFields: { ...(d.customFields ?? {}), [id]: value },
    }));
  }

  function selectPreset(preset: typeof COMMON_FOOD_PRESETS[0]) {
    setDraft((d) => ({
      ...d,
      name: preset.name,
      calories: preset.calories,
      protein: preset.protein,
      fiber: preset.fiber,
      carbs: preset.carbs,
      fat: preset.fat,
    }));
  }

  const mealTypes: MealType[] = ["breakfast", "lunch", "dinner", "snack"];

  return (
    <div className="space-y-4">
      {/* ── Quick Preset Chips & Copy Yesterday ── */}
      <NCard>
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Common Food Presets</h3>
          <button
            onClick={copyYesterdaysMeals}
            className="flex items-center gap-1 text-[11px] font-semibold text-[var(--electric)] hover:underline"
          >
            <Copy className="h-3 w-3" /> Copy Yesterday's Meals
          </button>
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1 text-xs">
          {COMMON_FOOD_PRESETS.map((p) => (
            <button
              key={p.name}
              onClick={() => selectPreset(p)}
              className="shrink-0 rounded-xl border border-border bg-[var(--surface-elevated)] px-3 py-2 text-left transition hover:border-[var(--electric)] hover:bg-[var(--electric)]/10"
            >
              <div className="font-semibold text-foreground">{p.name}</div>
              <div className="text-[10px] text-muted-foreground">{p.calories} kcal · {p.protein}p</div>
            </button>
          ))}
        </div>
      </NCard>

      <NCard>
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">Add food</h3>
        <div className="space-y-3">
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-4">
            <input
              placeholder="Food name (e.g. Oats + banana)"
              value={draft.name}
              onChange={(e) => setDraft({ ...draft, name: e.target.value })}
              className={inputCls + " sm:col-span-3"}
            />
            <select
              value={draft.mealType || "snack"}
              onChange={(e) => setDraft({ ...draft, mealType: e.target.value as MealType })}
              className={inputCls + " capitalize"}
            >
              {mealTypes.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <NumInput label="Calories" value={draft.calories} onChange={(v) => setDraft({ ...draft, calories: v })} />
            <NumInput label="Protein (g)" value={draft.protein} onChange={(v) => setDraft({ ...draft, protein: v })} />
            <NumInput label="Fiber (g)" value={draft.fiber} onChange={(v) => setDraft({ ...draft, fiber: v })} />
          </div>

          {hasOptional && (
            <details className="rounded-xl border border-border bg-[var(--surface-elevated)] p-3">
              <summary className="cursor-pointer text-sm text-muted-foreground font-medium">
                Optional nutrients ({enabledBuiltin.length + enabledCustom.length})
              </summary>
              <div className="mt-3 grid grid-cols-2 gap-2 md:grid-cols-3">
                {enabledBuiltin.map((n) => (
                  <NumInput
                    key={n.key}
                    label={`${n.label} (${n.unit})`}
                    value={(draft as unknown as Record<string, number>)[n.key] ?? 0}
                    onChange={(v) => setDraft({ ...draft, [n.key]: v })}
                  />
                ))}
                {enabledCustom.map((n) => (
                  <NumInput
                    key={n.id}
                    label={`${n.name} (${n.unit})`}
                    value={draft.customFields?.[n.id] ?? 0}
                    onChange={(v) => setCustomField(n.id, v)}
                  />
                ))}
              </div>
            </details>
          )}

          <button
            onClick={add}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--electric)] py-3 font-semibold text-[var(--primary-foreground)] shadow-[0_0_18px_var(--electric)] transition hover:scale-[1.01]"
          >
            <Plus className="h-4 w-4" /> Add food
          </button>
        </div>

        <div className="mt-6">
          <h4 className="mb-3 text-xs uppercase tracking-wider text-muted-foreground font-semibold">Today's Meals</h4>
          {day.foods.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">Nothing logged yet — tap a preset or add your first meal.</p>
          ) : (
            <div className="space-y-4">
              {mealTypes.map((mType) => {
                const group = day.foods.filter((f) => (f.mealType || "snack") === mType);
                if (group.length === 0) return null;
                const mCals = group.reduce((sum, f) => sum + f.calories, 0);
                const mProt = group.reduce((sum, f) => sum + f.protein, 0);

                return (
                  <div key={mType} className="rounded-xl border border-border/80 bg-[var(--surface-elevated)] p-3 space-y-2">
                    <div className="flex items-center justify-between border-b border-border/50 pb-2">
                      <span className="text-xs font-bold uppercase tracking-wider text-[var(--electric)]">{mType}</span>
                      <span className="text-xs font-medium text-muted-foreground tabular-nums">{mCals} kcal · {mProt}g protein</span>
                    </div>
                    <ul className="space-y-1.5">
                      {group.map((f) => (
                        <li key={f.id} className="flex items-center justify-between gap-3 text-sm pt-1">
                          <div className="min-w-0">
                            <span className="font-medium text-foreground">{f.name}</span>
                            <div className="text-xs text-muted-foreground tabular-nums">
                              {f.calories} kcal · {f.protein}p {f.fiber > 0 ? `· ${f.fiber}f` : ""}
                            </div>
                          </div>
                          <button
                            onClick={() => removeFood(f)}
                            className="shrink-0 text-muted-foreground hover:text-destructive"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </NCard>
    </div>
  );
}

// ---------------------------------------------------------------------------
// WaterTab, WorkoutTab, WeightTab — unchanged from original
// ---------------------------------------------------------------------------
function WaterTab({ day, update }: { day: DayLog; update: (p: Partial<DayLog>) => void }) {
  const { profile } = useApp();
  const target = Math.round(35 * profile.weightKg);
  const total = day.water.reduce((a, w) => a + w.ml, 0);
  const pct = Math.min(100, Math.round((total / target) * 100));

  function quick(ml: number) {
    update({ water: [...day.water, { id: uid(), ml }] });
    toast.success(`+${ml}ml water logged!`);
  }
  const [manual, setManual] = useState(250);

  const presets = [
    { label: "+150ml Glass", ml: 150 },
    { label: "+250ml Cup", ml: 250 },
    { label: "+500ml Bottle", ml: 500 },
    { label: "+750ml Shaker", ml: 750 },
    { label: "+1000ml Jug", ml: 1000 },
  ];

  return (
    <NCard>
      <div className="mb-4 flex items-end justify-between">
        <div>
          <div className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Hydration Today</div>
          <div className="font-display text-4xl font-bold tabular-nums">
            {total} <span className="text-base text-muted-foreground font-normal">/ {target} ml ({pct}%)</span>
          </div>
        </div>
        <Droplets className="h-10 w-10 text-[var(--electric)]" />
      </div>

      {/* Visual Water Fill Bar */}
      <div className="mb-4 h-3.5 w-full overflow-hidden rounded-full bg-[var(--surface-elevated)] border border-border/80">
        <div
          className="h-full bg-gradient-to-r from-[var(--electric)] to-cyan-400 transition-all duration-500 rounded-full"
          style={{ width: `${pct}%` }}
        />
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
        {presets.map((p) => (
          <button
            key={p.ml}
            onClick={() => quick(p.ml)}
            className="rounded-xl border border-border bg-[var(--surface-elevated)] py-2.5 px-2 text-xs font-semibold transition hover:border-[var(--electric)] hover:text-[var(--electric)] hover:bg-[var(--electric)]/10"
          >
            {p.label}
          </button>
        ))}
      </div>

      <div className="mt-3 flex gap-2">
        <input
          type="number"
          value={manual}
          onChange={(e) => setManual(+e.target.value)}
          placeholder="Custom ml"
          className={inputCls + " flex-1"}
        />
        <button onClick={() => quick(manual)} className="rounded-xl bg-[var(--electric)] px-5 font-semibold text-[var(--primary-foreground)] text-xs">
          Add
        </button>
      </div>

      <div className="mt-4">
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Logged Today:</span>
        {day.water.length === 0 ? (
          <p className="mt-2 text-xs text-muted-foreground">No water logged yet today.</p>
        ) : (
          <ul className="mt-2 flex flex-wrap gap-2">
            {day.water.map((w) => (
              <li key={w.id} className="flex items-center gap-2 rounded-full border border-border bg-[var(--surface-elevated)] px-3 py-1 text-xs font-medium">
                {w.ml} ml
                <button
                  onClick={() => {
                    const nextWater = day.water.filter((x) => x.id !== w.id);
                    update({ water: nextWater });
                    toast("Water entry removed", {
                      action: {
                        label: "Undo",
                        onClick: () => update({ water: [...nextWater, w] }),
                      },
                    });
                  }}
                  className="text-muted-foreground hover:text-destructive"
                >
                  <X className="h-3 w-3" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </NCard>
  );
}

function RestTimer() {
  const [seconds, setSeconds] = useState(0);
  const [active, setActive] = useState(false);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null;
    if (active && seconds > 0) {
      interval = setInterval(() => {
        setSeconds((s) => s - 1);
      }, 1000);
    } else if (seconds === 0 && active) {
      setActive(false);
      toast.success("⏰ Rest Timer Finished! Time for your next set!");
    }
    return () => { if (interval) clearInterval(interval); };
  }, [active, seconds]);

  function startTimer(sec: number) {
    setSeconds(sec);
    setActive(true);
  }

  return (
    <div className="rounded-xl border border-border/80 bg-[var(--surface-elevated)] p-3 space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold uppercase tracking-wider text-[var(--electric)]">Set Rest Timer</span>
        <span className="font-display text-lg font-bold tabular-nums text-foreground">
          {Math.floor(seconds / 60)}:{String(seconds % 60).padStart(2, "0")}
        </span>
      </div>
      <div className="flex flex-wrap items-center gap-1.5 text-xs">
        {[30, 60, 90, 120, 180].map((s) => (
          <button
            key={s}
            onClick={() => startTimer(s)}
            className={`rounded-lg px-2.5 py-1.5 font-medium border transition ${
              seconds === s && active
                ? "border-[var(--electric)] bg-[var(--electric)] text-[var(--primary-foreground)]"
                : "border-border/80 bg-background text-muted-foreground hover:text-foreground"
            }`}
          >
            {s < 60 ? `${s}s` : `${s / 60}m`}
          </button>
        ))}
        {active ? (
          <button onClick={() => setActive(false)} className="rounded-lg bg-amber-500/20 text-amber-300 px-2.5 py-1.5 font-medium">
            Pause
          </button>
        ) : seconds > 0 ? (
          <button onClick={() => setActive(true)} className="rounded-lg bg-[var(--neon)]/20 text-[var(--neon)] px-2.5 py-1.5 font-medium">
            Resume
          </button>
        ) : null}
      </div>
    </div>
  );
}

function WorkoutTab({ day, update, weightKg }: { day: DayLog; update: (p: Partial<DayLog>) => void; weightKg: number }) {
  const types = [...Object.keys(WORKOUT_METS), "custom"];
  const [type, setType] = useState("gym");
  const [customName, setCustomName] = useState("");
  const [customMet, setCustomMet] = useState(6);
  const [duration, setDuration] = useState(30);
  const [notes, setNotes] = useState("");

  const met = type === "custom" ? customMet : WORKOUT_METS[type];
  const burn = caloriesBurned(met, weightKg, duration);

  function add() {
    const entry: WorkoutEntry = {
      id: uid(),
      type: type === "custom" ? (customName || "custom") : type,
      customMet: type === "custom" ? customMet : undefined,
      durationMin: duration,
      caloriesBurned: burn,
      notes: notes || undefined,
    };
    update({ workouts: [...day.workouts, entry] });
    setNotes("");
  }

  return (
    <div className="space-y-4">
      <NCard>
        <RestTimer />
      </NCard>

      <NCard>
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">Log workout</h3>
      <div className="grid grid-cols-2 gap-2">
        <Field label="Type">
          <select value={type} onChange={(e) => setType(e.target.value)} className={inputCls}>
            {types.map((t) => <option key={t} value={t}>{workoutLabel(t)}</option>)}
          </select>
        </Field>
        <Field label="Duration (min)">
          <input type="number" value={duration} onChange={(e) => setDuration(+e.target.value)} className={inputCls} />
        </Field>
      </div>
      {type === "custom" && (
        <div className="mt-2 grid grid-cols-2 gap-2">
          <Field label="Custom name">
            <input value={customName} onChange={(e) => setCustomName(e.target.value)} className={inputCls} />
          </Field>
          <Field label="MET value">
            <input type="number" step="0.1" value={customMet} onChange={(e) => setCustomMet(+e.target.value)} className={inputCls} />
          </Field>
        </div>
      )}
      <Field label="Notes">
        <input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional" className={inputCls} />
      </Field>
      <div className="mt-3 flex items-center justify-between rounded-xl bg-[var(--surface-elevated)] p-3">
        <span className="text-sm text-muted-foreground">Estimated burn</span>
        <span className="font-display text-2xl font-bold text-[var(--neon)] tabular-nums">{Math.round(burn)} kcal</span>
      </div>
      <button onClick={add} className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--neon)] py-3 font-semibold text-[var(--accent-foreground)] shadow-[0_0_18px_var(--neon)] transition hover:scale-[1.01]">
        <Plus className="h-4 w-4" /> Add workout
      </button>
      <ul className="mt-5 space-y-2">
        {day.workouts.map((w) => (
          <li key={w.id} className="flex items-center justify-between gap-3 rounded-xl bg-[var(--surface-elevated)] p-3">
            <div>
              <div className="text-sm font-medium capitalize">{w.type.replace(/_/g, " ")}</div>
              <div className="text-xs text-muted-foreground tabular-nums">{w.durationMin} min · {Math.round(w.caloriesBurned)} kcal</div>
              {w.notes && <div className="text-xs text-muted-foreground">{w.notes}</div>}
            </div>
            <button
              onClick={() => {
                const nextWorkouts = day.workouts.filter((x) => x.id !== w.id);
                update({ workouts: nextWorkouts });
                toast("Workout removed", {
                  action: {
                    label: "Undo",
                    onClick: () => update({ workouts: [...nextWorkouts, w] }),
                  },
                });
              }}
              className="text-muted-foreground hover:text-destructive"
            >
              <X className="h-4 w-4" />
            </button>
          </li>
        ))}
      </ul>
    </NCard>
    </div>
  );
}

function WeightTab({ date, currentWeightKg, onSave }: { date: string; currentWeightKg: number; onSave: (kg: number) => void }) {
  const [value, setValue] = useState(currentWeightKg);
  const [saved, setSaved] = useState(false);

  function save() {
    if (value <= 0) return;
    onSave(value);
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  }

  return (
    <NCard>
      <div className="mb-4 flex items-end justify-between">
        <div>
          <div className="text-xs uppercase tracking-wider text-muted-foreground">Weight on {date}</div>
          <div className="font-display text-4xl font-bold tabular-nums">{value.toFixed(1)} <span className="text-base text-muted-foreground">kg</span></div>
        </div>
        <Scale className="h-10 w-10 text-[var(--electric)]" />
      </div>
      <div className="flex gap-2">
        <input type="number" step="0.1" value={value} onChange={(e) => setValue(+e.target.value)} className={inputCls + " flex-1"} />
        <button onClick={save} className="rounded-xl bg-[var(--electric)] px-4 font-medium text-[var(--primary-foreground)]">
          {saved ? "Saved ✓" : "Save"}
        </button>
      </div>
      <p className="mt-3 text-xs text-muted-foreground">
        Saving updates this date's entry and, if it's your most recent entry, also updates your current
        weight used for BMI/BMR/TDEE on the Body page.
      </p>
    </NCard>
  );
}

const inputCls = "w-full rounded-xl border border-border bg-[var(--surface-elevated)] px-3 py-2 text-sm outline-none transition focus:border-[var(--electric)]";

function NumInput({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[10px] uppercase tracking-wider text-muted-foreground">{label}</span>
      <input type="number" value={value || ""} onChange={(e) => onChange(+e.target.value)} className={inputCls} />
    </label>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[10px] uppercase tracking-wider text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}