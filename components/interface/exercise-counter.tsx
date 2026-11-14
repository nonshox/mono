"use client";

import {
  ArrowLeft,
  LoaderCircle,
  Medal,
  Pause,
  Play,
  RotateCcw,
  Share2,
  ShieldCheck,
  Square,
  Trophy,
  X,
} from "lucide-react";
import {
  FilesetResolver,
  PoseLandmarker,
  type NormalizedLandmark,
} from "@mediapipe/tasks-vision";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { saveWorkout, type ChallengeProgress } from "@/features/workouts/client-api";
import { EXERCISES, type ExerciseKind } from "@/features/exercises/config";
import { useUiPrefs } from "@/features/ui/store";
import { toast } from "sonner";

const WASM_URL = "/mediapipe/wasm";
const MODEL_URL = "/mediapipe/pose_landmarker_lite.task";

const CONNECTIONS: Array<[number, number]> = [
  [11, 13], [13, 15],
  [12, 14], [14, 16],
  [11, 23], [12, 24],
  [23, 24],
  [11, 12],
  [23, 25], [25, 27],
  [24, 26], [26, 28],
];

function angleDeg(
  a: { x: number; y: number; z: number },
  b: { x: number; y: number; z: number },
  c: { x: number; y: number; z: number },
): number {
  const ab = { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z };
  const cb = { x: c.x - b.x, y: c.y - b.y, z: c.z - b.z };
  const dot = ab.x * cb.x + ab.y * cb.y + ab.z * cb.z;
  const mag = Math.hypot(ab.x, ab.y, ab.z) * Math.hypot(cb.x, cb.y, cb.z);
  if (mag === 0) return 180;
  const cosine = Math.min(1, Math.max(-1, dot / mag));
  return (Math.acos(cosine) * 180) / Math.PI;
}

function vis(lm: { visibility?: number }): number {
  return lm.visibility ?? 0;
}

export function ExerciseCounter({ kind }: { kind: ExerciseKind }) {
  const config = EXERCISES[kind];
  const router = useRouter();
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
  const sessionRef = useRef<{
    reps: Array<{ duration: number }>;
    dipStartMs: number;
    holdStartMs: number;
    wasInPosition: boolean;
  graceTicks: number;
  }>({
    reps: [],
    dipStartMs: 0,
    holdStartMs: 0,
    wasInPosition: false,
    graceTicks: 0,
  });
  const cueRef = useRef("");
  const trackingRef = useRef(false);
  const startTimeRef = useRef(0);
  const smoothRef = useRef<Map<number, { x: number; y: number; z: number }>>(
    new Map(),
  );
  const sideLockRef = useRef<"left" | "right" | null>(null);
  const lastInferRef = useRef(0);

  const [phase, setPhase] = useState<"loading" | "ready" | "idle" | "error" | "done" | "countdown">(
    "idle",
  );
  const [countdown, setCountdown] = useState(3);
  const [paused, setPaused] = useState(false);
  const [discardConfirm, setDiscardConfirm] = useState(false);
  const [error, setError] = useState("");
  const [reps, setReps] = useState(0);
  const [current, setCurrent] = useState<"up" | "down" | "hold">("up");
  const [cue, setCue] = useState("");
  const [tracking, setTracking] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [summary, setSummary] = useState<{
    reps: number;
    duration: number;
    unlocked: string[];
    challengesCompleted: string[];
    challenges: ChallengeProgress[];
    rank: number | null;
    totalPushups: number;
  } | null>(null);
  const [saved, setSaved] = useState<"saving" | "saved" | "failed">("saved");

  const pausedRef = useRef(false);
  const accumRef = useRef(0);
  const pauseStartRef = useRef(0);

  const elapsedNow = useCallback(() => {
    const base = performance.now() - startTimeRef.current - accumRef.current;
    const extra = pausedRef.current
      ? performance.now() - pauseStartRef.current
      : 0;
    return Math.max(0, Math.round((base - extra) / 1000));
  }, []);

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

      ctx.save();
      ctx.translate(width, 0);
      ctx.scale(-1, 1);

      ctx.lineWidth = 3;
      ctx.strokeStyle = "rgba(252,252,252,0.85)";
      ctx.lineCap = "round";
      ctx.lineJoin = "round";

      for (const [a, b] of CONNECTIONS) {
        const pa = landmarks[a];
        const pb = landmarks[b];
        if (!pa || !pb) continue;
        if (vis(pa) < 0.45 || vis(pb) < 0.45) continue;
        ctx.beginPath();
        ctx.moveTo(pa.x * width, pa.y * height);
        ctx.lineTo(pb.x * width, pb.y * height);
        ctx.stroke();
      }
      ctx.fillStyle = "#0062d5";
      for (const lm of landmarks) {
        if (vis(lm) < 0.45) continue;
        ctx.beginPath();
        ctx.arc(lm.x * width, lm.y * height, 5, 0, Math.PI * 2);
        ctx.fill();
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
    if (now - lastInferRef.current < 22) return;
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

    const sides = {
      left: { shoulder: 11, elbow: 13, wrist: 15, hip: 23, knee: 25, ankle: 27 },
      right: { shoulder: 12, elbow: 14, wrist: 16, hip: 24, knee: 26, ankle: 28 },
    };
    if (!sideLockRef.current) {
      const avg = (s: typeof sides.left) =>
        (vis(landmarks[s.shoulder]) + vis(landmarks[s.elbow]) + vis(landmarks[s.wrist])) / 3;
      sideLockRef.current = avg(sides.left) >= avg(sides.right) ? "left" : "right";
    }
    const side = sideLockRef.current === "left" ? sides.left : sides.right;

    const S = landmarks[side.shoulder];
    const E = landmarks[side.elbow];
    const W = landmarks[side.wrist];
    const H = landmarks[side.hip];
    const A = landmarks[side.ankle];

    // Push-ups/squats only need arms. Plank needs shoulders + hips.
    const armsVis = (vis(S) + vis(E) + vis(W)) / 3;
    const lowerVis = Math.min(vis(H), vis(A));

    if (config.scoring === "time") {
      const torsoVisible = vis(S) >= 0.45 && vis(H) >= 0.45;
      if (!torsoVisible) {
        setTrackingOnce(false);
        setCueOnce("Step back â€” shoulders and hips in frame");
        return;
      }
    } else if (armsVis < 0.45) {
      setTrackingOnce(false);
      setCueOnce("");
      return;
    }
    setTrackingOnce(true);

    // Back check only when hips + ankles are actually in frame.
    const backAvailable = lowerVis >= 0.45;
    const backAngle = backAvailable ? angleDeg(S, H, A) : 180;
    const fsm = fsmRef.current;
    const session = sessionRef.current;

    if (config.scoring === "angular" && config.axes.kind === "angular") {
      // Track the arm/side we actually see â€” desktop webcams favor one side.
      const offset = sideLockRef.current === "left" ? 0 : 1;
      const joints = config.axes.joints.map((j) => j + offset);
      const angle = angleDeg(
        landmarks[joints[0]],
        landmarks[joints[1]],
        landmarks[joints[2]],
      );

      if (angle > config.axes.upAngle && fsm.state !== "up") {
        fsm.state = "up";
        setCurrent("up");
        const duration = now - session.dipStartMs;
        if (duration > 200) {
          session.reps.push({ duration });
        }
        if (now - fsm.lastRepMs > 600) {
          fsm.lastRepMs = now;
          setReps((count) => count + 1);
        }
      } else if (
        angle < config.axes.downAngle &&
        fsm.state !== "down"
      ) {
        fsm.state = "down";
        setCurrent("down");
        session.dipStartMs = now;
      }

      if (backAngle < 155) setCueOnce("Back straight");
      else if (fsm.state === "down") setCueOnce("Push back up");
      else if (angle > config.axes.upAngle + 10) setCueOnce("");
    } else if (config.scoring === "time" && config.axes.kind === "time") {
      const hipVisible = vis(H) >= 0.45;
      let aligned = false;
      if (backAvailable) {
        // Side view with ankles in frame: true shoulder-hip-ankle angle.
        aligned = backAngle > 150;
      } else if (hipVisible) {
        // Front/desk view: shoulders and hips should sit on one level line,
        // normalized by shoulder width so distance from camera doesn't matter.
        const shoulderWidth = Math.max(
          0.05,
          Math.abs(landmarks[11].x - landmarks[12].x),
        );
        aligned = Math.abs(S.y - H.y) / shoulderWidth < 0.7;
      }

      if (aligned) {
        session.graceTicks = 0;
        if (!session.wasInPosition) {
          session.wasInPosition = true;
          if (session.holdStartMs === 0) {
            session.holdStartMs = now;
          }
        }
        const holdMs = now - session.holdStartMs;
        setCueOnce(`Hold still â€” ${Math.floor(holdMs / 1000)}s`);
        setElapsed(Math.floor(holdMs / 1000));
        setCurrent("hold");
        return;
      }

      // Brief dips don't reset the hold â€” only ~0.5s out of position does.
      session.graceTicks += 1;
      if (session.wasInPosition && session.graceTicks <= 20) {
        const holdMs = now - session.holdStartMs;
        setCueOnce("Hold still");
        setElapsed(Math.floor(holdMs / 1000));
        setCurrent("hold");
        return;
      }
      session.wasInPosition = false;
      session.holdStartMs = 0;
      session.graceTicks = 0;
      setCurrent("down");
      setCueOnce(backAvailable ? "Lift your hips" : "Get into position");
    }
  }

  const teardown = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    for (const track of streamRef.current?.getTracks() ?? []) {
      track.stop();
    }
    streamRef.current = null;
    pausedRef.current = false;
    setPaused(false);
    setTrackingOnce(false);
  }, [setTrackingOnce]);

  const beginSession = useCallback(async () => {
    setPhase("loading");
    setError("");

    try {
      if (!landmarkerRef.current) {
        const vision = await FilesetResolver.forVisionTasks(WASM_URL);
        const options = {
          runningMode: "VIDEO" as const,
          numPoses: 1,
        };
        try {
          landmarkerRef.current = await PoseLandmarker.createFromOptions(vision, {
            baseOptions: { modelAssetPath: MODEL_URL, delegate: "GPU" },
            ...options,
          });
        } catch {
          // Some desktops/drivers can't run the GPU delegate â€” fall back to CPU.
          landmarkerRef.current = await PoseLandmarker.createFromOptions(vision, {
            baseOptions: { modelAssetPath: MODEL_URL, delegate: "CPU" },
            ...options,
          });
        }
      }

      const facing = useUiPrefs.getState().cameraFacing;
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: facing },
        audio: false,
      });
      streamRef.current = stream;

      const video = videoRef.current;
      if (!video) return;
      video.srcObject = stream;
      await video.play();

      startTimeRef.current = performance.now();
      accumRef.current = 0;
      pausedRef.current = false;
      setPaused(false);
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
  }, []);

  // Tap start ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ 3-2-1 ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ camera boots. Countdown is cancellable via the X.
  const start = useCallback(() => {
    setError("");
    setSummary(null);
    setReps(0);
    setCurrent("up");
    setCueOnce("");
    setTrackingOnce(false);
    setDiscardConfirm(false);
    fsmRef.current = { state: "up", lastRepMs: 0 };
    sessionRef.current = {
      reps: [],
      dipStartMs: 0,
      holdStartMs: 0,
      wasInPosition: false,
    graceTicks: 0,
    };
    sideLockRef.current = null;
    smoothRef.current.clear();
    lastInferRef.current = 0;
    accumRef.current = 0;
    pausedRef.current = false;
    setPaused(false);
    setCountdown(3);
    setPhase("countdown");
  }, [setCueOnce, setTrackingOnce]);

  const pause = useCallback(() => {
    if (pausedRef.current) return;
    pausedRef.current = true;
    pauseStartRef.current = performance.now();
    cancelAnimationFrame(rafRef.current);
    setTrackingOnce(false);
    setCueOnce("");
    setPaused(true);
  }, [setCueOnce, setTrackingOnce]);

  const resume = useCallback(() => {
    if (!pausedRef.current) return;
    accumRef.current += performance.now() - pauseStartRef.current;
    pausedRef.current = false;
    setPaused(false);
    rafRef.current = requestAnimationFrame(() => tickRef.current());
  }, []);

  const discard = useCallback(() => {
    teardown();
    setPhase("idle");
    setDiscardConfirm(false);
    setReps(0);
    setCueOnce("");
    router.replace("/");
  }, [router, teardown, setCueOnce]);

  const onFeed = phase === "ready" || phase === "countdown" || phase === "loading";

  const shareResult = useCallback(async () => {
    if (!summary) return;
    const text =
      config.scoring === "time"
        ? `I held a ${summary.reps}s plank on Mono Performance ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â camera-verified.`
        : `I did ${summary.reps} verified push-ups on Mono Performance${
            summary.rank ? ` ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â global rank #${summary.rank}` : ""
          }. Come chase me on the board.`;
    try {
      if (navigator.share) {
        await navigator.share({ title: "Mono Performance", text });
        return;
      }
      await navigator.clipboard.writeText(text);
      toast.success("Result copied to clipboard");
    } catch (error) {
      if (error instanceof Error && error.name !== "AbortError") {
        toast.error("Couldn't share right now");
      }
    }
  }, [summary, config.scoring]);

  const stop = useCallback(() => {
    teardown();

    const duration = elapsedNow();

    const isHold = config.scoring === "time";
    const finalReps = isHold ? elapsed : reps;
    const finalDuration = isHold ? elapsed : duration;

    setSummary({
      reps: finalReps,
      duration: finalDuration,
      unlocked: [],
      challengesCompleted: [],
      challenges: [],
      rank: null,
      totalPushups: 0,
    });
    setPhase("done");

    if (finalReps > 0) {
      setSaved("saving");
      saveWorkout({ kind, reps: finalReps, duration: finalDuration })
        .then((result) => {
          setSummary((current) =>
            current
              ? {
                  ...current,
                  unlocked: result.unlocked,
                  challengesCompleted: result.challengesCompleted,
                  challenges: result.challenges,
                  rank: result.rank,
                  totalPushups: result.totalPushups,
                }
              : current,
          );
          setSaved("saved");
        })
        .catch(() => setSaved("failed"));
    }
  }, [reps, elapsed, elapsedNow, teardown, config.scoring, kind]);

  // 3-2-1 countdown, then the camera boots.
  useEffect(() => {
    if (phase !== "countdown") return;
    const id = setTimeout(() => {
      if (countdown <= 1) {
        void beginSession();
        return;
      }
      setCountdown((value) => value - 1);
    }, 750);
    return () => clearTimeout(id);
  }, [phase, countdown, beginSession]);

  useEffect(() => {
    tickRef.current = tick;
  });

  useEffect(() => {
    if (phase !== "ready" || config.scoring === "time") return;
    const id = setInterval(() => {
      setElapsed(elapsedNow());
    }, 500);
    return () => clearInterval(id);
  }, [phase, config.scoring, elapsedNow]);

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

  return (
    <div className="relative h-full min-h-0 w-full select-none overflow-hidden bg-white text-foreground md:aspect-video md:h-auto md:max-h-full md:max-w-6xl md:rounded-2xl md:border md:border-border md:shadow-2xl min-[1920px]:max-w-7xl">
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
        {/* Subtle vignette ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â only while the camera is live */}
        {phase === "ready" && (
          <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/45 via-transparent to-black/55" />
        )}

        {/* Top overlay */}
        <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between gap-3 p-3 sm:p-4">
          <div className="flex min-w-0 items-center gap-2">
            {phase === "ready" || phase === "countdown" || phase === "loading" ? (
              <button
                aria-label="Discard session"
                className="pointer-events-auto grid size-11 shrink-0 place-items-center rounded-full border border-border/60 bg-white/85 text-foreground backdrop-blur-sm outline-none transition hover:bg-white focus-visible:ring-2 focus-visible:ring-ring"
                onClick={() => setDiscardConfirm(true)}
                type="button"
              >
                <X aria-hidden="true" className="size-5" strokeWidth={2} />
              </button>
            ) : (
              <Link
                aria-label="Back to home"
                className="pointer-events-auto grid size-11 shrink-0 place-items-center rounded-full border border-border/60 bg-white/85 text-foreground backdrop-blur-sm outline-none transition hover:bg-white focus-visible:ring-2 focus-visible:ring-ring"
                href="/"
              >
                <ArrowLeft aria-hidden="true" className="size-5" strokeWidth={1.8} />
              </Link>
            )}
            <div className="min-w-0">
              <p className={`type-eyebrow truncate ${onFeed ? "text-foreground [text-shadow:0_1px_3px_rgba(0,0,0,0.7)]" : "text-muted-foreground"}`}>
                {config.scoring === "time" ? "Plank" : config.label}
              </p>
              <p className={`text-[11px] font-medium sm:text-xs ${onFeed ? "text-foreground [text-shadow:0_1px_3px_rgba(0,0,0,0.7)]" : "text-muted-foreground"}`}>
                Camera verified
              </p>
            </div>
          </div>
          {phase === "ready" && !paused && (
            <span className="pointer-events-auto inline-flex shrink-0 items-center gap-1.5 rounded-full border border-border/60 bg-white/85 px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wider text-foreground backdrop-blur-sm">
              <span
                className={`size-1.5 rounded-full ${tracking ? "bg-emerald-500" : "bg-amber-500"} animate-pulse`}
              />
              {tracking ? "Detecting" : "Get in frame"}
            </span>
          )}
        </div>

        {/* Discard confirmation */}
        {discardConfirm && (
          <div className="absolute inset-x-0 bottom-28 z-10 flex justify-center px-4">
            <div className="flex max-w-xs flex-col items-center gap-1.5 rounded-2xl border border-border bg-white px-4 py-3 text-center shadow-xl">
              <p className="text-xs font-semibold text-foreground">Discard this session?</p>
              <p className="text-[10px] leading-4 text-muted-foreground">
                Nothing is saved ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â your reps so far will be lost.
              </p>
              <div className="mt-1 flex items-center gap-2">
                <button
                  className="h-10 rounded-full border border-border px-4 text-[11px] font-semibold text-muted-foreground outline-none transition hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
                  onClick={() => setDiscardConfirm(false)}
                  type="button"
                >
                  Keep going
                </button>
                <button
                  className="h-10 rounded-full bg-destructive px-4 text-[11px] font-bold text-white outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  onClick={discard}
                  type="button"
                >
                  Discard
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Countdown */}
        {phase === "countdown" && (
          <div className="pointer-events-none absolute inset-0 grid place-items-center">
            <div className="grid justify-items-center gap-2">
              <p className="text-[7rem] font-black tabular-nums leading-none tracking-tighter text-foreground drop-shadow-sm md:text-[9rem]">
                {countdown}
              </p>
              <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-muted-foreground">
                Get into position
              </p>
            </div>
          </div>
        )}

        {/* Loading */}
        {phase === "loading" && (
          <div className="absolute inset-0 grid place-items-center gap-3 bg-white/80 backdrop-blur-sm">
            <LoaderCircle aria-hidden="true" className="size-7 animate-spin text-foreground" />
            <p className="text-[11px] font-medium text-muted-foreground">Starting cameraÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚Â¦</p>
          </div>
        )}

        {/* Error */}
        {phase === "error" && (
          <div className="absolute inset-0 grid place-items-center bg-white p-6 text-center">
            <div className="grid max-w-xs justify-items-center gap-2.5">
              <p className="text-sm font-bold text-foreground">Camera couldn&apos;t start</p>
              <p className="text-xs leading-5 text-muted-foreground">{error}</p>
              <button
                className="mt-1 inline-flex h-11 items-center rounded-full bg-foreground px-6 text-xs font-bold text-background outline-none focus-visible:ring-2 focus-visible:ring-ring"
                onClick={start}
                type="button"
              >
                Try again
              </button>
              <Link
                className="text-[11px] font-semibold text-muted-foreground underline underline-offset-4 outline-none transition hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
                href="/"
              >
                Back to home
              </Link>
            </div>
          </div>
        )}

        {/* Big counter ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â live sessions only */}
        {phase === "ready" && (
          <div className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
            <p className="text-center text-[6rem] font-black tabular-nums leading-none tracking-tighter text-white/95 drop-shadow-lg md:text-[8rem]">
              {config.scoring === "time" ? elapsed : reps}
            </p>
            <p className="mt-2 text-center text-[10px] font-bold uppercase tracking-[0.25em] text-white/75">
              {paused
                ? "Paused"
                : tracking
                  ? current === "down"
                    ? "Depth"
                    : current === "hold"
                      ? "Hold"
                      : "Go"
                  : "Get in frame"}
            </p>
          </div>
        )}

        {/* Paused veil */}
        {phase === "ready" && paused && (
          <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-black/45" />
        )}

        {/* Idle hero ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â positioning guide + one-tap start */}
        {phase === "idle" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-white px-6 text-center sm:gap-5">
            <div className="grid justify-items-center gap-1">
              <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-muted-foreground">
                Mono is watching
              </p>
              <h2 className="text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl">
                {config.scoring === "time" ? "Hold the plank" : config.label}
              </h2>
            </div>
            <ul className="grid max-w-[20rem] gap-1 text-[11px] leading-5 text-muted-foreground sm:text-xs">
              <li>Prop your phone sideways at hip height</li>
              <li>Step back until your full body is in frame</li>
              <li>
                {config.scoring === "time"
                  ? "Lift your hips, hold still, breathe"
                  : "Start high ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â lower until your elbows pass 90ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â°"}
              </li>
            </ul>
            <button
              aria-label="Start"
              className="pointer-events-auto grid size-20 place-items-center rounded-full bg-foreground text-background shadow-xl outline-none transition active:scale-95 focus-visible:ring-4 focus-visible:ring-ring sm:size-24"
              onClick={start}
              type="button"
            >
              <Play aria-hidden="true" className="size-9 sm:size-10" strokeWidth={2.2} fill="currentColor" />
            </button>
            <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-muted-foreground/70">
              One tap to start
            </p>
          </div>
        )}

        {/* Bottom overlay controls */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 flex flex-col items-center gap-2 p-3 pb-5 md:p-4 md:pb-6">
          <p
            aria-live="polite"
            className={`min-h-5 text-[11px] font-medium text-white [text-shadow:0_1px_3px_rgba(0,0,0,0.7)] transition-opacity md:text-xs ${
              cue ? "opacity-100" : "opacity-0"
            }`}
          >
            {cue}
          </p>
          {phase === "ready" && !paused && (
            <div className="flex items-center gap-3">
              <button
                aria-label="Pause"
                className="pointer-events-auto grid size-12 place-items-center rounded-full border border-border/60 bg-white/80 text-foreground backdrop-blur-sm outline-none transition active:scale-95 focus-visible:ring-2 focus-visible:ring-ring"
                onClick={pause}
                type="button"
              >
                <Pause aria-hidden="true" className="size-5" strokeWidth={2} fill="currentColor" />
              </button>
              <button
                aria-label="Finish"
                className="pointer-events-auto grid size-14 place-items-center rounded-full bg-white text-black shadow-xl outline-none transition active:scale-95 focus-visible:ring-4 focus-visible:ring-white/40"
                onClick={stop}
                type="button"
              >
                <Square aria-hidden="true" className="size-6" strokeWidth={2} fill="currentColor" />
              </button>
            </div>
          )}
          {phase === "ready" && paused && (
            <div className="flex items-center gap-2">
              <button
                className="pointer-events-auto inline-flex h-12 items-center gap-1.5 rounded-full bg-white px-5 text-xs font-bold text-black outline-none transition active:scale-95 focus-visible:ring-4 focus-visible:ring-white/40"
                onClick={resume}
                type="button"
              >
                <Play aria-hidden="true" className="size-4" strokeWidth={2.4} fill="currentColor" />
                Resume
              </button>
              <button
                className="pointer-events-auto inline-flex h-12 items-center gap-1.5 rounded-full border border-border/60 bg-white/80 px-5 text-xs font-bold text-foreground backdrop-blur-sm outline-none transition active:scale-95 focus-visible:ring-2 focus-visible:ring-ring"
                onClick={stop}
                type="button"
              >
                <Square aria-hidden="true" className="size-4" strokeWidth={2} fill="currentColor" />
                Finish
              </button>
            </div>
          )}
          {phase === "done" && summary && (
            <div className="pointer-events-auto flex w-full max-w-md flex-col items-center gap-2.5 text-center md:gap-3">
              {summary.unlocked.length > 0 && (
                <div className="flex flex-wrap items-center justify-center gap-1.5">
                  {summary.unlocked.map((title) => (
                    <span
                      className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-[10px] font-bold text-amber-700"
                      key={title}
                    >
                      <Trophy aria-hidden="true" className="size-3" strokeWidth={2.2} />
                      {title}
                    </span>
                  ))}
                </div>
              )}
              {summary.challengesCompleted.map((title) => (
                <span
                  className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[10px] font-bold text-emerald-700"
                  key={title}
                >
                  <ShieldCheck aria-hidden="true" className="size-3" strokeWidth={2.2} />
                  {title} complete
                </span>
              ))}
              {summary.challenges
                .filter((c) => !c.completed)
                .slice(0, 2)
                .map((c) => (
                  <div className="w-full max-w-[17rem]" key={c.title}>
                    <div className="flex items-center justify-between gap-2 text-[10px] font-semibold text-muted-foreground">
                      <span className="truncate">{c.title}</span>
                      <span className="tabular-nums">
                        {c.current}/{c.target}
                      </span>
                    </div>
                    <div className="mt-1 h-1 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-emerald-500"
                        style={{ width: `${Math.min(100, Math.round((c.current / c.target) * 100))}%` }}
                      />
                    </div>
                  </div>
                ))}
              <div className="grid grid-cols-2 gap-8">
                <Stat label={config.scoring === "time" ? "Seconds" : "Reps"} value={summary.reps} />
                <Stat
                  label="Time"
                  value={`${Math.floor(summary.duration / 60)}:${String(summary.duration % 60).padStart(2, "0")}`}
                />
              </div>
              {summary.rank !== null && config.scoring !== "time" && (
                <p className="flex items-center gap-1.5 text-[11px] font-semibold text-foreground">
                  <Medal aria-hidden="true" className="size-4 text-amber-500" strokeWidth={2} />
                  Global #{summary.rank} ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â· {summary.totalPushups.toLocaleString()} verified push-ups
                </p>
              )}
              <div className="flex items-center gap-2">
                <button
                  aria-label="Share your result"
                  className="inline-flex h-11 items-center gap-1.5 rounded-full border border-white/15 bg-white/10 px-4 text-[11px] font-bold text-foreground outline-none backdrop-blur-md transition active:scale-95 focus-visible:ring-2 focus-visible:ring-ring"
                  onClick={() => void shareResult()}
                  type="button"
                >
                  <Share2 aria-hidden="true" className="size-4" strokeWidth={2} />
                  Share
                </button>
                <button
                  className="inline-flex h-11 items-center gap-1.5 rounded-full border border-white/15 bg-white/10 px-4 text-[11px] font-bold text-foreground outline-none backdrop-blur-md transition active:scale-95 focus-visible:ring-2 focus-visible:ring-ring"
                  onClick={start}
                  type="button"
                >
                  <RotateCcw aria-hidden="true" className="size-4" strokeWidth={2} />
                  One more
                </button>
                <Link
                  className="inline-flex h-11 items-center gap-1.5 rounded-full bg-foreground px-5 text-[11px] font-bold text-background outline-none transition active:scale-95 focus-visible:ring-4 focus-visible:ring-ring"
                  href="/"
                >
                  Done
                </Link>
              </div>
              <p className="text-[10px] text-muted-foreground">
                {saved === "saving"
                  ? "SavingÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚Â¦"
                  : saved === "failed"
                    ? "Couldn't save ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â check your connection"
                    : "Saved to your profile"}
              </p>
            </div>
          )}
        </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="grid justify-items-center gap-0.5">
      <p className="text-2xl font-extrabold tabular-nums text-foreground leading-none">{value}</p>
      <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
    </div>
  );
}
