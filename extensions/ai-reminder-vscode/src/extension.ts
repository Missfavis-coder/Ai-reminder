import * as vscode from "vscode";
import { createHash, randomUUID } from "node:crypto";
import { AiReminderApi } from "./api";

let output: vscode.OutputChannel;
let api: AiReminderApi;

interface WorkspaceSession {
  id: string;
  name: string;
  uri: string;
  startedAt?: number;
  registered: boolean;
}

const workspaceSessions = new Map<string, WorkspaceSession>();

function log(message: string): void {
  output.appendLine(message);
}

function getWorkspaceKey(folder: vscode.WorkspaceFolder): string {
  return folder.uri.toString();
}

function getDeviceWorkspaceId(folder: vscode.WorkspaceFolder): string {
  const hash = createHash("sha256")
    .update(getWorkspaceKey(folder))
    .digest("hex")
    .slice(0, 48);

  return `${vscode.env.machineId}:${hash}`;
}

function getWorkspaceForDocument(
  document: vscode.TextDocument,
): vscode.WorkspaceFolder | undefined {
  return vscode.workspace.getWorkspaceFolder(document.uri);
}

async function registerWorkspace(
  folder: vscode.WorkspaceFolder,
): Promise<void> {
  const key = getWorkspaceKey(folder);

  const existing = workspaceSessions.get(key);

  if (existing?.registered) {
    return;
  }

  const token = await api.getToken();
  const apiUrl = await api.getApiUrl();

  if (!token || !apiUrl) {
    log("Connect AI Reminder before registering projects.");
    return;
  }

  try {
    const workspace = await api.registerWorkspace(
      folder.name,
      getDeviceWorkspaceId(folder),
    );

    await api.saveWorkspaceId(key, workspace.id);

    workspaceSessions.set(key, {
      id: workspace.id,
      name: folder.name,
      uri: key,
      registered: true,
    });

    log(`Registered project: ${folder.name} (${workspace.id})`);
  } catch (error) {
    log(
      `Could not register ${folder.name}: ${
        error instanceof Error ? error.message : "Unknown error"
      }`,
    );
  }
}

async function registerAllWorkspaces(): Promise<void> {
  const folders = vscode.workspace.workspaceFolders ?? [];

  for (const folder of folders) {
    await registerWorkspace(folder);
  }
}

async function sendWorkspaceActivity(
  folder: vscode.WorkspaceFolder,
  eventType:
    | "workspace_focused"
    | "workspace_blurred"
    | "editor_changed"
    | "workspace_stopped",
  metadata: Record<string, unknown> = {},
): Promise<void> {
  const key = getWorkspaceKey(folder);
  const session = workspaceSessions.get(key);

  if (!session?.registered) {
    return;
  }

  try {
    await api.sendActivity(session.id, {
      eventId: randomUUID(),
      eventType,
      occurredAt: new Date().toISOString(),
      metadata,
    });
  } catch (error) {
    log(
      `Activity failed for ${folder.name}: ${
        error instanceof Error ? error.message : "Unknown error"
      }`,
    );
  }
}

async function startWorkspaceSession(
  folder: vscode.WorkspaceFolder,
): Promise<void> {
  const key = getWorkspaceKey(folder);
  const session = workspaceSessions.get(key);

  if (!session?.registered || session.startedAt !== undefined) {
    return;
  }

  session.startedAt = Date.now();

  await sendWorkspaceActivity(folder, "workspace_focused");

  log(`Started activity session: ${folder.name}`);
}

async function endWorkspaceSession(
  folder: vscode.WorkspaceFolder,
): Promise<void> {
  const key = getWorkspaceKey(folder);
  const session = workspaceSessions.get(key);

  if (!session || session.startedAt === undefined) {
    return;
  }

  const durationSeconds = Math.floor(
    (Date.now() - session.startedAt) / 1000,
  );

  await sendWorkspaceActivity(folder, "workspace_stopped", {
    durationSeconds,
  });

  session.startedAt = undefined;

  log(`Ended activity session: ${folder.name}`);
}

async function startVisibleWorkspaceSession(): Promise<void> {
  const editor = vscode.window.activeTextEditor;

  if (!editor) {
    return;
  }

  const folder = getWorkspaceForDocument(editor.document);

  if (!folder) {
    return;
  }

  await startWorkspaceSession(folder);
}

async function completeConnection(apiUrl: string): Promise<void> {
  await api.connect(
    apiUrl,
    vscode.workspace.name || "VS Code",
    vscode.env.machineId,
  );

  await registerAllWorkspaces();

  await startVisibleWorkspaceSession();

  vscode.window.showInformationMessage(
    "AI Reminder connected. Your open projects are now available on the website. Choose which ones to monitor.",
  );
}

export async function activate(
  context: vscode.ExtensionContext,
): Promise<void> {
  output = vscode.window.createOutputChannel("AI Reminder");

  context.subscriptions.push(output);

  api = new AiReminderApi(context.secrets, output);

  log("AI Reminder extension activated.");

  await registerAllWorkspaces();

  await startVisibleWorkspaceSession();

  context.subscriptions.push(
    vscode.window.registerUriHandler({
      handleUri: async (uri: vscode.Uri) => {
        if (uri.path !== "/connect") {
          return;
        }

        const apiUrl = new URLSearchParams(uri.query).get("apiUrl");

        if (!apiUrl) {
          vscode.window.showErrorMessage(
            "The AI Reminder connection URL is missing.",
          );
          return;
        }

        try {
          await completeConnection(apiUrl);
        } catch (error) {
          vscode.window.showErrorMessage(
            error instanceof Error
              ? error.message
              : "Could not connect to AI Reminder.",
          );

          log(`Connection failed: ${String(error)}`);
        }
      },
    }),

    vscode.commands.registerCommand(
      "aiReminder.connect",
      async () => {
        const apiUrl = await api.getApiUrl();

        if (!apiUrl) {
          const enteredUrl = await vscode.window.showInputBox({
            title: "Connect AI Reminder",
            prompt: "Enter your deployed AI Reminder website URL.",
            placeHolder: "https://your-ai-reminder-domain.com",
            ignoreFocusOut: true,
          });

          if (!enteredUrl) {
            return;
          }

          try {
            await completeConnection(enteredUrl);
          } catch (error) {
            vscode.window.showErrorMessage(
              error instanceof Error
                ? error.message
                : "Could not connect to AI Reminder.",
            );
          }

          return;
        }

        await registerAllWorkspaces();
        await startVisibleWorkspaceSession();

        vscode.window.showInformationMessage(
          "AI Reminder is connected.",
        );
      },
    ),

    vscode.commands.registerCommand(
      "aiReminder.disconnect",
      async () => {
        for (const folder of vscode.workspace.workspaceFolders ?? []) {
          await endWorkspaceSession(folder);
        }

        workspaceSessions.clear();

        await api.disconnect();
      },
    ),

    vscode.workspace.onDidChangeWorkspaceFolders(
      async (event) => {
        for (const folder of event.removed) {
          await endWorkspaceSession(folder);

          workspaceSessions.delete(getWorkspaceKey(folder));
        }

        for (const folder of event.added) {
          await registerWorkspace(folder);
        }

        await startVisibleWorkspaceSession();
      },
    ),

    vscode.window.onDidChangeActiveTextEditor(
      async (editor) => {
        for (const folder of vscode.workspace.workspaceFolders ?? []) {
          await endWorkspaceSession(folder);
        }

        if (editor) {
          const folder = getWorkspaceForDocument(editor.document);

          if (folder) {
            await registerWorkspace(folder);
            await startWorkspaceSession(folder);
          }
        }
      },
    ),

    vscode.workspace.onDidChangeTextDocument(
      async (event) => {
        if (
          event.document.uri.scheme !== "file" ||
          event.contentChanges.length === 0
        ) {
          return;
        }

        const folder = getWorkspaceForDocument(event.document);

        if (!folder) {
          return;
        }

        await sendWorkspaceActivity(folder, "editor_changed", {
          fileName: event.document.fileName.split(/[\\/]/).pop(),
          changeCount: event.contentChanges.length,
        });
      },
    ),

    vscode.window.onDidChangeWindowState(
      async (state) => {
        if (state.focused) {
          await startVisibleWorkspaceSession();
          return;
        }

        for (const folder of vscode.workspace.workspaceFolders ?? []) {
          await sendWorkspaceActivity(folder, "workspace_blurred");
          await endWorkspaceSession(folder);
        }
      },
    ),

    vscode.commands.registerCommand(
      "aiReminder.showActivity",
      () => output.show(),
    ),
  );
}

export async function deactivate(): Promise<void> {
  for (const folder of vscode.workspace.workspaceFolders ?? []) {
    await endWorkspaceSession(folder);
  }
}