"use client";

import { create } from "zustand";
import { fetchUser, type UserProfile } from "./client-api";

type UserState = {
  user: UserProfile | null;
  loading: boolean;
  error: string | null;
  /** Load once; subsequent calls are no-ops unless forced. */
  load: (force?: boolean) => Promise<void>;
  /** Local mutation after a profile update so every consumer sees it. */
  setUser: (user: UserProfile | null) => void;
  reset: () => void;
};

let inflight: Promise<void> | null = null;

/**
 * Shared account row — every surface that needs name/avatar reads it from
 * here instead of re-fetching /users on mount.
 */
export const useUserStore = create<UserState>((set, get) => ({
  user: null,
  loading: false,
  error: null,

  load: async (force = false) => {
    if (!force && get().user) return;
    if (inflight) return inflight;

    set({ loading: true, error: null });
    inflight = fetchUser()
      .then((user) => set({ user, loading: false, error: null }))
      .catch((cause) => {
        set({
          loading: false,
          error: cause instanceof Error ? cause.message : "Could not load your profile.",
        });
      })
      .finally(() => {
        inflight = null;
      });
    return inflight;
  },

  setUser: (user) => set({ user }),
  reset: () => set({ user: null, loading: false, error: null }),
}));
