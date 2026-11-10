#!/usr/bin/env node

import { Command } from "commander";
import { watch } from "chokidar";
import { basename, resolve } from "node:path";
import { createHash } from "node:crypto";

import {
  deleteToken,
  deleteWorkspaceId,
  getConfig,
  getOrCreateDeviceId,
  getToken,
  getWorkspaceId,
  saveWorkspaceId,
  type IdeProvider,
} from "./config.js";

import {
  getClient,
  login,
} from "./client.js";

const program = new Command();

const HEARTBEAT_MS = 30_000;
const IDLE_AFTER_MS = 5 * 60_000;

const IDE_PROVIDERS: IdeProvider[] = [
  "vscode",
  "cursor",
  "antigravity",
  "windsurf",
];

const ignoredDirectories = new Set([
  ".git",
  "node_modules",
  ".next",
  "dist",
  "build",
  "coverage",
  ".turbo",
  ".venv",
  "vendor",
]);

function getWorkspacePath(): string {
  return resolve(process.cwd());
}

function getIdeProvider(explicitIde?: string): IdeProvider {
  if (explicitIde) {
    if (IDE_PROVIDERS.includes(explicitIde as IdeProvider)) {
      return explicitIde as IdeProvider;
    }

    throw new Error(
      `Unsupported IDE "${explicitIde}". Choose one of: ${IDE_PROVIDERS.join(", ")}`,
    );
  }

  const env = process.env;
  const termProgram = (env.TERM_PROGRAM ?? "").toLowerCase();

  // Check Cursor before VS Code because Cursor is VS Code-based.
  if (
    env.CURSOR_TRACE_ID ||
    env.CURSOR_SESSION_ID ||
    env.CURSOR ||
    termProgram === "cursor"
  ) {
    return "cursor";
  }

  if (
    env.WINDSURF ||
    env.WINDSURF_SESSION ||
    env.WINDSURF_WORKSPACE ||
    env.CODEIUM_WIND_SURF ||
    termProgram === "windsurf"
  ) {
    return "windsurf";
  }

  if (
    env.ANTIGRAVITY ||
    env.ANTIGRAVITY_AGENT ||
    env.ANTIGRAVITY_SESSION ||
    termProgram === "antigravity"
  ) {
    return "antigravity";
  }

  if (
    env.VSCODE_PID ||
    env.VSCODE_IPC_HOOK_CLI ||
    env.VSCODE_GIT_IPC_HANDLE ||
    termProgram === "vscode"
  ) {
    return "vscode";
  }

  throw new Error(
    [
      "Could not reliably detect which IDE opened this terminal.",
      "",
      "Please specify your IDE manually:",
      "  ai-reminder connect --ide vscode",
      "  ai-reminder connect --ide cursor",
      "  ai-reminder connect --ide antigravity",
      "  ai-reminder connect --ide windsurf",
    ].join("\n"),
  );
}

function getWorkspaceDeviceId(
  root: string,
  deviceId: string,
  provider: IdeProvider,
): string {
  const hash = createHash("sha256")
    .update(`${provider}:${root}`)
    .digest("hex")
    .slice(0, 40);

  return `cli:${deviceId}:${hash}`;
}

function shouldIgnore(filePath: string): boolean {
  const normalized = filePath.replace(/\\/g, "/");
  const segments = normalized.split("/");

  if (segments.some((segment) => ignoredDirectories.has(segment))) {
    return true;
  }

  const filename = basename(normalized);

  if (
    /^\.env($|\.)/i.test(filename) ||
    /\.(pem|key|p12|pfx)$/i.test(filename) ||
    /(^|\.)(credentials|secrets|token)(\.|$)/i.test(filename)
  ) {
    return true;
  }

  return false;
}

async function connectWorkspace(ideOption?: string): Promise<void> {
  const root = getWorkspacePath();
  const provider = getIdeProvider(ideOption);
  const deviceId = await getOrCreateDeviceId();
  const client = await getClient();

  const workspace = await client.registerWorkspace(
    basename(root) || root,
    getWorkspaceDeviceId(root, deviceId, provider),
    provider,
  );

  await saveWorkspaceId(root, provider, workspace.id);

  console.log(`\nIDE: ${provider}`);
  console.log(`Workspace connected: ${workspace.name}`);
  console.log(`Workspace ID: ${workspace.id}`);
}

async function startMonitoring(ideOption?: string): Promise<void> {
  const root = getWorkspacePath();
  const provider = getIdeProvider(ideOption);
  const connectedWorkspaceId = await getWorkspaceId(root, provider);

  if (!connectedWorkspaceId) {
    throw new Error(
      `This project is not connected under ${provider}. Run ai-reminder connect --ide ${provider} first.`,
    );
  }

  const client = await getClient();

  await client.setMonitoring(connectedWorkspaceId, true);

  console.log(`\nIDE: ${provider}`);
  console.log(`Monitoring workspace: ${basename(root)}`);
  console.log("Watching saved-file changes and sending heartbeats.");
  console.log("Press Ctrl+C to stop monitoring.\n");

  let lastFileActivityAt = Date.now();
  let idle = false;
  let shuttingDown = false;

  let eventQueue = Promise.resolve();

  function emit(
    eventType:
      | "workspace_focused"
      | "editor_changed"
      | "heartbeat"
      | "idle_started"
      | "idle_ended"
      | "workspace_stopped",
    metadata: Record<string, unknown> = {},
  ): void {
    const workspaceId = connectedWorkspaceId;
  
    if (!workspaceId) {
      return;
    }
  
    eventQueue = eventQueue
      .then(() =>
        client.sendActivity(
          workspaceId,
          eventType,
          {
            ...metadata,
            source: "ai-reminder-cli",
            ide: provider,
          },
        ),
      )
      .catch((error: unknown) => {
        console.error(
          `Activity submission failed: ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
      });
  }

  emit("workspace_focused");

  const watcher = watch(root, {
    persistent: true,
    ignoreInitial: true,
    ignored: shouldIgnore,
  });

  watcher.on("all", (event, filePath) => {
    if (
      shuttingDown ||
      typeof filePath !== "string" ||
      shouldIgnore(filePath)
    ) {
      return;
    }
    lastFileActivityAt = Date.now();

    if (idle) {
      idle = false;

      emit("idle_ended");
    } else {
      emit("editor_changed", {
        fileName: basename(filePath),
        changeType: event,
      });
    }
  });

  watcher.on("error", (error) => {
    console.error("Workspace watcher error:", error);
  });

  const heartbeat = setInterval(() => {
    if (shuttingDown) return;

    const inactiveFor = Date.now() - lastFileActivityAt;

    if (inactiveFor >= IDLE_AFTER_MS && !idle) {
      idle = true;

      emit("idle_started");

      console.log("Workspace marked idle.");
      return;
    }

    if (!idle) {
      emit("heartbeat");
    }
  }, HEARTBEAT_MS);

  await new Promise<void>((resolvePromise) => {
    const shutdown = async () => {
      if (shuttingDown) return;

      shuttingDown = true;

      clearInterval(heartbeat);

      console.log("\nStopping workspace monitoring...");

      await watcher.close();

      emit("workspace_stopped");

      await eventQueue;

      await client.setMonitoring(connectedWorkspaceId, false);

      console.log("Workspace monitoring stopped.");

      resolvePromise();
    };

    process.once("SIGINT", () => void shutdown());
    process.once("SIGTERM", () => void shutdown());
  });
}

program
  .name("ai-reminder")
  .description("Connect development workspaces to AI Reminder.")
  .version("0.2.0");

program
  .command("login")
  .argument("<website-url>", "Your AI Reminder website URL")
  .description("Connect your AI Reminder account")
  .action(async (websiteUrl: string) => {
    await login(websiteUrl);
  });

program
  .command("connect")
  .description("Register the current project as a workspace")
  .option(
    "--ide <ide>",
    "IDE: vscode, cursor, antigravity, or windsurf",
  )
  .action(async (options: { ide?: string }) => {
    await connectWorkspace(options.ide);
  });

program
  .command("start")
  .description("Start monitoring the current workspace")
  .option(
    "--ide <ide>",
    "IDE: vscode, cursor, antigravity, or windsurf",
  )
  .action(async (options: { ide?: string }) => {
    await startMonitoring(options.ide);
  });

program
  .command("stop")
  .description("Stop monitoring the current workspace")
  .option(
    "--ide <ide>",
    "IDE: vscode, cursor, antigravity, or windsurf",
  )
  .action(async (options: { ide?: string }) => {
    const root = getWorkspacePath();
    const provider = getIdeProvider(options.ide);
    const workspaceId = await getWorkspaceId(root, provider);

    if (!workspaceId) {
      throw new Error(`No connected ${provider} workspace found.`);
    }

    const client = await getClient();

    await client.sendActivity(workspaceId, "workspace_stopped", {
      source: "ai-reminder-cli",
      ide: provider,
    });

    await client.setMonitoring(workspaceId, false);

    console.log(`${provider} workspace monitoring stopped.`);
  });

program
  .command("disconnect")
  .description("Disconnect the current workspace")
  .option(
    "--ide <ide>",
    "IDE: vscode, cursor, antigravity, or windsurf",
  )
  .action(async (options: { ide?: string }) => {
    const root = getWorkspacePath();
    const provider = getIdeProvider(options.ide);
    const workspaceId = await getWorkspaceId(root, provider);

    if (!workspaceId) {
      throw new Error(`No connected ${provider} workspace found.`);
    }

    const client = await getClient();

    await client.disconnectWorkspace(workspaceId);
    await deleteWorkspaceId(root, provider);

    console.log(`${provider} workspace disconnected.`);
  });

program
  .command("status")
  .description("Check your AI Reminder connection")
  .option(
    "--ide <ide>",
    "IDE: vscode, cursor, antigravity, or windsurf",
  )
  .action(async (options: { ide?: string }) => {
    const config = await getConfig();
    const token = await getToken();

    let provider: IdeProvider | null = null;
    let workspaceId: string | undefined;

    try {
      provider = getIdeProvider(options.ide);
      workspaceId = await getWorkspaceId(
        getWorkspacePath(),
        provider,
      );
    } catch {
      // Status should still show account information when
      // the CLI is run outside a detectable IDE terminal.
    }

    console.log("\nAI Reminder CLI");
    console.log("------------------------");
    console.log(`Account: ${token ? "Connected" : "Not connected"}`);
    console.log(`Website: ${config.apiUrl ?? "Not configured"}`);
    console.log(`IDE: ${provider ?? "Not detected"}`);
    console.log(`Workspace: ${workspaceId ?? "Not connected"}`);
    console.log("");
  });

program
  .command("logout")
  .description("Remove locally stored account credentials")
  .action(async () => {
    await deleteToken();

    console.log("AI Reminder credentials removed from this device.");
  });

program.parseAsync(process.argv).catch((error: unknown) => {
  console.error(
    "\nAI Reminder error:",
    error instanceof Error ? error.message : error,
  );

  process.exitCode = 1;
});