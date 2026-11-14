import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  Plus, X, Salad, Droplets, Dumbbell, Scale, Pill, Moon, Sparkles,
  BookOpen, MessageSquare, Settings as Cog, Compass, Zap,
} from "lucide-react";
import { toast } from "sonner";
import { useApp, today } from "@/lib/novaself/store";

export function FloatingActionButton({ hidden = false }: { hidden?: boolean }) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"log" | "nav">("log");
  const { getDay, upsertDay } = useApp();
  const { pathname } = useLocation();

  if (pathname === "/chat" || hidden) return null;

  function quickWater(ml: number = 250) {
    const t = today();
    const day = getDay(t);
    const id = Math.random().toString(36).slice(2, 10);
    upsertDay({ ...day, water: [...day.water, { id, ml }] });
    toast.success(`+${ml}ml water logged!`);
    setOpen(false);
  }

  return (
    <div className="fixed right-4 bottom-24 z-50 lg:bottom-8">
      {/* Expanded Quick Action Stack */}
      {open && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-xs animate-fade-in"
            onClick={() => setOpen(false)}
          />
          <div className="absolute bottom-14 right-0 z-50 flex flex-col items-end gap-2 animate-scale-up max-h-[80vh] overflow-y-auto pr-0.5">
            {/* Mode Switcher Pill */}
            <div className="mb-1 flex items-center gap-1 rounded-2xl border border-border/80 bg-[var(--surface-elevated)] p-1 text-xs font-bold">
              <button
                onClick={() => setMode("log")}
                className={`flex items-center gap-1 rounded-xl px-3 py-1.5 transition ${
                  mode === "log"
                    ? "bg-[var(--electric)] text-[var(--primary-foreground)]"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Zap className="h-3.5 w-3.5" />
                <span>Log</span>
              </button>
              <button
                onClick={() => setMode("nav")}
                className={`flex items-center gap-1 rounded-xl px-3 py-1.5 transition ${
                  mode === "nav"
                    ? "bg-[var(--electric)] text-[var(--primary-foreground)]"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Compass className="h-3.5 w-3.5" />
                <span>Screens</span>
              </button>
            </div>

            {/* Mode 1: Quick Log Actions */}
            {mode === "log" && (
              <>
                <Link
                  to="/log?tab=food"
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-2 rounded-2xl border border-border/80 bg-[var(--surface-elevated)] px-3.5 py-2 text-xs font-bold text-foreground hover:border-[var(--electric)] transition"
                >
                  <span>+ Food</span>
                  <div className="grid h-6 w-6 place-items-center rounded-lg bg-[var(--electric)]/20 text-[var(--electric)]">
                    <Salad className="h-3.5 w-3.5" />
                  </div>
                </Link>

                <button
                  onClick={() => quickWater(250)}
                  className="flex items-center gap-2 rounded-2xl border border-border/80 bg-[var(--surface-elevated)] px-3.5 py-2 text-xs font-bold text-foreground hover:border-cyan-400 transition"
                >
                  <span>+ 250ml Water</span>
                  <div className="grid h-6 w-6 place-items-center rounded-lg bg-cyan-500/20 text-cyan-400">
                    <Droplets className="h-3.5 w-3.5" />
                  </div>
                </button>

                <Link
                  to="/log?tab=workout"
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-2 rounded-2xl border border-border/80 bg-[var(--surface-elevated)] px-3.5 py-2 text-xs font-bold text-foreground hover:border-[var(--neon)] transition"
                >
                  <span>+ Workout</span>
                  <div className="grid h-6 w-6 place-items-center rounded-lg bg-[var(--neon)]/20 text-[var(--neon)]">
                    <Dumbbell className="h-3.5 w-3.5" />
                  </div>
                </Link>

                <Link
                  to="/log?tab=weight"
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-2 rounded-2xl border border-border/80 bg-[var(--surface-elevated)] px-3.5 py-2 text-xs font-bold text-foreground hover:border-amber-400 transition"
                >
                  <span>+ Weight</span>
                  <div className="grid h-6 w-6 place-items-center rounded-lg bg-amber-500/20 text-amber-400">
                    <Scale className="h-3.5 w-3.5" />
                  </div>
                </Link>

                <Link
                  to="/log?tab=supplements"
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-2 rounded-2xl border border-border/80 bg-[var(--surface-elevated)] px-3.5 py-2 text-xs font-bold text-foreground hover:border-pink-400 transition"
                >
                  <span>+ Supplement Intake</span>
                  <div className="grid h-6 w-6 place-items-center rounded-lg bg-pink-500/20 text-pink-400">
                    <Pill className="h-3.5 w-3.5" />
                  </div>
                </Link>

                <Link
                  to="/log?tab=sleep"
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-2 rounded-2xl border border-border/80 bg-[var(--surface-elevated)] px-3.5 py-2 text-xs font-bold text-foreground hover:border-violet-400 transition"
                >
                  <span>+ Sleep Log</span>
                  <div className="grid h-6 w-6 place-items-center rounded-lg bg-violet-500/20 text-violet-400">
                    <Moon className="h-3.5 w-3.5" />
                  </div>
                </Link>

                <Link
                  to="/log?tab=skin"
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-2 rounded-2xl border border-border/80 bg-[var(--surface-elevated)] px-3.5 py-2 text-xs font-bold text-foreground hover:border-[var(--neon)] transition"
                >
                  <span>+ Skin Check-in</span>
                  <div className="grid h-6 w-6 place-items-center rounded-lg bg-[var(--neon)]/20 text-[var(--neon)]">
                    <Sparkles className="h-3.5 w-3.5" />
                  </div>
                </Link>

                <Link
                  to="/log?tab=books"
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-2 rounded-2xl border border-border/80 bg-[var(--surface-elevated)] px-3.5 py-2 text-xs font-bold text-foreground hover:border-amber-400 transition"
                >
                  <span>+ Book Reading</span>
                  <div className="grid h-6 w-6 place-items-center rounded-lg bg-amber-500/20 text-amber-400">
                    <BookOpen className="h-3.5 w-3.5" />
                  </div>
                </Link>
              </>
            )}

            {/* Mode 2: Screen Navigation Shortcuts */}
            {mode === "nav" && (
              <>
                <Link
                  to="/workout"
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-2 rounded-2xl border border-border/80 bg-[var(--surface-elevated)] px-3.5 py-2 text-xs font-bold text-foreground hover:border-[var(--electric)] transition"
                >
                  <span>Workout Plan</span>
                  <div className="grid h-6 w-6 place-items-center rounded-lg bg-[var(--electric)]/20 text-[var(--electric)]">
                    <Dumbbell className="h-3.5 w-3.5" />
                  </div>
                </Link>

                <Link
                  to="/skin"
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-2 rounded-2xl border border-border/80 bg-[var(--surface-elevated)] px-3.5 py-2 text-xs font-bold text-foreground hover:border-[var(--neon)] transition"
                >
                  <span>Skin & Hair</span>
                  <div className="grid h-6 w-6 place-items-center rounded-lg bg-[var(--neon)]/20 text-[var(--neon)]">
                    <Sparkles className="h-3.5 w-3.5" />
                  </div>
                </Link>

                <Link
                  to="/sleep"
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-2 rounded-2xl border border-border/80 bg-[var(--surface-elevated)] px-3.5 py-2 text-xs font-bold text-foreground hover:border-violet-400 transition"
                >
                  <span>Sleep Logs</span>
                  <div className="grid h-6 w-6 place-items-center rounded-lg bg-violet-500/20 text-violet-400">
                    <Moon className="h-3.5 w-3.5" />
                  </div>
                </Link>

                <Link
                  to="/supplements"
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-2 rounded-2xl border border-border/80 bg-[var(--surface-elevated)] px-3.5 py-2 text-xs font-bold text-foreground hover:border-pink-400 transition"
                >
                  <span>Supplements</span>
                  <div className="grid h-6 w-6 place-items-center rounded-lg bg-pink-500/20 text-pink-400">
                    <Pill className="h-3.5 w-3.5" />
                  </div>
                </Link>

                <Link
                  to="/books"
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-2 rounded-2xl border border-border/80 bg-[var(--surface-elevated)] px-3.5 py-2 text-xs font-bold text-foreground hover:border-amber-400 transition"
                >
                  <span>Reading Books</span>
                  <div className="grid h-6 w-6 place-items-center rounded-lg bg-amber-500/20 text-amber-400">
                    <BookOpen className="h-3.5 w-3.5" />
                  </div>
                </Link>

                <Link
                  to="/chat"
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-2 rounded-2xl border border-border/80 bg-[var(--surface-elevated)] px-3.5 py-2 text-xs font-bold text-foreground hover:border-cyan-400 transition"
                >
                  <span>AI Coach Chat</span>
                  <div className="grid h-6 w-6 place-items-center rounded-lg bg-cyan-500/20 text-cyan-400">
                    <MessageSquare className="h-3.5 w-3.5" />
                  </div>
                </Link>

                <Link
                  to="/settings"
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-2 rounded-2xl border border-border/80 bg-[var(--surface-elevated)] px-3.5 py-2 text-xs font-bold text-foreground hover:border-[var(--electric)] transition"
                >
                  <span>Settings</span>
                  <div className="grid h-6 w-6 place-items-center rounded-lg bg-[var(--electric)]/20 text-[var(--electric)]">
                    <Cog className="h-3.5 w-3.5" />
                  </div>
                </Link>
              </>
            )}
          </div>
        </>
      )}

      {/* Main Minimized Floating Action Button */}
      <button
        onClick={() => setOpen(!open)}
        className={`relative z-50 grid h-11 w-11 place-items-center rounded-full text-white transition-transform duration-300 active:scale-95 ${
          open
            ? "bg-destructive rotate-90"
            : "bg-gradient-to-tr from-[var(--electric)] to-[var(--neon)] rotate-0"
        }`}
        aria-label="Quick Action Hub"
      >
        {open ? <X className="h-5 w-5 text-white" /> : <Plus className="h-5 w-5 text-white" />}
      </button>
    </div>
  );
}
