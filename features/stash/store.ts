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
  startTimer: (minutes) => set({ timerEndAt: Date.now() + minutes * 60_000 }),
  cancelTimer: () => set({ timerEndAt: null }),
  finishTimer: () => {
    stashAudio.stopAll();
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
