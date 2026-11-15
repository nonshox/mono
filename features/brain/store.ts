"use client";

import { create } from "zustand";
import {
  createBrainTasks,
  deleteBrainTask,
  fetchBrainTasks,
  setBrainTaskDone,
  tidyBrain as requestTidy,
  type BrainTask,
} from "./client-api";

type BrainState = {
  tasks: BrainTask[];
  loaded: boolean;
  saving: boolean;
  hydrating: boolean;
  hydrate: (tasks: BrainTask[]) => void;
  load: () => Promise<void>;
  add: (text: string) => Promise<BrainTask[]>;
  toggle: (id: string) => Promise<void>;
  remove: (id: string) => Promise<void>;
  tidy: () => Promise<void>;
};

export const useBrainStore = create<BrainState>((set, get) => ({
  tasks: [],
  loaded: false,
  saving: false,
  hydrating: false,

  hydrate: (tasks) => set({ tasks, loaded: true }),

  load: async () => {
    if (get().loaded) return;
    set({ hydrating: true });
    try {
      set({ tasks: await fetchBrainTasks(), loaded: true, hydrating: false });
    } catch {
      set({ hydrating: false });
    }
  },

  add: async (text) => {
    set({ saving: true });
    try {
      const created = await createBrainTasks(text);
      set((state) => ({ tasks: [...created, ...state.tasks], saving: false }));
      return created;
    } catch (cause) {
      set({ saving: false });
      throw cause;
    }
  },

  toggle: async (id) => {
    const previous = get().tasks;
    const target = previous.find((task) => task.id === id);
    if (!target) return;
    set({
      tasks: previous.map((task) =>
        task.id === id ? { ...task, done: !task.done } : task,
      ),
    });
    try {
      await setBrainTaskDone(id, !target.done);
    } catch (cause) {
      set({ tasks: previous });
      throw cause;
    }
  },

  remove: async (id) => {
    const previous = get().tasks;
    set({ tasks: previous.filter((task) => task.id !== id) });
    try {
      await deleteBrainTask(id);
    } catch (cause) {
      set({ tasks: previous });
      throw cause;
    }
  },

  tidy: async () => {
    set({ saving: true });
    try {
      set({ tasks: await requestTidy(), saving: false });
    } catch (cause) {
      set({ saving: false });
      throw cause;
    }
  },
}));
