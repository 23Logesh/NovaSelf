import { Component, type ReactNode } from "react";
import { HashRouter, Routes, Route, Navigate, useRouteError } from "react-router-dom";
import { AppProvider } from "@/lib/novaself/store";
import { AppShell } from "@/components/novaself/AppShell";
import { RequireAuth } from "@/components/novaself/RequireAuth";
import Welcome from "@/pages/Welcome";
import Dashboard from "@/pages/Dashboard";
import LogPage from "@/pages/Log";
import Body from "@/pages/Body";
import Progress from "@/pages/Progress";
import Diet from "@/pages/Diet";
import Workout from "@/pages/Workout";
import Skin from "@/pages/Skin";
import Supplements from "@/pages/Supplements";
import Books from "@/pages/Books";
import Chat from "@/pages/Chat";
import Settings from "@/pages/Settings";
import NotFound from "@/pages/NotFound";
import { RootRedirect } from "@/pages/RootRedirect";

// HashRouter: required for GitHub Pages static hosting (no server-side rewrites).
// See comment in original App.tsx for migration path to BrowserRouter on Vercel.

class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state: { error: Error | null } = { error: null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  render() {
    if (this.state.error) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-background px-4 text-foreground">
          <div className="max-w-md text-center">
            <h1 className="text-xl font-semibold tracking-tight">This page didn't load</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Something went wrong. Try refreshing, or reset local data from Settings if it persists.
            </p>
            <button
              onClick={() => this.setState({ error: null })}
              className="mt-6 inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              Try again
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export function RouteErrorFallback() {
  const error = useRouteError();
  console.error(error);
  return null;
}

export default function App() {
  return (
    <ErrorBoundary>
      <AppProvider>
        <HashRouter>
          <Routes>
            <Route path="/" element={<RootRedirect />} />
            <Route path="/welcome" element={<Welcome />} />

            <Route element={<RequireAuth><AppShell /></RequireAuth>}>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/log" element={<LogPage />} />
              <Route path="/body" element={<Body />} />
              <Route path="/progress" element={<Progress />} />
              <Route path="/diet" element={<Diet />} />
              <Route path="/workout" element={<Workout />} />
              <Route path="/skin" element={<Skin />} />
              <Route path="/supplements" element={<Supplements />} />
              <Route path="/books" element={<Books />} />
              <Route path="/chat" element={<Chat />} />
              <Route path="/settings" element={<Settings />} />
            </Route>

            <Route path="*" element={<NotFound />} />
          </Routes>
        </HashRouter>
      </AppProvider>
    </ErrorBoundary>
  );
}

export { Navigate };