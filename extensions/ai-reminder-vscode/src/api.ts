import * as vscode from "vscode";
import { createHash, randomBytes } from "node:crypto";

const TOKEN_KEY = "aiReminder.extensionToken";
const API_URL_KEY = "aiReminder.apiUrl";
const WORKSPACE_IDS_KEY = "aiReminder.workspaceIds";

interface ExtensionAuthRequestResponse {
  requestId: string;
  pollToken: string;
  expiresAt: string;
  authorizationUrl: string;
}

interface ExtensionAuthStatusResponse {
  status: "pending" | "approved" | "expired" | "exchanged";
}

interface ExtensionTokenResponse {
  token: string;
  id: string;
  expiresAt: string;
}

export interface RegisteredWorkspace {
  id: string;
  name: string;
  provider: "vscode";
}

export interface ActivityEventInput {
  eventId: string;
  workspaceId: string;
  eventType:
    | "workspace_focused"
    | "workspace_blurred"
    | "editor_changed"
    | "heartbeat"
    | "workspace_stopped"
    | "idle_started"
    | "idle_ended";
  occurredAt: string;
  metadata?: Record<string, unknown>;
}

function createCodeVerifier(): string {
  return randomBytes(32).toString("base64url");
}

function createCodeChallenge(verifier: string): string {
  return createHash("sha256").update(verifier).digest("base64url");
}

function wait(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function readError(response: Response): Promise<string> {
  try {
    const body = (await response.json()) as { error?: string };
    return body.error ?? `Request failed with HTTP ${response.status}.`;
  } catch {
    return `Request failed with HTTP ${response.status}.`;
  }
}

export class AiReminderApi {
  constructor(
    private readonly secrets: vscode.SecretStorage,
    private readonly output: vscode.OutputChannel,
  ) {}

  async connect(
    apiUrl: string,
    deviceName: string,
    deviceId: string,
  ): Promise<void> {
    const parsed = new URL(apiUrl);

    if (
      parsed.protocol !== "https:" &&
      parsed.hostname !== "localhost" &&
      parsed.hostname !== "127.0.0.1"
    ) {
      throw new Error("The AI Reminder website must use HTTPS.");
    }

    const origin = parsed.origin;
    const codeVerifier = createCodeVerifier();
    const codeChallenge = createCodeChallenge(codeVerifier);

    const requestResponse = await fetch(
      `${origin}/api/extension-auth/request`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ codeChallenge, deviceName }),
      },
    );

    if (!requestResponse.ok) {
      throw new Error(await readError(requestResponse));
    }

    const authRequest =
      (await requestResponse.json()) as ExtensionAuthRequestResponse;

    if (
      !authRequest.requestId ||
      !authRequest.pollToken ||
      !authRequest.authorizationUrl
    ) {
      throw new Error(
        "The website returned an incomplete authorization request.",
      );
    }

    await vscode.env.openExternal(
      vscode.Uri.parse(authRequest.authorizationUrl),
    );

    vscode.window.showInformationMessage(
      "Approve the AI Reminder connection in your browser. VS Code will finish connecting automatically.",
    );

    const expiresAt = new Date(authRequest.expiresAt).getTime();
    let approved = false;

    while (Date.now() < expiresAt) {
      await wait(2000);

      const statusResponse = await fetch(
        `${origin}/api/extension-auth/status?requestId=${encodeURIComponent(
          authRequest.requestId,
        )}`,
        {
          headers: {
            Authorization: `Bearer ${authRequest.pollToken}`,
          },
        },
      );

      if (!statusResponse.ok) {
        throw new Error(await readError(statusResponse));
      }

      const status =
        (await statusResponse.json()) as ExtensionAuthStatusResponse;

      if (status.status === "approved") {
        approved = true;
        break;
      }

      if (
        status.status === "expired" ||
        status.status === "exchanged"
      ) {
        break;
      }
    }

    if (!approved) {
      throw new Error(
        "The connection request expired or was not approved. Please try again.",
      );
    }

    const exchangeResponse = await fetch(
      `${origin}/api/extension-auth/exchange`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requestId: authRequest.requestId,
          pollToken: authRequest.pollToken,
          codeVerifier,
          deviceId,
        }),
      },
    );

    if (!exchangeResponse.ok) {
      throw new Error(await readError(exchangeResponse));
    }

    const tokenResult =
      (await exchangeResponse.json()) as ExtensionTokenResponse;

    if (!tokenResult.token) {
      throw new Error(
        "The website did not return an extension token.",
      );
    }

    // Store credentials securely in VS Code SecretStorage.
    await this.secrets.store(API_URL_KEY, origin);
    await this.secrets.store(TOKEN_KEY, tokenResult.token);

    this.output.appendLine(
      "Authorization completed and extension token stored securely.",
    );
  }

  async sendActivity(
    workspaceId: string,
    event: Omit<ActivityEventInput, "workspaceId">,
  ): Promise<void> {
    const token = await this.getToken();
    const apiUrl = await this.getApiUrl();
  
    if (!token || !apiUrl) {
      throw new Error("Connect your AI Reminder account first.");
    }
  
    if (!workspaceId) {
      throw new Error("Workspace ID is required.");
    }
  
    const response = await fetch(
      `${apiUrl}/api/activity/events`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...event,
          workspaceId,
        }),
      },
    );
  
    if (!response.ok) {
      throw new Error(
        `Activity submission failed: HTTP ${response.status}`,
      );
    }
  }
  async registerWorkspace(
    name: string,
    deviceId: string,
  ): Promise<RegisteredWorkspace> {
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
      throw new Error(
        `Workspace registration failed: ${await readError(response)}`,
      );
    }

    const data = (await response.json()) as {
      workspace: RegisteredWorkspace;
    };

    if (!data.workspace?.id) {
      throw new Error(
        "The server did not return a workspace ID.",
      );
    }

    return data.workspace;
  }
  async saveWorkspaceId(
    workspaceKey: string,
    workspaceId: string,
  ): Promise<void> {
    const stored = await this.secrets.get(WORKSPACE_IDS_KEY);
  
    let workspaceIds: Record<string, string> = {};
  
    if (stored) {
      try {
        workspaceIds = JSON.parse(stored) as Record<string, string>;
      } catch {
        workspaceIds = {};
      }
    }
  
    workspaceIds[workspaceKey] = workspaceId;
  
    await this.secrets.store(
      WORKSPACE_IDS_KEY,
      JSON.stringify(workspaceIds),
    );
  }
  
  async getWorkspaceId(
    workspaceKey: string,
  ): Promise<string | undefined> {
    const stored = await this.secrets.get(WORKSPACE_IDS_KEY);
  
    if (!stored) {
      return undefined;
    }
  
    try {
      const workspaceIds = JSON.parse(stored) as Record<string, string>;
      return workspaceIds[workspaceKey];
    } catch {
      return undefined;
    }
  }
  
  async clearWorkspaceId(
    workspaceKey?: string,
  ): Promise<void> {
    if (!workspaceKey) {
      await this.secrets.delete(WORKSPACE_IDS_KEY);
      return;
    }
  
    const stored = await this.secrets.get(WORKSPACE_IDS_KEY);
  
    if (!stored) {
      return;
    }
  
    try {
      const workspaceIds = JSON.parse(stored) as Record<string, string>;
  
      delete workspaceIds[workspaceKey];
  
      await this.secrets.store(
        WORKSPACE_IDS_KEY,
        JSON.stringify(workspaceIds),
      );
    } catch {
      await this.secrets.delete(WORKSPACE_IDS_KEY);
    }
  }

  async getToken(): Promise<string | undefined> {
    return this.secrets.get(TOKEN_KEY);
  }

  async getApiUrl(): Promise<string | undefined> {
    return this.secrets.get(API_URL_KEY);
  }

  async clearToken(): Promise<void> {
    await this.secrets.delete(TOKEN_KEY);
  }

  async disconnect(): Promise<void> {
    await this.clearToken();
    await this.clearWorkspaceId(API_URL_KEY);
    await this.secrets.delete(API_URL_KEY);

    vscode.window.showInformationMessage(
      "AI Reminder extension disconnected.",
    );

    this.output.appendLine(
      "Extension credentials and workspace ID removed.",
    );
  }
}