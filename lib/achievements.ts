export type MilestoneId =
  | "first-session"
  | "first-20"
  | "first-50"
  | "first-100"
  | "first-250"
  | "first-500"
  | "first-1000"
  | "first-streak"
  | "set-20"
  | "set-50"
  | "set-100";

export type MilestoneCategory = "cumulative" | "single";

export type Milestone = {
  id: MilestoneId;
  title: string;
  description: string;
  hint: string;
  category: MilestoneCategory;
};

export const MILESTONES: Milestone[] = [
  // Cumulative — progression over time
  { id: "first-session", title: "First session", description: "Complete your first push-ups", hint: "1 session", category: "cumulative" },
  { id: "first-20", title: "Warming up", description: "Reach 20 total reps", hint: "20 total reps", category: "cumulative" },
  { id: "first-50", title: "Getting steady", description: "Reach 50 total reps", hint: "50 total reps", category: "cumulative" },
  { id: "first-100", title: "Century club", description: "Reach 100 total reps", hint: "100 total reps", category: "cumulative" },
  { id: "first-250", title: "Solid build", description: "Reach 250 total reps", hint: "250 total reps", category: "cumulative" },
  { id: "first-500", title: "Strong foundation", description: "Reach 500 total reps", hint: "500 total reps", category: "cumulative" },
  { id: "first-1000", title: "Elite engine", description: "Reach 1,000 total reps", hint: "1,000 total reps", category: "cumulative" },
  { id: "first-streak", title: "Streak holder", description: "Train 3 days in a row", hint: "3-day streak", category: "cumulative" },
  // Single session — one set, counted by the camera
  { id: "set-20", title: "Twenty strong", description: "20 reps in a single session", hint: "20 in one session", category: "single" },
  { id: "set-50", title: "Fifty force", description: "50 reps in a single session", hint: "50 in one session", category: "single" },
  { id: "set-100", title: "Century in one go", description: "100 reps in a single session", hint: "100 in one session", category: "single" },
];

export const CATEGORY_LABELS: Record<MilestoneCategory, string> = {
  cumulative: "Cumulative",
  single: "Single session",
};

export type StatsInput = {
  totalReps: number;
  sessions: number;
  streak: number;
  bestSet: number;
};

export function unlockedMilestones(input: StatsInput): MilestoneId[] {
  const { totalReps, sessions, streak, bestSet } = input;
  const unlocked: MilestoneId[] = [];
  for (const m of MILESTONES) {
    if (m.id === "first-session" && sessions >= 1) unlocked.push(m.id);
    else if (m.id === "first-20" && totalReps >= 20) unlocked.push(m.id);
    else if (m.id === "first-50" && totalReps >= 50) unlocked.push(m.id);
    else if (m.id === "first-100" && totalReps >= 100) unlocked.push(m.id);
    else if (m.id === "first-250" && totalReps >= 250) unlocked.push(m.id);
    else if (m.id === "first-500" && totalReps >= 500) unlocked.push(m.id);
    else if (m.id === "first-1000" && totalReps >= 1000) unlocked.push(m.id);
    else if (m.id === "first-streak" && streak >= 3) unlocked.push(m.id);
    else if (m.id === "set-20" && bestSet >= 20) unlocked.push(m.id);
    else if (m.id === "set-50" && bestSet >= 50) unlocked.push(m.id);
    else if (m.id === "set-100" && bestSet >= 100) unlocked.push(m.id);
  }
  return unlocked;
}
