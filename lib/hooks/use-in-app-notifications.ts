"use client";

import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import { inAppNotificationService } from "@/lib/services/in-app-notification-service";

import type {
  UpdateNotificationInput,
} from "@/lib/types/in-app-notifications";

export const inAppNotificationKeys = {
  all: ["in-app-notifications"] as const,
  list: () => [...inAppNotificationKeys.all, "list"] as const,
};

export function useInAppNotifications() {
  return useQuery({
    queryKey: inAppNotificationKeys.list(),
    queryFn: ({ signal }) =>
      inAppNotificationService.getAll(signal),
  });
}

export function useUpdateInAppNotification() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      input,
    }: {
      id: string;
      input: UpdateNotificationInput;
    }) => inAppNotificationService.update(id, input),

    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: inAppNotificationKeys.all,
      }),
  });
}

export function useMarkAllNotificationsAsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () =>
      inAppNotificationService.markAllAsRead(),

    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: inAppNotificationKeys.all,
      }),
  });
}

export function useDeleteInAppNotification() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) =>
      inAppNotificationService.delete(id),

    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: inAppNotificationKeys.all,
      }),
  });
}