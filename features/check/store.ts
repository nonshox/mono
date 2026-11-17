"use client";

import { create } from "zustand";
import {
  createItem,
  deleteItem,
  moveItem as moveApi,
  editItemText as editApi,
  resetTicks,
  saveSatisfied,
  setItemDone,
} from "./client-api";
import type { TimelineItem, Bucket } from "./types";

type CheckState = {
  items: TimelineItem[];
  day: string;
  satisfied: number | null;
  loading: boolean;
  saving: boolean;
  toggle: (id: string) => Promise<void>;
  add: (bucket: Bucket, text: string) => Promise<void>;
  remove: (id: string) => Promise<void>;
  move: (id: string, direction: "up" | "down") => Promise<void>;
  editText: (id: string, text: string) => Promise<void>;
  satisfy: (percent: number) => Promise<void>;
  reset: () => Promise<void>;
  hydrate: (bundle: {
    items: TimelineItem[];
    day: string;
    satisfied: number | null;
  }) => void;
};

export const useCheckStore = create<CheckState>((set, get) => ({
  items: [],
  day: "",
  satisfied: null,
  loading: true,
  saving: false,

  hydrate: ({ items, day, satisfied }) =>
    set({ items, day, satisfied, loading: false }),

  toggle: async (id) => {
    const previous = get().items;
    const target = previous.find((item) => item.id === id);
    if (!target) return;
    set({
      items: previous.map((item) =>
        item.id === id ? { ...item, done: !item.done } : item,
      ),
    });
    try {
      await setItemDone(id, !target.done);
    } catch (cause) {
      set({ items: previous });
      throw cause;
    }
  },

  add: async (bucket, text) => {
    set({ saving: true });
    try {
      const item = await createItem(bucket, text);
      set({ items: [...get().items, item], saving: false });
    } catch (cause) {
      set({ saving: false });
      throw cause;
    }
  },

  move: async (id, direction) => {
    const previous = get().items;
    const target = previous.find((item) => item.id === id);
    if (!target) return;
    const siblings = previous
      .filter((entry) => entry.bucket === target.bucket)
      .sort((a, b) => a.order - b.order);
    const index = siblings.findIndex((entry) => entry.id === id);
    const swapIndex = direction === "up" ? index - 1 : index + 1;
    if (swapIndex < 0 || swapIndex >= siblings.length) return;
    const a = siblings[index];
    const b = siblings[swapIndex];
    set({
      items: previous.map((entry) => {
        if (entry.id === a.id) return { ...entry, order: b.order };
        if (entry.id === b.id) return { ...entry, order: a.order };
        return entry;
      }),
    });
    try {
      await moveApi(id, direction);
    } catch (cause) {
      set({ items: previous });
      throw cause;
    }
  },

  editText: async (id, text) => {
    const previous = get().items;
    set({ items: previous.map((entry) => (entry.id === id ? { ...entry, text } : entry)) });
    try {
      await editApi(id, text);
    } catch (cause) {
      set({ items: previous });
      throw cause;
    }
  },

  remove: async (id) => {
    const previous = get().items;
    set({ items: previous.filter((item) => item.id !== id) });
    try {
      await deleteItem(id);
    } catch (cause) {
      set({ items: previous });
      throw cause;
    }
  },

  satisfy: async (percent) => {
    set({ saving: true });
    try {
      await saveSatisfied(percent);
      set({ satisfied: percent, saving: false });
    } catch (cause) {
      set({ saving: false });
      throw cause;
    }
  },

  reset: async () => {
    set({ saving: true });
    try {
      await resetTicks();
      set({
        items: get().items.map((item) => ({ ...item, done: false })),
        saving: false,
      });
    } catch (cause) {
      set({ saving: false });
      throw cause;
    }
  },
}));
