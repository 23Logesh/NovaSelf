import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Droplets, Dumbbell, Salad, Plus, X, Scale, Pill, Sparkles, BookOpen, Moon } from "lucide-react";
import { NCard } from "@/components/novaself/NCard";
import { SectionHeader } from "@/components/novaself/SectionHeader";
import { SupplementIntakePanel } from "@/components/novaself/SupplementIntakePanel";
import { SkinCheckIn } from "@/components/novaself/SkinCheckIn";
import { SleepCheckIn } from "@/components/novaself/SleepCheckIn";
import { ReadingSessionForm } from "@/components/novaself/ReadingSessionForm";
import { useApp, today } from "@/lib/novaself/store";
import { caloriesBurned, WORKOUT_METS, workoutLabel } from "@/lib/novaself/calculations";
import { OPTIONAL_NUTRIENTS } from "@/lib/novaself/types";
import type { FoodEntry, WorkoutEntry, DayLog } from "@/lib/novaself/types";

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
  const [tab, setTab] = useState<Tab>("food");

  function update(patch: Partial<DayLog>) {
    upsertDay({ ...day, ...patch });
  }

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
        <FoodTab
          day={day}
          update={update}
          enabledNutrients={settings.enabledNutrients}
          customNutrients={settings.customNutrients}
          enabledCustomNutrients={settings.enabledCustomNutrients}
        />
      )}
      {tab === "water" && <WaterTab day={day} update={update} />}
      {tab === "workout" && <WorkoutTab day={day} update={update} weightKg={profile.weightKg} />}
      {tab === "weight" && (
        <WeightTab
          date={date}
          currentWeightKg={day.weightKg ?? profile.weightKg}
          onSave={(kg) => logWeight(date, kg)}
        />
      )}
      {tab === "supplements" && (
        <NCard>
          <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted-foreground">Today's supplements</h3>
          <SupplementIntakePanel />
        </NCard>
      )}
      {tab === "skin" && <SkinCheckIn />}
      {tab === "sleep" && <SleepCheckIn />}
      {tab === "books" && <ReadingSessionForm />}
    </div>
  );
}

// ---------------------------------------------------------------------------
// FoodTab — updated to render custom nutrients alongside built-ins
// ---------------------------------------------------------------------------
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
  const enabledBuiltin = OPTIONAL_NUTRIENTS.filter((n) => enabledNutrients[n.key]);
  const enabledCustom = customNutrients.filter((n) => enabledCustomNutrients[n.id] ?? true);
  const hasOptional = enabledBuiltin.length > 0 || enabledCustom.length > 0;

  const blank: FoodEntry = { id: uid(), name: "", calories: 0, protein: 0, fiber: 0 };
  const [draft, setDraft] = useState<FoodEntry>(blank);

  function add() {
    if (!draft.name.trim()) return;
    update({ foods: [...day.foods, { ...draft, id: uid() }] });
    setDraft({ ...blank, id: uid() });
  }

  function setCustomField(id: string, value: number) {
    setDraft((d) => ({
      ...d,
      customFields: { ...(d.customFields ?? {}), [id]: value },
    }));
  }

  return (
    <NCard>
      <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">Add food</h3>
      <div className="space-y-3">
        <input
          placeholder="Food name (e.g. Oats + banana)"
          value={draft.name}
          onChange={(e) => setDraft({ ...draft, name: e.target.value })}
          className={inputCls}
        />
        <div className="grid grid-cols-3 gap-2">
          <NumInput label="Calories" value={draft.calories} onChange={(v) => setDraft({ ...draft, calories: v })} />
          <NumInput label="Protein (g)" value={draft.protein} onChange={(v) => setDraft({ ...draft, protein: v })} />
          <NumInput label="Fiber (g)" value={draft.fiber} onChange={(v) => setDraft({ ...draft, fiber: v })} />
        </div>

        {hasOptional && (
          <details className="rounded-xl border border-border bg-[var(--surface-elevated)] p-3">
            <summary className="cursor-pointer text-sm text-muted-foreground">
              Optional nutrients ({enabledBuiltin.length + enabledCustom.length})
            </summary>
            <div className="mt-3 grid grid-cols-2 gap-2 md:grid-cols-3">
              {/* Built-in optional nutrients */}
              {enabledBuiltin.map((n) => (
                <NumInput
                  key={n.key}
                  label={`${n.label} (${n.unit})`}
                  value={(draft as unknown as Record<string, number>)[n.key] ?? 0}
                  onChange={(v) => setDraft({ ...draft, [n.key]: v })}
                />
              ))}
              {/* User-defined custom nutrients */}
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
        <h4 className="mb-2 text-xs uppercase tracking-wider text-muted-foreground">Logged</h4>
        {day.foods.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">Nothing yet — log your first meal.</p>
        ) : (
          <ul className="space-y-2">
            {day.foods.map((f) => {
              const customSummary = f.customFields
                ? Object.entries(f.customFields)
                    .map(([id, val]) => {
                      const def = customNutrients.find((n) => n.id === id);
                      return def ? `${val}${def.unit} ${def.name}` : null;
                    })
                    .filter(Boolean)
                    .join(" · ")
                : "";
              return (
                <li key={f.id} className="flex items-start justify-between gap-3 rounded-xl bg-[var(--surface-elevated)] p-3">
                  <div className="min-w-0">
                    <div className="text-sm font-medium">{f.name}</div>
                    <div className="text-xs text-muted-foreground tabular-nums">
                      {f.calories} kcal · {f.protein}g protein · {f.fiber}g fiber
                    </div>
                    {customSummary && (
                      <div className="mt-0.5 text-xs text-muted-foreground tabular-nums">{customSummary}</div>
                    )}
                  </div>
                  <button
                    onClick={() => update({ foods: day.foods.filter((x) => x.id !== f.id) })}
                    className="shrink-0 text-muted-foreground hover:text-destructive"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </NCard>
  );
}

// ---------------------------------------------------------------------------
// WaterTab, WorkoutTab, WeightTab — unchanged from original
// ---------------------------------------------------------------------------
function WaterTab({ day, update }: { day: DayLog; update: (p: Partial<DayLog>) => void }) {
  const total = day.water.reduce((a, w) => a + w.ml, 0);
  function quick(ml: number) { update({ water: [...day.water, { id: uid(), ml }] }); }
  const [manual, setManual] = useState(200);
  return (
    <NCard>
      <div className="mb-4 flex items-end justify-between">
        <div>
          <div className="text-xs uppercase tracking-wider text-muted-foreground">Total today</div>
          <div className="font-display text-4xl font-bold tabular-nums">{total} <span className="text-base text-muted-foreground">ml</span></div>
        </div>
        <Droplets className="h-10 w-10 text-[var(--electric)]" />
      </div>
      <div className="grid grid-cols-3 gap-2">
        {[250, 500, 1000].map((v) => (
          <button key={v} onClick={() => quick(v)} className="rounded-xl border border-border bg-[var(--surface-elevated)] py-3 text-sm font-medium transition hover:border-[var(--electric)] hover:text-[var(--electric)]">+{v} ml</button>
        ))}
      </div>
      <div className="mt-3 flex gap-2">
        <input type="number" value={manual} onChange={(e) => setManual(+e.target.value)} className={inputCls + " flex-1"} />
        <button onClick={() => quick(manual)} className="rounded-xl bg-[var(--electric)] px-4 font-medium text-[var(--primary-foreground)]">Add</button>
      </div>
      <ul className="mt-4 flex flex-wrap gap-2">
        {day.water.map((w) => (
          <li key={w.id} className="flex items-center gap-2 rounded-full border border-border bg-[var(--surface-elevated)] px-3 py-1 text-xs">
            {w.ml} ml <button onClick={() => update({ water: day.water.filter((x) => x.id !== w.id) })} className="text-muted-foreground hover:text-destructive"><X className="h-3 w-3" /></button>
          </li>
        ))}
      </ul>
    </NCard>
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
            <button onClick={() => update({ workouts: day.workouts.filter((x) => x.id !== w.id) })} className="text-muted-foreground hover:text-destructive"><X className="h-4 w-4" /></button>
          </li>
        ))}
      </ul>
    </NCard>
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