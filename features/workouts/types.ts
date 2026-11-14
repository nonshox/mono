import type { Models } from "node-appwrite";

export type WorkoutRow = Models.Row & {
  user: string;
  kind: string;
  reps: number;
  duration: number;
};

export type WorkoutSummary = {
  sessions: number;
  totalReps: number;
  bestSet: number;
  streak: number;
};
