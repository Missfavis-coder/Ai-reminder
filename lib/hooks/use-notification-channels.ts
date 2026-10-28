
"use client";

import { useQuery } from "@tanstack/react-query";
import { notificationChannelsService } from
  "@/lib/services/notification-channels-service";

export function useNotificationChannels() {
  return useQuery({
    queryKey: ["notification-channels", "list"],
    queryFn: ({ signal }) =>
      notificationChannelsService.getAll(signal),
  });
}
