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
exports.AiReminderApi = void 0;
const vscode = __importStar(require("vscode"));
const node_crypto_1 = require("node:crypto");
const TOKEN_KEY = "aiReminder.extensionToken";
const API_URL_KEY = "aiReminder.apiUrl";
const WORKSPACE_IDS_KEY = "aiReminder.workspaceIds";
function createCodeVerifier() {
    return (0, node_crypto_1.randomBytes)(32).toString("base64url");
}
function createCodeChallenge(verifier) {
    return (0, node_crypto_1.createHash)("sha256").update(verifier).digest("base64url");
}
function wait(milliseconds) {
    return new Promise((resolve) => setTimeout(resolve, milliseconds));
}
async function readError(response) {
    try {
        const body = (await response.json());
        return body.error ?? `Request failed with HTTP ${response.status}.`;
    }
    catch {
        return `Request failed with HTTP ${response.status}.`;
    }
}
class AiReminderApi {
    secrets;
    output;
    constructor(secrets, output) {
        this.secrets = secrets;
        this.output = output;
    }
    async connect(apiUrl, deviceName, deviceId) {
        const parsed = new URL(apiUrl);
        if (parsed.protocol !== "https:" &&
            parsed.hostname !== "localhost" &&
            parsed.hostname !== "127.0.0.1") {
            throw new Error("The AI Reminder website must use HTTPS.");
        }
        const origin = parsed.origin;
        const codeVerifier = createCodeVerifier();
        const codeChallenge = createCodeChallenge(codeVerifier);
        const requestResponse = await fetch(`${origin}/api/extension-auth/request`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ codeChallenge, deviceName }),
        });
        if (!requestResponse.ok) {
            throw new Error(await readError(requestResponse));
        }
        const authRequest = (await requestResponse.json());
        if (!authRequest.requestId ||
            !authRequest.pollToken ||
            !authRequest.authorizationUrl) {
            throw new Error("The website returned an incomplete authorization request.");
        }
        await vscode.env.openExternal(vscode.Uri.parse(authRequest.authorizationUrl));
        vscode.window.showInformationMessage("Approve the AI Reminder connection in your browser. VS Code will finish connecting automatically.");
        const expiresAt = new Date(authRequest.expiresAt).getTime();
        let approved = false;
        while (Date.now() < expiresAt) {
            await wait(2000);
            const statusResponse = await fetch(`${origin}/api/extension-auth/status?requestId=${encodeURIComponent(authRequest.requestId)}`, {
                headers: {
                    Authorization: `Bearer ${authRequest.pollToken}`,
                },
            });
            if (!statusResponse.ok) {
                throw new Error(await readError(statusResponse));
            }
            const status = (await statusResponse.json());
            if (status.status === "approved") {
                approved = true;
                break;
            }
            if (status.status === "expired" ||
                status.status === "exchanged") {
                break;
            }
        }
        if (!approved) {
            throw new Error("The connection request expired or was not approved. Please try again.");
        }
        const exchangeResponse = await fetch(`${origin}/api/extension-auth/exchange`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                requestId: authRequest.requestId,
                pollToken: authRequest.pollToken,
                codeVerifier,
                deviceId,
            }),
        });
        if (!exchangeResponse.ok) {
            throw new Error(await readError(exchangeResponse));
        }
        const tokenResult = (await exchangeResponse.json());
        if (!tokenResult.token) {
            throw new Error("The website did not return an extension token.");
        }
        // Store credentials securely in VS Code SecretStorage.
        await this.secrets.store(API_URL_KEY, origin);
        await this.secrets.store(TOKEN_KEY, tokenResult.token);
        this.output.appendLine("Authorization completed and extension token stored securely.");
    }
    async sendActivity(workspaceId, event) {
        const token = await this.getToken();
        const apiUrl = await this.getApiUrl();
        if (!token || !apiUrl) {
            throw new Error("Connect your AI Reminder account first.");
        }
        if (!workspaceId) {
            throw new Error("Workspace ID is required.");
        }
        const response = await fetch(`${apiUrl}/api/activity/events`, {
            method: "POST",
            headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                ...event,
                workspaceId,
            }),
        });
        if (!response.ok) {
            throw new Error(`Activity submission failed: HTTP ${response.status}`);
        }
    }
    async registerWorkspace(name, deviceId) {
        const token = await this.getToken();
        const apiUrl = await this.getApiUrl();
        if (!token || !apiUrl) {
            throw new Error("Connect your AI Reminder account first.");
        }
        const response = await fetch(`${apiUrl}/api/workspaces`, {
            method: "POST",
            headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                provider: "vscode",
                name,
                deviceId,
            }),
        });
        if (!response.ok) {
            throw new Error(`Workspace registration failed: ${await readError(response)}`);
        }
        const data = (await response.json());
        if (!data.workspace?.id) {
            throw new Error("The server did not return a workspace ID.");
        }
        return data.workspace;
    }
    async saveWorkspaceId(workspaceKey, workspaceId) {
        const stored = await this.secrets.get(WORKSPACE_IDS_KEY);
        let workspaceIds = {};
        if (stored) {
            try {
                workspaceIds = JSON.parse(stored);
            }
            catch {
                workspaceIds = {};
            }
        }
        workspaceIds[workspaceKey] = workspaceId;
        await this.secrets.store(WORKSPACE_IDS_KEY, JSON.stringify(workspaceIds));
    }
    async getWorkspaceId(workspaceKey) {
        const stored = await this.secrets.get(WORKSPACE_IDS_KEY);
        if (!stored) {
            return undefined;
        }
        try {
            const workspaceIds = JSON.parse(stored);
            return workspaceIds[workspaceKey];
        }
        catch {
            return undefined;
        }
    }
    async clearWorkspaceId(workspaceKey) {
        if (!workspaceKey) {
            await this.secrets.delete(WORKSPACE_IDS_KEY);
            return;
        }
        const stored = await this.secrets.get(WORKSPACE_IDS_KEY);
        if (!stored) {
            return;
        }
        try {
            const workspaceIds = JSON.parse(stored);
            delete workspaceIds[workspaceKey];
            await this.secrets.store(WORKSPACE_IDS_KEY, JSON.stringify(workspaceIds));
        }
        catch {
            await this.secrets.delete(WORKSPACE_IDS_KEY);
        }
    }
    async getToken() {
        return this.secrets.get(TOKEN_KEY);
    }
    async getApiUrl() {
        return this.secrets.get(API_URL_KEY);
    }
    async clearToken() {
        await this.secrets.delete(TOKEN_KEY);
    }
    async disconnect() {
        await this.clearToken();
        await this.clearWorkspaceId(API_URL_KEY);
        await this.secrets.delete(API_URL_KEY);
        vscode.window.showInformationMessage("AI Reminder extension disconnected.");
        this.output.appendLine("Extension credentials and workspace ID removed.");
    }
}
exports.AiReminderApi = AiReminderApi;
//# sourceMappingURL=api.js.map