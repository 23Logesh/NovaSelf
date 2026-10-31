import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Download, Plus, RotateCcw, X, Upload, FileJson, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Capacitor } from "@capacitor/core";
import { Directory, Filesystem } from "@capacitor/filesystem";
import { Share } from "@capacitor/share";
import { NCard } from "@/components/novaself/NCard";
import { SectionHeader } from "@/components/novaself/SectionHeader";
import { AppTour } from "@/components/novaself/AppTour";
import { useApp } from "@/lib/novaself/store";
import { runExport } from "@/lib/novaself/exportExcel";
import { OPTIONAL_NUTRIENTS } from "@/lib/novaself/types";
import { isoDate } from "@/lib/novaself/calculations";
import type { ActivityLevel } from "@/lib/novaself/calculations";

const uid = () => Math.random().toString(36).slice(2, 10);

export default function Settings() {
  const app = useApp();
  const {
    settings, updateSettings, toggleNutrient,
    addCustomNutrient, removeCustomNutrient, toggleCustomNutrient,
    profile, saveProfile,
    resetAll, clearOllamaUrl,
  } = app;
  const [exporting, setExporting] = useState(false);
  const [tourOpen, setTourOpen] = useState(false);
  const navigate = useNavigate();

  const [customDraft, setCustomDraft] = useState({ name: "", unit: "g" });

  function submitCustomNutrient() {
    const name = customDraft.name.trim();
    const unit = customDraft.unit.trim() || "g";
    if (!name) return;
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
        <div className="flex gap-2">
          <input
            placeholder="Name (e.g. Creatine)"
            value={customDraft.name}
            onChange={(e) => setCustomDraft({ ...customDraft, name: e.target.value })}
            onKeyDown={(e) => e.key === "Enter" && submitCustomNutrient()}
            className="min-w-0 flex-1 rounded-xl border border-border bg-[var(--surface-elevated)] px-3 py-2 text-sm text-foreground outline-none focus:border-[var(--electric)]"
          />
          <input
            placeholder="Unit"
            value={customDraft.unit}
            onChange={(e) => setCustomDraft({ ...customDraft, unit: e.target.value })}
            onKeyDown={(e) => e.key === "Enter" && submitCustomNutrient()}
            className="w-16 shrink-0 rounded-xl border border-border bg-[var(--surface-elevated)] px-3 py-2 text-sm text-foreground outline-none focus:border-[var(--electric)]"
          />
          <button
            onClick={submitCustomNutrient}
            disabled={!customDraft.name.trim()}
            className="flex shrink-0 items-center gap-1.5 rounded-xl bg-[var(--electric)] px-3 py-2 text-sm font-semibold text-[var(--primary-foreground)] disabled:opacity-40"
          >
            <Plus className="h-4 w-4" /> Add
          </button>
        </div>
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
          <p className="mt-3 text-xs italic text-muted-foreground">No custom nutrients yet.</p>
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

      {/* Data export & Backup */}
      <NCard>
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">Your Data & Backup</h3>
        <p className="mb-3 text-xs text-muted-foreground">
          Everything is stored locally on this device. You can export an Excel report, or create a full JSON database backup to restore on any phone later.
        </p>
        <div className="space-y-3">
          <button
            onClick={async () => {
              setExporting(true);
              try { await runExport(app); } finally { setExporting(false); }
            }}
            disabled={exporting}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--electric)] py-3 text-sm font-semibold text-[var(--primary-foreground)] disabled:opacity-50 transition hover:scale-[1.005]"
          >
            <Download className="h-4 w-4" /> {exporting ? "Preparing…" : "Export to Excel (.xlsx)"}
          </button>

          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <button
              onClick={async () => {
                try {
                  const dataStr = JSON.stringify(app, null, 2);
                  const fileName = `novaself-backup-${isoDate()}.json`;
                  if (Capacitor.isNativePlatform()) {
                    const { uri } = await Filesystem.writeFile({
                      path: fileName,
                      data: dataStr,
                      directory: Directory.Cache,
                    });
                    await Share.share({ title: "NovaSelf JSON Backup", url: uri });
                  } else {
                    const blob = new Blob([dataStr], { type: "application/json" });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement("a");
                    a.href = url;
                    a.download = fileName;
                    a.click();
                    URL.revokeObjectURL(url);
                  }
                  toast.success("JSON backup exported!");
                } catch {
                  toast.error("Export failed");
                }
              }}
              className="flex items-center justify-center gap-2 rounded-xl border border-border bg-[var(--surface-elevated)] py-2.5 text-xs font-semibold text-foreground hover:border-[var(--electric)] transition"
            >
              <FileJson className="h-4 w-4 text-[var(--electric)]" /> Export JSON Backup
            </button>

            <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-border bg-[var(--surface-elevated)] py-2.5 text-xs font-semibold text-foreground hover:border-[var(--neon)] transition">
              <Upload className="h-4 w-4 text-[var(--neon)]" /> Restore JSON Backup
              <input
                type="file"
                accept=".json"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  const reader = new FileReader();
                  reader.onload = (ev) => {
                    try {
                      const content = ev.target?.result as string;
                      const parsed = JSON.parse(content);
                      if (parsed && typeof parsed === "object" && (parsed.profile || parsed.days)) {
                        window.localStorage.setItem("novaself.v1", JSON.stringify(parsed));
                        toast.success("Backup restored successfully! Reloading...");
                        setTimeout(() => window.location.reload(), 800);
                      } else {
                        toast.error("Invalid backup file format.");
                      }
                    } catch {
                      toast.error("Failed to read backup file.");
                    }
                  };
                  reader.readAsText(file);
                }}
              />
            </label>
          </div>
        </div>
      </NCard>

      {/* Help & Guide */}
      <NCard>
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">Help & Guide</h3>
        <p className="mb-3 text-xs text-muted-foreground">
          Learn how to make the most of NovaSelf's features, tracking tools, and calculations.
        </p>
        <button
          onClick={() => setTourOpen(true)}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-[var(--electric)] bg-[var(--electric)]/10 py-3 text-sm font-semibold text-[var(--electric)] hover:bg-[var(--electric)]/20 transition"
        >
          <Sparkles className="h-4 w-4" /> Take Feature Tour
        </button>
      </NCard>
      <AppTour isOpen={tourOpen} onClose={() => setTourOpen(false)} />

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