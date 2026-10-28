export type WorkspaceProvider = "browser" | "vscode";

export type WorkspaceStatus = "connected" | "disconnected";

export interface Workspace {
  id: string;
  userId: string;
  provider: WorkspaceProvider;
  name: string;
  deviceId: string | null;
  status: WorkspaceStatus;
  lastSeenAt: string | null;
  createdAt: string;
}

export interface WorkspacesResponse {
  workspaces: Workspace[];
}

export interface WorkspaceResponse {
  workspace: Workspace;
}

export interface CreateWorkspaceInput {
  provider: WorkspaceProvider;
  name: string;
  deviceId?: string;
}