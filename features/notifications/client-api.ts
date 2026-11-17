import { apiClient } from "@/lib/api-client";

export type NotificationKind =
  | "dot_closed"
  | "letter_ready"
  | "streak_7"
  | "streak_30"
  | "day_ending";

export type NotificationItem = {
  id: string;
  kind: NotificationKind;
  body: string;
  ref: string | null;
  createdAt: string;
  read: boolean;
};

export type NotificationPage = {
  items: NotificationItem[];
  /** No more pages — the list is small and capped at 50. */
  hasMore: false;
  unreadCount: number;
};

export async function fetchNotifications(): Promise<NotificationPage> {
  const { data } = await apiClient.get<NotificationPage>("/notifications");
  return data;
}

/** Badge-only count — one tiny query, used when the list isn't loaded. */
export async function fetchUnreadCount(): Promise<number> {
  const { data } = await apiClient.get<{ unreadCount: number }>(
    "/notifications",
    { params: { count: "1" } },
  );
  return data.unreadCount;
}

export async function markNotificationsRead(id: string): Promise<void> {
  await apiClient.patch("/notifications", { id });
}

export async function markAllNotificationsRead(): Promise<void> {
  await apiClient.patch("/notifications", { id: "all" });
}

export async function clearReadNotifications(): Promise<{ deleted: number }> {
  const { data } = await apiClient.delete<{ deleted: number }>("/notifications");
  return data;
}
