/** Deterministic XP: reps are the grind, badges the bonus, wins the glory. */
export function computeXp(input: {
  totalReps: number;
  unlockedBadges: number;
  challengesCompleted: number;
}): number {
  return input.totalReps * 10 + input.unlockedBadges * 250 + input.challengesCompleted * 500;
}
