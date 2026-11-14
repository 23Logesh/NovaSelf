import { useState, useRef } from "react";
import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  Activity, BookOpen, Dumbbell, Home, Pill, Settings as Cog,
  Sparkles, Sun, Moon, LineChart, Salad, Droplets, MessageSquare,
  Download, Compass, X,
} from "lucide-react";
import { useApp } from "@/lib/novaself/store";
import { runExport } from "@/lib/novaself/exportExcel";
import { FloatingActionButton } from "@/components/novaself/FloatingActionButton";

const nav = [
  { to: "/dashboard", label: "Home", icon: Home },
  { to: "/log", label: "Log", icon: Droplets },
  { to: "/body", label: "Body", icon: Activity },
  { to: "/progress", label: "Trend", icon: LineChart },
  { to: "/diet", label: "Diet", icon: Salad },
  { to: "/chat", label: "AI Chat", icon: MessageSquare },
] as const;

const desktopNav = [
  ...nav,
  { to: "/workout", label: "Workout", icon: Dumbbell },
  { to: "/skin", label: "Skin & Hair", icon: Sparkles },
  { to: "/sleep", label: "Sleep", icon: Moon },
  { to: "/supplements", label: "Supplements", icon: Pill },
  { to: "/books", label: "Books", icon: BookOpen },
  { to: "/settings", label: "Settings", icon: Cog },
] as const;

const swipeRoutes = [
  "/dashboard",
  "/log",
  "/body",
  "/progress",
  "/diet",
  "/workout",
  "/skin",
  "/sleep",
  "/supplements",
  "/books",
  "/chat",
  "/settings",
];

export function AppShell() {
  const app = useApp();
  const { settings, updateSettings, profile } = app;
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const [exporting, setExporting] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);

  async function handleExport() {
    setExporting(true);
    try {
      await runExport(app);
    } finally {
      setExporting(false);
    }
  }

  function handleTouchStart(e: React.TouchEvent) {
    const target = e.target as HTMLElement;
    if (target.closest("input, textarea, select, button, canvas, .recharts-wrapper, [role='slider'], [data-no-swipe]")) {
      touchStartRef.current = null;
      return;
    }
    touchStartRef.current = {
      x: e.touches[0].clientX,
      y: e.touches[0].clientY,
    };
  }

  function handleTouchEnd(e: React.TouchEvent) {
    if (!touchStartRef.current) return;
    const startX = touchStartRef.current.x;
    const startY = touchStartRef.current.y;
    const endX = e.changedTouches[0].clientX;
    const endY = e.changedTouches[0].clientY;
    touchStartRef.current = null;

    const diffX = endX - startX;
    const diffY = endY - startY;

    if (diffY < -50 && Math.abs(diffY) > Math.abs(diffX) * 1.2 && startY > window.innerHeight - 120) {
      setDrawerOpen(true);
      return;
    }

    if (Math.abs(diffX) > 60 && Math.abs(diffX) > Math.abs(diffY) * 1.5) {
      const currentIdx = swipeRoutes.findIndex((r) => pathname.startsWith(r));
      if (currentIdx !== -1) {
        if (diffX < 0 && currentIdx < swipeRoutes.length - 1) {
          navigate(swipeRoutes[currentIdx + 1]);
        } else if (diffX > 0 && currentIdx > 0) {
          navigate(swipeRoutes[currentIdx - 1]);
        }
      }
    }
  }

  const isLogSubRoute = ["/workout", "/skin", "/sleep", "/supplements", "/books"].some((r) => pathname.startsWith(r));

  function isNavActive(to: string) {
    if (to === "/log") return pathname.startsWith("/log") || isLogSubRoute;
    if (to === "/chat") return pathname.startsWith("/chat") || pathname.startsWith("/settings");
    return pathname.startsWith(to);
  }

  const transitionClass =
    settings.pageTransition === "fade"
      ? "animate-page-fade"
      : settings.pageTransition === "scale"
      ? "animate-page-scale"
      : settings.pageTransition === "flip"
      ? "animate-page-flip"
      : settings.pageTransition === "none"
      ? "animate-page-none"
      : "animate-page-slide";

  return (
    <div
      className="min-h-screen bg-background text-foreground"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <header className="sticky top-0 z-50 border-b border-border/60 bg-background/90 backdrop-blur-xl pt-[env(safe-area-inset-top,0px)]">
        <div className="mx-auto flex max-w-md items-center justify-between px-3 py-3">
          <Link to="/dashboard" className="flex items-center">
            <span className="font-display text-xl font-bold tracking-tight text-foreground">
              NovaSelf
            </span>
          </Link>

          <div className="flex shrink-0 items-center gap-1.5">
            <button
              onClick={handleExport}
              disabled={exporting}
              className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-border bg-[var(--surface)] text-muted-foreground transition hover:text-foreground disabled:opacity-50"
              aria-label="Export to Excel"
              title="Export to Excel"
            >
              <Download className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => updateSettings({ theme: settings.theme === "dark" ? "light" : "dark" })}
              className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-border bg-[var(--surface)] text-muted-foreground transition hover:text-foreground"
              aria-label="Toggle theme"
            >
              {settings.theme === "dark" ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
            </button>
          </div>
        </div>
      </header>

      {/* Main Dynamically Animated Page Content */}
      <main
        key={pathname}
        className={`mx-auto max-w-md px-3 pb-28 pt-4 lg:pb-12 ${transitionClass}`}
        style={{ animationDuration: `${settings.pageTransitionDuration ?? 250}ms` }}
      >
        <Outlet />
      </main>

      {/* ── Mobile bottom nav with Swipe-Up Drawer handle ── */}
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border/60 bg-background/90 backdrop-blur-xl lg:hidden pb-[env(safe-area-inset-bottom,0px)]">
        <div
          onClick={() => setDrawerOpen(true)}
          className="mx-auto my-1 flex h-2 w-16 items-center justify-center cursor-pointer group"
          title="Swipe Up for All Screens"
        >
          <div className="h-1 w-8 rounded-full bg-muted-foreground/40 group-hover:bg-[var(--electric)] transition" />
        </div>

        <div className="mx-auto grid max-w-md grid-cols-6 px-2 pb-1.5">
          {nav.map((item) => {
            const Icon = item.icon;
            const active = isNavActive(item.to);
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={`flex flex-col items-center gap-1 rounded-lg py-1 text-[10px] transition ${
                  active ? "text-[var(--electric)] font-bold" : "text-muted-foreground"
                }`}
              >
                <Icon className={`h-5 w-5 transition ${active ? "drop-shadow-[0_0_6px_var(--electric)]" : ""}`} />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </div>
      </nav>

      {/* ── Full Bottom Drawer with ALL Screen Menus ── */}
      {drawerOpen && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-xs lg:hidden animate-fade-in"
            onClick={() => setDrawerOpen(false)}
          />
          <div className="fixed inset-x-0 bottom-0 z-50 rounded-t-3xl border-t border-border/80 bg-[var(--surface)] p-5 pb-safe lg:hidden animate-scale-up">
            <div className="mx-auto mb-4 flex w-full max-w-md items-center justify-between pb-2 border-b border-border/60">
              <div className="flex items-center gap-2">
                <Compass className="h-4 w-4 text-[var(--electric)]" />
                <span className="text-sm font-bold text-foreground">All Screens & Menus</span>
              </div>
              <button
                onClick={() => setDrawerOpen(false)}
                className="grid h-7 w-7 place-items-center rounded-full bg-[var(--surface-elevated)] text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mx-auto grid max-w-md grid-cols-3 gap-2.5 pb-6">
              {desktopNav.map((item) => {
                const Icon = item.icon;
                const active = pathname.startsWith(item.to);
                return (
                  <button
                    key={item.to}
                    onClick={() => {
                      setDrawerOpen(false);
                      navigate(item.to);
                    }}
                    className={`flex flex-col items-center gap-2 rounded-2xl p-3.5 text-xs font-semibold border transition ${
                      active
                        ? "border-[var(--electric)] bg-[var(--electric)]/15 text-[var(--electric)] font-bold"
                        : "border-border/60 bg-[var(--surface-elevated)] text-muted-foreground hover:text-foreground hover:border-border"
                    }`}
                  >
                    <Icon className="h-6 w-6" />
                    <span className="truncate max-w-full">{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </>
      )}

      {/* Floating Action & Navigation Hub */}
      <FloatingActionButton hidden={drawerOpen} />
    </div>
  );
}
