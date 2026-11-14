import { useState, useRef } from "react";
import { Link } from "react-router-dom";
import {
  Salad, Droplets, Dumbbell, Sparkles, Moon, Pill, BookOpen, X, ChevronRight,
  Plus, Minus, Check,
} from "lucide-react";
import { toast } from "sonner";
import { useApp, today } from "@/lib/novaself/store";
import { COMMON_FOOD_PRESETS, type FoodPreset } from "@/lib/novaself/types";
import {
  calorieTarget, proteinTargetG, waterTargetMl,
} from "@/lib/novaself/calculations";

interface StoryItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  pct: number;
  valueStr: string;
  targetStr: string;
  details: string[];
  logPath: string;
}

export function StoryBar() {
  const state = useApp();
  const {
    profile, days, skinLogs, sleepLogs, intakes, readingSessions, books, supplements,
    upsertDay, upsertSkin, removeSkin, upsertSleep, removeSleep, logIntake, removeIntake,
    logReading,
  } = state;

  const t = today();
  const day = days.find((d) => d.date === t) ?? { date: t, foods: [], water: [], workouts: [] };

  const cals = day.foods.reduce((a, f) => a + f.calories, 0);
  const targetCals = calorieTarget(profile);
  const calPct = Math.min(100, Math.round((cals / targetCals) * 100));

  const water = day.water.reduce((a, w) => a + w.ml, 0);
  const targetWater = waterTargetMl(profile);
  const waterPct = Math.min(100, Math.round((water / targetWater) * 100));

  const workouts = day.workouts;
  const workoutPct = workouts.length > 0 ? 100 : 0;

  const skinLog = skinLogs.find((s) => s.date === t);
  let skinTasks = 0;
  if (skinLog) {
    if (skinLog.faceWash) skinTasks++;
    if (skinLog.moisturizer) skinTasks++;
    if (skinLog.sunscreen) skinTasks++;
    if (skinLog.hairOil) skinTasks++;
    if (skinLog.scalpMassage) skinTasks++;
  }
  const skinPct = Math.round((skinTasks / 5) * 100);

  const sleepLog = sleepLogs.find((s) => s.date === t);
  const sleepHrs = sleepLog?.durationHours ?? 0;
  const sleepPct = Math.min(100, Math.round((sleepHrs / 8) * 100));

  const todayIntakes = intakes.filter((i) => i.date === t);
  const suppPct = supplements.length > 0 ? Math.min(100, Math.round((todayIntakes.length / supplements.length) * 100)) : 0;

  const todayReading = readingSessions.filter((s) => s.date === t);
  const readPages = todayReading.reduce((a, s) => a + s.pages, 0);
  const readPct = Math.min(100, Math.round((readPages / 20) * 100));

  const stories: StoryItem[] = [
    {
      id: "food",
      label: "Nutrition",
      icon: Salad,
      color: "#3B82F6",
      pct: calPct,
      valueStr: `${cals} kcal`,
      targetStr: `${Math.round(targetCals)} kcal goal`,
      details: [`Logged ${day.foods.length} food items today`, `Protein: ${day.foods.reduce((a, f) => a + f.protein, 0)}g / ${Math.round(proteinTargetG(profile))}g`],
      logPath: "/log?tab=food",
    },
    {
      id: "water",
      label: "Hydration",
      icon: Droplets,
      color: "#06B6D4",
      pct: waterPct,
      valueStr: `${water} ml`,
      targetStr: `${Math.round(targetWater)} ml goal`,
      details: [`Drank ${water} ml of water`, `Goal: ${Math.round(targetWater)} ml`],
      logPath: "/log?tab=water",
    },
    {
      id: "workout",
      label: "Workouts",
      icon: Dumbbell,
      color: "#10B981",
      pct: workoutPct,
      valueStr: workouts.length > 0 ? `${workouts.length} Session${workouts.length === 1 ? "" : "s"}` : "Rest Day",
      targetStr: "Daily Training",
      details: workouts.length > 0
        ? workouts.map((w) => `${w.type.replace(/_/g, " ")} (${w.durationMin} min, ${Math.round(w.caloriesBurned)} kcal)`)
        : ["No workout logged yet today."],
      logPath: "/log?tab=workout",
    },
    {
      id: "sleep",
      label: "Sleep",
      icon: Moon,
      color: "#8B5CF6",
      pct: sleepPct,
      valueStr: sleepHrs > 0 ? `${sleepHrs.toFixed(1)} hrs` : "Not Logged",
      targetStr: "8.0 hrs goal",
      details: sleepLog
        ? [`Bed: ${sleepLog.bedTime ?? "—"} → Wake: ${sleepLog.wakeTime ?? "—"}`, `Quality: ${sleepLog.quality}/5`]
        : ["Log last night's sleep duration."],
      logPath: "/log?tab=sleep",
    },
    {
      id: "skin",
      label: "Skin Care",
      icon: Sparkles,
      color: "#EC4899",
      pct: skinPct,
      valueStr: `${skinTasks}/5 Done`,
      targetStr: "Daily Routine",
      details: skinLog
        ? [
            `Face wash: ${skinLog.faceWash ? "✓" : "✗"}`,
            `Moisturizer: ${skinLog.moisturizer ? "✓" : "✗"}`,
            `Sunscreen: ${skinLog.sunscreen ? "✓" : "✗"}`,
          ]
        : ["Complete your daily skin & hair routine."],
      logPath: "/log?tab=skin",
    },
    {
      id: "supps",
      label: "Supps",
      icon: Pill,
      color: "#F59E0B",
      pct: suppPct,
      valueStr: `${todayIntakes.length} Taken`,
      targetStr: `${supplements.length} Stack Total`,
      details: todayIntakes.length > 0
        ? todayIntakes.map((i) => {
            const s = supplements.find((x) => x.id === i.supplementId);
            return `Took ${i.amount}${s?.unit ?? "dose"} ${s?.name ?? "Supplement"}`;
          })
        : ["Log your daily supplement intake."],
      logPath: "/log?tab=supplements",
    },
    {
      id: "reading",
      label: "Reading",
      icon: BookOpen,
      color: "#14B8A6",
      pct: readPct,
      valueStr: `${readPages} Pages`,
      targetStr: "20 Pages goal",
      details: todayReading.length > 0
        ? todayReading.map((s) => {
            const b = books.find((x) => x.id === s.bookId);
            return `Read ${s.pages} pages of ${b?.title ?? "Book"}`;
          })
        : ["Log pages read today."],
      logPath: "/log?tab=books",
    },
  ];

  const [activeStoryIndex, setActiveStoryIndex] = useState<number | null>(null);
  const [foodPickerOpen, setFoodPickerOpen] = useState(false);
  const touchStartRef = useRef<number | null>(null);

  const activeStory = activeStoryIndex !== null ? stories[activeStoryIndex] : null;

  function goNextStory() {
    if (activeStoryIndex === null) return;
    if (activeStoryIndex < stories.length - 1) {
      setActiveStoryIndex(activeStoryIndex + 1);
    } else {
      setActiveStoryIndex(0);
    }
  }

  function goPrevStory() {
    if (activeStoryIndex === null) return;
    if (activeStoryIndex > 0) {
      setActiveStoryIndex(activeStoryIndex - 1);
    } else {
      setActiveStoryIndex(stories.length - 1);
    }
  }

  function handleStoryOverlayTap(e: React.MouseEvent) {
    const target = e.target as HTMLElement;
    if (target.closest("button, a, input, select")) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    if (clickX < rect.width * 0.35) {
      goPrevStory();
    } else {
      goNextStory();
    }
  }

  function handleTouchStart(e: React.TouchEvent) {
    e.stopPropagation();
    touchStartRef.current = e.touches[0].clientX;
  }

  function handleTouchEnd(e: React.TouchEvent) {
    e.stopPropagation();
    if (touchStartRef.current === null) return;
    const diffX = e.changedTouches[0].clientX - touchStartRef.current;
    touchStartRef.current = null;
    if (Math.abs(diffX) > 40) {
      if (diffX < 0) goNextStory();
      else goPrevStory();
    }
  }

  function addFoodPreset(p: FoodPreset) {
    const entry = {
      id: Math.random().toString(36).slice(2, 10),
      name: p.name,
      calories: p.calories,
      protein: p.protein,
      fiber: p.fiber,
      carbs: p.carbs,
      fat: p.fat,
    };
    upsertDay({ ...day, foods: [...day.foods, entry] });
    toast.success(`Logged: ${p.name} (+${p.calories} kcal)`);
    setFoodPickerOpen(false);
  }

  // Inline Quick Actions
  function handleQuickAdd(id: string) {
    if (id === "food") {
      setFoodPickerOpen(true);
    } else if (id === "water") {
      const entry = { id: Math.random().toString(36).slice(2, 10), ml: 250 };
      upsertDay({ ...day, water: [...day.water, entry] });
      toast.success("+250ml water added!");
    } else if (id === "workout") {
      const entry = {
        id: Math.random().toString(36).slice(2, 10),
        type: "gym",
        durationMin: 30,
        caloriesBurned: Math.round(7.0 * (profile.weightKg || 70) * (30 / 60)),
      };
      upsertDay({ ...day, workouts: [...day.workouts, entry] });
      toast.success("+30 min workout logged!");
    } else if (id === "sleep") {
      upsertSleep({ date: t, durationHours: 8, quality: 4, bedTime: "23:00", wakeTime: "07:00" });
      toast.success("8 hrs sleep logged!");
    } else if (id === "skin") {
      upsertSkin({
        date: t,
        faceWash: true, moisturizer: true, sunscreen: true,
        hairOil: true, scalpMassage: true,
        oiliness: 1, hairFall: 1, pimples: 0, darkPatchChange: false,
      });
      toast.success("Skin routine marked complete!");
    } else if (id === "supps" && supplements.length > 0) {
      logIntake({ id: Math.random().toString(36).slice(2, 10), supplementId: supplements[0].id, date: t, amount: 1 });
      toast.success(`Took ${supplements[0].name}!`);
    } else if (id === "reading" && books.length > 0) {
      logReading({ id: Math.random().toString(36).slice(2, 10), bookId: books[0].id, date: t, pages: 10, minutes: 15 });
      toast.success("+10 pages read logged!");
    }
  }

  function handleQuickRemove(id: string) {
    if (id === "water" && day.water.length > 0) {
      upsertDay({ ...day, water: day.water.slice(0, -1) });
      toast.info("Removed last water entry.");
    } else if (id === "food" && day.foods.length > 0) {
      upsertDay({ ...day, foods: day.foods.slice(0, -1) });
      toast.info("Removed last food entry.");
    } else if (id === "workout" && day.workouts.length > 0) {
      upsertDay({ ...day, workouts: day.workouts.slice(0, -1) });
      toast.info("Removed last workout entry.");
    } else if (id === "sleep") {
      removeSleep(t);
      toast.info("Cleared today's sleep log.");
    } else if (id === "skin") {
      removeSkin(t);
      toast.info("Reset today's skin routine.");
    } else if (id === "supps" && todayIntakes.length > 0) {
      removeIntake(todayIntakes[0].id);
      toast.info("Removed last supplement intake.");
    }
  }

  return (
    <>
      {/* ── Horizontal Instagram Story Ring Bar ── */}
      <div className="rounded-2xl border border-border/70 bg-[var(--surface)] p-3 space-y-2">
        <div className="flex items-center justify-between px-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
            <Sparkles className="h-3 w-3 text-[var(--electric)]" /> Daily Status Stories
          </span>
          <span className="text-[10px] text-muted-foreground">Tap to view</span>
        </div>

        <div className="flex gap-3 overflow-x-auto pb-1 pt-1 scrollbar-none">
          {stories.map((story, idx) => {
            const Icon = story.icon;
            const isDone = story.pct >= 100;

            return (
              <button
                key={story.id}
                onClick={() => setActiveStoryIndex(idx)}
                className="flex flex-col items-center gap-1.5 shrink-0 group focus:outline-none"
              >
                {/* Story Gradient Ring */}
                <div
                  className={`relative grid h-14 w-14 place-items-center rounded-full p-[2px] transition-transform duration-200 group-active:scale-95`}
                  style={{
                    background: isDone
                      ? `linear-gradient(135deg, #10B981, #059669)`
                      : story.pct > 0
                      ? `linear-gradient(135deg, ${story.color}, #3B82F6)`
                      : `var(--border)`,
                  }}
                >
                  <div className="grid h-full w-full place-items-center rounded-full bg-[var(--surface-elevated)]">
                    <Icon className="h-6 w-6" style={{ color: story.color }} />
                  </div>
                </div>
                <span className="text-[10px] font-semibold text-foreground tracking-tight max-w-[56px] truncate">
                  {story.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── True Fullscreen Mobile Instagram-Style Story Overlay ── */}
      {activeStory && (
        <div
          data-no-swipe="true"
          onClick={handleStoryOverlayTap}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          className="fixed inset-0 z-50 h-screen h-dvh w-screen bg-black text-white p-4 sm:p-6 flex flex-col justify-between animate-fade-in select-none"
        >
          <div className="mx-auto w-full max-w-md h-full flex flex-col justify-between pt-[env(safe-area-inset-top,12px)] pb-[env(safe-area-inset-bottom,12px)]">
            {/* Top Story Segment Bars */}
            <div>
              <div className="flex gap-1 mb-4">
                {stories.map((s, idx) => (
                  <div
                    key={s.id}
                    className="h-1 flex-1 rounded-full overflow-hidden bg-white/20 cursor-pointer"
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveStoryIndex(idx);
                    }}
                  >
                    <div
                      className="h-full bg-white transition-all duration-300"
                      style={{
                        width: idx === activeStoryIndex ? "100%" : idx < activeStoryIndex! ? "100%" : "0%",
                      }}
                    />
                  </div>
                ))}
              </div>

              {/* Story Header Bar */}
              <div className="flex items-center justify-between pb-3 border-b border-white/10">
                <div className="flex items-center gap-3">
                  <div
                    className="grid h-10 w-10 place-items-center rounded-full"
                    style={{ background: `${activeStory.color}30` }}
                  >
                    <activeStory.icon className="h-5 w-5" style={{ color: activeStory.color }} />
                  </div>
                  <div>
                    <h3 className="font-bold text-base leading-none text-white">{activeStory.label}</h3>
                    <span className="text-xs text-white/60">{activeStory.targetStr}</span>
                  </div>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveStoryIndex(null);
                  }}
                  className="grid h-9 w-9 place-items-center rounded-full bg-white/10 text-white hover:bg-white/20 transition"
                  aria-label="Close Story"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Story Visual Centerpiece */}
            <div className="py-6 text-center space-y-4 my-auto">
              <div
                className="mx-auto grid h-24 w-24 place-items-center rounded-full border-4 border-white/20"
                style={{
                  background: `radial-gradient(circle, ${activeStory.color}40 0%, transparent 70%)`,
                  borderColor: activeStory.color,
                }}
              >
                <activeStory.icon className="h-12 w-12" style={{ color: activeStory.color }} />
              </div>

              <div>
                <div className="font-display text-4xl font-extrabold tabular-nums text-white">
                  {activeStory.valueStr}
                </div>
                <div className="mt-1 text-xs font-semibold uppercase tracking-widest text-white/70">
                  {activeStory.pct}% Goal Achieved
                </div>
              </div>

              {/* Story Log Details List */}
              <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md p-4 text-left space-y-2 text-xs text-white">
                {activeStory.details.map((d, i) => (
                  <div key={i} className="flex items-center gap-2 font-medium">
                    <span className="h-2 w-2 rounded-full shrink-0" style={{ background: activeStory.color }} />
                    {d}
                  </div>
                ))}
              </div>

              {/* Quick Add / Remove Action Controls */}
              <div className="flex items-center justify-center gap-3 pt-1">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleQuickAdd(activeStory.id);
                  }}
                  className="flex items-center gap-1.5 rounded-full border border-white/20 bg-white/20 px-4 py-2 text-xs font-bold text-white hover:bg-white/30 transition shadow-lg"
                >
                  <Plus className="h-4 w-4" /> Quick Add
                </button>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleQuickRemove(activeStory.id);
                  }}
                  className="flex items-center gap-1.5 rounded-full border border-red-500/40 bg-red-500/20 px-4 py-2 text-xs font-bold text-red-200 hover:bg-red-500/30 transition shadow-lg"
                >
                  <Minus className="h-4 w-4" /> Remove Entry
                </button>
              </div>
            </div>

            {/* Bottom Actions Bar */}
            <div className="flex gap-3 pt-2">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  goPrevStory();
                }}
                className="flex-1 rounded-2xl border border-white/20 bg-white/10 py-3 text-xs font-bold text-white hover:bg-white/20 transition"
              >
                Previous
              </button>

              <Link
                to={activeStory.logPath}
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveStoryIndex(null);
                }}
                className="flex-1 flex items-center justify-center gap-1.5 rounded-2xl py-3 text-xs font-bold text-white transition"
                style={{ background: activeStory.color }}
              >
                Full Log <ChevronRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Food Quick Presets Picker Modal */}
      {foodPickerOpen && (
        <div
          data-no-swipe="true"
          onClick={(e) => e.stopPropagation()}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fade-in"
        >
          <div className="relative w-full max-w-sm rounded-3xl border border-border/80 bg-[var(--surface)] p-5 shadow-2xl text-foreground">
            <div className="flex items-center justify-between pb-3 border-b border-border/60">
              <div className="flex items-center gap-2">
                <Salad className="h-5 w-5 text-[var(--electric)]" />
                <h3 className="font-bold text-sm">Quick Add Food Preset</h3>
              </div>
              <button
                onClick={() => setFoodPickerOpen(false)}
                className="grid h-7 w-7 place-items-center rounded-full bg-[var(--surface-elevated)] text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <p className="mt-2 text-xs text-muted-foreground">Select a meal or food preset to log instantly:</p>

            <div className="mt-3 max-h-64 overflow-y-auto space-y-2 pr-1">
              {COMMON_FOOD_PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  onClick={() => addFoodPreset(preset)}
                  className="w-full flex items-center justify-between rounded-xl border border-border/60 bg-[var(--surface-elevated)] p-3 text-left transition hover:border-[var(--electric)]"
                >
                  <div>
                    <div className="text-xs font-bold text-foreground">{preset.name}</div>
                    <div className="text-[10px] text-muted-foreground">{preset.category} · {preset.protein}g protein</div>
                  </div>
                  <div className="text-xs font-bold text-[var(--electric)] tabular-nums">{preset.calories} kcal</div>
                </button>
              ))}
            </div>

            <div className="mt-4 pt-3 border-t border-border/60 flex justify-end">
              <Link
                to="/log?tab=food"
                onClick={() => setFoodPickerOpen(false)}
                className="text-xs font-bold text-[var(--electric)] hover:underline flex items-center gap-1"
              >
                Custom Food Entry <ChevronRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
