import type { LucideIcon } from "lucide-react";
import { Dumbbell, PersonStanding, Timer } from "lucide-react";

export type ExerciseKind = "pushup" | "squat" | "plank";

export type ExerciseConfig = {
  id: ExerciseKind;
  label: string;
  short: string;
  hint: string;
  icon: LucideIcon;
  scoring: "angular" | "time";
  axes:
    | { kind: "angular"; downAngle: number; upAngle: number; joints: [number, number, number] }
    | { kind: "time"; alignTol: number };
};

export const EXERCISES: Record<ExerciseKind, ExerciseConfig> = {
  pushup: {
    id: "pushup",
    label: "Push-ups",
    short: "Push-ups",
    hint: "Side view. Shoulders, elbows, hips and ankles tracked.",
    icon: Dumbbell,
    scoring: "angular",
    axes: { kind: "angular", downAngle: 90, upAngle: 150, joints: [11, 13, 15] },
  },
  squat: {
    id: "squat",
    label: "Squats",
    short: "Squats",
    hint: "Side view. Knees and hips tracked. Sit below knee-parallel.",
    icon: PersonStanding,
    scoring: "angular",
    axes: { kind: "angular", downAngle: 90, upAngle: 155, joints: [23, 25, 27] }, // right hip-knee-ankle
  },
  plank: {
    id: "plank",
    label: "Plank",
    short: "Plank",
    hint: "Side view. Hold still. Flat back = good form.",
    icon: Timer,
    scoring: "time",
    axes: { kind: "time", alignTol: 30 },
  },
};

export const exerciseList = Object.values(EXERCISES);
