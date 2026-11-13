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

export async function saveWorkout(input: {
  kind: "pushup";
  reps: number;
  duration: number;
  score?: number;
}): Promise<void> {
  await apiClient.post("/workouts", input);
}
