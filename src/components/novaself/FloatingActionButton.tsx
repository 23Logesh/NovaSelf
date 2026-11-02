import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  Plus, X, Salad, Droplets, Dumbbell, Scale, Pill, Moon, Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { useApp, today } from "@/lib/novaself/store";

export function FloatingActionButton() {
  const [open, setOpen] = useState(false);
  const { getDay, upsertDay } = useApp();
  const { pathname } = useLocation();

  if (pathname === "/chat") return null;

  function quickWater(ml: number = 250) {
    const t = today();
    const day = getDay(t);
    const id = Math.random().toString(36).slice(2, 10);
    upsertDay({ ...day, water: [...day.water, { id, ml }] });
    toast.success(`+${ml}ml water logged!`);
    setOpen(false);
  }

  return (
    <div className="fixed right-4 bottom-20 z-40 lg:bottom-6">
      {/* Expanded Radial Quick Action Wheel */}
      {open && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-xs animate-fade-in"
            onClick={() => setOpen(false)}
          />
          <div className="absolute bottom-16 right-0 z-50 flex flex-col items-end gap-2.5 animate-scale-up">
            <Link
              to="/log?tab=food"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2 rounded-2xl border border-border bg-[var(--surface-elevated)] px-4 py-2.5 text-xs font-bold text-foreground shadow-xl hover:border-[var(--electric)] transition"
            >
              <span>+ Food</span>
              <div className="grid h-7 w-7 place-items-center rounded-xl bg-[var(--electric)]/20 text-[var(--electric)]">
                <Salad className="h-4 w-4" />
              </div>
            </Link>

            <button
              onClick={() => quickWater(250)}
              className="flex items-center gap-2 rounded-2xl border border-border bg-[var(--surface-elevated)] px-4 py-2.5 text-xs font-bold text-foreground shadow-xl hover:border-cyan-400 transition"
            >
              <span>+ 250ml Water</span>
              <div className="grid h-7 w-7 place-items-center rounded-xl bg-cyan-500/20 text-cyan-400">
                <Droplets className="h-4 w-4" />
              </div>
            </button>

            <Link
              to="/log?tab=workout"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2 rounded-2xl border border-border bg-[var(--surface-elevated)] px-4 py-2.5 text-xs font-bold text-foreground shadow-xl hover:border-[var(--neon)] transition"
            >
              <span>+ Workout</span>
              <div className="grid h-7 w-7 place-items-center rounded-xl bg-[var(--neon)]/20 text-[var(--neon)]">
                <Dumbbell className="h-4 w-4" />
              </div>
            </Link>

            <Link
              to="/log?tab=weight"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2 rounded-2xl border border-border bg-[var(--surface-elevated)] px-4 py-2.5 text-xs font-bold text-foreground shadow-xl hover:border-amber-400 transition"
            >
              <span>+ Weight</span>
              <div className="grid h-7 w-7 place-items-center rounded-xl bg-amber-500/20 text-amber-400">
                <Scale className="h-4 w-4" />
              </div>
            </Link>

            <Link
              to="/log?tab=supplements"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2 rounded-2xl border border-border bg-[var(--surface-elevated)] px-4 py-2.5 text-xs font-bold text-foreground shadow-xl hover:border-pink-400 transition"
            >
              <span>+ Supplement Intake</span>
              <div className="grid h-7 w-7 place-items-center rounded-xl bg-pink-500/20 text-pink-400">
                <Pill className="h-4 w-4" />
              </div>
            </Link>

            <Link
              to="/log?tab=sleep"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2 rounded-2xl border border-border bg-[var(--surface-elevated)] px-4 py-2.5 text-xs font-bold text-foreground shadow-xl hover:border-violet-400 transition"
            >
              <span>+ Sleep</span>
              <div className="grid h-7 w-7 place-items-center rounded-xl bg-violet-500/20 text-violet-400">
                <Moon className="h-4 w-4" />
              </div>
            </Link>
          </div>
        </>
      )}

      {/* Main WhatsApp / Instagram Style Floating Action Button */}
      <button
        onClick={() => setOpen(!open)}
        className={`relative grid h-14 w-14 place-items-center rounded-full text-[var(--primary-foreground)] shadow-[0_0_25px_var(--electric)] transition-transform duration-200 active:scale-95 ${
          open
            ? "bg-destructive shadow-none rotate-45"
            : "bg-gradient-to-tr from-[var(--electric)] to-[var(--neon)]"
        }`}
        aria-label="Quick Log"
      >
        {open ? <X className="h-6 w-6" /> : <Plus className="h-7 w-7" />}
      </button>
    </div>
  );
}
