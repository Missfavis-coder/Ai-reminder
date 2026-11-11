"use client";

import { useMemo, useState } from "react";
import {
  Activity,
  Clock3,
  Monitor,
  RefreshCw,
  Timer,
  CalendarDays,
} from "lucide-react";

import { useActivityEvents, useWorkspaceSessions } from "@/lib/hooks/use-activity";
import { useWorkspaces } from "@/lib/hooks/use-workspace";

import type {
  ActivityEvent,
  ActivityPeriod,
  WorkspaceSession,
} from "@/lib/types/activity";

function formatDate(value: string | null) {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "—";

  return date.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function formatDuration(seconds: number) {
  const safeSeconds = Math.max(0, seconds);

  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const remainingSeconds = safeSeconds % 60;

  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes}m ${remainingSeconds}s`;

  return `${remainingSeconds}s`;
}

function eventLabel(eventType: ActivityEvent["eventType"]) {
  const labels: Record<ActivityEvent["eventType"], string> = {
    workspace_focused: "Workspace focused",
    workspace_blurred: "Workspace blurred",
    editor_changed: "File edited",
    heartbeat: "Activity heartbeat",
    workspace_stopped: "Workspace stopped",
    idle_started: "Idle started",
    idle_ended: "Idle ended",
  };

  return labels[eventType];
}

function sessionStatusClass(status: WorkspaceSession["status"]) {
  switch (status) {
    case "active":
      return "bg-green-500/10 text-green-600";
    case "idle":
      return "bg-yellow-500/10 text-yellow-600";
    case "paused":
      return "bg-orange-500/10 text-orange-600";
    default:
      return "bg-muted text-muted-foreground";
  }
}


const workspaceProviderLabels: Record<string, string> = {
  vscode: "Visual Studio Code",
  cursor: "Cursor",
  antigravity: "Antigravity",
  windsurf: "Windsurf",
  browser: "Browser",
  desktop: "Desktop",
};

export default function ActivityPage() {
  const [period, setPeriod] = useState<ActivityPeriod>("7d");
  const [workspaceId, setWorkspaceId] = useState("all");

  const filters = useMemo(
    () => ({
      period,
      workspaceId: workspaceId === "all" ? undefined : workspaceId,
      limit: 100,
    }),
    [period, workspaceId],
  );

  const {
    data: events = [],
    isLoading: eventsLoading,
    isError: eventsError,
    refetch: refetchEvents,
  } = useActivityEvents(filters);

  const {
    data: sessions = [],
    isLoading: sessionsLoading,
    isError: sessionsError,
    refetch: refetchSessions,
  } = useWorkspaceSessions(filters);

  const {
    data: workspaces = [],
    isLoading: workspacesLoading,
  } = useWorkspaces();

  const loading = eventsLoading || sessionsLoading || workspacesLoading;

  const workspaceNames = useMemo(
    () =>
      new Map(
        workspaces.map((workspace) => [
          workspace.id,
          workspace.name,
        ]),
      ),
    [workspaces],
  );

  const activeSessions = sessions.filter(
    (session) => session.status === "active",
  );

  const totalActiveSeconds = sessions.reduce(
    (total, session) => total + session.activeSeconds,
    0,
  );

  const fileEdits = events.filter(
    (event) => event.eventType === "editor_changed",
  ).length;

  async function refreshActivity() {
    await Promise.all([
      refetchEvents(),
      refetchSessions(),
    ]);
  }

  return (
    <main className="space-y-8 p-6">
      <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Activity
          </h1>

          <p className="mt-2 text-sm text-muted-foreground">
            Monitor your workspace activity and development sessions.
          </p>
        </div>

        <button
          onClick={refreshActivity}
          disabled={loading}
          className="inline-flex items-center justify-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium transition hover:bg-muted disabled:opacity-50"
        >
          <RefreshCw className="h-4 w-4" />
          Refresh
        </button>
      </header>

      <section className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Monitor className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />

          <select
            value={workspaceId}
            onChange={(event) => setWorkspaceId(event.target.value)}
            className="h-10 w-full rounded-lg border bg-background pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="all">All workspaces</option>

            {workspaces.map((workspace) => (
              <option key={workspace.id} value={workspace.id}>
                {workspace.name} ({workspaceProviderLabels[workspace.provider] ?? workspace.provider})
              </option>
            ))}
          </select>
        </div>

        <div className="relative">
          <CalendarDays className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />

          <select
            value={period}
            onChange={(event) =>
              setPeriod(event.target.value as ActivityPeriod)
            }
            className="h-10 w-full rounded-lg border bg-background pl-9 pr-8 text-sm outline-none focus:ring-2 focus:ring-ring sm:w-44"
          >
            <option value="today">Today</option>
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
          </select>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          {
            label: "Activity events",
            value: events.length,
            icon: Activity,
          },
          {
            label: "Active sessions",
            value: activeSessions.length,
            icon: Monitor,
          },
          {
            label: "File edits",
            value: fileEdits,
            icon: Clock3,
          },
          {
            label: "Recorded active time",
            value: formatDuration(totalActiveSeconds),
            icon: Timer,
          },
        ].map((item) => {
          const Icon = item.icon;

          return (
            <article key={item.label} className="rounded-xl border p-5">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  {item.label}
                </p>

                <Icon className="h-5 w-5 text-muted-foreground" />
              </div>

              <p className="mt-3 text-3xl font-semibold">
                {loading ? "—" : item.value}
              </p>
            </article>
          );
        })}
      </section>

      {eventsError || sessionsError ? (
        <div className="rounded-xl border border-destructive/30 p-5">
          <p className="font-medium">Some activity data could not be loaded.</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Check your activity API routes and try refreshing.
          </p>
        </div>
      ) : null}

      <section className="grid gap-6 xl:grid-cols-2">
        <div className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold">Recent activity</h2>
            <p className="text-sm text-muted-foreground">
              The latest events recorded from your workspaces.
            </p>
          </div>

          <div className="rounded-xl border">
            {eventsLoading ? (
              <div className="p-8 text-center text-sm text-muted-foreground">
                Loading activity...
              </div>
            ) : events.length === 0 ? (
              <div className="p-8 text-center">
                <Activity className="mx-auto h-8 w-8 text-muted-foreground" />

                <p className="mt-3 font-medium">No activity yet</p>

                <p className="mt-1 text-sm text-muted-foreground">
                  Events from your connected workspaces will appear here.
                </p>
              </div>
            ) : (
              <div className="divide-y">
                {events.slice(0, 5).map((event) => (
                  <article
                    key={event.id}
                    className="flex items-start gap-3 p-4"
                  >
                    <div className="mt-1 rounded-full bg-muted p-2">
                      <Activity className="h-4 w-4 text-muted-foreground" />
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium">
                        {eventLabel(event.eventType)}
                      </p>

                      <p className="mt-1 truncate text-xs text-muted-foreground">
                        {workspaceNames.get(event.workspaceId) ??
                          "Unknown workspace"}
                      </p>

                      {typeof event.metadata?.fileName === "string" && (
                        <p className="mt-1 truncate text-xs text-muted-foreground">
                          {event.metadata.fileName}
                        </p>
                      )}

                      <p className="mt-2 text-xs text-muted-foreground">
                        {formatDate(event.occurredAt)}
                      </p>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold">Session history</h2>
            <p className="text-sm text-muted-foreground">
              Review active, idle and completed sessions.
            </p>
          </div>

          <div className="rounded-xl border">
            {sessionsLoading ? (
              <div className="p-8 text-center text-sm text-muted-foreground">
                Loading sessions...
              </div>
            ) : sessions.length === 0 ? (
              <div className="p-8 text-center">
                <Timer className="mx-auto h-8 w-8 text-muted-foreground" />

                <p className="mt-3 font-medium">No sessions recorded</p>

                <p className="mt-1 text-sm text-muted-foreground">
                  Your workspace sessions will appear here.
                </p>
              </div>
            ) : (
              <div className="divide-y">
                {sessions.slice(0,5).map((session) => (
                  <article key={session.id} className="space-y-3 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <p className="truncate text-sm font-medium">
                        {workspaceNames.get(session.workspaceId) ??
                          "Unknown workspace"}
                      </p>

                      <span
                        className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium capitalize ${sessionStatusClass(session.status)}`}
                      >
                        {session.status}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div>
                        <p className="text-muted-foreground">Started</p>
                        <p className="mt-1">
                          {formatDate(session.startedAt)}
                        </p>
                      </div>

                      <div>
                        <p className="text-muted-foreground">Ended</p>
                        <p className="mt-1">
                          {formatDate(session.endedAt)}
                        </p>
                      </div>

                      <div>
                        <p className="text-muted-foreground">Active time</p>
                        <p className="mt-1 font-medium">
                          {formatDuration(session.activeSeconds)}
                        </p>
                      </div>

                      <div>
                        <p className="text-muted-foreground">Last activity</p>
                        <p className="mt-1">
                          {formatDate(session.lastActivityAt)}
                        </p>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}