"use client";

import { create } from "zustand";
import { stashAudio, type BrainwaveBand, type NoiseType } from "./audio";

const DEFAULT_VOLUME = 60;

type StashAudioState = {
  brainwaveOn: boolean;
  band: BrainwaveBand;
  isochronic: boolean;
  brainwaveVolume: number;
  noiseOn: boolean;
  noiseType: NoiseType;
  noiseVolume: number;
  droneOn: boolean;
  droneVolume: number;
  /** Epoch ms when the session ends; null when idle. */
  timerEndAt: number | null;

  toggleBrainwave: () => void;
  setBand: (band: BrainwaveBand) => void;
  setIsochronic: (isochronic: boolean) => void;
  setBrainwaveVolume: (volume: number) => void;
  toggleNoise: () => void;
  setNoiseType: (type: NoiseType) => void;
  setNoiseVolume: (volume: number) => void;
  toggleDrone: () => void;
  setDroneVolume: (volume: number) => void;
  /** One tap — band, tones and timer all set up for the moment. */
  startSession: (preset: "calm" | "focus" | "deep") => void;
  cancelTimer: () => void;
  /** Fade everything out and reset — used when the session ends. */
  finishTimer: () => void;
  stopAll: () => void;
};

export const useStashStore = create<StashAudioState>((set, get) => ({
  brainwaveOn: false,
  band: "alpha",
  isochronic: false,
  brainwaveVolume: DEFAULT_VOLUME,
  noiseOn: false,
  noiseType: "brown",
  noiseVolume: DEFAULT_VOLUME,
  droneOn: false,
  droneVolume: DEFAULT_VOLUME,
  timerEndAt: null,

  toggleBrainwave: () => {
    const s = get();
    const brainwaveOn = !s.brainwaveOn;
    stashAudio.setBrainwave({ on: brainwaveOn, band: s.band, isochronic: s.isochronic, volume: s.brainwaveVolume });
    set({ brainwaveOn });
  },
  setBand: (band) => {
    const s = get();
    stashAudio.setBrainwave({ on: s.brainwaveOn, band, isochronic: s.isochronic, volume: s.brainwaveVolume });
    set({ band });
  },
  setIsochronic: (isochronic) => {
    const s = get();
    stashAudio.setBrainwave({ on: s.brainwaveOn, band: s.band, isochronic, volume: s.brainwaveVolume });
    set({ isochronic });
  },
  setBrainwaveVolume: (volume) => {
    const s = get();
    if (s.brainwaveOn) stashAudio.rideBrainwave(volume);
    set({ brainwaveVolume: volume });
  },
  toggleNoise: () => {
    const s = get();
    const noiseOn = !s.noiseOn;
    stashAudio.setNoise({ on: noiseOn, type: s.noiseType, volume: s.noiseVolume });
    set({ noiseOn });
  },
  setNoiseType: (noiseType) => {
    const s = get();
    stashAudio.setNoise({ on: s.noiseOn, type: noiseType, volume: s.noiseVolume });
    set({ noiseType });
  },
  setNoiseVolume: (volume) => {
    const s = get();
    if (s.noiseOn) {
      stashAudio.setNoise({ on: true, type: s.noiseType, volume });
    }
    set({ noiseVolume: volume });
  },
  toggleDrone: () => {
    const s = get();
    const droneOn = !s.droneOn;
    stashAudio.setDrone({ on: droneOn, volume: s.droneVolume });
    set({ droneOn });
  },
  setDroneVolume: (volume) => {
    const s = get();
    if (s.droneOn) stashAudio.rideDrone(volume);
    set({ droneVolume: volume });
  },
  startSession: (preset) => {
    const s = get();
    // One tap = the complete setup for that moment.
    const presets = {
      calm: { minutes: 10, band: "alpha" as BrainwaveBand, noise: false },
      focus: { minutes: 25, band: "beta" as BrainwaveBand, noise: false },
      deep: { minutes: 50, band: "beta" as BrainwaveBand, noise: true },
    } as const;
    const p = presets[preset];
    stashAudio.setBrainwave({
      on: true,
      band: p.band,
      isochronic: s.isochronic,
      volume: s.brainwaveVolume,
    });
    const patch: Partial<StashAudioState> = {
      brainwaveOn: true,
      band: p.band,
      timerEndAt: Date.now() + p.minutes * 60_000,
    };
    if (p.noise) {
      stashAudio.setNoise({ on: true, type: "brown", volume: s.noiseVolume });
      patch.noiseOn = true;
      patch.noiseType = "brown";
    }
    set(patch);
  },
  cancelTimer: () => set({ timerEndAt: null }),
  finishTimer: () => {
    stashAudio.stopAll();
    stashAudio.playChime();
    set({
      timerEndAt: null,
      brainwaveOn: false,
      noiseOn: false,
      droneOn: false,
    });
  },
  stopAll: () => {
    stashAudio.stopAll();
    set({
      timerEndAt: null,
      brainwaveOn: false,
      noiseOn: false,
      droneOn: false,
    });
  },
}));
