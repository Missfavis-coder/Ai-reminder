
"use client";

import { useState, type FormEvent } from "react";
import {
  PiBellRinging,
  PiCode,
  PiGlobe,
  PiPhoneCall,
  PiPlus,
  PiShieldCheck,
  PiSpinnerGap,
} from "react-icons/pi";
import { toast } from "sonner";
import { z } from "zod";

import ChannelIntegration from "@/components/integrations/channel-integration";
import { Button } from "@/components/ui/button";
import { WorkspaceSkeleton } from "@/components/integrations/integrations-skeleton";

import {
  useCreateWorkspace,
  useWorkspaces,
  useUpdateWorkspace,
  useDisconnectWorkspace,
} from "@/lib/hooks/use-workspace";

const workspaceSchema = z.object({
  provider: z.enum(["browser", "vscode"]),
  name: z.string().trim().min(1, "Enter a workspace name.").max(200),
});

type Provider = "browser" | "vscode";

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

  const workspacesQuery = useWorkspaces();
  const createWorkspace = useCreateWorkspace();
  const updateWorkspace = useUpdateWorkspace();
  const disconnectWorkspace = useDisconnectWorkspace();

  const workspaces = workspacesQuery.data ?? [];

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

    const parsed = workspaceSchema.safeParse({
      provider,
      name: workspaceName,
    });

    if (!parsed.success) {
      toast.error(
        parsed.error.issues[0]?.message ?? "Invalid workspace.",
      );
      return;
    }

    try {
      await createWorkspace.mutateAsync(parsed.data);

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
      "Disconnect this workspace? Its activity will no longer be monitored.",
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
              Connect the workspaces AI Reminder should monitor, then choose
              where you want your reminders delivered.
            </p>
          </div>

          <div className="flex items-center gap-3 rounded-lg border border-border bg-primary px-3 py-2.5 text-white">
            <span className="flex size-9 items-center justify-center rounded-lg bg-white/15">
              <PiBellRinging className="size-5" />
            </span>

            <div>
              <p className="text-xs font-medium">
                Notification channels
              </p>
              <p className="text-[11px]">
                Manage your reminder destinations below
              </p>
            </div>
          </div>
        </section>

        {/* How AI Reminder works */}
        <section className="rounded-xl border border-border bg-secondary/40 p-4 sm:p-5">
          <div className="flex items-start gap-3">
            <PiShieldCheck className="mt-0.5 size-5 shrink-0 text-primary" />

            <div>
              <h2 className="text-sm font-semibold">
                How AI Reminder works
              </h2>

              <p className="mt-1 text-sm leading-6 text-muted-foreground">
                Connect a workspace so activity can be recorded. Configure
                reminder rules for the activity or tasks you care about, then
                select the notification channels you want those reminders sent
                to. Connecting a workspace or channel does not automatically
                create a reminder rule.
              </p>
            </div>
          </div>
        </section>

        {/* Workspace monitoring */}
        <section className="space-y-4">
          <div>
            <h2 className="text-base font-semibold">
              Workspaces to monitor
            </h2>

            <p className="mt-1 text-sm text-muted-foreground">
              Register the browser or VS Code workspace where your activity
              happens.
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
                    Register a workspace
                  </h3>

                  <p className="text-xs text-muted-foreground">
                    Add a workspace to your monitoring list.
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
                    <option value="vscode">
                      Visual Studio Code
                    </option>
                    <option value="browser">
                      Browser
                    </option>
                  </select>
                </div>

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
                    onChange={(event) =>
                      setWorkspaceName(event.target.value)
                    }
                    placeholder={
                      provider === "vscode"
                        ? "e.g. AI Reminder project"
                        : "e.g. Research workspace"
                    }
                    maxLength={200}
                    required
                    className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none placeholder:text-muted-foreground focus:border-ring focus:ring-2 focus:ring-ring/20"
                  />
                </div>

                <div className="rounded-lg bg-muted/60 p-3">
                  <p className="text-xs leading-5 text-muted-foreground">
                    Registering a workspace records it in your account.
                    Actual monitoring still depends on the workspace agent or
                    client sending activity events to AI Reminder.
                  </p>
                </div>

                <Button
                  type="submit"
                  disabled={busy || isOpeningVSCode}
                  className="w-full gap-2"
                >
                  {createWorkspace.isPending || isOpeningVSCode ? (
                    <PiSpinnerGap className="size-4 animate-spin" />
                  ) : (
                    <PiPlus className="size-4" />
                  )}

                  {createWorkspace.isPending
                    ? "Registering workspace..."
                    : isOpeningVSCode
                      ? "Opening VS Code..."
                      : provider === "vscode"
                        ? "Connect VS Code"
                        : "Register workspace"}
                </Button>
              </form>
            </div>

            {/* Registered workspaces */}
            <div className="rounded-xl border border-border p-4 sm:p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-semibold">
                    Your workspaces
                  </h3>

                  <p className="mt-1 text-xs text-muted-foreground">
                    Workspaces registered to your account.
                  </p>
                </div>

                <span className="rounded-full bg-secondary px-2.5 py-1 text-xs">
                  {workspaces.length}
                </span>
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
                    No workspaces registered
                  </p>

                  <p className="mt-1 text-xs leading-5 text-muted-foreground">
                    Add a browser or VS Code workspace to get started.
                  </p>
                </div>
              ) : (
                <div className="mt-4 space-y-3">
                  {workspaces.map((workspace) => (
                    <div
                      key={workspace.id}
                      className="rounded-lg border border-border p-3"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex min-w-0 items-start gap-3">
                          <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-secondary">
                            {workspace.provider === "vscode" ? (
                              <PiCode className="size-4" />
                            ) : (
                              <PiGlobe className="size-4" />
                            )}
                          </span>

                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium">
                              {workspace.name}
                            </p>

                            <p className="mt-1 text-xs text-muted-foreground">
                              {workspace.provider === "vscode"
                                ? "Visual Studio Code"
                                : "Browser"}
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
                              workspace.monitoringEnabled
                                ? "bg-primary/10 text-primary"
                                : "bg-muted text-muted-foreground"
                            }`}
                          >
                            {workspace.monitoringEnabled
                              ? "Monitoring on"
                              : "Monitoring paused"}
                          </span>
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
                          {updatingWorkspaceId === workspace.id && (
                            <PiSpinnerGap className="mr-1.5 size-3.5 animate-spin" />
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
              )}
            </div>
          </div>
        </section>

        {/* Notification channels */}
        <ChannelIntegration />

        {/* VS Code connection modal */}
        {showVSCodeModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
            <div className="w-full max-w-md rounded-2xl border bg-background p-6 shadow-2xl">
              <div className="mb-5 flex items-center justify-between">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                  <PiCode className="h-6 w-6 text-primary" />
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
                  <PiShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-primary" />

                  <div>
                    <p className="text-sm font-medium">
                      Secure account authorization
                    </p>

                    <p className="mt-1 text-xs leading-5 text-muted-foreground">
                      You&apos;ll be redirected to your browser to approve the
                      connection using your AI Reminder account.
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
                      <PiSpinnerGap className="mr-2 h-4 w-4 animate-spin" />
                      Opening VS Code...
                    </>
                  ) : (
                    <>
                      <PiCode className="mr-2 h-4 w-4" />
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
