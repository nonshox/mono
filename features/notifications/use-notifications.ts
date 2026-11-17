"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  clearReadNotifications,
  fetchNotifications,
  markAllNotificationsRead,
  markNotificationsRead,
  type NotificationItem,
} from "@/features/notifications/client-api";
import { getApiErrorMessage } from "@/lib/api-client";
import {
  countUnread,
  keepUnreadInList,
  markAllReadInList,
  markReadInList,
} from "@/features/notifications/model";

export function useNotifications() {
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    fetchNotifications()
      .then((page) => active && setItems(page.items))
      .catch((cause) =>
        active &&
        setError(getApiErrorMessage(cause, "Notifications could not be loaded.")),
      )
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, []);

  const unreadCount = countUnread(items);

  const markRead = (item: NotificationItem) => {
    if (item.read) return;
    const previous = items;
    setItems(markReadInList(items, item.id)); // optimistic
    void markNotificationsRead(item.id).catch((cause) => {
      setItems(previous); // rollback
      toast.error(getApiErrorMessage(cause, "Could not mark as read."));
    });
  };

  const markAllRead = () => {
    const previous = items;
    setItems(markAllReadInList(items));
    void markAllNotificationsRead().catch((cause) => {
      setItems(previous);
      toast.error(getApiErrorMessage(cause, "Could not mark all as read."));
    });
  };

  const clearRead = () => {
    const previous = items;
    setItems(keepUnreadInList(items));
    void clearReadNotifications()
      .then(({ deleted }) => {
        if (deleted === 0) {
          setItems(previous);
          toast.message("No read notifications to clear.");
        } else {
          toast.success(`${deleted} ${deleted === 1 ? "notification" : "notifications"} cleared.`);
        }
      })
      .catch((cause) => {
        setItems(previous);
        toast.error(getApiErrorMessage(cause, "Could not clear read notifications."));
      });
  };

  return {
    items,
    unreadCount,
    loading,
    error,
    markRead,
    markAllRead,
    clearRead,
  };
}
