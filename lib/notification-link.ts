import type { NotificationItem } from "@/features/notifications/client-api";

/** Where a notification should take you when tapped. */
export function notificationHref(item: NotificationItem): string | null {
  if (item.type.startsWith("followed")) return "/profile";
  if (item.ref?.startsWith("achievement:")) return "/profile";
  return null;
}

export function relativeTime(value: string): string {
  const timestamp = new Date(value).getTime();
  if (Number.isNaN(timestamp)) return "";
  const seconds = Math.max(0, Math.floor((Date.now() - timestamp) / 1000));
  if (seconds < 60) return "now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d`;
  return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" }).format(new Date(value));
}
