"use client";

import { create } from "zustand";
import { deleteDay, fetchYearDays, saveDay, type DayEntry } from "./client-api";

type DaysState = {
  /** day-keyed text of the entries in `year`. */
  entries: Record<string, string>;
  year: number | null;
  /** True while a different year's entries are being fetched. */
  loading: boolean;
  /** False until the first hydrate/load completes. */
  loaded: boolean;
  saving: boolean;
  /** Seed the store from server-rendered initial data (runs once). */
  hydrate: (year: number, days: DayEntry[]) => void;
  /** Load another year's entries (no-op when already loaded). */
  load: (year: number) => Promise<void>;
  /** Upsert with optimistic update; throws on failure so callers can toast. */
  save: (day: string, text: string) => Promise<void>;
  /** Remove an entry with optimistic update; throws on failure. */
  remove: (day: string) => Promise<void>;
};

export const useDaysStore = create<DaysState>((set, get) => ({
  entries: {},
  year: null,
  loading: false,
  loaded: false,
  saving: false,

  hydrate: (year, days) =>
    set({
      year,
      loaded: true,
      entries: Object.fromEntries(days.map((entry) => [entry.day, entry.text])),
    }),

  load: async (year) => {
    if (get().year === year && get().loaded) return;
    set({ loading: true });
    try {
      const days = await fetchYearDays(year);
      set({
        year,
        loaded: true,
        loading: false,
        entries: Object.fromEntries(days.map((entry) => [entry.day, entry.text])),
      });
    } catch (cause) {
      set({ loading: false });
      throw cause;
    }
  },

  save: async (day, text) => {
    const previous = get().entries[day];
    set((state) => ({
      saving: true,
      entries: { ...state.entries, [day]: text },
    }));
    try {
      await saveDay(day, text);
      set({ saving: false });
    } catch (cause) {
      set((state) => {
        const entries = { ...state.entries };
        if (previous === undefined) {
          delete entries[day];
        } else {
          entries[day] = previous;
        }
        return { saving: false, entries };
      });
      throw cause;
    }
  },

  remove: async (day) => {
    const previous = get().entries[day];
    if (previous === undefined) return;
    set((state) => {
      const entries = { ...state.entries };
      delete entries[day];
      return { saving: true, entries };
    });
    try {
      await deleteDay(day);
      set({ saving: false });
    } catch (cause) {
      set((state) => ({
        saving: false,
        entries: { ...state.entries, [day]: previous },
      }));
      throw cause;
    }
  },
}));
