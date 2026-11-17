"use client";

import { create } from "zustand";
import { deleteDay, fetchYearDays, saveDay, type DayEntry } from "./client-api";

type DaysState = {
  /** day-keyed text of the entries in `year`. */
  entries: Record<string, string>;
  /** day-keyed satisfaction percent (only days closed via end-of-day appear). */
  satisfied: Record<string, number>;
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

const satisfiedOf = (days: DayEntry[]) =>
  Object.fromEntries(
    days.filter((entry) => entry.satisfied != null).map((entry) => [entry.day, entry.satisfied as number]),
  );

export const useDaysStore = create<DaysState>((set, get) => ({
  entries: {},
  satisfied: {},
  year: null,
  loading: false,
  loaded: false,
  saving: false,

  hydrate: (year, days) =>
    set({
      year,
      loaded: true,
      entries: Object.fromEntries(days.map((entry) => [entry.day, entry.text])),
      satisfied: satisfiedOf(days),
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
        satisfied: satisfiedOf(days),
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
    const previousSatisfied = get().satisfied[day];
    if (previous === undefined) return;
    set((state) => {
      const entries = { ...state.entries };
      delete entries[day];
      const satisfied = { ...state.satisfied };
      delete satisfied[day];
      return { saving: true, entries, satisfied };
    });
    try {
      await deleteDay(day);
      set({ saving: false });
    } catch (cause) {
      set((state) => ({
        saving: false,
        entries: { ...state.entries, [day]: previous },
        satisfied:
          previousSatisfied === undefined
            ? state.satisfied
            : { ...state.satisfied, [day]: previousSatisfied },
      }));
      throw cause;
    }
  },
}));
