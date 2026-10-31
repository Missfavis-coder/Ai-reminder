
import { apiClient } from "@/lib/api";
import type {
  CreateWorkspaceInput,
  WorkspaceResponse,
  WorkspacesResponse,
} from "@/lib/types/workspace";

export const workspacesService = {
  async getAll(signal?: AbortSignal) {
    const response = await apiClient.get<WorkspacesResponse>(
      "/api/workspaces",
      { signal },
    );

    return response.workspaces;
  },

  async create(input: CreateWorkspaceInput) {
    const response = await apiClient.post<WorkspaceResponse>(
      "/api/workspaces",
      input,
    );

    return response.workspace;
  },

  async disconnect(workspaceId: string) {
    const response = await apiClient.patch<WorkspaceResponse>(
      `/api/workspaces/${workspaceId}`,
      { status: "disconnected" },
    );

    return response.workspace;
  },
};
