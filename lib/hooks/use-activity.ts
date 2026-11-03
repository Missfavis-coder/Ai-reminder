"use client";

import {
  useQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";

import { activityService } from "@/lib/services/activity-service";

import type {
  ActivityEventInput,
  ActivityFilters,
} from "@/lib/types/activity";

export const activityKeys = {
  all: ["activity"] as const,

  events: (filters: ActivityFilters) =>
    [...activityKeys.all, "events", filters] as const,

  sessions: (filters: ActivityFilters) =>
    [...activityKeys.all, "sessions", filters] as const,
};

export function useActivityEvents(filters: ActivityFilters = {}) {
  return useQuery({
    queryKey: activityKeys.events(filters),

    queryFn: ({ signal }) =>
      activityService.getEvents(filters, signal),

    refetchInterval: 30_000,
  });
}

export function useWorkspaceSessions(filters: ActivityFilters = {}) {
  return useQuery({
    queryKey: activityKeys.sessions(filters),

    queryFn: ({ signal }) =>
      activityService.getSessions(filters, signal),

    refetchInterval: 30_000,
  });
}

export function useSubmitActivityEvent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: ActivityEventInput) =>
      activityService.submitEvent(input),

    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: activityKeys.all,
      });
    },
  });
}