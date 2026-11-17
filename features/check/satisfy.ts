import "server-only";

import { userDay } from "@/lib/dates";
import {
  ensureTimelineSeed,
  type TimelineItem,
} from "./service";

/** The user's local day (ISO, matches the days table). Falls back to UTC. */
export function todayDay(timeZone?: string | null): string {
  return userDay(timeZone);
}

/** Fetch today's full state — items + satisfied percentage. Seeds on first visit. */
export async function loadCheckBundle(
  userId: string,
  timeZone?: string | null,
): Promise<{
  items: TimelineItem[];
  satisfied: number | null;
  day: string;
}> {
  const currentItems = await ensureTimelineSeed(userId);
  const { getDaySatisfied } = await import("@/features/days/service");
  const satisfied = await getDaySatisfied(userId, todayDay(timeZone));
  return { items: currentItems, satisfied, day: todayDay(timeZone) };
}
