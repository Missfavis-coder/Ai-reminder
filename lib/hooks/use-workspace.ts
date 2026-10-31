
"use client";

import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import { workspacesService } from "@/lib/services/workspace-service";
import { CreateWorkspaceInput } from "../types/workspace";

export const workspaceKeys = {
  all: ["workspaces"] as const,
  lists: () => [...workspaceKeys.all, "list"] as const,
};

export function useWorkspaces() {
  return useQuery({
    queryKey: workspaceKeys.lists(),
    queryFn: ({ signal }) => workspacesService.getAll(signal),
  });
}

export function useCreateWorkspace() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateWorkspaceInput) =>
      workspacesService.create(input),

    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: workspaceKeys.all,
      });
    },
  });
}

export function useDisconnectWorkspace() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (workspaceId: string) =>
      workspacesService.disconnect(workspaceId),

    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: workspaceKeys.all,
      });
    },
  });
}
