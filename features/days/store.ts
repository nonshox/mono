"use client";

import { create } from "zustand";
import { deleteDay, saveDay, type DayEntry } from "./client-api";

type DaysState = {
  /** year -> day-keyed text of the entries written that year. */
  entries: Record<string, string>;
  year: number | null;
  saving: boolean;
  /** Seed the store from server-rendered initial data (runs once). */
  hydrate: (year: number, days: DayEntry[]) => void;
  /** Upsert with optimistic update; throws on failure so callers can toast. */
  save: (day: string, text: string) => Promise<void>;
  /** Remove an entry with optimistic update; throws on failure. */
  remove: (day: string) => Promise<void>;
};

export const useDaysStore = create<DaysState>((set, get) => ({
  entries: {},
  year: null,
  saving: false,

  hydrate: (year, days) =>
    set({
      year,
      entries: Object.fromEntries(days.map((entry) => [entry.day, entry.text])),
    }),

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
