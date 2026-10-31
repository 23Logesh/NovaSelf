import { useState } from "react";
import { X, ChevronRight, ChevronLeft, Sparkles, Apple, Salad, ShieldCheck, Dumbbell, Scale } from "lucide-react";

interface TourStep {
  title: string;
  subtitle: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  description: string;
}

const TOUR_STEPS: TourStep[] = [
  {
    title: "Welcome to NovaSelf",
    subtitle: "Your offline personal transformation tracker",
    icon: Apple,
    color: "var(--electric)",
    description: "Every field, calculation, and business rule runs 100% locally on your device. No cloud servers required — your data stays private and secure.",
  },
  {
    title: "Today's Dashboard & Energy Balance",
    subtitle: "Real-time macro progress & net calories",
    icon: Sparkles,
    color: "var(--neon)",
    description: "Track your Calories, Protein, Water, and Fiber with interactive progress rings. View live net calorie balance (Consumed vs. Workout Burned) and quick log buttons.",
  },
  {
    title: "Daily Log & 1-Tap Presets",
    subtitle: "Fast, dynamic logging with Undo support",
    icon: Salad,
    color: "var(--electric)",
    description: "Log foods using common preset chips (Whey, Oats, Eggs, Chicken, etc.), group meals into Breakfast/Lunch/Dinner, and instantly undo any accidental deletions.",
  },
  {
    title: "Diet & Mess Menu Integration",
    subtitle: "Turn plans into daily action instantly",
    icon: ShieldCheck,
    color: "var(--neon)",
    description: "Planning your diet or hostel mess menu? Tap the '+ Log' button on any planned meal or mess item to instantly add it to Today's Food Log.",
  },
  {
    title: "Workouts & Set Rest Timer",
    subtitle: "Lift smarter with built-in timers",
    icon: Dumbbell,
    color: "var(--electric)",
    description: "Complete programmed workout days with 1 tap, estimate MET-based calorie burn, and use the built-in 30s–3m Set Rest Timer between gym sets.",
  },
  {
    title: "Body Intelligence & Secure Backups",
    subtitle: "Advanced metrics & Excel/JSON exports",
    icon: Scale,
    color: "var(--neon)",
    description: "Monitor BMI, BMR, TDEE, WHtR, WHR, FFMI, and 1-Rep Max benchmarks. Export your complete data to Excel (.xlsx) or backup/restore via JSON anytime in Settings.",
  },
];

export function AppTour({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [currentStep, setCurrentStep] = useState(0);

  if (!isOpen) return null;

  const step = TOUR_STEPS[currentStep];
  const Icon = step.icon;
  const isLast = currentStep === TOUR_STEPS.length - 1;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4 animate-fade-in">
      <div className="relative w-full max-w-lg rounded-3xl border border-border bg-[var(--surface)] p-6 shadow-[0_0_50px_rgba(0,0,0,0.8)] text-foreground overflow-hidden">
        {/* Glow backdrop */}
        <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-[var(--electric)] opacity-20 blur-[60px]" />
        <div className="pointer-events-none absolute -left-16 -bottom-16 h-48 w-48 rounded-full bg-[var(--neon)] opacity-20 blur-[60px]" />

        <div className="relative flex items-center justify-between pb-4 border-b border-border/60">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-[var(--electric)]">
              Step {currentStep + 1} of {TOUR_STEPS.length}
            </span>
          </div>
          <button
            onClick={onClose}
            className="grid h-8 w-8 place-items-center rounded-full bg-[var(--surface-elevated)] text-muted-foreground hover:text-foreground transition"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="relative py-8 text-center space-y-4">
          <div
            className="mx-auto grid h-16 w-16 place-items-center rounded-2xl shadow-lg"
            style={{
              background: `color-mix(in oklab, ${step.color} 20%, transparent)`,
              color: step.color,
              boxShadow: `0 0 30px ${step.color}`,
            }}
          >
            <Icon className="h-8 w-8" />
          </div>

          <div>
            <h3 className="font-display text-2xl font-bold tracking-tight text-foreground">{step.title}</h3>
            <p className="text-xs uppercase tracking-[0.18em] text-[var(--electric)] mt-1">{step.subtitle}</p>
          </div>

          <p className="text-sm text-muted-foreground leading-relaxed max-w-md mx-auto px-2">
            {step.description}
          </p>

          {/* Dots */}
          <div className="flex justify-center gap-1.5 pt-4">
            {TOUR_STEPS.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentStep(idx)}
                className={`h-2 rounded-full transition-all ${
                  idx === currentStep ? "w-6 bg-[var(--electric)] shadow-[0_0_8px_var(--electric)]" : "w-2 bg-border"
                }`}
              />
            ))}
          </div>
        </div>

        <div className="relative flex items-center justify-between gap-3 pt-4 border-t border-border/60">
          <button
            onClick={() => setCurrentStep((s) => Math.max(0, s - 1))}
            disabled={currentStep === 0}
            className="flex items-center gap-1 rounded-xl border border-border px-4 py-2.5 text-xs font-semibold text-muted-foreground hover:text-foreground disabled:opacity-30 transition"
          >
            <ChevronLeft className="h-4 w-4" /> Back
          </button>

          {isLast ? (
            <button
              onClick={onClose}
              className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-[var(--electric)] to-[var(--neon)] px-6 py-2.5 text-xs font-semibold text-[var(--primary-foreground)] shadow-[0_0_20px_var(--electric)] transition hover:scale-[1.02]"
            >
              Get Started <Sparkles className="h-4 w-4" />
            </button>
          ) : (
            <button
              onClick={() => setCurrentStep((s) => Math.min(TOUR_STEPS.length - 1, s + 1))}
              className="flex items-center gap-1 rounded-xl bg-[var(--electric)] px-5 py-2.5 text-xs font-semibold text-[var(--primary-foreground)] shadow-[0_0_15px_var(--electric)] transition hover:opacity-90"
            >
              Next <ChevronRight className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
