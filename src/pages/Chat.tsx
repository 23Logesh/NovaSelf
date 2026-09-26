import { useEffect, useRef, useState } from "react";
import { Navigate } from "react-router-dom";
import { Send, Sparkles } from "lucide-react";
import { NCard } from "@/components/novaself/NCard";
import { SectionHeader } from "@/components/novaself/SectionHeader";
import { useApp } from "@/lib/novaself/store";

export default function Chat() {
  const { settings, chat, sendChat } = useApp();
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [chat, sending]);

  // FR-37: AI Chat is only reachable when an Ollama URL is actually
  // configured — no separate manual enable switch anymore.
  if (!settings.ollamaUrl.trim()) return <Navigate to="/settings" replace />;

  async function send() {
    const t = text.trim();
    if (!t || sending) return;
    setText("");
    setSending(true);
    try {
      await sendChat(t);
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="flex h-[calc(100vh-12rem)] flex-col gap-4">
      <SectionHeader eyebrow="Assistant" title="AI Chat" description={`Connected to ${settings.ollamaUrl}`} />

      <NCard className="flex-1 overflow-y-auto">
        {chat.length === 0 && (
          <div className="flex h-full flex-col items-center justify-center text-center text-muted-foreground">
            <Sparkles className="mb-3 h-10 w-10 text-[var(--electric)]" />
            <p className="font-display text-lg">Ask anything about your training, diet, or stats.</p>
            <p className="mt-1 text-sm">Connects live to your Ollama server configured in /settings.</p>
          </div>
        )}
        <div className="space-y-3">
          {chat.map((m) => (
            <div key={m.id} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm ${
                m.role === "user"
                  ? "bg-[var(--electric)] text-[var(--primary-foreground)]"
                  : "border border-border bg-[var(--surface-elevated)] text-foreground"
              }`}>{m.content}</div>
            </div>
          ))}
          {sending && (
            <div className="flex justify-start">
              <div className="max-w-[80%] rounded-2xl border border-border bg-[var(--surface-elevated)] px-4 py-2.5 text-sm text-muted-foreground">
                Thinking…
              </div>
            </div>
          )}
          <div ref={endRef} />
        </div>
      </NCard>

      <div className="flex gap-2">
        <input value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === "Enter" && send()}
          placeholder="Type a message…" disabled={sending}
          className="flex-1 rounded-2xl border border-border bg-[var(--surface)] px-4 py-3 text-sm outline-none focus:border-[var(--electric)] disabled:opacity-60" />
        <button onClick={send} disabled={sending} className="grid h-12 w-12 place-items-center rounded-2xl bg-[var(--electric)] text-[var(--primary-foreground)] shadow-[0_0_18px_var(--electric)] disabled:opacity-60">
          <Send className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
}