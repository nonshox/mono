"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

type UiPrefs = {
  /** Which camera the counter should request first. */
  cameraFacing: "user" | "environment";
  setCameraFacing: (facing: "user" | "environment") => void;
};

/**
 * Small client-side preferences, persisted to localStorage. Anything the
 * server doesn't need lives here instead of ad-hoc localStorage keys.
 */
export const useUiPrefs = create<UiPrefs>()(
  persist(
    (set) => ({
      cameraFacing: "user",
      setCameraFacing: (facing) => set({ cameraFacing: facing }),
    }),
    {
      name: "mono:ui",
      version: 1,
      partialize: (state) => ({ cameraFacing: state.cameraFacing }),
    },
  ),
);
