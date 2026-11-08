#!/usr/bin/env node
import { Command } from "commander";
import { watch } from "chokidar";
import { basename, resolve } from "node:path";
import { createHash } from "node:crypto";
import { deleteToken, deleteWorkspaceId, getConfig, getOrCreateDeviceId, getToken, getWorkspaceId, saveWorkspaceId, } from "./config.js";
import { getClient, login, } from "./client.js";
const program = new Command();
const HEARTBEAT_MS = 30_000;
const IDLE_AFTER_MS = 5 * 60_000;
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
function getWorkspacePath() {
    return resolve(process.cwd());
}
function getWorkspaceDeviceId(root, deviceId) {
    const hash = createHash("sha256")
        .update(root)
        .digest("hex")
        .slice(0, 40);
    return `cli:${deviceId}:${hash}`;
}
function shouldIgnore(filePath) {
    const normalized = filePath.replace(/\\/g, "/");
    const segments = normalized.split("/");
    if (segments.some((segment) => ignoredDirectories.has(segment))) {
        return true;
    }
    const filename = basename(normalized);
    if (/^\.env($|\.)/i.test(filename) ||
        /\.(pem|key|p12|pfx)$/i.test(filename) ||
        /(^|\.)(credentials|secrets|token)(\.|$)/i.test(filename)) {
        return true;
    }
    return false;
}
async function connectWorkspace() {
    const root = getWorkspacePath();
    const deviceId = await getOrCreateDeviceId();
    const client = await getClient();
    const workspace = await client.registerWorkspace(basename(root) || root, getWorkspaceDeviceId(root, deviceId));
    await saveWorkspaceId(root, workspace.id);
    console.log(`\nWorkspace connected: ${workspace.name}`);
    console.log(`Workspace ID: ${workspace.id}`);
}
async function startMonitoring() {
    const root = getWorkspacePath();
    const connectedWorkspaceId = await getWorkspaceId(root);
    if (!connectedWorkspaceId) {
        throw new Error("This project is not connected. Run ai-reminder connect first.");
    }
    const client = await getClient();
    await client.setMonitoring(connectedWorkspaceId, true);
    console.log(`\nMonitoring workspace: ${basename(root)}`);
    console.log("Watching saved-file changes and sending heartbeats.");
    console.log("Press Ctrl+C to stop monitoring.\n");
    let lastFileActivityAt = Date.now();
    let idle = false;
    let shuttingDown = false;
    let eventQueue = Promise.resolve();
    function emit(eventType, metadata = {}) {
        eventQueue = eventQueue
            .then(() => client.sendActivity(connectedWorkspaceId, eventType, metadata))
            .catch((error) => {
            console.error(`Activity submission failed: ${error instanceof Error ? error.message : String(error)}`);
        });
    }
    emit("workspace_focused", {
        source: "ai-reminder-cli",
    });
    const watcher = watch(root, {
        persistent: true,
        ignoreInitial: true,
        ignored: shouldIgnore,
    });
    watcher.on("all", (event, filePath) => {
        if (shuttingDown || shouldIgnore(filePath)) {
            return;
        }
        lastFileActivityAt = Date.now();
        if (idle) {
            idle = false;
            emit("idle_ended", {
                source: "ai-reminder-cli",
            });
        }
        else {
            emit("editor_changed", {
                fileName: basename(filePath),
                changeType: event,
                source: "ai-reminder-cli",
            });
        }
    });
    watcher.on("error", (error) => {
        console.error("Workspace watcher error:", error);
    });
    const heartbeat = setInterval(() => {
        if (shuttingDown)
            return;
        const inactiveFor = Date.now() - lastFileActivityAt;
        if (inactiveFor >= IDLE_AFTER_MS && !idle) {
            idle = true;
            emit("idle_started", {
                source: "ai-reminder-cli",
            });
            console.log("Workspace marked idle.");
            return;
        }
        if (!idle) {
            emit("heartbeat", {
                source: "ai-reminder-cli",
            });
        }
    }, HEARTBEAT_MS);
    await new Promise((resolvePromise) => {
        const shutdown = async () => {
            if (shuttingDown)
                return;
            shuttingDown = true;
            clearInterval(heartbeat);
            console.log("\nStopping workspace monitoring...");
            await watcher.close();
            emit("workspace_stopped", {
                source: "ai-reminder-cli",
            });
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
    .description("Connect your development workspace to AI Reminder.")
    .version("0.1.0");
program
    .command("login")
    .argument("<website-url>", "Your deployed AI Reminder website URL")
    .description("Connect your AI Reminder account")
    .action(async (websiteUrl) => {
    await login(websiteUrl);
});
program
    .command("connect")
    .description("Register the current project as a workspace")
    .action(connectWorkspace);
program
    .command("start")
    .description("Start monitoring the current workspace")
    .action(startMonitoring);
program
    .command("stop")
    .description("Stop monitoring the current workspace")
    .action(async () => {
    const root = getWorkspacePath();
    const workspaceId = await getWorkspaceId(root);
    if (!workspaceId) {
        throw new Error("This project is not connected.");
    }
    const client = await getClient();
    await client.sendActivity(workspaceId, "workspace_stopped", {
        source: "ai-reminder-cli",
    });
    await client.setMonitoring(workspaceId, false);
    console.log("Workspace monitoring stopped.");
});
program
    .command("disconnect")
    .description("Disconnect the current workspace")
    .action(async () => {
    const root = getWorkspacePath();
    const workspaceId = await getWorkspaceId(root);
    if (!workspaceId) {
        throw new Error("This project is not connected.");
    }
    const client = await getClient();
    await client.disconnectWorkspace(workspaceId);
    await deleteWorkspaceId(root);
    console.log("Workspace disconnected.");
});
program
    .command("status")
    .description("Check your AI Reminder connection")
    .action(async () => {
    const config = await getConfig();
    const token = await getToken();
    const workspaceId = await getWorkspaceId(getWorkspacePath());
    console.log("\nAI Reminder CLI");
    console.log("------------------------");
    console.log(`Account: ${token ? "Connected" : "Not connected"}`);
    console.log(`Website: ${config.apiUrl ?? "Not configured"}`);
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
program.parseAsync(process.argv).catch((error) => {
    console.error("\nAI Reminder error:", error instanceof Error ? error.message : error);
    process.exitCode = 1;
});
