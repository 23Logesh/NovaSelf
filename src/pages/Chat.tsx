import { useEffect, useRef, useState } from "react";
import { Send, Sparkles, CheckCheck, Bot, User, Cpu, RotateCcw, Paperclip, Camera, X } from "lucide-react";
import { toast } from "sonner";
import { NCard } from "@/components/novaself/NCard";
import { SectionHeader } from "@/components/novaself/SectionHeader";
import { useApp, today, AppState } from "@/lib/novaself/store";
import { runGemini, toHistory, type Attachment } from "@/lib/novaself/geminiClient";
import { toolDeclarations, buildContext, SYSTEM_PROMPT, runTool } from "@/lib/novaself/aiTools";
import { fileToAttachment } from "@/lib/novaself/attachments";

function formatTime(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export default function Chat() {
  const app = useApp();
  const { settings, chat, appendChat, getDay, upsertDay, logWeight, saveProfile, profile } = app;
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [pending, setPending] = useState<Attachment[]>([]);
  const [undo, setUndo] = useState<Partial<AppState> | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chat, sending]);

  async function handleFiles(files: FileList | null) {
    if (!files || !files.length) return;
    const items = Array.from(files);
    if (pending.length + items.length > 4) {
      toast.error("Maximum 4 attachments allowed per message");
      return;
    }
    const newAtts: Attachment[] = [];
    for (const file of items) {
      try {
        const att = await fileToAttachment(file);
        newAtts.push(att);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : String(e));
      }
    }
    if (newAtts.length) {
      setPending((prev) => [...prev, ...newAtts]);
    }
  }

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
    if ((!t && !pending.length) || sending) return;
    setText("");
    setSending(true);
    setUndo(null);

    try {
      if (!pending.length) {
        const agentResult = parseAgentCommand(t);
        if (agentResult) {
          appendChat({ id: Math.random().toString(36).slice(2), role: "user", content: t, ts: Date.now() });
          setTimeout(() => {
            appendChat({ id: Math.random().toString(36).slice(2), role: "assistant", content: agentResult, ts: Date.now() });
          }, 300);
          setSending(false);
          return;
        }
      }

      if (settings.aiProvider === "gemini" && settings.aiApiKey) {
        const history = toHistory(chat);
        appendChat({
          id: Math.random().toString(36).slice(2),
          role: "user",
          content: t || "(attachment)",
          ts: Date.now(),
          attachments: pending.map((a) => ({ name: a.name, kind: a.kind, thumb: a.thumb })),
        });

        const { chat: _c, settings: _s, ...before } = structuredClone(app.getState());
        let acted = 0;

        const reply = await runGemini({
          apiKey: settings.aiApiKey,
          preferredModel: settings.aiModel,
          systemText: SYSTEM_PROMPT + "\n\nAPP DATA:\n" + buildContext(app.getState()),
          history,
          userText: t,
          attachments: pending,
          tools: toolDeclarations,
          executeTool: (name, args) => app.aiMutate((s) => runTool(s, name, args)),
          onAction: (name, _a, r) => {
            if (r.ok) {
              acted++;
              toast.success(`AI Action: ${name}`);
            } else {
              toast.error(`AI Action failed: ${name} (${r.error})`);
            }
          },
        });

        appendChat({ id: Math.random().toString(36).slice(2), role: "assistant", content: reply, ts: Date.now() });
        if (acted > 0) setUndo(before);
        setPending([]);
      } else {
        const userMsg = {
          id: Math.random().toString(36).slice(2),
          role: "user" as const,
          content: t,
          ts: Date.now(),
          attachments: pending.map((a) => ({ name: a.name, kind: a.kind, thumb: a.thumb })),
        };
        appendChat(userMsg);
        setPending([]);

        if (settings.aiProvider === "openai" && settings.aiApiKey) {
          const modelName = settings.aiModel && settings.aiModel.includes("gpt") ? settings.aiModel.trim() : "gpt-4o-mini";
          const res = await fetch("https://api.openai.com/v1/chat/completions", {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${settings.aiApiKey}` },
            body: JSON.stringify({
              model: modelName,
              messages: [
                { role: "system", content: `You are NovaSelf AI Fitness Coach. User name: ${profile.name}, Weight: ${profile.weightKg}kg, Goal: ${profile.goalWeightKg}kg.` },
                { role: "user", content: t },
              ],
            }),
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data.error?.message || `OpenAI error ${res.status}`);
          const replyText = data.choices?.[0]?.message?.content || "No response from OpenAI.";
          appendChat({ id: Math.random().toString(36).slice(2), role: "assistant" as const, content: replyText, ts: Date.now() });
        } else if (settings.ollamaUrl) {
          const res = await fetch(`${settings.ollamaUrl}/api/generate`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ model: "llama3", prompt: t, stream: false }),
          });
          const data = await res.json();
          const replyText = data.response || "No response from Ollama.";
          appendChat({ id: Math.random().toString(36).slice(2), role: "assistant" as const, content: replyText, ts: Date.now() });
        } else {
          throw new Error("Please configure your Gemini API Key in Settings.");
        }
      }
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      appendChat({
        id: Math.random().toString(36).slice(2),
        role: "assistant" as const,
        content: `❌ [AI Error]: ${errMsg}`,
        ts: Date.now(),
      });
    } finally {
      setSending(false);
    }
  }

  function handleUndo() {
    if (!undo) return;
    app.restoreData(undo);
    setUndo(null);
    toast.success("AI changes undone!");
    appendChat({
      id: Math.random().toString(36).slice(2),
      role: "assistant",
      content: "🔄 [Undo applied] Reverted app data to the state before the AI action.",
      ts: Date.now(),
    });
  }

  return (
    <div className="flex h-[calc(100vh-12rem)] flex-col gap-4">
      <SectionHeader
        eyebrow="Gemini Agent"
        title="NovaSelf AI Coach & Agent"
        description="Full app read/write capabilities via tool calling & Gemini API"
      />

      <NCard className="flex-1 overflow-y-auto relative bg-[var(--surface)] border border-border/70 rounded-3xl p-4 shadow-xl">
        {chat.length === 0 && (
          <div className="flex h-full flex-col items-center justify-center text-center text-muted-foreground p-4">
            <div className="grid h-16 w-16 place-items-center rounded-2xl bg-gradient-to-tr from-[var(--electric)] to-[var(--neon)] text-[var(--primary-foreground)] shadow-[0_0_30px_var(--electric)] mb-3">
              <Cpu className="h-8 w-8 animate-pulse" />
            </div>
            <p className="font-display text-xl font-bold text-foreground">Gemini Agent Ready</p>
            <p className="mt-1 text-xs text-muted-foreground max-w-sm">
              Ask anything, attach meal/nutrition photos or plans, or command the AI to log food, workouts, & stats!
            </p>

            <div className="mt-6 grid grid-cols-1 gap-2 sm:grid-cols-2 text-left w-full max-w-md">
              {[
                "📊 How is my day going?",
                "🍳 Log 2 eggs and toast for breakfast",
                "💧 Log 500ml water",
                "⚖️ Log weight 78.2 kg",
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
          {chat.map((m, idx) => {
            const isUser = m.role === "user";
            const isLatestAssistant = !isUser && idx === chat.length - 1;
            return (
              <div key={m.id} className="space-y-1">
                <div className={`flex gap-2 items-end ${isUser ? "justify-end" : "justify-start"}`}>
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
                    {m.attachments && m.attachments.length > 0 && (
                      <div className="mb-2 flex flex-wrap gap-2">
                        {m.attachments.map((att, i) => (
                          <div key={i} className="flex items-center gap-1.5 rounded-lg bg-black/30 px-2 py-1 text-xs text-white">
                            {att.thumb ? (
                              <img src={att.thumb} alt={att.name} className="h-8 w-8 rounded object-cover" />
                            ) : (
                              <Paperclip className="h-3.5 w-3.5" />
                            )}
                            <span className="truncate max-w-[120px]">{att.name}</span>
                          </div>
                        ))}
                      </div>
                    )}

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

                {isLatestAssistant && undo && (
                  <div className="flex justify-start pl-9">
                    <button
                      onClick={handleUndo}
                      className="flex items-center gap-1.5 rounded-xl border border-amber-500/40 bg-amber-500/10 px-3 py-1.5 text-xs font-semibold text-amber-500 hover:bg-amber-500/20 transition"
                    >
                      <RotateCcw className="h-3.5 w-3.5" />
                      Undo AI changes
                    </button>
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
                Gemini Agent reasoning & executing tools...
              </div>
            </div>
          )}
          <div ref={endRef} />
        </div>
      </NCard>

      {/* Pending Attachments Preview */}
      {pending.length > 0 && (
        <div className="flex flex-wrap gap-2 px-2">
          {pending.map((att, i) => (
            <div key={i} className="flex items-center gap-2 rounded-xl border border-border bg-[var(--surface)] px-3 py-1.5 text-xs shadow">
              {att.thumb ? (
                <img src={att.thumb} alt={att.name} className="h-7 w-7 rounded object-cover" />
              ) : (
                <Paperclip className="h-4 w-4 text-[var(--electric)]" />
              )}
              <span className="truncate max-w-[140px] text-foreground font-medium">{att.name}</span>
              <button
                onClick={() => setPending((prev) => prev.filter((_, idx) => idx !== i))}
                className="rounded-full p-1 text-muted-foreground hover:bg-destructive/20 hover:text-destructive"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Hidden File / Camera Inputs */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/*,application/pdf,.csv,.txt,.json,.md,.xlsx,.xls"
        onChange={(e) => handleFiles(e.target.files)}
        className="hidden"
      />
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={(e) => handleFiles(e.target.files)}
        className="hidden"
      />

      {/* Message Input Bar */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => fileInputRef.current?.click()}
          title="Attach file or photo"
          className="grid h-12 w-12 shrink-0 place-items-center rounded-full border border-border/80 bg-[var(--surface)] text-muted-foreground hover:text-foreground hover:border-[var(--electric)] transition shadow"
        >
          <Paperclip className="h-5 w-5" />
        </button>
        <button
          onClick={() => cameraInputRef.current?.click()}
          title="Take photo with camera"
          className="grid h-12 w-12 shrink-0 place-items-center rounded-full border border-border/80 bg-[var(--surface)] text-muted-foreground hover:text-foreground hover:border-[var(--electric)] transition shadow"
        >
          <Camera className="h-5 w-5" />
        </button>

        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
          placeholder="Ask Gemini or command (e.g. 'Log 500ml water', attach meal photo)…"
          disabled={sending}
          className="flex-1 rounded-full border border-border/80 bg-[var(--surface)] px-5 py-3 text-sm text-foreground outline-none focus:border-[var(--electric)] disabled:opacity-60 shadow-lg"
        />
        <button
          onClick={send}
          disabled={sending || (!text.trim() && !pending.length)}
          className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-gradient-to-tr from-[var(--electric)] to-[var(--neon)] text-[var(--primary-foreground)] shadow-[0_0_20px_var(--electric)] transition hover:scale-105 disabled:opacity-40"
        >
          <Send className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
}
