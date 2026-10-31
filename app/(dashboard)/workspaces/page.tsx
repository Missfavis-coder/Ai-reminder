
"use client";

import { useState } from "react";
import {
  useWorkspaces,
  useCreateWorkspace,
  useDisconnectWorkspace,
} from "@/lib/hooks/use-workspace";

function formatDate(value: string | null) {
  if (!value) return "Not available";

  return new Date(value).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export default function WorkspacesPage() {
  const [disconnectingId, setDisconnectingId] = useState<string | null>(null);

  const {
    data: workspaces = [],
    isLoading,
    isError,
    error,
    refetch,
  } = useWorkspaces();

  const createWorkspace = useCreateWorkspace();
  const disconnectWorkspace = useDisconnectWorkspace();

  const connected = workspaces.filter(
    (workspace) => workspace.status === "connected",
  );

  const vscodeWorkspaces = workspaces.filter(
    (workspace) => workspace.provider === "vscode",
  );

  const browserWorkspaces = workspaces.filter(
    (workspace) => workspace.provider === "browser",
  );

  async function handleCreateBrowserWorkspace() {
    try {
      await createWorkspace.mutateAsync({
        provider: "browser",
        name: "My Browser",
        deviceId: `browser-${crypto.randomUUID()}`,
      });
    } catch {
      // React Query exposes the error through the mutation state.
    }
  }

  async function handleDisconnect(workspaceId: string) {
    const confirmed = window.confirm(
      "Disconnect this workspace? Its activity history will be preserved.",
    );

    if (!confirmed) return;

    setDisconnectingId(workspaceId);

    try {
      await disconnectWorkspace.mutateAsync(workspaceId);
    } catch {
      // React Query exposes the error through the mutation state.
    } finally {
      setDisconnectingId(null);
    }
  }

  return (
    <main className="space-y-8 p-6">
      <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Workspaces
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Manage the devices and environments connected to AI Reminder.
          </p>
        </div>

        <button
          onClick={handleCreateBrowserWorkspace}
          disabled={createWorkspace.isPending}
          className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
        >
          {createWorkspace.isPending
            ? "Connecting..."
            : "Connect browser"}
        </button>
      </header>

      {createWorkspace.isError && (
        <p className="text-sm text-destructive">
          {createWorkspace.error instanceof Error
            ? createWorkspace.error.message
            : "Could not create browser workspace."}
        </p>
      )}

      {disconnectWorkspace.isError && (
        <p className="text-sm text-destructive">
          Could not disconnect workspace. Please try again.
        </p>
      )}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "Total workspaces", value: workspaces.length },
          { label: "Connected", value: connected.length },
          { label: "VS Code", value: vscodeWorkspaces.length },
          { label: "Browser", value: browserWorkspaces.length },
        ].map((item) => (
          <div key={item.label} className="rounded-xl border p-5">
            <p className="text-sm text-muted-foreground">{item.label}</p>
            <p className="mt-2 text-3xl font-semibold">{item.value}</p>
          </div>
        ))}
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">Your workspaces</h2>
            <p className="text-sm text-muted-foreground">
              View and manage your connected environments.
            </p>
          </div>

          <button
            onClick={() => refetch()}
            className="rounded-lg border px-4 py-2 text-sm hover:bg-muted"
          >
            Refresh
          </button>
        </div>

        {isLoading ? (
          <div className="rounded-xl border p-10 text-center text-sm text-muted-foreground">
            Loading workspaces...
          </div>
        ) : isError ? (
          <div className="rounded-xl border p-10 text-center">
            <p className="font-medium">Unable to load workspaces.</p>
            <p className="mt-2 text-sm text-muted-foreground">
              {error instanceof Error ? error.message : "Something went wrong."}
            </p>
            <button
              onClick={() => refetch()}
              className="mt-4 rounded-lg border px-4 py-2 text-sm"
            >
              Try again
            </button>
          </div>
        ) : workspaces.length === 0 ? (
          <div className="rounded-xl border border-dashed p-10 text-center">
            <h3 className="font-semibold">No workspaces connected</h3>
            <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
              Connect a browser workspace or install the AI Reminder VS Code
              extension to get started.
            </p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {workspaces.map((workspace) => (
              <article key={workspace.id} className="rounded-xl border p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-semibold">{workspace.name}</h3>
                    <p className="mt-1 text-xs capitalize text-muted-foreground">
                      {workspace.provider} workspace
                    </p>
                  </div>

                  <span
                    className={`rounded-full px-2.5 py-1 text-xs ${
                      workspace.status === "connected"
                        ? "bg-green-500/10 text-green-600"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {workspace.status}
                  </span>
                </div>

                <div className="mt-6 space-y-3 text-sm">
                  <div className="flex justify-between gap-3">
                    <span className="text-muted-foreground">Last seen</span>
                    <span className="text-right">
                      {formatDate(workspace.lastSeenAt)}
                    </span>
                  </div>

                  <div className="flex justify-between gap-3">
                    <span className="text-muted-foreground">Created</span>
                    <span className="text-right">
                      {formatDate(workspace.createdAt)}
                    </span>
                  </div>
                </div>

                <div className="mt-5 border-t pt-4">
                  <p className="truncate text-xs text-muted-foreground">
                    ID: {workspace.id}
                  </p>

                  {workspace.status === "connected" && (
                    <button
                      onClick={() => handleDisconnect(workspace.id)}
                      disabled={disconnectingId === workspace.id}
                      className="mt-4 w-full rounded-lg border border-destructive/30 px-3 py-2 text-sm text-destructive hover:bg-destructive/5 disabled:opacity-50"
                    >
                      {disconnectingId === workspace.id
                        ? "Disconnecting..."
                        : "Disconnect workspace"}
                    </button>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
