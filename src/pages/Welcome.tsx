import { useState } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import { Zap, ArrowRight } from "lucide-react";
import { useApp } from "@/lib/novaself/store";
import type { Sex } from "@/lib/novaself/calculations";

export default function Welcome() {
  const { onboarded, saveProfile, profile } = useApp();
  const navigate = useNavigate();

  const [form, setForm] = useState(() => ({
    name: profile.name,
    age: profile.age,
    sex: profile.sex as Sex,
    heightCm: profile.heightCm,
    weightKg: profile.weightKg,
    goalWeightKg: profile.goalWeightKg,
  }));

  if (onboarded) return <Navigate to="/dashboard" replace />;

  const valid =
    form.name.trim().length > 0 &&
    form.age > 0 && form.heightCm > 0 && form.weightKg > 0 && form.goalWeightKg > 0;

  function complete() {
    if (!valid) return;
    saveProfile({ ...form, name: form.name.trim(), startingWeightKg: form.weightKg });
    navigate("/dashboard?tour=true");
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-background text-foreground">
      <div className="pointer-events-none absolute -left-20 -top-20 h-[500px] w-[500px] rounded-full bg-[var(--electric)] opacity-20 blur-[140px]" />
      <div className="pointer-events-none absolute -bottom-32 -right-16 h-[420px] w-[420px] rounded-full bg-[var(--neon)] opacity-20 blur-[140px]" />

      <div className="relative mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-12">
        <div className="mb-10 flex items-center gap-3">
          <div className="grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-[var(--electric)] to-[var(--neon)] text-[var(--primary-foreground)] shadow-[0_0_32px_var(--electric)]">
            <Zap className="h-6 w-6 fill-current" />
          </div>
          <div>
            <div className="font-display text-2xl font-bold tracking-tight">NovaSelf</div>
            <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Become measurably better</div>
          </div>
        </div>

        <div className="animate-fade-in space-y-5">
          <div>
            <div className="text-xs uppercase tracking-[0.2em] text-[var(--electric)]">Step 1 of 1</div>
            <h1 className="mt-1 font-display text-3xl font-bold">Tell us about you</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              We'll calibrate your targets from this. Edit any time in Settings or the Body page.
              Everything stays on this phone.
            </p>
          </div>

          <Field label="Name">
            <input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Your name"
              className={inputCls}
            />
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Age">
              <input
                type="number"
                value={form.age || ""}
                onChange={(e) => setForm({ ...form, age: +e.target.value })}
                placeholder="25"
                className={inputCls}
              />
            </Field>
            <Field label="Sex">
              <select
                value={form.sex}
                onChange={(e) => setForm({ ...form, sex: e.target.value as Sex })}
                className={inputCls}
              >
                <option value="male">Male</option>
                <option value="female">Female</option>
              </select>
            </Field>
          </div>

          <Field label="Height (cm)">
            <input
              type="number"
              value={form.heightCm || ""}
              onChange={(e) => setForm({ ...form, heightCm: +e.target.value })}
              placeholder="170"
              className={inputCls}
            />
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Current weight (kg)">
              <input
                type="number"
                step="0.1"
                value={form.weightKg || ""}
                onChange={(e) => setForm({ ...form, weightKg: +e.target.value })}
                placeholder="70.0"
                className={inputCls}
              />
            </Field>
            <Field label="Goal weight (kg)">
              <input
                type="number"
                step="0.1"
                value={form.goalWeightKg || ""}
                onChange={(e) => setForm({ ...form, goalWeightKg: +e.target.value })}
                placeholder="65.0"
                className={inputCls}
              />
            </Field>
          </div>

          <button
            onClick={complete}
            disabled={!valid}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[var(--electric)] to-[var(--neon)] px-5 py-4 font-semibold text-[var(--primary-foreground)] shadow-[0_0_32px_var(--electric)] transition hover:scale-[1.01] disabled:opacity-40 disabled:shadow-none"
          >
            Enter NovaSelf <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

const inputCls =
  "w-full rounded-xl border border-border bg-[var(--surface-elevated)] px-4 py-3 text-foreground outline-none transition focus:border-[var(--electric)] focus:shadow-[0_0_0_3px_color-mix(in_oklab,var(--electric)_25%,transparent)]";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs uppercase tracking-wider text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}