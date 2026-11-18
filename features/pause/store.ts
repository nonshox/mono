"use client";

import { create } from "zustand";
import { pauseAudio, type BrainwaveBand, type NoiseType } from "./audio";

const DEFAULT_VOLUME = 60;

type PauseState = {
  brainwaveOn: boolean;
  band: BrainwaveBand;
  isochronic: boolean;
  brainwaveVolume: number;
  noiseOn: boolean;
  noiseType: NoiseType;
  noiseVolume: number;
  droneOn: boolean;
  droneVolume: number;
  /** Epoch ms when the focus timer ends; null when idle. */
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
  startTimer: (minutes: number) => void;
  cancelTimer: () => void;
  /** Fade everything out and reset — used when the timer rings. */
  finishTimer: () => void;
  stopAll: () => void;
};

export const usePauseStore = create<PauseState>((set, get) => ({
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
    pauseAudio.setBrainwave({ on: brainwaveOn, band: s.band, isochronic: s.isochronic, volume: s.brainwaveVolume });
    set({ brainwaveOn });
  },
  setBand: (band) => {
    const s = get();
    pauseAudio.setBrainwave({ on: s.brainwaveOn, band, isochronic: s.isochronic, volume: s.brainwaveVolume });
    set({ band });
  },
  setIsochronic: (isochronic) => {
    const s = get();
    pauseAudio.setBrainwave({ on: s.brainwaveOn, band: s.band, isochronic, volume: s.brainwaveVolume });
    set({ isochronic });
  },
  setBrainwaveVolume: (volume) => {
    const s = get();
    if (s.brainwaveOn) pauseAudio.rideBrainwave(volume);
    set({ brainwaveVolume: volume });
  },
  toggleNoise: () => {
    const s = get();
    const noiseOn = !s.noiseOn;
    pauseAudio.setNoise({ on: noiseOn, type: s.noiseType, volume: s.noiseVolume });
    set({ noiseOn });
  },
  setNoiseType: (noiseType) => {
    const s = get();
    pauseAudio.setNoise({ on: s.noiseOn, type: noiseType, volume: s.noiseVolume });
    set({ noiseType });
  },
  setNoiseVolume: (volume) => {
    const s = get();
    if (s.noiseOn) {
      pauseAudio.setNoise({ on: true, type: s.noiseType, volume });
    }
    set({ noiseVolume: volume });
  },
  toggleDrone: () => {
    const s = get();
    const droneOn = !s.droneOn;
    pauseAudio.setDrone({ on: droneOn, volume: s.droneVolume });
    set({ droneOn });
  },
  setDroneVolume: (volume) => {
    const s = get();
    if (s.droneOn) pauseAudio.rideDrone(volume);
    set({ droneVolume: volume });
  },
  startTimer: (minutes) => set({ timerEndAt: Date.now() + minutes * 60_000 }),
  cancelTimer: () => set({ timerEndAt: null }),
  finishTimer: () => {
    pauseAudio.stopAll();
    set({
      timerEndAt: null,
      brainwaveOn: false,
      noiseOn: false,
      droneOn: false,
    });
  },
  stopAll: () => {
    pauseAudio.stopAll();
    set({
      timerEndAt: null,
      brainwaveOn: false,
      noiseOn: false,
      droneOn: false,
    });
  },
}));
