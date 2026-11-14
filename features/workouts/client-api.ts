import { apiClient } from "@/lib/api-client";

export type WorkoutSummary = {
  sessions: number;
  totalReps: number;
  bestSet: number;
  streak: number;
};

export async function fetchWorkoutSummary(): Promise<WorkoutSummary> {
  const { data } = await apiClient.get<WorkoutSummary>("/workouts");
  return data;
}

export type ChallengeProgress = {
  title: string;
  current: number;
  target: number;
  completed: boolean;
};

export type SaveWorkoutResult = {
  saved: boolean;
  unlocked: string[];
  challengesCompleted: string[];
  challenges: ChallengeProgress[];
  rank: number | null;
  totalPushups: number;
};

export async function saveWorkout(input: {
  kind: "pushup" | "squat" | "plank";
  reps: number;
  duration: number;
}): Promise<SaveWorkoutResult> {
  const { data } = await apiClient.post<SaveWorkoutResult>("/workouts", input);
  return data;
}
