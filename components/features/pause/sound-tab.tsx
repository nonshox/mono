"use client";

import { MoonStar, Square, AudioLines, CloudRain, Radio } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { VolumeStepper } from "@/components/features/pause/volume-stepper";
import { formatClock } from "@/features/pause/time";
import { usePauseStore } from "@/features/pause/store";
import type { BrainwaveBand, NoiseType } from "@/features/pause/audio";

const BANDS: Array<{ value: BrainwaveBand; label: string }> = [
  { value: "delta", label: "Delta · 2 Hz · deep sleep" },
  { value: "theta", label: "Theta · 6 Hz · meditate" },
  { value: "alpha", label: "Alpha · 10 Hz · relax" },
  { value: "beta", label: "Beta · 20 Hz · focus" },
];
const NOISE_TYPES: Array<{ value: NoiseType; label: string }> = [
  { value: "brown", label: "Brown · deep hush" },
  { value: "pink", label: "Pink · softer static" },
  { value: "white", label: "White · bright" },
];
const TIMER_MINUTES = [15, 25, 50] as const;

function SoundCard({
  icon,
  title,
  hint,
  on,
  onToggle,
  children,
}: {
  icon: ReactNode;
  title: string;
  hint: string;
  on: boolean;
  onToggle: () => void;
  children: ReactNode;
}) {
  return (
    <section className="rounded-2xl border-2 border-border/70 bg-popover p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-muted text-foreground">
            {icon}
          </span>
          <div className="min-w-0">
            <p className="text-xs font-bold text-foreground">{title}</p>
            <p className="truncate text-[11px] text-foreground">{hint}</p>
          </div>
        </div>
        <Switch
          aria-label={`${title} on or off`}
          checked={on}
          onCheckedChange={onToggle}
        />
      </div>
      {on && (
        <div className="mt-3 flex flex-col gap-3 border-t border-border/60 pt-3">
          {children}
        </div>
      )}
    </section>
  );
}

export function SoundTab() {
  const brainwaveOn = usePauseStore((st) => st.brainwaveOn);
  const band = usePauseStore((st) => st.band);
  const isochronic = usePauseStore((st) => st.isochronic);
  const brainwaveVolume = usePauseStore((st) => st.brainwaveVolume);
  const noiseOn = usePauseStore((st) => st.noiseOn);
  const noiseType = usePauseStore((st) => st.noiseType);
  const noiseVolume = usePauseStore((st) => st.noiseVolume);
  const droneOn = usePauseStore((st) => st.droneOn);
  const droneVolume = usePauseStore((st) => st.droneVolume);
  const timerEndAt = usePauseStore((st) => st.timerEndAt);
  const toggleBrainwave = usePauseStore((st) => st.toggleBrainwave);
  const setBand = usePauseStore((st) => st.setBand);
  const setIsochronic = usePauseStore((st) => st.setIsochronic);
  const setBrainwaveVolume = usePauseStore((st) => st.setBrainwaveVolume);
  const toggleNoise = usePauseStore((st) => st.toggleNoise);
  const setNoiseType = usePauseStore((st) => st.setNoiseType);
  const setNoiseVolume = usePauseStore((st) => st.setNoiseVolume);
  const toggleDrone = usePauseStore((st) => st.toggleDrone);
  const setDroneVolume = usePauseStore((st) => st.setDroneVolume);
  const startTimer = usePauseStore((st) => st.startTimer);
  const cancelTimer = usePauseStore((st) => st.cancelTimer);
  const finishTimer = usePauseStore((st) => st.finishTimer);
  const stopAll = usePauseStore((st) => st.stopAll);
  const [now, setNow] = useState(() => Date.now());

  // Focus timer tick — drift-free, derived from timerEndAt.
  useEffect(() => {
    if (timerEndAt === null) return;
    const id = window.setInterval(() => {
      const current = Date.now();
      setNow(current);
      if (current >= timerEndAt) {
        finishTimer();
        toast.success("Focus session done — sound faded out");
      }
    }, 500);
    return () => window.clearInterval(id);
  }, [timerEndAt, finishTimer]);

  const remainingMs = timerEndAt === null ? null : Math.max(0, timerEndAt - now);
  const anythingOn = brainwaveOn || noiseOn || droneOn;

  return (
    <section aria-label="Sound mixer" className="flex flex-col gap-3 py-2">
      <div className="flex items-center justify-between px-1">
        <p className="type-eyebrow text-foreground">On this device</p>
        <Button
          className="h-7 gap-1.5 rounded-full px-3 text-[11px] font-bold"
          disabled={!anythingOn}
          onClick={stopAll}
          size="sm"
          type="button"
          variant="outline"
        >
          <Square aria-hidden="true" className="size-3" fill="currentColor" strokeWidth={0} />
          Stop all
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <SoundCard
          hint={isochronic ? "Pulsed tone · speakers ok" : "Two tones · headphones"}
          icon={<AudioLines aria-hidden="true" className="size-4" strokeWidth={1.8} />}
          on={brainwaveOn}
          onToggle={toggleBrainwave}
          title="Brainwave"
        >
          <Select
            onValueChange={(value) => value && setIsochronic(value === "isochronic")}
            value={isochronic ? "isochronic" : "binaural"}
          >
            <SelectTrigger aria-label="Tone type" className="h-9 w-full rounded-xl text-xs font-semibold">
              <SelectValue>{(value: string) => (value === "isochronic" ? "Isochronic" : "Binaural")}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="binaural">Binaural</SelectItem>
              <SelectItem value="isochronic">Isochronic</SelectItem>
            </SelectContent>
          </Select>
          <Select
            onValueChange={(value) => value && setBand(value as BrainwaveBand)}
            value={band}
          >
            <SelectTrigger aria-label="Brainwave band" className="h-9 w-full rounded-xl text-xs font-semibold">
              <SelectValue>{(value: BrainwaveBand) => BANDS.find((entry) => entry.value === value)?.label ?? value}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              {BANDS.map((entry) => (
                <SelectItem key={entry.value} value={entry.value}>
                  {entry.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <VolumeStepper label="Brainwave volume" onChange={setBrainwaveVolume} value={brainwaveVolume} />
        </SoundCard>

        <SoundCard
          hint="Generated noise · masks the world"
          icon={<CloudRain aria-hidden="true" className="size-4" strokeWidth={1.8} />}
          on={noiseOn}
          onToggle={toggleNoise}
          title="Noise"
        >
          <Select
            onValueChange={(value) => value && setNoiseType(value as NoiseType)}
            value={noiseType}
          >
            <SelectTrigger aria-label="Noise color" className="h-9 w-full rounded-xl text-xs font-semibold">
              <SelectValue>{(value: NoiseType) => NOISE_TYPES.find((entry) => entry.value === value)?.label ?? value}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              {NOISE_TYPES.map((entry) => (
                <SelectItem key={entry.value} value={entry.value}>
                  {entry.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <VolumeStepper label="Noise volume" onChange={setNoiseVolume} value={noiseVolume} />
        </SoundCard>

        <SoundCard
          hint="Detuned 55/110/165 Hz pad"
          icon={<Radio aria-hidden="true" className="size-4" strokeWidth={1.8} />}
          on={droneOn}
          onToggle={toggleDrone}
          title="Drone"
        >
          <VolumeStepper label="Drone volume" onChange={setDroneVolume} value={droneVolume} />
        </SoundCard>

        <section className="rounded-2xl border-2 border-border/70 bg-popover p-4">
          <div className="flex items-center gap-2.5">
            <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-muted text-foreground">
              <MoonStar aria-hidden="true" className="size-4" strokeWidth={1.8} />
            </span>
            <div className="min-w-0">
              <p className="text-xs font-bold text-foreground">Focus timer</p>
              <p className="text-[11px] text-foreground">
                {remainingMs !== null ? "Fades out when done" : "Everything keeps running"}
              </p>
            </div>
          </div>
          <div className="mt-3 border-t border-border/60 pt-3">
            {remainingMs !== null ? (
              <div className="flex items-center justify-between gap-3">
                <span className="type-title text-3xl tabular-nums text-foreground" aria-live="polite">
                  {formatClock(remainingMs)}
                </span>
                <Button
                  className="h-9 rounded-xl px-4 text-xs font-bold"
                  onClick={cancelTimer}
                  type="button"
                  variant="outline"
                >
                  Cancel
                </Button>
              </div>
            ) : (
              <div className="flex flex-wrap items-center gap-2">
                {TIMER_MINUTES.map((minutes) => (
                  <Button
                    className="h-9 rounded-xl px-4 text-xs font-bold tabular-nums"
                    key={minutes}
                    onClick={() => startTimer(minutes)}
                    type="button"
                    variant="outline"
                  >
                    {minutes} min
                  </Button>
                ))}
              </div>
            )}
          </div>
        </section>
      </div>

      {!isochronic && (
        <p className="px-1 text-center text-[11px] leading-5 text-foreground">
          Headphones recommended — the two tones barely differ, which is the trick.
        </p>
      )}
    </section>
  );
}
