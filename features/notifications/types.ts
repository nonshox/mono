/** Shared contracts — safe for both server (service) and client (UI) code. */

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
