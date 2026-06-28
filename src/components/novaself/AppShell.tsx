import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import {
  Activity, Apple, BookOpen, Dumbbell, Home, Pill, Settings as Cog,
  Sparkles, Sun, Moon, LineChart, Salad, Droplets, MessageSquare,
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
  const { settings, updateSettings, profile } = useApp();
  const { pathname } = useLocation();
  // FR-37: AI Chat only appears in navigation when an Ollama URL is configured.
  const aiChatAvailable = settings.ollamaUrl.trim().length > 0;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-30 border-b border-border/60 bg-background/70 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3">
          <Link to="/dashboard" className="flex items-center gap-2">
            <div className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-[var(--electric)] to-[var(--neon)] text-[var(--primary-foreground)] shadow-[0_0_24px_var(--electric)]">
              <Apple className="h-5 w-5" />
            </div>
            <div className="flex flex-col leading-tight">
              <span className="font-display text-lg font-bold tracking-tight">NovaSelf</span>
              <span className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">{profile.name}</span>
            </div>
          </Link>

          <nav className="hidden items-center gap-1 lg:flex">
            {[...nav, ...moreNav]
              .filter((item) => !("gated" in item && item.gated) || aiChatAvailable)
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
            className="grid h-9 w-9 place-items-center rounded-full border border-border bg-[var(--surface)] text-muted-foreground transition hover:text-foreground"
            aria-label="Toggle theme"
          >
            {settings.theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 pb-28 pt-6 lg:pb-12">
        <Outlet />
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-border/60 bg-background/85 backdrop-blur-xl lg:hidden">
        <div className="mx-auto grid max-w-md grid-cols-5 px-2 py-1.5">
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
        </div>
      </nav>
    </div>
  );
}