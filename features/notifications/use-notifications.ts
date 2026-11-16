"use client";

import {
  useInfiniteQuery,
  useMutation,
  useQueryClient,
  type InfiniteData,
} from "@tanstack/react-query";
import { toast } from "sonner";
import { useMemo } from "react";
import {
  fetchNotifications,
  markNotificationsRead,
  type NotificationItem,
  type NotificationPage,
} from "@/features/notifications/client-api";
import {
  allUnreadIds,
  chunk,
  countUnread,
  flattenPages,
  markAllReadInPages,
  markReadInPages,
} from "@/features/notifications/model";
import { getApiErrorMessage } from "@/lib/api-client";

export const notificationsKey = ["notifications"] as const;

type PagesData = InfiniteData<NotificationPage, string | null>;

export function useNotifications() {
  const queryClient = useQueryClient();
  const query = useInfiniteQuery({
    queryKey: notificationsKey,
    queryFn: ({ pageParam }) => fetchNotifications(pageParam),
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    staleTime: 30_000,
  });

  const pages = useMemo(() => query.data?.pages ?? [], [query.data]);
  const items = useMemo(() => flattenPages(pages), [pages]);
  const unreadCount = useMemo(() => countUnread(items), [items]);
  const loading = query.isLoading;
  const error = query.error
    ? getApiErrorMessage(query.error, "Notifications could not be loaded.")
    : "";

  const snapshot = async (): Promise<PagesData | undefined> => {
    await queryClient.cancelQueries({ queryKey: notificationsKey });
    return queryClient.getQueryData<PagesData>(notificationsKey);
  };
  const restore = (previous: PagesData | undefined) => {
    if (previous) queryClient.setQueryData(notificationsKey, previous);
    else void queryClient.invalidateQueries({ queryKey: notificationsKey });
  };
  const patch = (updater: (pages: NotificationPage[]) => NotificationPage[]) => {
    queryClient.setQueryData<PagesData>(notificationsKey, (data) =>
      data ? { ...data, pages: updater(data.pages) } : data,
    );
  };

  const markReadMutation = useMutation({
    mutationFn: (item: NotificationItem) =>
      item.read ? Promise.resolve() : markNotificationsRead(item.ids ?? [item.id]),
    onMutate: async (item) => {
      if (item.read) return { previous: undefined as PagesData | undefined };
      const previous = await snapshot();
      patch((current) => markReadInPages(current, item));
      return { previous };
    },
    onError: (_cause, _item, context) => {
      restore(context?.previous);
      toast.error("This notification could not be marked as read.");
    },
  });

  const markAllReadMutation = useMutation({
    mutationFn: async () => {
      const ids = allUnreadIds(flattenPages(pages));
      for (const batch of chunk(ids, 50)) {
        await markNotificationsRead(batch);
      }
    },
    onMutate: async () => {
      const previous = await snapshot();
      patch(markAllReadInPages);
      return { previous };
    },
    onError: (_cause, _vars, context) => {
      restore(context?.previous);
      toast.error("Notifications could not be marked as read.");
    },
  });

  return {
    items,
    unreadCount,
    loading,
    loaded: query.isSuccess || query.data !== undefined,
    error,
    markRead: (item: NotificationItem) => markReadMutation.mutate(item),
    markAllRead: () => markAllReadMutation.mutate(),
  };
}

/** Drop the cached notifications list (used on sign-out / re-auth). */
export function useClearNotifications() {
  const queryClient = useQueryClient();
  return () => queryClient.removeQueries({ queryKey: notificationsKey });
}
