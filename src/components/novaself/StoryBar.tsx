import { useState } from "react";
import { Link } from "react-router-dom";
import {
  Salad, Droplets, Dumbbell, Sparkles, Moon, Pill, BookOpen, X, ChevronRight, Zap,
} from "lucide-react";
import { useApp, today } from "@/lib/novaself/store";
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
  const { profile, days, skinLogs, sleepLogs, intakes, readingSessions, books, supplements } = state;
  const t = today();
  const day = days.find((d) => d.date === t) ?? { date: t, foods: [], water: [], workouts: [] };

  // Calculate percentages
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

  const activeStory = activeStoryIndex !== null ? stories[activeStoryIndex] : null;

  return (
    <>
      {/* ── Horizontal Instagram Story Ring Bar ── */}
      <div className="rounded-2xl border border-border/70 bg-[var(--surface)] p-3 space-y-2">
        <div className="flex items-center justify-between px-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
            <Zap className="h-3 w-3 text-[var(--electric)] fill-current" /> Daily Status Stories
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
                    boxShadow: story.pct > 0 ? `0 0 12px ${story.color}40` : "none",
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

      {/* ── Fullscreen Instagram-Style Story Modal ── */}
      {activeStory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-xl p-4 animate-fade-in">
          <div className="relative w-full max-w-sm rounded-3xl border border-white/10 bg-[var(--surface)] p-6 shadow-2xl text-foreground flex flex-col justify-between min-h-[480px]">
            {/* Top Story Progress Indicator */}
            <div>
              <div className="flex gap-1 mb-4">
                {stories.map((s, idx) => (
                  <div
                    key={s.id}
                    className="h-1 flex-1 rounded-full overflow-hidden bg-white/20"
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

              {/* Story Header */}
              <div className="flex items-center justify-between pb-3 border-b border-border/50">
                <div className="flex items-center gap-2">
                  <div
                    className="grid h-8 w-8 place-items-center rounded-full"
                    style={{ background: `${activeStory.color}25` }}
                  >
                    <activeStory.icon className="h-4 w-4" style={{ color: activeStory.color }} />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm leading-none">{activeStory.label}</h3>
                    <span className="text-[10px] text-muted-foreground">{activeStory.targetStr}</span>
                  </div>
                </div>
                <button
                  onClick={() => setActiveStoryIndex(null)}
                  className="grid h-7 w-7 place-items-center rounded-full bg-white/10 text-white hover:bg-white/20 transition"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Story Content Card */}
            <div className="py-6 text-center space-y-4 my-auto">
              <div
                className="mx-auto grid h-24 w-24 place-items-center rounded-full shadow-2xl border-4 border-white/10"
                style={{
                  background: `radial-gradient(circle, ${activeStory.color}30 0%, transparent 70%)`,
                  borderColor: activeStory.color,
                }}
              >
                <activeStory.icon className="h-12 w-12" style={{ color: activeStory.color }} />
              </div>

              <div>
                <div className="font-display text-4xl font-extrabold tabular-nums text-foreground">
                  {activeStory.valueStr}
                </div>
                <div className="mt-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {activeStory.pct}% Goal Achieved
                </div>
              </div>

              <div className="rounded-2xl border border-border/60 bg-[var(--surface-elevated)] p-4 text-left space-y-2 text-xs">
                {activeStory.details.map((d, i) => (
                  <div key={i} className="flex items-center gap-2 text-foreground font-medium">
                    <span className="h-1.5 w-1.5 rounded-full" style={{ background: activeStory.color }} />
                    {d}
                  </div>
                ))}
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="flex gap-2 pt-2">
              <button
                onClick={() =>
                  setActiveStoryIndex((prev) =>
                    prev !== null && prev > 0 ? prev - 1 : stories.length - 1
                  )
                }
                className="flex-1 rounded-xl border border-border bg-[var(--surface-elevated)] py-2.5 text-xs font-semibold text-muted-foreground hover:text-foreground"
              >
                Previous
              </button>

              <Link
                to={activeStory.logPath}
                onClick={() => setActiveStoryIndex(null)}
                className="flex-1 flex items-center justify-center gap-1 rounded-xl py-2.5 text-xs font-bold text-[var(--primary-foreground)] shadow-lg transition"
                style={{ background: activeStory.color }}
              >
                Log More <ChevronRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
