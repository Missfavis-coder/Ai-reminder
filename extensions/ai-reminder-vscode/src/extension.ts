
import * as vscode from "vscode";
import { randomUUID } from "node:crypto";

let output: vscode.OutputChannel;
let sessionStartedAt: number | undefined;
let currentWorkspace: string | undefined;

function logActivity(
  type: string,
  details: Record<string, string | number | boolean> = {},
): void {
  const event = {
    eventId: randomUUID(),
    source: "vscode",
    type,
    occurredAt: new Date().toISOString(),
    workspace: currentWorkspace ?? "no-workspace",
    details,
  };

  output.appendLine(JSON.stringify(event));
}

function getWorkspaceName(): string | undefined {
  const folder = vscode.workspace.workspaceFolders?.[0];
  return folder?.name;
}

function startSession(): void {
  if (sessionStartedAt !== undefined) return;

  sessionStartedAt = Date.now();
  currentWorkspace = getWorkspaceName();

  logActivity("session_started");
}

function endSession(): void {
  if (sessionStartedAt === undefined) return;

  const durationSeconds = Math.floor(
    (Date.now() - sessionStartedAt) / 1000,
  );

  logActivity("session_ended", { durationSeconds });
  sessionStartedAt = undefined;
}

export function activate(context: vscode.ExtensionContext): void {
  output = vscode.window.createOutputChannel("AI Reminder");
  context.subscriptions.push(output);

  output.appendLine("AI Reminder activity tracking activated.");

  currentWorkspace = getWorkspaceName();

  if (currentWorkspace) {
    startSession();
  }

  context.subscriptions.push(
    vscode.workspace.onDidChangeWorkspaceFolders(() => {
      endSession();
      currentWorkspace = getWorkspaceName();

      logActivity("workspace_changed");

      if (currentWorkspace) {
        startSession();
      }
    }),

    vscode.workspace.onDidChangeTextDocument((event) => {
      if (event.document.uri.scheme !== "file") return;
      if (event.contentChanges.length === 0) return;

      logActivity("file_edited", {
        fileName: event.document.fileName.split(/[\\/]/).pop() ?? "unknown",
        changeCount: event.contentChanges.length,
      });
    }),

    vscode.window.onDidChangeWindowState((state) => {
      logActivity(state.focused ? "editor_focused" : "editor_blurred");

      if (state.focused) {
        startSession();
      } else {
        endSession();
      }
    }),

    vscode.commands.registerCommand("aiReminder.showActivity", () => {
      output.show();
    }),

    vscode.commands.registerCommand("aiReminder.endSession", () => {
      endSession();
      vscode.window.showInformationMessage(
        "AI Reminder: work session ended.",
      );
    }),
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("aiReminder.startSession", () => {
      startSession();
      vscode.window.showInformationMessage(
        "AI Reminder: work session started.",
      );
    }),
  );

  context.subscriptions.push({
    dispose: () => endSession(),
  });
}

export function deactivate(): void {
  if (sessionStartedAt !== undefined) {
    endSession();
  }
}
