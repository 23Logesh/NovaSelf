import { useState, useEffect, useRef } from "react";
import { Play, Square, MapPin, Navigation, Flame, CheckCircle } from "lucide-react";
import { toast } from "sonner";
import { NCard } from "@/components/novaself/NCard";
import { useApp, today } from "@/lib/novaself/store";
import { caloriesBurned, WORKOUT_METS } from "@/lib/novaself/calculations";

interface Point {
  lat: number;
  lng: number;
  time: number;
}

function haversineDistance(p1: Point, p2: Point): number {
  const R = 6371; // Earth's radius in km
  const dLat = ((p2.lat - p1.lat) * Math.PI) / 180;
  const dLng = ((p2.lng - p1.lng) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((p1.lat * Math.PI) / 180) *
      Math.cos((p2.lat * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export function GPSJoggingTracker({ onClose }: { onClose?: () => void }) {
  const { profile, getDay, upsertDay } = useApp();
  const [tracking, setTracking] = useState(false);
  const [distanceKm, setDistanceKm] = useState(0);
  const [seconds, setSeconds] = useState(0);
  const [points, setPoints] = useState<Point[]>([]);
  const [currentPos, setCurrentPos] = useState<Point | null>(null);
  const watchIdRef = useRef<number | null>(null);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (tracking) {
      interval = setInterval(() => setSeconds((s) => s + 1), 1000);
    }
    return () => clearInterval(interval);
  }, [tracking]);

  function startTracking() {
    if (!navigator.geolocation) {
      toast.error("GPS Geolocation is not supported on this device.");
      return;
    }

    setTracking(true);
    setDistanceKm(0);
    setSeconds(0);
    setPoints([]);

    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const newPoint: Point = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          time: Date.now(),
        };

        setCurrentPos(newPoint);

        setPoints((prev) => {
          if (prev.length > 0) {
            const last = prev[prev.length - 1];
            const dist = haversineDistance(last, newPoint);
            if (dist > 0.003) { // > 3 meters
              setDistanceKm((d) => d + dist);
              return [...prev, newPoint];
            }
            return prev;
          }
          return [newPoint];
        });
      },
      (err) => {
        console.warn("GPS error:", err);
      },
      { enableHighAccuracy: true, maximumAge: 1000, timeout: 10000 }
    );
  }

  function stopTracking() {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    setTracking(false);
  }

  function finishAndLog() {
    stopTracking();
    const durationMin = Math.max(1, Math.round(seconds / 60));
    const met = WORKOUT_METS.jogging || 7.0;
    const burn = Math.round(caloriesBurned(met, profile.weightKg || 70, durationMin));

    const t = today();
    const day = getDay(t);
    const id = Math.random().toString(36).slice(2, 10);

    upsertDay({
      ...day,
      workouts: [
        ...day.workouts,
        {
          id,
          type: "jogging",
          durationMin,
          caloriesBurned: burn,
          notes: `GPS Tracked Run: ${distanceKm.toFixed(2)} km covered (${points.length} waypoints)`,
        },
      ],
    });

    toast.success(`Run Logged! ${distanceKm.toFixed(2)} km in ${durationMin} min (${burn} kcal burned)`);
    if (onClose) onClose();
  }

  const durationMin = Math.max(0.1, seconds / 60);
  const paceMinPerKm = distanceKm > 0.05 ? durationMin / distanceKm : 0;
  const estimatedBurn = Math.round(caloriesBurned(7.0, profile.weightKg || 70, durationMin));

  // Compute Static Map Box image URL from OpenStreetMap static tile provider
  const mapCenterLat = currentPos ? currentPos.lat : 13.0827;
  const mapCenterLng = currentPos ? currentPos.lng : 80.2707;

  return (
    <NCard glow="neon" className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Navigation className="h-5 w-5 text-[var(--neon)] animate-pulse" />
          <h3 className="font-display font-bold text-base text-foreground">Real-Time OpenStreetMap GPS Jogging Tracker</h3>
        </div>
        {tracking && (
          <span className="flex items-center gap-1.5 rounded-full bg-[var(--neon)]/20 px-3 py-1 text-xs font-bold text-[var(--neon)]">
            <span className="h-2 w-2 rounded-full bg-[var(--neon)] animate-ping" /> Live GPS
          </span>
        )}
      </div>

      {/* Real OpenStreetMap Interactive Map Box */}
      <div className="relative h-48 w-full rounded-2xl overflow-hidden border border-border/80 bg-[var(--surface-elevated)] shadow-inner flex items-center justify-center">
        {currentPos ? (
          <iframe
            title="OpenStreetMap Live GPS Track"
            width="100%"
            height="100%"
            frameBorder="0"
            scrolling="no"
            src={`https://www.openstreetmap.org/export/embed.html?bbox=${mapCenterLng - 0.005}%2C${mapCenterLat - 0.005}%2C${mapCenterLng + 0.005}%2C${mapCenterLat + 0.005}&layer=mapnik&marker=${mapCenterLat}%2C${mapCenterLng}`}
            className="w-full h-full opacity-90 filter invert-[0.85] hue-rotate-180"
          />
        ) : (
          <div className="text-center space-y-2 text-muted-foreground p-4">
            <MapPin className="h-8 w-8 text-[var(--neon)] mx-auto animate-bounce" />
            <p className="text-xs font-medium">Tap 'Start GPS Run' to acquire location signal & render live map</p>
          </div>
        )}

        {/* Live GPS Coordinates Badge */}
        {currentPos && (
          <div className="absolute top-2 right-2 rounded-lg border border-border/80 bg-background/90 backdrop-blur-md px-2.5 py-1 text-[10px] font-bold tabular-nums text-foreground shadow">
            Lat: {currentPos.lat.toFixed(4)}, Lng: {currentPos.lng.toFixed(4)}
          </div>
        )}
      </div>

      {/* Main Stats Grid */}
      <div className="grid grid-cols-3 gap-3 text-center">
        <div className="rounded-2xl border border-border/80 bg-[var(--surface-elevated)] p-3">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground block">Distance</span>
          <span className="font-display text-3xl font-extrabold tabular-nums text-[var(--neon)]">
            {distanceKm.toFixed(2)}
          </span>
          <span className="text-[10px] text-muted-foreground block">km</span>
        </div>

        <div className="rounded-2xl border border-border/80 bg-[var(--surface-elevated)] p-3">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground block">Time</span>
          <span className="font-display text-3xl font-extrabold tabular-nums text-foreground">
            {String(Math.floor(seconds / 60)).padStart(2, "0")}:{String(seconds % 60).padStart(2, "0")}
          </span>
          <span className="text-[10px] text-muted-foreground block">mm:ss</span>
        </div>

        <div className="rounded-2xl border border-border/80 bg-[var(--surface-elevated)] p-3">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground block">Pace</span>
          <span className="font-display text-3xl font-extrabold tabular-nums text-[var(--electric)]">
            {paceMinPerKm > 0 ? paceMinPerKm.toFixed(1) : "—"}
          </span>
          <span className="text-[10px] text-muted-foreground block">min/km</span>
        </div>
      </div>

      {/* Calories & Live Route Map Representation */}
      <div className="rounded-2xl border border-border/60 bg-[var(--surface-elevated)] p-3 flex items-center justify-between text-xs">
        <div className="flex items-center gap-2">
          <Flame className="h-4 w-4 text-[var(--electric)]" />
          <span>Estimated Burn: <strong className="text-foreground">{estimatedBurn} kcal</strong></span>
        </div>
        <div className="flex items-center gap-1 text-muted-foreground text-[10px]">
          <MapPin className="h-3.5 w-3.5 text-[var(--neon)]" />
          <span>{points.length} Live Waypoints</span>
        </div>
      </div>

      {/* Control Buttons */}
      <div className="flex gap-2">
        {!tracking ? (
          <button
            onClick={startTracking}
            className="flex-1 flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[var(--electric)] to-[var(--neon)] py-3 text-sm font-bold text-[var(--primary-foreground)] shadow-[0_0_20px_var(--neon)] transition hover:scale-[1.01]"
          >
            <Play className="h-4 w-4 fill-current" /> Start GPS Run
          </button>
        ) : (
          <>
            <button
              onClick={stopTracking}
              className="flex-1 flex items-center justify-center gap-1.5 rounded-2xl border border-destructive bg-destructive/20 py-3 text-xs font-bold text-destructive hover:bg-destructive/30 transition"
            >
              <Square className="h-4 w-4 fill-current" /> Pause
            </button>

            <button
              onClick={finishAndLog}
              disabled={distanceKm < 0.01 && seconds < 10}
              className="flex-1 flex items-center justify-center gap-1.5 rounded-2xl bg-[var(--neon)] py-3 text-xs font-bold text-[var(--primary-foreground)] shadow-[0_0_20px_var(--neon)] transition disabled:opacity-40"
            >
              <CheckCircle className="h-4 w-4" /> Save & Log Run
            </button>
          </>
        )}
      </div>
    </NCard>
  );
}
