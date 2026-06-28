import { useState } from "react";
import { Plus, BookOpen } from "lucide-react";
import { NCard } from "@/components/novaself/NCard";
import { useApp, today } from "@/lib/novaself/store";

const uid = () => Math.random().toString(36).slice(2, 10);

const ic =
  "rounded-lg border border-border bg-[var(--surface-elevated)] px-3 py-2 text-sm outline-none focus:border-[var(--electric)] w-full";

/**
 * Compact "log a reading session" form.
 * Only shows books that aren't yet completed (same as Books.tsx).
 * Used by both Log.tsx (Books tab) and the standalone Books page.
 */
export function ReadingSessionForm() {
  const { books, logReading } = useApp();
  const reading = books.filter((b) => !b.completed);

  const [session, setSession] = useState({
    bookId: reading[0]?.id ?? "",
    pages: 20,
    minutes: 30,
    notes: "",
  });

  // Keep bookId in sync if the reading list changes (e.g. first book added).
  const bookId = reading.find((b) => b.id === session.bookId)
    ? session.bookId
    : reading[0]?.id ?? "";

  function submit() {
    if (!bookId || session.pages <= 0) return;
    logReading({
      id: uid(),
      bookId,
      date: today(),
      pages: session.pages,
      minutes: session.minutes,
      notes: session.notes || undefined,
    });
    setSession((s) => ({ ...s, pages: 20, minutes: 30, notes: "" }));
  }

  if (reading.length === 0) {
    return (
      <NCard>
        <div className="flex items-center gap-2 py-6 text-center text-sm text-muted-foreground justify-center">
          <BookOpen className="h-4 w-4" />
          No books in progress.{" "}
          <span className="text-[var(--electric)]">Add one on the Books page.</span>
        </div>
      </NCard>
    );
  }

  return (
    <NCard>
      <h3 className="mb-3 text-xs uppercase tracking-wider text-muted-foreground">Log reading session</h3>
      <div className="space-y-2">
        <select
          value={bookId}
          onChange={(e) => setSession({ ...session, bookId: e.target.value })}
          className={ic}
        >
          {reading.map((b) => (
            <option key={b.id} value={b.id}>
              {b.title}
            </option>
          ))}
        </select>
        <div className="grid grid-cols-2 gap-2">
          <label className="block">
            <span className="mb-1 block text-[10px] uppercase tracking-wider text-muted-foreground">Pages read</span>
            <input
              type="number"
              min={1}
              value={session.pages || ""}
              onChange={(e) => setSession({ ...session, pages: +e.target.value })}
              className={ic}
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-[10px] uppercase tracking-wider text-muted-foreground">Minutes</span>
            <input
              type="number"
              min={1}
              value={session.minutes || ""}
              onChange={(e) => setSession({ ...session, minutes: +e.target.value })}
              className={ic}
            />
          </label>
        </div>
        <input
          placeholder="Notes (optional)"
          value={session.notes}
          onChange={(e) => setSession({ ...session, notes: e.target.value })}
          className={ic}
        />
        <button
          onClick={submit}
          className="mt-1 flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--neon)] py-2.5 text-sm font-semibold text-[var(--accent-foreground)] transition hover:opacity-90"
        >
          <Plus className="h-4 w-4" /> Log session
        </button>
      </div>

      {/* Mini progress summary for currently selected book */}
      {(() => {
        const b = books.find((x) => x.id === bookId);
        if (!b) return null;
        const pct = Math.min(100, (b.pagesRead / b.totalPages) * 100);
        return (
          <div className="mt-4">
            <div className="mb-1 flex justify-between text-xs text-muted-foreground tabular-nums">
              <span>{b.pagesRead} / {b.totalPages} pages</span>
              <span>{pct.toFixed(0)}%</span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-gradient-to-r from-[var(--electric)] to-[var(--neon)] transition-all"
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        );
      })()}
    </NCard>
  );
}