
import { createHash, randomBytes, randomUUID } from "node:crypto";
import open from "open";

import {
  getConfig,
  getOrCreateDeviceId,
  getToken,
  saveConfig,
  saveToken,
} from "./config.js";

type ActivityEventType =
  | "workspace_focused"
  | "workspace_blurred"
  | "editor_changed"
  | "heartbeat"
  | "workspace_stopped"
  | "idle_started"
  | "idle_ended";

interface ApiError {
  error?: string;
}

async function getError(response: Response): Promise<string> {
  try {
    const body = (await response.json()) as ApiError;

    return body.error ?? `HTTP ${response.status}`;
  } catch {
    return `HTTP ${response.status}`;
  }
}

function normalizeApiUrl(value: string): string {
  const url = new URL(value);

  if (
    url.protocol !== "https:" &&
    url.hostname !== "localhost" &&
    url.hostname !== "127.0.0.1"
  ) {
    throw new Error("AI Reminder requires HTTPS.");
  }

  return url.origin;
}

function createCodeVerifier(): string {
  return randomBytes(32).toString("base64url");
}

function createCodeChallenge(verifier: string): string {
  return createHash("sha256")
    .update(verifier)
    .digest("base64url");
}

function sleep(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

export async function login(apiUrlInput: string): Promise<void> {
  const apiUrl = normalizeApiUrl(apiUrlInput);

  const verifier = createCodeVerifier();
  const challenge = createCodeChallenge(verifier);

  const deviceId = await getOrCreateDeviceId();

  const requestResponse = await fetch(
    `${apiUrl}/api/extension-auth/request`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        codeChallenge: challenge,
        deviceName: "AI Reminder CLI",
      }),
    },
  );

  if (!requestResponse.ok) {
    throw new Error(await getError(requestResponse));
  }

  const authRequest = (await requestResponse.json()) as {
    requestId: string;
    pollToken: string;
    expiresAt: string;
    authorizationUrl: string;
  };

  console.log("\nOpening your browser for authorization...\n");

  try {
    await open(authRequest.authorizationUrl);
  } catch {
    console.log("Open this authorization link manually:");
    console.log(authRequest.authorizationUrl);
  }

  console.log("Waiting for account approval...");

  const expiresAt = new Date(authRequest.expiresAt).getTime();

  let approved = false;

  while (Date.now() < expiresAt) {
    await sleep(2000);

    const response = await fetch(
      `${apiUrl}/api/extension-auth/status?requestId=${encodeURIComponent(
        authRequest.requestId,
      )}`,
      {
        headers: {
          Authorization: `Bearer ${authRequest.pollToken}`,
        },
      },
    );

    if (!response.ok) {
      throw new Error(await getError(response));
    }

    const result = (await response.json()) as {
      status: "pending" | "approved" | "expired" | "exchanged";
    };

    if (result.status === "approved") {
      approved = true;
      break;
    }

    if (
      result.status === "expired" ||
      result.status === "exchanged"
    ) {
      break;
    }
  }

  if (!approved) {
    throw new Error(
      "Authorization expired or was not approved. Please try again.",
    );
  }

  const exchangeResponse = await fetch(
    `${apiUrl}/api/extension-auth/exchange`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        requestId: authRequest.requestId,
        pollToken: authRequest.pollToken,
        codeVerifier: verifier,
        deviceId,
      }),
    },
  );

  if (!exchangeResponse.ok) {
    throw new Error(await getError(exchangeResponse));
  }

  const result = (await exchangeResponse.json()) as {
    token: string;
  };

  if (!result.token) {
    throw new Error("The server did not return an access token.");
  }

  await saveToken(result.token);
  await saveConfig({ apiUrl });

  console.log("\nSuccessfully connected to AI Reminder!");
}

export class AiReminderClient {
  constructor(
    private readonly apiUrl: string,
    private readonly token: string,
  ) {}

  private async request<T>(
    endpoint: string,
    method: "GET" | "POST" | "PATCH",
    body?: Record<string, unknown>,
  ): Promise<T> {
    const response = await fetch(`${this.apiUrl}${endpoint}`, {
      method,
      headers: {
        Authorization: `Bearer ${this.token}`,
        "Content-Type": "application/json",
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });

    if (!response.ok) {
      throw new Error(await getError(response));
    }

    return response.json() as Promise<T>;
  }

  async registerWorkspace(
    name: string,
    deviceId: string,
  ): Promise<{ id: string; name: string }> {
    const result = await this.request<{
      workspace: { id: string; name: string };
    }>("/api/workspaces", "POST", {
      provider: "desktop",
      name,
      deviceId,
    });

    return result.workspace;
  }

  async setMonitoring(
    workspaceId: string,
    enabled: boolean,
  ): Promise<void> {
    await this.request(
      `/api/workspaces/${workspaceId}`,
      "PATCH",
      { monitoringEnabled: enabled },
    );
  }

  async disconnectWorkspace(workspaceId: string): Promise<void> {
    await this.request(
      `/api/workspaces/${workspaceId}`,
      "PATCH",
      { status: "disconnected" },
    );
  }

  async sendActivity(
    workspaceId: string,
    eventType: ActivityEventType,
    metadata: Record<string, unknown> = {},
  ): Promise<void> {
    await this.request(
      "/api/activity/events",
      "POST",
      {
        eventId: randomUUID(),
        workspaceId,
        eventType,
        occurredAt: new Date().toISOString(),
        metadata,
      },
    );
  }
}

export async function getClient(): Promise<AiReminderClient> {
  const config = await getConfig();
  const token = await getToken();

  if (!config.apiUrl || !token) {
    throw new Error(
      "You are not connected. Run: ai-reminder login <website-url>",
    );
  }

  return new AiReminderClient(config.apiUrl, token);
}
