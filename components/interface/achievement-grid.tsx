import { Check, Lock } from "lucide-react";
import { MILESTONES, type MilestoneId } from "@/lib/achievements";

/**
 * Achievement list — one hairline row per badge, unlocked first.
 * No boxes, no groups, no noise. Pure render.
 */
export function AchievementGrid({
  unlockedIds,
}: {
  unlockedIds: MilestoneId[];
}) {
  const unlocked = new Set(unlockedIds);
  const ordered = [
    ...MILESTONES.filter((m) => unlocked.has(m.id)),
    ...MILESTONES.filter((m) => !unlocked.has(m.id)),
  ];

  return (
    <ul className="divide-y divide-border/60 border-y border-border/60">
      {ordered.map((m) => {
        const isUnlocked = unlocked.has(m.id);
        return (
          <li
            className="flex items-center gap-2.5 py-2.5 sm:py-3"
            key={m.id}
            title={m.description}
          >
            {isUnlocked ? (
              <Check
                aria-hidden="true"
                className="size-4 shrink-0 text-primary sm:size-4"
                strokeWidth={2.6}
              />
            ) : (
              <Lock
                aria-hidden="true"
                className="size-4 shrink-0 text-muted-foreground/50"
                strokeWidth={2}
              />
            )}
            <span
              className={`min-w-0 flex-1 truncate text-[11px] sm:text-xs ${
                isUnlocked
                  ? "font-medium text-foreground"
                  : "text-muted-foreground"
              }`}
            >
              {m.title}
            </span>
            <span
              className={`shrink-0 text-[10px] tabular-nums ${
                isUnlocked
                  ? "text-primary/80"
                  : "text-muted-foreground/60"
              }`}
            >
              {isUnlocked ? "Earned" : m.hint}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
