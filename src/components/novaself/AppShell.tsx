import { useState } from "react";
import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  Activity, Apple, BookOpen, Dumbbell, Home, Pill, Settings as Cog,
  Sparkles, Sun, Moon, LineChart, Salad, Droplets, MessageSquare,
  MoreHorizontal, X, AlertTriangle,
} from "lucide-react";
import { useApp } from "@/lib/novaself/store";

const nav = [
  { to: "/dashboard", label: "Home", icon: Home },
  { to: "/log", label: "Log", icon: Droplets },
  { to: "/body", label: "Body", icon: Activity },
  { to: "/progress", label: "Trend", icon: LineChart },
  { to: "/diet", label: "Diet", icon: Salad },
] as const;

const moreNav = [
  { to: "/workout", label: "Workout", icon: Dumbbell },
  { to: "/skin", label: "Skin & Hair", icon: Sparkles },
  { to: "/supplements", label: "Supplements", icon: Pill },
  { to: "/books", label: "Books", icon: BookOpen },
  { to: "/chat", label: "AI Chat", icon: MessageSquare, gated: true },
  { to: "/settings", label: "Settings", icon: Cog },
] as const;

export function AppShell() {
  const { settings, updateSettings, profile, googleAccount, sheetLoadWarning, clearSheetLoadWarning } = useApp();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const [moreOpen, setMoreOpen] = useState(false);

  const aiChatAvailable = settings.ollamaUrl.trim().length > 0;
  const moreNavActive = moreNav.some((item) => pathname.startsWith(item.to));
  const visibleMoreNav = moreNav.filter(
    (item) => !(("gated" in item) && item.gated) || aiChatAvailable,
  );

  function handleMoreNavClick(to: string) {
    setMoreOpen(false);
    navigate(to);
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-30 border-b border-border/60 bg-background/70 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3">
          <Link to="/dashboard" className="flex min-w-0 items-center gap-2">
            <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-[var(--electric)] to-[var(--neon)] text-[var(--primary-foreground)] shadow-[0_0_24px_var(--electric)]">
              <Apple className="h-5 w-5" />
            </div>
            <div className="flex min-w-0 flex-col leading-tight">
              <span className="font-display text-lg font-bold tracking-tight">NovaSelf</span>
              <span className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                {profile.name || "—"}
              </span>
              {/* Google account email — shown when signed in, truncated to avoid overflow */}
              {googleAccount?.email && (
                <span
                  className="max-w-[160px] truncate text-[9px] leading-tight text-muted-foreground/60"
                  title={googleAccount.email}
                >
                  {googleAccount.email}
                </span>
              )}
            </div>
          </Link>

          <nav className="hidden items-center gap-1 lg:flex">
            {[...nav, ...moreNav]
              .filter((item) => !(("gated" in item) && item.gated) || aiChatAvailable)
              .map((item) => {
                const Icon = item.icon;
                const active = pathname.startsWith(item.to);
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm transition-all ${
                      active
                        ? "bg-[var(--electric)]/15 text-[var(--electric)]"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    <span>{item.label}</span>
                  </NavLink>
                );
              })}
          </nav>

          <button
            onClick={() => updateSettings({ theme: settings.theme === "dark" ? "light" : "dark" })}
            className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-border bg-[var(--surface)] text-muted-foreground transition hover:text-foreground"
            aria-label="Toggle theme"
          >
            {settings.theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 pb-28 pt-6 lg:pb-12">
        {sheetLoadWarning && (
          <div className="mb-4 flex items-start gap-3 rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-400">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <span className="flex-1">{sheetLoadWarning}</span>
            <button
              onClick={clearSheetLoadWarning}
              className="shrink-0 text-amber-400/60 transition hover:text-amber-400"
              aria-label="Dismiss warning"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}
        <Outlet />
      </main>

      {/* ── Mobile bottom nav ── */}
      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-border/60 bg-background/85 backdrop-blur-xl lg:hidden">
        <div className="mx-auto grid max-w-md grid-cols-6 px-2 py-1.5">
          {nav.map((item) => {
            const Icon = item.icon;
            const active = pathname.startsWith(item.to);
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={`flex flex-col items-center gap-1 rounded-lg py-2 text-[10px] transition ${
                  active ? "text-[var(--electric)]" : "text-muted-foreground"
                }`}
              >
                <Icon className={`h-5 w-5 transition ${active ? "drop-shadow-[0_0_6px_var(--electric)]" : ""}`} />
                <span>{item.label}</span>
              </NavLink>
            );
          })}

          <button
            onClick={() => setMoreOpen(true)}
            className={`flex flex-col items-center gap-1 rounded-lg py-2 text-[10px] transition ${
              moreNavActive || moreOpen ? "text-[var(--electric)]" : "text-muted-foreground"
            }`}
            aria-label="More screens"
          >
            <MoreHorizontal
              className={`h-5 w-5 transition ${
                moreNavActive || moreOpen ? "drop-shadow-[0_0_6px_var(--electric)]" : ""
              }`}
            />
            <span>More</span>
          </button>
        </div>
      </nav>

      {/* ── More bottom sheet (mobile only) ── */}
      {moreOpen && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden"
            onClick={() => setMoreOpen(false)}
            aria-hidden="true"
          />
          <div className="fixed inset-x-0 bottom-0 z-50 rounded-t-2xl border-t border-border/60 bg-background pb-safe lg:hidden">
            <div className="flex items-center justify-between px-5 pb-2 pt-4">
              <span className="text-sm font-semibold text-foreground">More</span>
              <button
                onClick={() => setMoreOpen(false)}
                className="grid h-7 w-7 place-items-center rounded-full bg-[var(--surface)] text-muted-foreground transition hover:text-foreground"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="grid grid-cols-3 gap-2 px-4 pb-8 pt-2">
              {visibleMoreNav.map((item) => {
                const Icon = item.icon;
                const active = pathname.startsWith(item.to);
                return (
                  <button
                    key={item.to}
                    onClick={() => handleMoreNavClick(item.to)}
                    className={`flex flex-col items-center gap-2 rounded-xl px-3 py-4 text-xs font-medium transition ${
                      active
                        ? "bg-[var(--electric)]/15 text-[var(--electric)]"
                        : "bg-[var(--surface)] text-muted-foreground hover:bg-muted hover:text-foreground"
                    }`}
                  >
                    <Icon className={`h-6 w-6 ${active ? "drop-shadow-[0_0_6px_var(--electric)]" : ""}`} />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}