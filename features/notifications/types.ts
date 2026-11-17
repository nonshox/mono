/** Shared contracts — safe for both server (service) and client (UI) code. */

export type NotificationKind =
  | "dot_closed"
  | "letter_ready"
  | "day_ending";

export type NotificationItem = {
  id: string;
  kind: NotificationKind;
  body: string;
  createdAt: string;
  read: boolean;
};
