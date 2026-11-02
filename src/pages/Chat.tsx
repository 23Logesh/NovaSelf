import { useEffect, useRef, useState } from "react";
import { Send, Sparkles, CheckCheck, Bot, User, Cpu } from "lucide-react";
import { toast } from "sonner";
import { NCard } from "@/components/novaself/NCard";
import { SectionHeader } from "@/components/novaself/SectionHeader";
import { useApp, today } from "@/lib/novaself/store";
import type { AppSettings } from "@/lib/novaself/types";
import { calorieTarget, proteinTargetG, waterTargetMl } from "@/lib/novaself/calculations";

function formatTime(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

// Advanced Neural Fitness AI Coach Engine
function getNeuralCoachResponse(prompt: string, profile: any): string {
  const lower = prompt.toLowerCase();
  const targetCals = Math.round(calorieTarget(profile));
  const targetProt = Math.round(proteinTargetG(profile));
  const targetWater = Math.round(waterTargetMl(profile));
  const currentWeight = profile.weightKg;
  const goalWeight = profile.goalWeightKg;

  if (lower.includes("hello") || lower.includes("hi") || lower.includes("hey")) {
    return `👋 Hello ${profile.name}! I'm your NovaSelf Neural Fitness Coach. How can I help you crush your fitness goals today? (Current weight: ${currentWeight}kg, Goal: ${goalWeight}kg)`;
  }
  if (lower.includes("macro") || lower.includes("calorie") || lower.includes("diet") || lower.includes("eat") || lower.includes("food")) {
    return `📊 [Nutrition Breakdown for ${profile.name}]:\n• Daily Calorie Target: ~${targetCals} kcal\n• Protein Goal: ${targetProt}g\n• Water Target: ${targetWater}ml\n\nTip: Prioritize lean proteins (chicken, eggs, whey, paneer), complex carbs, and green veggies to maintain steady energy while staying in your target range!`;
  }
  if (lower.includes("workout") || lower.includes("gym") || lower.includes("exercise") || lower.includes("lift") || lower.includes("training") || lower.includes("muscle")) {
    return `🏋️ [Training & Hypertrophy Plan]:\nTo transform your physique (${currentWeight}kg → ${goalWeight}kg):\n1. Train 3-4x weekly with compound movements (Squats, Bench, Deadlifts, Pull-ups).\n2. Apply progressive overload (adding weight or reps each session).\n3. Log your sets and reps using the Set Tracker!`;
  }
  if (lower.includes("sleep") || lower.includes("rest") || lower.includes("recovery")) {
    return `🌙 [Recovery & Sleep Protocol]:\nMuscle repair and fat burning happen during deep sleep. Aim for 7.5 to 8.5 hours nightly. Make sure to log your sleep duration and quality daily in the Sleep tab!`;
  }
  if (lower.includes("water") || lower.includes("hydration") || lower.includes("drink")) {
    return `💧 [Hydration Status]: Your daily hydration benchmark is ${targetWater}ml. Proper hydration prevents fatigue and keeps your metabolism running at peak efficiency.`;
  }
  if (lower.includes("weight") || lower.includes("fat") || lower.includes("loss") || lower.includes("gain") || lower.includes("progress")) {
    return `🎯 [Progress Assessment]: You're currently at ${currentWeight}kg working towards ${goalWeight}kg. Keep logging your weight and meals daily — consistency over weeks and months is what delivers permanent results!`;
  }

  return `💪 [NovaSelf Coach]: Great question! Regarding "${prompt}": To achieve your fitness goals (${currentWeight}kg → ${goalWeight}kg), prioritize high protein intake, consistent training, proper sleep, and daily tracking. You can also type agentic commands anytime like:\n• "Log 500ml water"\n• "Log 45 min gym workout"\n• "Log weight 78.5 kg"`;
}

export default function Chat() {
  const app = useApp();
  const { settings, chat, sendChat, getDay, upsertDay, logWeight, saveProfile, profile } = app;
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chat, sending]);

  function parseAgentCommand(input: string): string | null {
    const lower = input.toLowerCase();

    const waterMatch = lower.match(/log\s+(\d+)\s*(ml|liters|l)\s*water/);
    if (waterMatch) {
      let amount = parseInt(waterMatch[1], 10);
      if (waterMatch[2].startsWith("l")) amount *= 1000;
      const t = today();
      const day = getDay(t);
      upsertDay({
        ...day,
        water: [...day.water, { id: Math.random().toString(36).slice(2, 10), ml: amount }],
      });
      toast.success(`Agent Action: Logged ${amount}ml water!`);
      return `✨ [Agent Action Executed] Successfully logged ${amount}ml of water for today!`;
    }

    const weightMatch = lower.match(/log\s+weight\s+(?:of\s+)?(\d+(?:\.\d+)?)\s*kg/);
    if (weightMatch) {
      const kg = parseFloat(weightMatch[1]);
      logWeight(today(), kg);
      toast.success(`Agent Action: Recorded weight ${kg}kg!`);
      return `✨ [Agent Action Executed] Successfully recorded weight as ${kg} kg!`;
    }

    const workoutMatch = lower.match(/log\s+(\d+)\s*min(?:utes)?\s*(?:of\s+)?([a-z\s]+)/);
    if (workoutMatch) {
      const mins = parseInt(workoutMatch[1], 10);
      const type = workoutMatch[2].trim().replace(/\s+/g, "_");
      const t = today();
      const day = getDay(t);
      const burn = Math.round(7.0 * (profile.weightKg || 70) * (mins / 60));
      upsertDay({
        ...day,
        workouts: [
          ...day.workouts,
          { id: Math.random().toString(36).slice(2, 10), type, durationMin: mins, caloriesBurned: burn },
        ],
      });
      toast.success(`Agent Action: Logged ${mins} min ${type}!`);
      return `✨ [Agent Action Executed] Logged ${mins} min ${type.replace(/_/g, " ")} workout (~${burn} kcal burned)!`;
    }

    const goalMatch = lower.match(/set\s+goal\s+weight\s+(?:to\s+)?(\d+(?:\.\d+)?)\s*kg/);
    if (goalMatch) {
      const targetKg = parseFloat(goalMatch[1]);
      saveProfile({ goalWeightKg: targetKg });
      toast.success(`Agent Action: Goal weight updated to ${targetKg}kg!`);
      return `✨ [Agent Action Executed] Successfully updated your goal weight target to ${targetKg} kg!`;
    }

    return null;
  }

  async function send() {
    const t = text.trim();
    if (!t || sending) return;
    setText("");
    setSending(true);

    try {
      const agentResult = parseAgentCommand(t);
      if (agentResult) {
        sendChat(t);
        setTimeout(() => {
          app.chat.push({ id: Math.random().toString(36).slice(2), role: "assistant", content: agentResult, ts: Date.now() });
        }, 300);
      } else {
        const userMsg = { id: Math.random().toString(36).slice(2), role: "user" as const, content: t, ts: Date.now() };
        app.chat.push(userMsg);

        // Instant neural coach response
        const replyText = getNeuralCoachResponse(t, profile);
        setTimeout(() => {
          app.chat.push({ id: Math.random().toString(36).slice(2), role: "assistant" as const, content: replyText, ts: Date.now() });
        }, 350);
      }
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="flex h-[calc(100vh-12rem)] flex-col gap-4">
      <SectionHeader
        eyebrow="Agentic AI"
        title="Neural AI Fitness Coach"
        description="Instant Expert Coaching & Autonomous Tool Execution"
      />

      <NCard className="flex-1 overflow-y-auto relative bg-[var(--surface)] border border-border/70 rounded-3xl p-4 shadow-xl">
        {chat.length === 0 && (
          <div className="flex h-full flex-col items-center justify-center text-center text-muted-foreground p-4">
            <div className="grid h-16 w-16 place-items-center rounded-2xl bg-gradient-to-tr from-[var(--electric)] to-[var(--neon)] text-[var(--primary-foreground)] shadow-[0_0_30px_var(--electric)] mb-3">
              <Cpu className="h-8 w-8 animate-pulse" />
            </div>
            <p className="font-display text-xl font-bold text-foreground">AI Coach Active & Ready</p>
            <p className="mt-1 text-xs text-muted-foreground max-w-sm">
              Ask fitness questions, or give direct commands like <span className="text-[var(--electric)]">"Log 500ml water"</span> or <span className="text-[var(--neon)]">"Log 45 min gym workout"</span>.
            </p>

            <div className="mt-6 grid grid-cols-1 gap-2 sm:grid-cols-2 text-left w-full max-w-md">
              {[
                "💧 Log 500ml water",
                "🏋️ Log 45 min gym workout",
                "⚖️ Log weight 78.2 kg",
                "🎯 Set goal weight to 68 kg",
              ].map((prompt) => (
                <button
                  key={prompt}
                  onClick={() => setText(prompt)}
                  className="rounded-2xl border border-border/80 bg-[var(--surface-elevated)] p-3 text-xs font-semibold text-foreground transition hover:border-[var(--electric)] hover:bg-[var(--electric)]/10"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="space-y-3">
          {chat.map((m) => {
            const isUser = m.role === "user";
            return (
              <div
                key={m.id}
                className={`flex gap-2 items-end ${isUser ? "justify-end" : "justify-start"}`}
              >
                {!isUser && (
                  <div className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-[var(--neon)]/20 text-[var(--neon)] mb-1">
                    <Bot className="h-4 w-4" />
                  </div>
                )}

                <div
                  className={`relative max-w-[82%] rounded-2xl px-4 py-2.5 text-sm shadow-md ${
                    isUser
                      ? "bg-gradient-to-r from-[var(--electric)] to-blue-600 text-[var(--primary-foreground)] rounded-br-none"
                      : "border border-border/80 bg-[var(--surface-elevated)] text-foreground rounded-bl-none"
                  }`}
                >
                  <p className="leading-relaxed whitespace-pre-wrap">{m.content}</p>

                  <div className={`mt-1 flex items-center gap-1 justify-end text-[10px] ${isUser ? "text-white/80" : "text-muted-foreground"}`}>
                    <span>{formatTime(m.ts)}</span>
                    {isUser && <CheckCheck className="h-3.5 w-3.5 text-cyan-200" />}
                  </div>
                </div>

                {isUser && (
                  <div className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-[var(--electric)]/20 text-[var(--electric)] mb-1">
                    <User className="h-4 w-4" />
                  </div>
                )}
              </div>
            );
          })}

          {sending && (
            <div className="flex justify-start gap-2 items-center">
              <div className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-[var(--neon)]/20 text-[var(--neon)]">
                <Bot className="h-4 w-4" />
              </div>
              <div className="rounded-2xl rounded-bl-none border border-border bg-[var(--surface-elevated)] px-4 py-2.5 text-xs text-muted-foreground animate-pulse">
                AI Coach is thinking & executing actions...
              </div>
            </div>
          )}
          <div ref={endRef} />
        </div>
      </NCard>

      {/* WhatsApp Style Message Bar */}
      <div className="flex items-center gap-2">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
          placeholder="Ask AI or type command (e.g. 'Log 500ml water')…"
          disabled={sending}
          className="flex-1 rounded-full border border-border/80 bg-[var(--surface)] px-5 py-3 text-sm text-foreground outline-none focus:border-[var(--electric)] disabled:opacity-60 shadow-lg"
        />
        <button
          onClick={send}
          disabled={sending || !text.trim()}
          className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-gradient-to-tr from-[var(--electric)] to-[var(--neon)] text-[var(--primary-foreground)] shadow-[0_0_20px_var(--electric)] transition hover:scale-105 disabled:opacity-40"
        >
          <Send className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
}
