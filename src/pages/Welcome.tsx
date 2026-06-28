import { useState } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import { Apple, ArrowRight, Sparkles } from "lucide-react";
import { useApp } from "@/lib/novaself/store";
import type { Sex } from "@/lib/novaself/calculations";

export default function Welcome() {
  const { signedIn, onboarded, signInGoogle, saveProfile, profile } = useApp();
  const navigate = useNavigate();
  const [step, setStep] = useState(signedIn ? 1 : 0);
  const [signingIn, setSigningIn] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState(() => ({
    name: signedIn ? profile.name : "",
    age: signedIn ? profile.age : 0,
    sex: (signedIn ? profile.sex : "male") as Sex,
    heightCm: signedIn ? profile.heightCm : 0,
    weightKg: signedIn ? profile.weightKg : 0,
    goalWeightKg: signedIn ? profile.goalWeightKg : 0,
  }));

  if (signedIn && onboarded) {
    return <Navigate to="/dashboard" replace />;
  }

  async function handleSignInAndAdvance() {
    setSigningIn(true);
    setError("");
    try {
      await signInGoogle();
      await Promise.resolve();
      handleStepChange(1);
    } catch (err) {
      console.error("[Welcome] Sign-in failed:", err);
      setError("Sign-in failed. Please try again.");
    } finally {
      setSigningIn(false);
    }
  }

  function handleStepChange(newStep: number) {
    if (newStep === 1) {
      setForm({
        name: profile.name,
        age: profile.age,
        sex: profile.sex as Sex,
        heightCm: profile.heightCm,
        weightKg: profile.weightKg,
        goalWeightKg: profile.goalWeightKg,
      });
    }
    setStep(newStep);
  }

  function complete() {
    saveProfile({ ...form, startingWeightKg: form.weightKg });
    navigate("/dashboard");
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-background text-foreground">
      {/* ── Sign-in loading overlay ─────────────────────────────────────────
          Shown for the full duration of handleSignInAndAdvance() — from the
          moment the user clicks "Continue with Google" until signInGoogle()
          resolves (success or error). Sits above everything else via z-50.
          The Google popup still opens in front of this at the OS level, but
          our overlay ensures our own page looks intentional, not abandoned.
      ──────────────────────────────────────────────────────────────────── */}
      {signingIn && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-6 bg-background/95 backdrop-blur-sm">
          {/* Glows */}
          <div className="pointer-events-none absolute left-1/2 top-1/2 h-[400px] w-[400px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[var(--electric)] opacity-10 blur-[120px]" />
          <div className="pointer-events-none absolute left-1/2 top-1/2 h-[260px] w-[260px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[var(--neon)] opacity-10 blur-[80px]" />

          {/* Spinning logo ring */}
          <div className="relative">
            {/* Outer spinning ring */}
            <svg
              className="absolute inset-0 -m-3 animate-spin"
              style={{ animationDuration: "2s" }}
              viewBox="0 0 80 80"
              width={80}
              height={80}
            >
              <circle
                cx="40" cy="40" r="36"
                fill="none"
                stroke="url(#spin-grad)"
                strokeWidth="3"
                strokeLinecap="round"
                strokeDasharray="56 170"
              />
              <defs>
                <linearGradient id="spin-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="var(--electric)" />
                  <stop offset="100%" stopColor="var(--neon)" />
                </linearGradient>
              </defs>
            </svg>

            {/* Logo icon in the centre */}
            <div className="grid h-[56px] w-[56px] place-items-center rounded-2xl bg-gradient-to-br from-[var(--electric)] to-[var(--neon)] text-[var(--primary-foreground)] shadow-[0_0_40px_var(--electric)]">
              <Apple className="h-7 w-7" />
            </div>
          </div>

          {/* Text */}
          <div className="text-center">
            <p className="font-display text-lg font-semibold tracking-tight text-foreground">
              Signing you in…
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              Complete the Google prompt to continue
            </p>
          </div>
        </div>
      )}

      {/* ── Page background glows ────────────────────────────────────────── */}
      <div className="pointer-events-none absolute -left-20 -top-20 h-[500px] w-[500px] rounded-full bg-[var(--electric)] opacity-20 blur-[140px]" />
      <div className="pointer-events-none absolute -bottom-32 -right-16 h-[420px] w-[420px] rounded-full bg-[var(--neon)] opacity-20 blur-[140px]" />

      <div className="relative mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-12">
        <div className="mb-10 flex items-center gap-3">
          <div className="grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-[var(--electric)] to-[var(--neon)] text-[var(--primary-foreground)] shadow-[0_0_32px_var(--electric)]">
            <Apple className="h-6 w-6" />
          </div>
          <div>
            <div className="font-display text-2xl font-bold tracking-tight">NovaSelf</div>
            <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Become measurably better</div>
          </div>
        </div>

        {step === 0 && (
          <div className="animate-fade-in space-y-6">
            <h1 className="font-display text-4xl font-bold leading-tight">
              One tool for <span className="text-[var(--electric)]">fitness</span>,{" "}
              <span className="text-[var(--neon)]">nutrition</span>, and everything you're tracking.
            </h1>
            <p className="text-muted-foreground">
              Sign in with Google to keep your data in your own Sheet. No accounts, no servers, no surveillance.
            </p>

            <button
              onClick={handleSignInAndAdvance}
              disabled={signingIn}
              className="group flex w-full items-center justify-center gap-3 rounded-2xl border border-border bg-[var(--surface-elevated)] px-5 py-4 font-medium transition hover:bg-[var(--surface)] hover:shadow-[0_0_24px_var(--electric)] disabled:opacity-60"
            >
              <GoogleIcon />
              <span>Continue with Google</span>
              <ArrowRight className="ml-auto h-4 w-4 transition group-hover:translate-x-1" />
            </button>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <ul className="space-y-2 pt-4 text-sm text-muted-foreground">
              <li className="flex items-center gap-2"><Sparkles className="h-4 w-4 text-[var(--neon)]" /> Calories, protein, fiber, water — at a glance</li>
              <li className="flex items-center gap-2"><Sparkles className="h-4 w-4 text-[var(--neon)]" /> Real BMI, BMR, TDEE & body-fat math</li>
              <li className="flex items-center gap-2"><Sparkles className="h-4 w-4 text-[var(--neon)]" /> Diet plan, workout phases, skin, supplements & books</li>
            </ul>
          </div>
        )}

        {step === 1 && (
          <div className="animate-fade-in space-y-5">
            <div>
              <div className="text-xs uppercase tracking-[0.2em] text-[var(--electric)]">Step 1 of 1</div>
              <h1 className="mt-1 font-display text-3xl font-bold">Tell us about you</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                We'll calibrate your targets from this. Edit any time in Settings or the Body page.
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
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[var(--electric)] to-[var(--neon)] px-5 py-4 font-semibold text-[var(--primary-foreground)] shadow-[0_0_32px_var(--electric)] transition hover:scale-[1.01]"
            >
              Enter NovaSelf <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        )}
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

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.76h3.55c2.08-1.92 3.29-4.74 3.29-8.09z"/>
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.55-2.76c-.99.66-2.26 1.06-3.73 1.06-2.87 0-5.3-1.94-6.16-4.54H2.18v2.85A11 11 0 0 0 12 23z"/>
      <path fill="#FBBC05" d="M5.84 14.09a6.6 6.6 0 0 1 0-4.18V7.07H2.18a11 11 0 0 0 0 9.87l3.66-2.85z"/>
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1A11 11 0 0 0 2.18 7.07l3.66 2.85C6.7 7.32 9.13 5.38 12 5.38z"/>
    </svg>
  );
}