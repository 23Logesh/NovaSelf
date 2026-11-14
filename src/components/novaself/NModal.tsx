import type { ReactNode } from "react";
import { X } from "lucide-react";

interface NModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
}

export function NModal({ isOpen, onClose, title, children }: NModalProps) {
  if (!isOpen) return null;

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-start justify-center pt-12 sm:pt-16 p-3 sm:p-4 bg-black/85 backdrop-blur-md overflow-y-auto animate-fade-in"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-sm mx-auto rounded-3xl border border-border bg-[var(--surface)] p-5 sm:p-6 shadow-2xl text-foreground space-y-4 max-h-[85vh] overflow-y-auto animate-scale-up"
      >
        {title && (
          <div className="flex items-center justify-between pb-3 border-b border-border/60">
            <span className="text-xs font-bold text-[var(--electric)] uppercase tracking-wider">
              {title}
            </span>
            <button
              onClick={onClose}
              className="grid h-7 w-7 place-items-center rounded-full bg-[var(--surface-elevated)] text-muted-foreground hover:text-foreground transition"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}
        {children}
      </div>
    </div>
  );
}
