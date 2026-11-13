import type { Models } from "node-appwrite";

export type ChallengeRow = Models.Row & {
  title: string;
  reps: number;
  window: string;
  starts: string;
  ends: string;
  active: boolean;
};

export type Challenge = {
  id: string;
  title: string;
  reps: number;
  window: string;
  starts: string;
  ends: string;
  isActive: boolean;
};

export type LeaderboardEntry = {
  rank: number;
  userId: string;
  name: string;
  avatar: string;
  reps: number;
  isYou: boolean;
};

export type ChallengeDetail = Challenge & {
  joined: boolean;
  myReps: number;
  memberCount: number;
  leaderboard: LeaderboardEntry[];
};
