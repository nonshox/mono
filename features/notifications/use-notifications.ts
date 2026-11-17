"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  clearReadNotifications,
  fetchNotifications,
  fetchUnreadCount,
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

const SEEN_KEY = "mono_bell_seen";

/**
 * Lazy notifications — zero network on mount. The full list is fetched only
 * when the bell opens; after the first open in a session, mounts fetch a
 * tiny unread count (id-only rows) so the badge stays honest.
 */
export function useNotifications() {
  const [items, setItems] = useState<NotificationItem[] | null>(null);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const loaded = items !== null;
  const unreadCount = loaded ? countUnread(items) : count;

  // Badge refresh only after the bell has been opened once this session.
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.sessionStorage.getItem(SEEN_KEY) !== "1") return;
    let active = true;
    fetchUnreadCount()
      .then((next) => active && setCount(next))
      .catch(() => {
        /* silent — badge simply stays off */
      });
    return () => {
      active = false;
    };
  }, []);

  const ensureLoaded = async () => {
    if (items !== null) {
      return;
    }
    setLoading(true);
    setError("");
    try {
      const page = await fetchNotifications();
      setItems(page.items);
      window.sessionStorage.setItem(SEEN_KEY, "1");
      setCount(countUnread(page.items));
    } catch (cause) {
      setError(
        getApiErrorMessage(cause, "Notifications could not be loaded."),
      );
    } finally {
      setLoading(false);
    }
  };

  const markRead = (item: NotificationItem) => {
    if (!items || item.read) return;
    const previous = items;
    setItems(markReadInList(items, item.id)); // optimistic
    void markNotificationsRead(item.id).catch((cause) => {
      setItems(previous); // rollback
      toast.error(getApiErrorMessage(cause, "Could not mark as read."));
    });
  };

  const markAllRead = () => {
    if (!items) return;
    const previous = items;
    setItems(markAllReadInList(items));
    void markAllNotificationsRead().catch((cause) => {
      setItems(previous);
      toast.error(getApiErrorMessage(cause, "Could not mark all as read."));
    });
  };

  const clearRead = () => {
    if (!items) return;
    const previous = items;
    setItems(keepUnreadInList(items));
    void clearReadNotifications()
      .then(({ deleted }) => {
        if (deleted === 0) {
          setItems(previous);
          toast.message("No read notifications to clear.");
        } else {
          toast.success(
            `${deleted} ${deleted === 1 ? "notification" : "notifications"} cleared.`,
          );
        }
      })
      .catch((cause) => {
        setItems(previous);
        toast.error(
          getApiErrorMessage(cause, "Could not clear read notifications."),
        );
      });
  };

  return {
    items: items ?? [],
    loaded,
    unreadCount,
    loading,
    error,
    ensureLoaded,
    markRead,
    markAllRead,
    clearRead,
  };
}
