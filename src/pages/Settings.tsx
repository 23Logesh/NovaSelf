import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { LogOut, Plus, RotateCcw, X } from "lucide-react";
import { NCard } from "@/components/novaself/NCard";
import { SectionHeader } from "@/components/novaself/SectionHeader";
import { useApp } from "@/lib/novaself/store";
import { OPTIONAL_NUTRIENTS } from "@/lib/novaself/types";
import type { ActivityLevel } from "@/lib/novaself/calculations";

const uid = () => Math.random().toString(36).slice(2, 10);

export default function Settings() {
  const {
    settings, updateSettings, toggleNutrient,
    addCustomNutrient, removeCustomNutrient, toggleCustomNutrient,
    profile, saveProfile,
    signOut, resetAll, clearOllamaUrl,
  } = useApp();
  const navigate = useNavigate();

  const [customDraft, setCustomDraft] = useState({ name: "", unit: "g" });

  function submitCustomNutrient() {
    const name = customDraft.name.trim();
    const unit = customDraft.unit.trim() || "g";
    if (!name) return;
    // Guard against duplicate names (case-insensitive).
    if (settings.customNutrients.some((n) => n.name.toLowerCase() === name.toLowerCase())) return;
    addCustomNutrient({ id: uid(), name, unit });
    setCustomDraft({ name: "", unit: "g" });
  }

  return (
    <div className="space-y-7">
      <SectionHeader eyebrow="Configure" title="Settings" />

      {/* Profile */}
      <NCard>
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">Profile</h3>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
          <Field label="Name">
            <input value={profile.name} onChange={(e) => saveProfile({ name: e.target.value })} className={ic} />
          </Field>
          <Field label="Age">
            <input type="number" value={profile.age} onChange={(e) => saveProfile({ age: +e.target.value })} className={ic} />
          </Field>
          <Field label="Goal weight (kg)">
            <input type="number" step={0.1} value={profile.goalWeightKg} onChange={(e) => saveProfile({ goalWeightKg: +e.target.value })} className={ic} />
          </Field>
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

      {/* Built-in optional nutrients */}
      <NCard>
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">Optional nutrients</h3>
        <p className="mb-3 text-xs text-muted-foreground">
          Calories, protein, and fiber are always shown. Toggle anything else you want to track.
        </p>
        <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
          {OPTIONAL_NUTRIENTS.map((n) => (
            <label
              key={n.key}
              className={`flex cursor-pointer items-center justify-between gap-2 rounded-xl border p-2.5 text-sm transition ${
                settings.enabledNutrients[n.key]
                  ? "border-[var(--electric)] bg-[var(--electric)]/10 text-[var(--electric)]"
                  : "border-border bg-[var(--surface-elevated)] text-muted-foreground"
              }`}
            >
              <span>{n.label} <span className="text-[10px] opacity-60">({n.unit})</span></span>
              <input
                type="checkbox"
                checked={settings.enabledNutrients[n.key]}
                onChange={() => toggleNutrient(n.key)}
                className="accent-[var(--electric)]"
              />
            </label>
          ))}
        </div>
      </NCard>

      {/* Custom nutrients */}
      <NCard>
        <h3 className="mb-1 text-sm font-semibold uppercase tracking-wider text-muted-foreground">Custom nutrients</h3>
        <p className="mb-3 text-xs text-muted-foreground">
          Define your own fields (e.g. Creatine, Collagen, Glutamine) — they'll appear alongside built-in nutrients
          in the food log entry form.
        </p>

        {/* Add form */}
        <div className="flex gap-2">
          <input
            placeholder="Name (e.g. Creatine)"
            value={customDraft.name}
            onChange={(e) => setCustomDraft({ ...customDraft, name: e.target.value })}
            onKeyDown={(e) => e.key === "Enter" && submitCustomNutrient()}
            className={ic + " flex-1"}
          />
          <input
            placeholder="Unit"
            value={customDraft.unit}
            onChange={(e) => setCustomDraft({ ...customDraft, unit: e.target.value })}
            onKeyDown={(e) => e.key === "Enter" && submitCustomNutrient()}
            className={ic + " w-20 shrink-0"}
          />
          <button
            onClick={submitCustomNutrient}
            disabled={!customDraft.name.trim()}
            className="flex shrink-0 items-center gap-1.5 rounded-xl bg-[var(--electric)] px-3 py-2 text-sm font-semibold text-[var(--primary-foreground)] disabled:opacity-40"
          >
            <Plus className="h-4 w-4" /> Add
          </button>
        </div>

        {/* Existing custom nutrients — toggle + delete */}
        {settings.customNutrients.length > 0 && (
          <div className="mt-3 grid grid-cols-2 gap-2 md:grid-cols-4">
            {settings.customNutrients.map((n) => {
              const enabled = settings.enabledCustomNutrients[n.id] ?? true;
              return (
                <div
                  key={n.id}
                  className={`flex items-center justify-between gap-1.5 rounded-xl border p-2.5 text-sm transition ${
                    enabled
                      ? "border-[var(--neon)] bg-[var(--neon)]/10 text-[var(--neon)]"
                      : "border-border bg-[var(--surface-elevated)] text-muted-foreground"
                  }`}
                >
                  <button
                    onClick={() => toggleCustomNutrient(n.id)}
                    className="min-w-0 flex-1 text-left"
                    title={enabled ? "Click to hide" : "Click to show"}
                  >
                    <div className="truncate font-medium">{n.name}</div>
                    <div className="text-[10px] opacity-70">{n.unit}</div>
                  </button>
                  <button
                    onClick={() => {
                      if (confirm(`Remove custom nutrient "${n.name}"? It will disappear from all food entries.`)) {
                        removeCustomNutrient(n.id);
                      }
                    }}
                    className="shrink-0 opacity-50 hover:opacity-100 hover:text-destructive"
                    title="Delete"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {settings.customNutrients.length === 0 && (
          <p className="mt-3 text-xs text-muted-foreground italic">No custom nutrients yet.</p>
        )}
      </NCard>

      {/* Ollama */}
      <NCard>
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">AI Coach (Ollama)</h3>
        <p className="mb-3 text-xs text-muted-foreground">
          Point this at a local Ollama instance to enable the AI Chat assistant. Fully optional.
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

      {/* Theme */}
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

      {/* Multi-user info */}
      <NCard>
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">Multi-user accounts</h3>
        <p className="text-xs text-muted-foreground">
          Each Google account gets its own private "NovaSelf Data" Sheet in their own Drive.
          No shared backend — one account's data can never reach another's.
        </p>
      </NCard>

      {/* Danger zone */}
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

const ic = "w-full rounded-xl border border-border bg-[var(--surface-elevated)] px-3 py-2 text-sm text-foreground outline-none focus:border-[var(--electric)]";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[10px] uppercase tracking-wider text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}