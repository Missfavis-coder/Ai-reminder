"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.activate = activate;
exports.deactivate = deactivate;
const vscode = __importStar(require("vscode"));
const node_crypto_1 = require("node:crypto");
let output;
let sessionStartedAt;
let currentWorkspace;
function logActivity(type, details = {}) {
    const event = {
        eventId: (0, node_crypto_1.randomUUID)(),
        source: "vscode",
        type,
        occurredAt: new Date().toISOString(),
        workspace: currentWorkspace ?? "no-workspace",
        details,
    };
    output.appendLine(JSON.stringify(event));
}
function getWorkspaceName() {
    const folder = vscode.workspace.workspaceFolders?.[0];
    return folder?.name;
}
function startSession() {
    if (sessionStartedAt !== undefined)
        return;
    sessionStartedAt = Date.now();
    currentWorkspace = getWorkspaceName();
    logActivity("session_started");
}
function endSession() {
    if (sessionStartedAt === undefined)
        return;
    const durationSeconds = Math.floor((Date.now() - sessionStartedAt) / 1000);
    logActivity("session_ended", { durationSeconds });
    sessionStartedAt = undefined;
}
function activate(context) {
    output = vscode.window.createOutputChannel("AI Reminder");
    context.subscriptions.push(output);
    output.appendLine("AI Reminder activity tracking activated.");
    currentWorkspace = getWorkspaceName();
    if (currentWorkspace) {
        startSession();
    }
    context.subscriptions.push(vscode.workspace.onDidChangeWorkspaceFolders(() => {
        endSession();
        currentWorkspace = getWorkspaceName();
        logActivity("workspace_changed");
        if (currentWorkspace) {
            startSession();
        }
    }), vscode.workspace.onDidChangeTextDocument((event) => {
        if (event.document.uri.scheme !== "file")
            return;
        if (event.contentChanges.length === 0)
            return;
        logActivity("file_edited", {
            fileName: event.document.fileName.split(/[\\/]/).pop() ?? "unknown",
            changeCount: event.contentChanges.length,
        });
    }), vscode.window.onDidChangeWindowState((state) => {
        logActivity(state.focused ? "editor_focused" : "editor_blurred");
        if (state.focused) {
            startSession();
        }
        else {
            endSession();
        }
    }), vscode.commands.registerCommand("aiReminder.showActivity", () => {
        output.show();
    }), vscode.commands.registerCommand("aiReminder.endSession", () => {
        endSession();
        vscode.window.showInformationMessage("AI Reminder: work session ended.");
    }));
    context.subscriptions.push(vscode.commands.registerCommand("aiReminder.startSession", () => {
        startSession();
        vscode.window.showInformationMessage("AI Reminder: work session started.");
    }));
    context.subscriptions.push({
        dispose: () => endSession(),
    });
}
function deactivate() {
    if (sessionStartedAt !== undefined) {
        endSession();
    }
}
//# sourceMappingURL=extension.js.map