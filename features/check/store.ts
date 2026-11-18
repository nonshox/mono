"use client";

import { create } from "zustand";
import {
  createItem,
  deleteItem,
  moveItem as moveApi,
  reorderItems as reorderApi,
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
  // --- UI state (client-only) ------------------------------------------
  manage: Record<Bucket, boolean>;
  drafts: Record<Bucket, string>;
  editingId: string | null;
  suggestingBucket: Bucket | null;
  suggestions: Partial<Record<Bucket, string[]>>;
  toggleManage: (bucket: Bucket) => void;
  setDraft: (bucket: Bucket, text: string) => void;
  clearDraft: (bucket: Bucket) => void;
  setEditingId: (id: string | null) => void;
  setSuggestingBucket: (bucket: Bucket | null) => void;
  setSuggestions: (
    updater: (prev: Partial<Record<Bucket, string[]>>) => Partial<Record<Bucket, string[]>>,
  ) => void;
  // --- actions -----------------------------------------------------------
  toggle: (id: string) => Promise<void>;
  add: (bucket: Bucket, text: string) => Promise<void>;
  remove: (id: string) => Promise<void>;
  move: (id: string, direction: "up" | "down") => Promise<void>;
  reorder: (bucket: Bucket, ids: string[]) => Promise<void>;
  editText: (id: string, text: string) => Promise<void>;
  satisfy: (percent: number) => Promise<void>;
  reset: () => Promise<void>;
  hydrate: (bundle: {
    items: TimelineItem[];
    day: string;
    satisfied: number | null;
  }) => void;
};

const ALL_MANAGE_OFF: Record<Bucket, boolean> = {
  rise: false,
  midday: false,
  evening: false,
};

/**
 * Manage mode exits itself shortly after any manage action, so it never
 * lingers after the user is done. Lives at module scope — one shared timer
 * across all three buckets.
 */
let manageExitTimer: ReturnType<typeof setTimeout> | null = null;
function scheduleManageExit(set: (partial: Partial<CheckState>) => void) {
  if (manageExitTimer) clearTimeout(manageExitTimer);
  manageExitTimer = setTimeout(() => {
    set({ manage: { ...ALL_MANAGE_OFF } });
    manageExitTimer = null;
  }, 900);
}

export const useCheckStore = create<CheckState>((set, get) => ({
  items: [],
  day: "",
  satisfied: null,
  loading: true,
  saving: false,
  manage: { ...ALL_MANAGE_OFF },
  drafts: { rise: "", midday: "", evening: "" },
  editingId: null,
  suggestingBucket: null,
  suggestions: {},

  toggleManage: (bucket) =>
    set((state) => {
      const manage = { ...state.manage, [bucket]: !state.manage[bucket] };
      return { manage, editingId: manage[bucket] ? state.editingId : null };
    }),

  setDraft: (bucket, text) =>
    set((state) => ({ drafts: { ...state.drafts, [bucket]: text } })),

  clearDraft: (bucket) =>
    set((state) => ({ drafts: { ...state.drafts, [bucket]: "" } })),

  setEditingId: (id) => set({ editingId: id }),

  setSuggestingBucket: (bucket) => set({ suggestingBucket: bucket }),

  setSuggestions: (updater) => set((state) => ({ suggestions: updater(state.suggestions) })),

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
      scheduleManageExit(set);
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
      scheduleManageExit(set);
    } catch (cause) {
      set({ items: previous });
      throw cause;
    }
  },

  reorder: async (bucket, ids) => {
    const previous = get().items;
    const orderOf = new Map(ids.map((id, index) => [id, index]));
    set({
      items: previous.map((entry) =>
        entry.bucket === bucket ? { ...entry, order: orderOf.get(entry.id) ?? entry.order } : entry,
      ),
    });
    try {
      await reorderApi(bucket, ids);
      scheduleManageExit(set);
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
      scheduleManageExit(set);
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
      scheduleManageExit(set);
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
