
"use client";

import { useEffect, useState, type FormEvent } from "react";
import {
  PiCheckCircle,
  PiCode,
  PiGlobe,
  PiPauseCircle,
  PiPhoneCall,
  PiPlayCircle,
  PiPlus,
  PiShieldCheck,
  PiSpinnerGap,
  PiSquaresFour,
  PiTerminal,
  PiX,
} from "react-icons/pi";
import { toast } from "sonner";
import { z } from "zod";

import ChannelIntegration from "@/components/integrations/channel-integration";
import { Button } from "@/components/ui/button";
import { WorkspaceOverviewSkeleton, WorkspaceSkeleton } from "@/components/integrations/integrations-skeleton";

import type { WorkspaceProvider } from "@/lib/types/workspace";

import {
  useCreateWorkspace,
  useWorkspaces,
  useUpdateWorkspace,
  useDisconnectWorkspace,
} from "@/lib/hooks/use-workspace";

const workspaceSchema = z.object({
  name: z.string().trim().min(1, "Enter a workspace name.").max(200),
});

type Provider = WorkspaceProvider;

const providerGroups: WorkspaceProvider[] = [
  "vscode",
  "cursor",
  "antigravity",
  "windsurf",
  "browser",
  "desktop",
];

const providerLabels: Record<WorkspaceProvider, string> = {
  vscode: "Visual Studio Code",
  cursor: "Cursor",
  antigravity: "Antigravity",
  windsurf: "Windsurf",
  browser: "Browser",
  desktop: "Desktop",
};

function formatDate(value: string | null) {
  if (!value) return "Not available";

  return new Date(value).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export default function IntegrationsPage() {
  const [provider, setProvider] = useState<Provider>("vscode");
  const [workspaceName, setWorkspaceName] = useState("");
  const [showVSCodeModal, setShowVSCodeModal] = useState(false);
  const [isOpeningVSCode, setIsOpeningVSCode] = useState(false);
  const [vscodeProgress, setVscodeProgress] = useState("");

  const [updatingWorkspaceId, setUpdatingWorkspaceId] =
    useState<string | null>(null);

  const [disconnectingWorkspaceId, setDisconnectingWorkspaceId] =
    useState<string | null>(null);

  const [showIntroduction, setShowIntroduction] = useState(true);

    useEffect(() => {
      const timer = window.setTimeout(() => {
        setShowIntroduction(false);
      }, 2 * 60 * 1000);
    
      return () => window.clearTimeout(timer);
    }, []);

  const workspacesQuery = useWorkspaces();
  const createWorkspace = useCreateWorkspace();
  const updateWorkspace = useUpdateWorkspace();
  const disconnectWorkspace = useDisconnectWorkspace();

  const workspaces = workspacesQuery.data ?? [];

  const connectedWorkspaces = workspaces.filter(
    (workspace) => workspace.status === "connected",
  );

  const monitoringWorkspaces = connectedWorkspaces.filter(
    (workspace) => workspace.monitoringEnabled,
  );

  const ideWorkspaces = workspaces.filter((workspace) =>
    ["vscode", "cursor", "antigravity", "windsurf"].includes(
      workspace.provider,
    ),
  );

  const groupedWorkspaces = providerGroups
    .map((groupProvider) => ({
      provider: groupProvider,
      workspaces: workspaces.filter(
        (workspace) => workspace.provider === groupProvider,
      ),
    }))
    .filter((group) => group.workspaces.length > 0);

  const cliCommand = `ai-reminder connect --ide ${provider}`;
  const cliStartCommand = `ai-reminder start --ide ${provider}`;

  async function copyCliCommand(command: string, label: string) {
    try {
      await navigator.clipboard.writeText(command);
      toast.success(`${label} copied.`);
    } catch {
      toast.error("Could not copy the command. Please copy it manually.");
    }
  }

  const connectVSCode = () => {
    setShowVSCodeModal(true);
  };

  const openVSCode = () => {
    if (isOpeningVSCode) return;

    setIsOpeningVSCode(true);
    setVscodeProgress("Opening VS Code...");

    const apiUrl = window.location.origin;

    const vscodeUri = `vscode://ai-reminder.ai-reminder-vscode/connect?apiUrl=${encodeURIComponent(
      apiUrl,
    )}`;

    toast.info(
      "Opening VS Code. Complete the authorization in your extension.",
    );

    window.location.href = vscodeUri;

    setVscodeProgress(
      "Waiting for VS Code to open. Complete the connection in the extension.",
    );
  };

  async function handleConnectWorkspace(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (provider === "vscode") {
      connectVSCode();
      return;
    }

    if (provider !== "browser") {
      return;
    }

    const parsed = workspaceSchema.safeParse({
      name: workspaceName,
    });

    if (!parsed.success) {
      toast.error(
        parsed.error.issues[0]?.message ?? "Invalid workspace.",
      );
      return;
    }

    try {
      await createWorkspace.mutateAsync({
        provider: "browser",
        name: parsed.data.name,
      });

      toast.success("Workspace registered successfully.");
      setWorkspaceName("");
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Could not register workspace.",
      );
    }
  }

  async function handleToggleWorkspaceMonitoring(
    workspaceId: string,
    monitoringEnabled: boolean,
  ) {
    setUpdatingWorkspaceId(workspaceId);

    try {
      await updateWorkspace.mutateAsync({
        workspaceId,
        monitoringEnabled,
      });

      toast.success(
        monitoringEnabled
          ? "Workspace monitoring enabled."
          : "Workspace monitoring paused.",
      );
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Could not update workspace monitoring.",
      );
    } finally {
      setUpdatingWorkspaceId(null);
    }
  }

  async function handleDisconnectWorkspace(workspaceId: string) {
    const confirmed = window.confirm(
      "Disconnect this workspace? Its activity history will be preserved, but new activity will no longer be monitored.",
    );

    if (!confirmed) return;

    setDisconnectingWorkspaceId(workspaceId);

    try {
      await disconnectWorkspace.mutateAsync(workspaceId);

      toast.success("Workspace disconnected.");
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Could not disconnect workspace.",
      );
    } finally {
      setDisconnectingWorkspaceId(null);
    }
  }

  const busy =
    createWorkspace.isPending ||
    updateWorkspace.isPending ||
    disconnectWorkspace.isPending;

  return (
    <main className="min-h-screen bg-background px-4 py-6 text-foreground sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1400px] space-y-8">
        {/* Page heading */}
        <section className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">
              Integrations
            </h1>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
              Connect your development workspaces and notification channels.
              Manage all your AI Reminder connections in one place.
            </p>
          </div>

        </section>

       {/* Temporary Introduction */}
{showIntroduction && (
  <section className="relative rounded-xl border border-border bg-secondary/40 p-4 pr-10 sm:p-5">
    <button
      type="button"
      onClick={() => setShowIntroduction(false)}
      aria-label="Dismiss introduction"
      className="absolute right-3 top-3 rounded-md p-1 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
    >
      <PiX className="size-4" />
    </button>

    <div className="flex items-start gap-3">
      <PiShieldCheck className="mt-0.5 size-5 shrink-0 text-primary" />

      <div>
        <h2 className="text-sm font-semibold">
          Your connections, all in one place
        </h2>

        <p className="mt-1 text-xs leading-6 text-muted-foreground">
          Connect the environments where your work happens and the
          channels where you want to receive reminders. Workspace
          connections provide activity data, while notification
          connections provide delivery destinations. You control
          which channels are used when creating your reminders.
        </p>
      </div>
    </div>
  </section>
)}

        {/* Workspace overview */}
        <section className="space-y-4">
          <div>
            <h2 className="text-base font-semibold">
              Workspace overview
            </h2>

            <p className="mt-1 text-sm text-muted-foreground">
              A quick overview of the environments connected to your account.
            </p>
          </div>

          {workspacesQuery.isPending ? (
            <WorkspaceOverviewSkeleton />
          ) : workspacesQuery.isError ? (
            <div className="rounded-xl border border-border p-5">
              <p className="text-sm text-destructive">
                Could not load your workspace overview.
              </p>

              <Button
                variant="outline"
                size="sm"
                className="mt-3"
                onClick={() => void workspacesQuery.refetch()}
              >
                Try again
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
              {[
                {
                  label: "Total workspaces",
                  value: workspaces.length,
                  icon: PiSquaresFour,
                },
                {
                  label: "Connected",
                  value: connectedWorkspaces.length,
                  icon: PiCheckCircle,
                },
                {
                  label: "Monitoring",
                  value: monitoringWorkspaces.length,
                  icon: PiPlayCircle,
                },
                {
                  label: "IDE workspaces",
                  value: ideWorkspaces.length,
                  icon: PiCode,
                },
                {
                  label: "Browser workspaces",
                  value: workspaces.filter(
                    (workspace) => workspace.provider === "browser",
                  ).length,
                  icon: PiGlobe,
                },
              ].map((item) => {
                const Icon = item.icon;

                return (
                  <div
                    key={item.label}
                    className="rounded-xl border border-border p-4"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs text-muted-foreground">
                        {item.label}
                      </p>

                      <Icon className="size-4 text-primary" />
                    </div>

                    <p className="mt-3 text-2xl font-semibold tabular-nums">
                      {item.value}
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Workspace integrations */}
        <section className="space-y-4">
          <div>
            <h2 className="text-base font-semibold">
              Workspace integrations
            </h2>

            <p className="mt-1 text-sm text-muted-foreground">
              Connect and manage the environments where your development
              activity takes place.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
            {/* Register workspace */}
            <div className="rounded-xl border border-border p-4 sm:p-5">
              <div className="flex items-center gap-3">
                <span className="flex size-10 items-center justify-center rounded-lg bg-secondary">
                  <PiCode className="size-5" />
                </span>

                <div>
                  <h3 className="text-sm font-semibold">
                    Connect a workspace
                  </h3>

                  <p className="text-xs text-muted-foreground">
                    Add an environment to your monitoring list.
                  </p>
                </div>
              </div>

              <form
                onSubmit={handleConnectWorkspace}
                className="mt-5 space-y-4"
              >
                <div className="space-y-1.5">
                  <label
                    htmlFor="workspace-provider"
                    className="text-xs font-medium"
                  >
                    Workspace provider
                  </label>

                  <select
                    id="workspace-provider"
                    value={provider}
                    onChange={(event) =>
                      setProvider(event.target.value as Provider)
                    }
                    className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/20"
                  >
                    <option value="vscode">Visual Studio Code</option>
                    <option value="cursor">Cursor</option>
                    <option value="antigravity">Antigravity</option>
                    <option value="windsurf">Windsurf</option>
                    <option value="browser">Browser</option>
                  </select>
                </div>

                {provider === "browser" ? (
                  <>
                    <div className="space-y-1.5">
                      <label
                        htmlFor="workspace-name"
                        className="text-xs font-medium"
                      >
                        Workspace name
                      </label>

                      <input
                        id="workspace-name"
                        value={workspaceName}
                        onChange={(event) => setWorkspaceName(event.target.value)}
                        placeholder="e.g. Research workspace"
                        maxLength={200}
                        required
                        className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none placeholder:text-muted-foreground focus:border-ring focus:ring-2 focus:ring-ring/20"
                      />
                    </div>

                    <div className="rounded-lg bg-muted/60 p-3">
                      <p className="text-xs leading-5 text-muted-foreground">
                        Registering a browser workspace adds it to your account.
                        Activity monitoring requires a connected agent to send events.
                      </p>
                    </div>

                    <Button
                      type="submit"
                      disabled={busy}
                      className="w-full gap-2"
                    >
                      {createWorkspace.isPending ? (
                        <PiSpinnerGap className="size-4 animate-spin" />
                      ) : (
                        <PiPlus className="size-4" />
                      )}
                      {createWorkspace.isPending
                        ? "Registering workspace..."
                        : "Register browser workspace"}
                    </Button>
                  </>
                ) : (
                  <div className="space-y-3">
                    {provider === "vscode" && (
                      <div className="space-y-2 rounded-lg bg-muted/60 p-3">
                        <p className="text-xs leading-5 text-muted-foreground">
                          You can connect VS Code with the AI Reminder extension, or use the CLI commands below.
                        </p>
                        <Button
                          type="button"
                          variant="outline"
                          className="w-full gap-2"
                          onClick={connectVSCode}
                        >
                          <PiCode className="size-4" />
                          Connect with VS Code extension
                        </Button>
                      </div>
                    )}

                    <div className="space-y-2.5 rounded-lg border border-border p-3">
                      <div className="flex items-center gap-2">
                        <PiTerminal className="size-4 shrink-0 text-primary" />
                        <p className="text-xs font-semibold">Connect any IDE with the AI Reminder CLI</p>
                      </div>

                      <p className="text-[11px] leading-4 text-muted-foreground">
                        Open the IDE's terminal in your project folder. These commands work with VS Code, Cursor, Antigravity, and Windsurf. The selected IDE is used automatically below.
                      </p>

                      <div className="space-y-1.5">
                        <div className="flex min-w-0 items-center gap-2 rounded-md bg-muted px-2.5 py-2">
                          <code className="min-w-0 flex-1 break-all text-[11px] leading-4">{cliCommand}</code>
                          <Button type="button" size="sm" variant="outline" className="h-7 shrink-0 px-2 text-[11px]" onClick={() => void copyCliCommand(cliCommand, "Connect command")}>Copy</Button>
                        </div>
                        <div className="flex min-w-0 items-center gap-2 rounded-md bg-muted px-2.5 py-2">
                          <code className="min-w-0 flex-1 break-all text-[11px] leading-4">{cliStartCommand}</code>
                          <Button type="button" size="sm" variant="outline" className="h-7 shrink-0 px-2 text-[11px]" onClick={() => void copyCliCommand(cliStartCommand, "Start command")}>Copy</Button>
                        </div>
                      </div>

                      <p className="text-[10px] leading-4 text-muted-foreground">
                        First time using the CLI? Sign in once with <code className="rounded bg-muted px-1 py-0.5 text-[10px]">ai-reminder login &lt;website-url&gt;</code>. Replace the placeholder with your AI Reminder website URL.
                      </p>
                    </div>
                  </div>
                )}
              </form>
            </div>

            {/* Registered workspaces */}
            <div className="rounded-xl border border-border  p-4 sm:p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-semibold">
                    Connected workspaces
                  </h3>

                  <p className="mt-1 text-xs text-muted-foreground">
                    Manage your registered environments.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-secondary px-2.5 py-1 text-xs">
                    {workspaces.length}
                  </span>

                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => void workspacesQuery.refetch()}
                    disabled={workspacesQuery.isFetching}
                  >
                    {workspacesQuery.isFetching ? (
                      <PiSpinnerGap className="size-3.5 animate-spin" />
                    ) : (
                      "Refresh"
                    )}
                  </Button>
                </div>
              </div>

              {workspacesQuery.isPending ? (
                <WorkspaceSkeleton />
              ) : workspacesQuery.isError ? (
                <div className="py-8">
                  <p className="text-sm text-destructive">
                    Could not load workspaces.
                  </p>

                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-3"
                    onClick={() => void workspacesQuery.refetch()}
                  >
                    Try again
                  </Button>
                </div>
              ) : workspaces.length === 0 ? (
                <div className="mt-5 rounded-lg border border-dashed border-border p-6 text-center">
                  <PiPhoneCall className="mx-auto size-6 text-muted-foreground" />

                  <p className="mt-3 text-sm font-medium">
                    No workspaces connected
                  </p>

                  <p className="mt-1 text-xs leading-5 text-muted-foreground">
                    Connect an IDE using its extension or CLI, or register a browser workspace to get started.
                  </p>
                </div>
              ) : (
                <div className="mt-4 space-y-3 max-h-[350px] overflow-y-auto">
                  {groupedWorkspaces.map((group) => (
                    <section key={group.provider} className="space-y-2">
                      <div className="flex items-center justify-between border-b border-border pb-2">
                        <h4 className="text-xs font-semibold tracking-wide">
                          {providerLabels[group.provider]}
                        </h4>
                        <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] text-muted-foreground">
                          {group.workspaces.length}
                        </span>
                      </div>
                      <div className="space-y-3">
                        {group.workspaces.map((workspace) => (
                    <div
                      key={workspace.id}
                      className="rounded-lg border border-border p-3"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex min-w-0 items-start gap-3">
                          <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-secondary">
                            {workspace.provider === "browser" ? (
                              <PiGlobe className="size-4" />
                            ) : (
                              <PiCode className="size-4" />
                            )}
                          </span>

                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium">
                              {workspace.name}
                            </p>

                            <p className="mt-1 text-xs capitalize text-muted-foreground">
                              {providerLabels[workspace.provider]} workspace
                            </p>
                          </div>
                        </div>

                        <div className="flex shrink-0 flex-col items-end gap-1.5">
                          <span
                            className={`rounded-full px-2 py-1 text-[10px] capitalize ${
                              workspace.status === "connected"
                                ? "bg-primary/10 text-primary"
                                : "bg-muted text-muted-foreground"
                            }`}
                          >
                            {workspace.status}
                          </span>

                          <span
                            className={`rounded-full px-2 py-1 text-[10px] ${
                              workspace.monitoringEnabled &&
                              workspace.status === "connected"
                                ? "bg-primary/10 text-primary"
                                : "bg-muted text-muted-foreground"
                            }`}
                          >
                            {workspace.monitoringEnabled &&
                            workspace.status === "connected"
                              ? "Monitoring on"
                              : "Monitoring paused"}
                          </span>
                        </div>
                      </div>

                      <div className="mt-3 grid grid-cols-2 gap-3 border-t border-border pt-3 text-xs">
                        <div>
                          <p className="text-muted-foreground">
                            Last seen
                          </p>
                          <p className="mt-1 font-medium">
                            {formatDate(workspace.lastSeenAt)}
                          </p>
                        </div>

                        <div>
                          <p className="text-muted-foreground">
                            Connected on
                          </p>
                          <p className="mt-1 font-medium">
                            {formatDate(workspace.createdAt)}
                          </p>
                        </div>
                      </div>

                      <div className="mt-3 flex flex-wrap justify-end gap-2 border-t border-border pt-3">
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          disabled={
                            updatingWorkspaceId === workspace.id ||
                            workspace.status !== "connected"
                          }
                          onClick={() =>
                            void handleToggleWorkspaceMonitoring(
                              workspace.id,
                              !workspace.monitoringEnabled,
                            )
                          }
                        >
                          {updatingWorkspaceId === workspace.id ? (
                            <PiSpinnerGap className="mr-1.5 size-3.5 animate-spin" />
                          ) : workspace.monitoringEnabled ? (
                            <PiPauseCircle className="mr-1.5 size-3.5" />
                          ) : (
                            <PiPlayCircle className="mr-1.5 size-3.5" />
                          )}

                          {updatingWorkspaceId === workspace.id
                            ? "Updating..."
                            : workspace.monitoringEnabled
                              ? "Pause monitoring"
                              : "Start monitoring"}
                        </Button>

                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          disabled={
                            disconnectingWorkspaceId === workspace.id
                          }
                          onClick={() =>
                            void handleDisconnectWorkspace(workspace.id)
                          }
                        >
                          {disconnectingWorkspaceId === workspace.id && (
                            <PiSpinnerGap className="mr-1.5 size-3.5 animate-spin" />
                          )}

                          {disconnectingWorkspaceId === workspace.id
                            ? "Disconnecting..."
                            : "Disconnect"}
                        </Button>
                      </div>
                    </div>
                        ))}
                      </div>
                    </section>
                  ))}
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Notification integrations */}
        <section className="space-y-2">

          <ChannelIntegration />
        </section>

        {/* VS Code connection modal */}
        {showVSCodeModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
            <div className="w-full max-w-md rounded-2xl border bg-background p-6 shadow-2xl">
              <div className="mb-5 flex items-center justify-between">
                <div className="flex size-12 items-center justify-center rounded-xl bg-primary/10">
                  <PiCode className="size-6 text-primary" />
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setShowVSCodeModal(false);
                    setIsOpeningVSCode(false);
                    setVscodeProgress("");
                  }}
                  className="rounded-lg p-2 text-muted-foreground transition hover:bg-muted"
                  aria-label="Close dialog"
                >
                  ✕
                </button>
              </div>

              <h2 className="text-xl font-semibold">
                Connect VS Code
              </h2>

              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                Connect your VS Code environment to AI Reminder to track
                your development activity and work sessions.
              </p>

              <div className="mt-5 rounded-xl border bg-muted/40 p-4">
                <div className="flex items-start gap-3">
                  <PiShieldCheck className="mt-0.5 size-5 shrink-0 text-primary" />

                  <div>
                    <p className="text-sm font-medium">
                      Secure account authorization
                    </p>

                    <p className="mt-1 text-xs leading-5 text-muted-foreground">
                      You&apos;ll be redirected to your browser to approve
                      the connection using your AI Reminder account.
                    </p>
                  </div>
                </div>
              </div>

              {vscodeProgress && (
                <div
                  className="mt-4 flex items-start gap-2 rounded-lg border border-primary/20 bg-primary/5 p-3"
                  role="status"
                  aria-live="polite"
                >
                  <PiSpinnerGap className="mt-0.5 size-4 shrink-0 animate-spin text-primary" />
                  <p className="text-xs leading-5 text-muted-foreground">
                    {vscodeProgress}
                  </p>
                </div>
              )}

              <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowVSCodeModal(false);
                    setIsOpeningVSCode(false);
                    setVscodeProgress("");
                  }}
                >
                  Cancel
                </Button>

                <Button
                  type="button"
                  onClick={openVSCode}
                  disabled={isOpeningVSCode}
                >
                  {isOpeningVSCode ? (
                    <>
                      <PiSpinnerGap className="mr-2 size-4 animate-spin" />
                      Opening VS Code...
                    </>
                  ) : (
                    <>
                      <PiCode className="mr-2 size-4" />
                      Continue to VS Code
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
