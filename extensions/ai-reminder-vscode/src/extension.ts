
import * as vscode from "vscode";
import { randomUUID } from "node:crypto";
import { AiReminderApi } from "./api";

let output: vscode.OutputChannel;
let api: AiReminderApi;

let sessionStartedAt: number | undefined;
let currentWorkspace: string | undefined;
let workspaceReady = false;

function log(message: string): void {
  output.appendLine(message);
}

function sendActivity(
  eventType:
    | "workspace_focused"
    | "workspace_blurred"
    | "editor_changed"
    | "workspace_stopped",
  metadata: Record<string, unknown> = {},
): void {
  if (!workspaceReady) {
    log(`Activity skipped: workspace is not ready (${eventType}).`);
    return;
  }

  void api.sendActivity({
    eventId: randomUUID(),
    eventType,
    occurredAt: new Date().toISOString(),
    metadata,
  }).catch((error: unknown) => {
    log(
      `Activity submission failed (${eventType}): ${
        error instanceof Error ? error.message : "Unknown error"
      }`,
    );
  });
}

function getWorkspaceName(): string | undefined {
  return vscode.workspace.workspaceFolders?.[0]?.name;
}

async function registerCurrentWorkspace(): Promise<void> {
  const folder = vscode.workspace.workspaceFolders?.[0];

  if (!folder) {
    workspaceReady = false;
    currentWorkspace = undefined;
    return;
  }

  workspaceReady = false;
  currentWorkspace = folder.name;

  try {
    const workspace = await api.registerWorkspace(
      folder.name,
      vscode.env.machineId,
    );

    await api.saveWorkspaceId(workspace.id);
    workspaceReady = true;

    log(`Workspace registered: ${workspace.name} (${workspace.id})`);
  } catch (error) {
    log(
      `Workspace registration failed: ${
        error instanceof Error ? error.message : "Unknown error"
      }`,
    );
  }
}

function startSession(): void {
  if (sessionStartedAt !== undefined || !workspaceReady) {
    return;
  }

  sessionStartedAt = Date.now();

  sendActivity("workspace_focused");
  log("Activity session started.");
}

function endSession(): void {
  if (sessionStartedAt === undefined) {
    return;
  }

  const durationSeconds = Math.floor(
    (Date.now() - sessionStartedAt) / 1000,
  );

  sendActivity("workspace_stopped", { durationSeconds });

  sessionStartedAt = undefined;
  log(`Activity session ended (${durationSeconds}s).`);
}

export async function activate(
  context: vscode.ExtensionContext,
): Promise<void> {
  output = vscode.window.createOutputChannel("AI Reminder");
  context.subscriptions.push(output);

  api = new AiReminderApi(context.secrets, output);

  log("AI Reminder activity tracking activated.");

  await registerCurrentWorkspace();

  if (vscode.window.state.focused) {
    startSession();
  }

  context.subscriptions.push(
    vscode.workspace.onDidChangeWorkspaceFolders(async () => {
      endSession();
      await registerCurrentWorkspace();

      if (vscode.window.state.focused) {
        startSession();
      }
    }),

    vscode.commands.registerCommand("aiReminder.connect", async () => {
      try {
        await api.connect();
        await registerCurrentWorkspace();
    
        if (vscode.window.state.focused) {
          startSession();
        }
      } catch (error) {
        vscode.window.showErrorMessage(
          error instanceof Error
            ? error.message
            : "Could not connect to AI Reminder.",
        );
      }
    }),
    
    vscode.commands.registerCommand("aiReminder.disconnect", async () => {
      endSession();
      workspaceReady = false;
      await api.disconnect();
    }),

    vscode.workspace.onDidChangeTextDocument((event) => {
      if (event.document.uri.scheme !== "file") return;
      if (event.contentChanges.length === 0) return;

      sendActivity("editor_changed", {
        fileName: event.document.fileName.split(/[\\/]/).pop() ?? "unknown",
        changeCount: event.contentChanges.length,
      });
    }),

    vscode.window.onDidChangeWindowState((state) => {
      if (state.focused) {
        startSession();
      } else {
        sendActivity("workspace_blurred");
        endSession();
      }
    }),

    vscode.commands.registerCommand("aiReminder.showActivity", () => {
      output.show();
    }),

    vscode.commands.registerCommand("aiReminder.startSession", () => {
      startSession();
    }),

    vscode.commands.registerCommand("aiReminder.endSession", () => {
      endSession();
    }),

    {
      dispose: () => endSession(),
    },
  );
}

export function deactivate(): void {
  endSession();
}
