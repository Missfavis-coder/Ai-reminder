export type ActivityEventType =
  | "workspace_focused"
  | "workspace_blurred"
  | "editor_changed"
  | "heartbeat"
  | "workspace_stopped"
  | "idle_started"
  | "idle_ended";

export type ActivityPeriod = "today" | "7d" | "30d";

export interface ActivityEventInput {
  eventId: string;
  workspaceId: string;
  eventType: ActivityEventType;
  occurredAt: string;
  metadata?: Record<string, unknown>;
}

export interface ActivityEvent {
  id: string;
  eventId: string;
  userId: string;
  workspaceId: string;
  eventType: ActivityEventType;
  occurredAt: string;
  receivedAt: string;
  metadata: Record<string, unknown>;
}

export type WorkspaceSessionStatus =
  | "active"
  | "idle"
  | "paused"
  | "ended";

export interface WorkspaceSession {
  id: string;
  userId: string;
  workspaceId: string;
  status: WorkspaceSessionStatus;
  startedAt: string;
  lastActivityAt: string | null;
  idleSinceAt: string | null;
  activeSeconds: number;
  endedAt: string | null;
  createdAt: string;
  lastEventOccurredAt: string | null;
}

export interface ActivityFilters {
  workspaceId?: string;
  period?: ActivityPeriod;
  limit?: number;
}

export interface ActivityEventsResponse {
  events: ActivityEvent[];
}

export interface WorkspaceSessionsResponse {
  sessions: WorkspaceSession[];
}

export interface ActivityEventResponse {
  accepted?: boolean;
  duplicate?: boolean;
  [key: string]: unknown;
}