import { useNavigate } from "react-router-dom";
import { LogOut, RotateCcw, X } from "lucide-react";
import { NCard } from "@/components/novaself/NCard";
import { SectionHeader } from "@/components/novaself/SectionHeader";
import { useApp } from "@/lib/novaself/store";
import { OPTIONAL_NUTRIENTS } from "@/lib/novaself/types";
import type { ActivityLevel } from "@/lib/novaself/calculations";

export default function Settings() {
  const {
    settings, updateSettings, toggleNutrient, profile, saveProfile,
    signOut, resetAll, clearOllamaUrl,
  } = useApp();
  const navigate = useNavigate();

  return (
    <div className="space-y-7">
      <SectionHeader eyebrow="Configure" title="Settings" />

      <NCard>
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">Profile</h3>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
          <Field label="Name"><input value={profile.name} onChange={(e) => saveProfile({ name: e.target.value })} className={ic} /></Field>
          <Field label="Age"><input type="number" value={profile.age} onChange={(e) => saveProfile({ age: +e.target.value })} className={ic} /></Field>
          <Field label="Goal weight (kg)"><input type="number" step={0.1} value={profile.goalWeightKg} onChange={(e) => saveProfile({ goalWeightKg: +e.target.value })} className={ic} /></Field>
          <Field label="Activity">
            <select value={profile.activity} onChange={(e) => saveProfile({ activity: e.target.value as ActivityLevel })} className={ic}>
              {["sedentary", "light", "moderate", "active", "very_active"].map((a) => (
                <option key={a} value={a}>{a.replace("_", " ")}</option>
              ))}
            </select>
          </Field>
        </div>
        <p className="mt-3 text-xs text-muted-foreground">Height, weight, and body measurements are on the Body page.</p>
      </NCard>

      <NCard>
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">Optional nutrients</h3>
        <p className="mb-3 text-xs text-muted-foreground">Calories, protein, and fiber are always shown. Toggle anything else you want to track.</p>
        <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
          {OPTIONAL_NUTRIENTS.map((n) => (
            <label key={n.key} className={`flex cursor-pointer items-center justify-between gap-2 rounded-xl border p-2.5 text-sm transition ${
              settings.enabledNutrients[n.key]
                ? "border-[var(--electric)] bg-[var(--electric)]/10 text-[var(--electric)]"
                : "border-border bg-[var(--surface-elevated)] text-muted-foreground"
            }`}>
              <span>{n.label}</span>
              <input type="checkbox" checked={settings.enabledNutrients[n.key]} onChange={() => toggleNutrient(n.key)} className="accent-[var(--electric)]" />
            </label>
          ))}
        </div>
      </NCard>

      <NCard>
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">AI Coach (Ollama)</h3>
        <p className="mb-3 text-xs text-muted-foreground">
          Point this at a local Ollama instance to enable the AI Chat assistant. Fully optional — the rest of the app works without it.
        </p>
        <Field label="Ollama URL">
          <div className="flex gap-2">
            <input
              value={settings.ollamaUrl}
              onChange={(e) => updateSettings({ ollamaUrl: e.target.value })}
              placeholder="http://localhost:11434"
              className={ic + " flex-1"}
            />
            {settings.ollamaUrl && (
              <button
                onClick={clearOllamaUrl}
                title="Clear Ollama URL"
                className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-border text-muted-foreground hover:border-destructive hover:text-destructive"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          <p className="mt-1.5 text-xs text-muted-foreground">
            {settings.ollamaUrl ? "AI Chat is visible in navigation." : "AI Chat stays hidden until this is set."}
          </p>
        </Field>
      </NCard>

      <NCard>
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">Theme</h3>
        <div className="flex gap-2">
          {(["dark", "light"] as const).map((t) => (
            <button
              key={t}
              onClick={() => updateSettings({ theme: t })}
              className={`flex-1 rounded-xl border px-4 py-3 text-sm capitalize transition ${
                settings.theme === t
                  ? "border-[var(--electric)] bg-[var(--electric)]/10 text-[var(--electric)]"
                  : "border-border bg-[var(--surface-elevated)] text-muted-foreground"
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </NCard>

      <NCard>
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">Multi-user accounts</h3>
        <p className="text-xs text-muted-foreground">
          Each Google account that signs in gets its own private "NovaSelf Data" Sheet created in their own Drive.
          There is no shared backend — one account's data can never reach another's by design (FR-43/44).
        </p>
      </NCard>

      <NCard>
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-destructive">Danger zone</h3>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => { if (confirm("Reset all local data?")) { resetAll(); navigate("/welcome"); } }}
            className="flex items-center gap-2 rounded-xl border border-border bg-[var(--surface-elevated)] px-4 py-2 text-sm text-muted-foreground hover:border-destructive hover:text-destructive"
          >
            <RotateCcw className="h-4 w-4" /> Reset all data
          </button>
          <button
            onClick={() => { signOut(); navigate("/welcome"); }}
            className="flex items-center gap-2 rounded-xl border border-border bg-[var(--surface-elevated)] px-4 py-2 text-sm text-muted-foreground hover:border-destructive hover:text-destructive"
          >
            <LogOut className="h-4 w-4" /> Sign out
          </button>
        </div>
      </NCard>
    </div>
  );
}

const ic = "w-full rounded-xl border border-border bg-[var(--surface-elevated)] px-3 py-2 text-sm outline-none focus:border-[var(--electric)]";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[10px] uppercase tracking-wider text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}