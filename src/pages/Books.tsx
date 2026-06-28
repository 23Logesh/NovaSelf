import { useState } from "react";
import { BookOpen, Plus, X, Check } from "lucide-react";
import { NCard } from "@/components/novaself/NCard";
import { SectionHeader } from "@/components/novaself/SectionHeader";
import { ReadingSessionForm } from "@/components/novaself/ReadingSessionForm";
import { useApp } from "@/lib/novaself/store";
import type { Book } from "@/lib/novaself/types";

const uid = () => Math.random().toString(36).slice(2, 10);

export default function Books() {
  const { books, setBooks } = useApp();
  const reading = books.filter((b) => !b.completed);
  const completed = books.filter((b) => b.completed);
  const [draft, setDraft] = useState<Book>({
    id: uid(), title: "", author: "", totalPages: 0, pagesRead: 0, completed: false,
  });

  return (
    <div className="space-y-7">
      <SectionHeader
        eyebrow="Mind"
        title="Reading log"
        description="Track books and reading sessions. Auto-shelved at 100%."
      />

      <NCard>
        <h3 className="mb-3 text-xs uppercase tracking-wider text-muted-foreground">Add book</h3>
        <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
          <input
            placeholder="Title"
            value={draft.title}
            onChange={(e) => setDraft({ ...draft, title: e.target.value })}
            className={ic + " md:col-span-2"}
          />
          <input
            placeholder="Author"
            value={draft.author}
            onChange={(e) => setDraft({ ...draft, author: e.target.value })}
            className={ic}
          />
          <input
            type="number"
            placeholder="Pages"
            value={draft.totalPages || ""}
            onChange={(e) => setDraft({ ...draft, totalPages: +e.target.value })}
            className={ic}
          />
        </div>
        <button
          onClick={() => {
            if (!draft.title.trim() || !draft.totalPages) return;
            setBooks([...books, { ...draft, id: uid() }]);
            setDraft({ id: uid(), title: "", author: "", totalPages: 0, pagesRead: 0, completed: false });
          }}
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--electric)] py-2.5 text-sm font-semibold text-[var(--primary-foreground)]"
        >
          <Plus className="h-4 w-4" /> Add book
        </button>
      </NCard>

      <div>
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">Currently reading</h3>
        {reading.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted-foreground">Nothing in progress — add a book above.</p>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {reading.map((b) => {
              const pct = (b.pagesRead / b.totalPages) * 100;
              return (
                <NCard key={b.id}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <BookOpen className="h-4 w-4 shrink-0 text-[var(--neon)]" />
                        <span className="truncate font-display text-lg font-bold">{b.title}</span>
                      </div>
                      <div className="mt-0.5 text-xs text-muted-foreground">{b.author}</div>
                    </div>
                    <button
                      onClick={() => setBooks(books.filter((x) => x.id !== b.id))}
                      className="shrink-0 text-muted-foreground hover:text-destructive"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-[var(--electric)] to-[var(--neon)]"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <div className="mt-1 flex justify-between text-xs text-muted-foreground tabular-nums">
                    <span>{b.pagesRead} / {b.totalPages} pages</span>
                    <span>{pct.toFixed(0)}%</span>
                  </div>
                </NCard>
              );
            })}
          </div>
        )}
      </div>

      <ReadingSessionForm />

      {completed.length > 0 && (
        <div>
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">Completed</h3>
          <div className="grid gap-2 md:grid-cols-3">
            {completed.map((b) => (
              <div
                key={b.id}
                className="flex items-center gap-2 rounded-xl border border-[var(--neon)]/30 bg-[var(--neon)]/5 p-3 text-sm"
              >
                <Check className="h-4 w-4 shrink-0 text-[var(--neon)]" />
                <span className="truncate">{b.title}</span>
                <button
                  onClick={() => setBooks(books.filter((x) => x.id !== b.id))}
                  className="ml-auto shrink-0 text-muted-foreground hover:text-destructive"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

const ic = "rounded-lg border border-border bg-[var(--surface-elevated)] px-3 py-2 text-sm outline-none focus:border-[var(--electric)]";