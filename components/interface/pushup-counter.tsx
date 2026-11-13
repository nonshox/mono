"use client";

import { Dumbbell, LoaderCircle, Play, Square } from "lucide-react";
import {
  FilesetResolver,
  PoseLandmarker,
  type NormalizedLandmark,
} from "@mediapipe/tasks-vision";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/interface/empty-state";
import { saveWorkout } from "@/features/workouts/client-api";

const WASM_URL = "/mediapipe/wasm";
const MODEL_URL = "/mediapipe/pose_landmarker_full.task";

const SIDE = {
  left: { shoulder: 11, elbow: 13, wrist: 15, hip: 23, ankle: 27 },
  right: { shoulder: 12, elbow: 14, wrist: 16, hip: 24, ankle: 28 },
} as const;

const CONNECTIONS: Array<[number, number]> = [
  [11, 13],
  [13, 15],
  [12, 14],
  [14, 16],
  [11, 23],
  [12, 24],
  [23, 24],
  [11, 12],
  [23, 27],
  [24, 28],
];

function angleDeg(
  a: { x: number; y: number; z: number },
  b: { x: number; y: number; z: number },
  c: { x: number; y: number; z: number },
): number {
  const ux = a.x - b.x;
  const uy = a.y - b.y;
  const uz = a.z - b.z;
  const vx = c.x - b.x;
  const vy = c.y - b.y;
  const vz = c.z - b.z;
  const dot = ux * vx + uy * vy + uz * vz;
  const mag = Math.hypot(ux, uy, uz) * Math.hypot(vx, vy, vz);
  if (mag === 0) return 180;
  const cosine = Math.min(1, Math.max(-1, dot / mag));
  return (Math.acos(cosine) * 180) / Math.PI;
}

function visibility(lm: { visibility?: number }): number {
  return lm.visibility ?? 0;
}

export function PushupCounter() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const landmarkerRef = useRef<PoseLandmarker | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number>(0);
  const tickRef = useRef<() => void>(() => undefined);
  const fsmRef = useRef<{ state: "up" | "down"; lastRepMs: number }>({
    state: "up",
    lastRepMs: 0,
  });
  const cueRef = useRef("");
  const trackingRef = useRef(false);
  const startTimeRef = useRef(0);
  const smoothRef = useRef<Map<number, { x: number; y: number; z: number }>>(
    new Map(),
  );
  const sideLockRef = useRef<"left" | "right" | null>(null);
  const lastInferRef = useRef(0);

  const [phase, setPhase] = useState<"idle" | "loading" | "ready" | "error">(
    "idle",
  );
  const [error, setError] = useState("");
  const [reps, setReps] = useState(0);
  const [current, setCurrent] = useState<"up" | "down">("up");
  const [cue, setCue] = useState("");
  const [tracking, setTracking] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [summary, setSummary] = useState<{
    reps: number;
    duration: number;
  } | null>(null);
  const [saved, setSaved] = useState<"saving" | "saved" | "failed">("saved");

  const setCueOnce = useCallback((next: string) => {
    if (cueRef.current === next) return;
    cueRef.current = next;
    setCue(next);
  }, []);

  const setTrackingOnce = useCallback((next: boolean) => {
    if (trackingRef.current === next) return;
    trackingRef.current = next;
    setTracking(next);
  }, []);

  const draw = useCallback(
    (landmarks: NormalizedLandmark[]) => {
      const canvas = canvasRef.current;
      const video = videoRef.current;
      if (!canvas || !video) return;
      if (canvas.width !== video.videoWidth) {
        canvas.width = video.videoWidth || 1280;
        canvas.height = video.videoHeight || 720;
      }
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      const { width, height } = canvas;
      ctx.clearRect(0, 0, width, height);
      if (landmarks.length === 0) return;

      // Mirror to match the CSS-mirrored video element.
      ctx.save();
      ctx.translate(width, 0);
      ctx.scale(-1, 1);

      ctx.lineWidth = 4;
      ctx.strokeStyle = "rgba(0, 98, 213, 0.9)";
      ctx.lineCap = "round";
      ctx.lineJoin = "round";

      for (const [a, b] of CONNECTIONS) {
        const pa = landmarks[a];
        const pb = landmarks[b];
        if (!pa || !pb) continue;
        if (visibility(pa) < 0.45 || visibility(pb) < 0.45) continue;
        ctx.beginPath();
        ctx.moveTo(pa.x * width, pa.y * height);
        ctx.lineTo(pb.x * width, pb.y * height);
        ctx.stroke();
      }

      for (const lm of landmarks) {
        if (visibility(lm) < 0.45) continue;
        ctx.beginPath();
        ctx.arc(lm.x * width, lm.y * height, 5.5, 0, Math.PI * 2);
        ctx.fillStyle = "#fcfcfc";
        ctx.fill();
        ctx.lineWidth = 2;
        ctx.strokeStyle = "rgba(0, 98, 213, 0.95)";
        ctx.stroke();
      }
      ctx.restore();
    },
    [],
  );

  function tick() {
    rafRef.current = requestAnimationFrame(() => tickRef.current());
    const video = videoRef.current;
    const landmarker = landmarkerRef.current;
    if (!video || !landmarker || video.readyState < 2) return;

    const now = performance.now();
    if (now - lastInferRef.current < 33) {
      return; // cap inference at ~30fps
    }
    lastInferRef.current = now;

    const result = landmarker.detectForVideo(video, now);
    const raw = result.landmarks?.[0] ?? [];

    if (raw.length === 0) {
      smoothRef.current.clear();
      draw([]);
      setTrackingOnce(false);
      setCueOnce("");
      return;
    }

    // Exponential smoothing per landmark — kills jitter, stabilizes angles.
    const ALPHA = 0.45;
    const smooth = smoothRef.current;
    const landmarks = raw.map((lm, index) => {
      const prev = smooth.get(index);
      const next = prev
        ? {
            x: prev.x + (lm.x - prev.x) * ALPHA,
            y: prev.y + (lm.y - prev.y) * ALPHA,
            z: prev.z + (lm.z - prev.z) * ALPHA,
            visibility: lm.visibility,
          }
        : { x: lm.x, y: lm.y, z: lm.z, visibility: lm.visibility };
      smooth.set(index, { x: next.x, y: next.y, z: next.z });
      return next;
    });

    draw(landmarks);

    const left = SIDE.left;
    const right = SIDE.right;

    // Lock a side for the session — people don't switch flanks mid-set.
    if (!sideLockRef.current) {
      const avg = (s: { shoulder: number; elbow: number; wrist: number }) =>
        (visibility(landmarks[s.shoulder]) +
          visibility(landmarks[s.elbow]) +
          visibility(landmarks[s.wrist])) /
        3;
      sideLockRef.current = avg(left) >= avg(right) ? "left" : "right";
    }
    const side = sideLockRef.current === "left" ? left : right;

    const S = landmarks[side.shoulder];
    const E = landmarks[side.elbow];
    const W = landmarks[side.wrist];
    const H = landmarks[side.hip];
    const A = landmarks[side.ankle];

    const avgVis =
      (visibility(S) +
        visibility(E) +
        visibility(W) +
        visibility(H) +
        visibility(A)) /
      5;
    if (avgVis < 0.45) {
      setTrackingOnce(false);
      setCueOnce("Hold position — sideways in frame");
      return;
    }
    setTrackingOnce(true);

    const elbowAngle = angleDeg(S, E, W);
    const backAngle = angleDeg(S, H, A);

    const fsm = fsmRef.current;
    if (elbowAngle > 150 && fsm.state !== "up") {
      fsm.state = "up";
      setCurrent("up");
      if (now - fsm.lastRepMs > 600) {
        fsm.lastRepMs = now;
        setReps((count) => count + 1);
      }
    } else if (elbowAngle < 90 && fsm.state !== "down") {
      fsm.state = "down";
      setCurrent("down");
    }

    if (backAngle < 155) {
      setCueOnce("Keep your back straight");
    } else if (elbowAngle < 90) {
      setCueOnce("Push back up");
    } else if (elbowAngle > 160) {
      setCueOnce("");
    }
  }

  const start = useCallback(async () => {
    setPhase("loading");
    setError("");
    setSummary(null);
    setReps(0);
    setCurrent("up");
    setCueOnce("");
    fsmRef.current = { state: "up", lastRepMs: 0 };
    sideLockRef.current = null;
    smoothRef.current.clear();
    lastInferRef.current = 0;

    try {
      if (!landmarkerRef.current) {
        const vision = await FilesetResolver.forVisionTasks(WASM_URL);
        landmarkerRef.current = await PoseLandmarker.createFromOptions(vision, {
          baseOptions: { modelAssetPath: MODEL_URL, delegate: "GPU" },
          runningMode: "VIDEO",
          numPoses: 1,
        });
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      streamRef.current = stream;

      const video = videoRef.current;
      if (!video) return;
      video.srcObject = stream;
      await video.play();

      startTimeRef.current = performance.now();
      setPhase("ready");
      setElapsed(0);
      rafRef.current = requestAnimationFrame(() => tickRef.current());
    } catch (cause) {
      setPhase("error");
      const message =
        cause instanceof Error ? cause.message : "Camera or pose model unavailable.";
      setError(
        /denied|notallowed/i.test(message)
          ? "Camera access was denied. Allow it in your browser settings and try again."
          : `Could not start the camera: ${message}`,
      );
    }
  }, [setCueOnce]);

  const stop = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    for (const track of streamRef.current?.getTracks() ?? []) {
      track.stop();
    }
    streamRef.current = null;
    const duration = Math.round((performance.now() - startTimeRef.current) / 1000);
    setSummary({ reps, duration });
    setPhase("idle");
    setTrackingOnce(false);

    if (reps > 0) {
      setSaved("saving");
      saveWorkout({ kind: "pushup", reps, duration })
        .then(() => setSaved("saved"))
        .catch(() => setSaved("failed"));
    }
  }, [reps, setTrackingOnce]);

  // Keep the frame callback ref fresh so rAF never calls a stale closure.
  useEffect(() => {
    tickRef.current = tick;
  });

  // Session timer
  useEffect(() => {
    if (phase !== "ready") return;
    const id = setInterval(() => {
      setElapsed(
        Math.max(0, Math.round((performance.now() - startTimeRef.current) / 1000)),
      );
    }, 500);
    return () => clearInterval(id);
  }, [phase]);

  // Unmount cleanup
  useEffect(
    () => () => {
      cancelAnimationFrame(rafRef.current);
      for (const track of streamRef.current?.getTracks() ?? []) {
        track.stop();
      }
      landmarkerRef.current?.close();
    },
    [],
  );

  if (phase === "error") {
    return (
      <div className="grid min-h-[50vh] place-items-center">
        <EmptyState
          action={
            <Button onClick={() => void start()} type="button">
              Try again
            </Button>
          }
          description={error}
          icon={Dumbbell}
          title="Camera unavailable"
        />
      </div>
    );
  }

  if (phase === "idle") {
    return (
      <div className="mx-auto grid w-full max-w-xl justify-items-center px-2 py-10 text-center">
        <span className="grid size-16 place-items-center rounded-full bg-primary/10 text-primary">
          <Dumbbell aria-hidden="true" className="size-8" strokeWidth={1.8} />
        </span>
        <h1 className="type-title mt-6">Push-ups, analyzed live.</h1>
        <p className="type-lead mt-2 max-w-md">
          Lie flat facing sideways to the camera — shoulders, hips and ankles
          visible in the frame. The AI counts every clean rep while you work.
        </p>
        <div className="mt-6 grid gap-2 text-xs text-muted-foreground">
          <p>✓ Side view — best for depth and back form</p>
          <p>✓ All processing happens on your device</p>
          <p>✓ No account, no upload — your body stays yours</p>
        </div>
        {summary && (
          <div className="surface-card mt-8 w-full p-5">
            <p className="type-eyebrow">Last session</p>
            <div className="mt-2 flex items-end justify-center gap-10">
              <div>
                <p className="text-5xl font-extrabold tabular-nums">{summary.reps}</p>
                <p className="mt-1 text-xs font-medium text-muted-foreground">reps</p>
              </div>
              <div>
                <p className="text-5xl font-extrabold tabular-nums">
                  {Math.floor(summary.duration / 60)}
                  <span className="text-2xl">:</span>
                  {String(summary.duration % 60).padStart(2, "0")}
                </p>
                <p className="mt-1 text-xs font-medium text-muted-foreground">duration</p>
              </div>
            </div>
            <p className="mt-4 text-center text-xs font-medium leading-none">
              {saved === "saving" ? (
                <span className="text-muted-foreground">Saving to your log…</span>
              ) : saved === "failed" ? (
                <span className="text-destructive">Couldn&apos;t save — offline?</span>
              ) : (
                <span className="text-primary">Saved to your log ✓</span>
              )}
            </p>
          </div>
        )}
        <Button
          className="mt-8 h-12 rounded-full px-12 text-base"
          onClick={() => void start()}
          size="lg"
          type="button"
        >
          <Play aria-hidden="true" />
          Start session
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-4xl">
      <div className="relative aspect-video w-full overflow-hidden rounded-3xl border border-border bg-black shadow-dock">
        <video
          aria-hidden="true"
          className="absolute inset-0 h-full w-full -scale-x-100 object-cover"
          muted
          playsInline
          ref={videoRef}
        />
        <canvas
          aria-hidden="true"
          className="absolute inset-0 h-full w-full object-cover"
          ref={canvasRef}
        />
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/55 via-transparent to-black/65" />

        {/* Top bar: reps + phase */}
        <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between p-4 sm:p-6">
          <div>
            <p className="type-eyebrow text-white/70">Reps</p>
            <p className="text-7xl font-extrabold tabular-nums leading-none text-white sm:text-8xl">
              {reps}
            </p>
          </div>
          <div className="mt-2 flex flex-col items-end gap-2">
            <span
              className={`inline-flex h-9 items-center rounded-full px-4 text-xs font-bold uppercase tracking-wider backdrop-blur-md transition-colors ${
                current === "down"
                  ? "bg-primary text-primary-foreground"
                  : "bg-white/15 text-white"
              }`}
            >
              {current === "down" ? "Down — depth!" : "Up"}
            </span>
            <span className="rounded-full bg-black/40 px-3 py-1 text-xs font-medium tabular-nums text-white/85 backdrop-blur-md">
              {Math.floor(elapsed / 60)}:{String(elapsed % 60).padStart(2, "0")}
            </span>
          </div>
        </div>

        {/* Bottom: cue + stop */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 flex flex-col items-center gap-3 p-4 sm:p-6">
          <p
            className={`min-h-6 text-sm font-semibold text-white transition-opacity ${
              cue ? "opacity-100" : "opacity-0"
            }`}
            role="status"
          >
            {cue || " "}
          </p>
          <Button
            className="pointer-events-auto h-11 rounded-full bg-white/15 px-8 text-white backdrop-blur-md hover:bg-white/25"
            onClick={stop}
            size="lg"
            type="button"
            variant="ghost"
          >
            <Square aria-hidden="true" />
            Finish session
          </Button>
        </div>

        {/* Loading veil */}
        {phase === "loading" && (
          <div className="absolute inset-0 grid place-items-center bg-black/70">
            <div className="flex flex-col items-center gap-3">
              <LoaderCircle aria-hidden="true" className="size-8 animate-spin text-white" />
              <p className="text-sm font-medium text-white/90">Loading pose model…</p>
            </div>
          </div>
        )}
        {phase === "ready" && !tracking && (
          <p className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-black/60 px-4 py-2 text-sm font-medium text-white backdrop-blur-md">
            Position yourself sideways in frame…
          </p>
        )}
      </div>

      <p className="mt-4 text-center text-xs text-muted-foreground">
        Counting works best from the side — shoulders, hips and ankles in one line.
      </p>
    </div>
  );
}
