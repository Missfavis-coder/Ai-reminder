
"use client";

import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import { notificationChannelsService } from
  "@/lib/services/notification-channels-service";

import type {
  NotificationChannel,
  NotificationChannelType,
} from "@/lib/types/notification-channel";

const queryKey = ["notification-channels", "list"] as const;

export interface SaveNotificationChannelInput {
  type: NotificationChannelType;
  destination: string;
  consentGranted: boolean;
}

export interface UpdateNotificationChannelInput {
  id: string;
  enabled: boolean;
}

export function useNotificationChannels() {
  return useQuery({
    queryKey,
    queryFn: ({ signal }) =>
      notificationChannelsService.getAll(signal),
  });
}

export function useSaveNotificationChannel() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: SaveNotificationChannelInput) =>
      notificationChannelsService.save(input),

    onSuccess: (channel: NotificationChannel) => {
      queryClient.setQueryData<NotificationChannel[]>(
        queryKey,
        (current = []) => {
          const exists = current.some(
            (item) => item.id === channel.id,
          );

          return exists
            ? current.map((item) =>
                item.id === channel.id ? channel : item,
              )
            : [...current, channel];
        },
      );

      void queryClient.invalidateQueries({ queryKey });
    },
  });
}

export function useUpdateNotificationChannel() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: UpdateNotificationChannelInput) =>
      notificationChannelsService.update(input.id, {
        enabled: input.enabled,
      }),

    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey });
    },
  });
}
