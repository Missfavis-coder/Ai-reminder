export type ActivityEventType =
  | "workspace_focused"
  | "workspace_blurred"
  | "heartbeat"
  | "workspace_stopped"
  | "idle_started"
  | "idle_ended";

export interface ActivityEventInput {
  eventId: string;
  workspaceId: string;
  eventType: ActivityEventType;
  occurredAt: string;
}

export interface ActivityEventResponse {
  [key: string]: unknown;
}