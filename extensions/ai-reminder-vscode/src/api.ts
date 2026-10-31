import * as vscode from "vscode";

const TOKEN_KEY = "aiReminder.extensionToken";
const API_URL_KEY = "aiReminder.apiUrl";

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
export class AiReminderApi {
  constructor(
    private readonly secrets: vscode.SecretStorage,
    private readonly output: vscode.OutputChannel,
  ) {}

  async sendActivity(
    event: Omit<ActivityEventInput, "workspaceId">,
  ): Promise<void> {
    const token = await this.getToken();
    const apiUrl = await this.getApiUrl();
    const workspaceId = await this.getWorkspaceId();
  
    if (!token || !apiUrl) {
      throw new Error("Connect your AI Reminder account first.");
    }
  
    if (!workspaceId) {
      throw new Error(
        "No registered workspace found. Register your workspace first.",
      );
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
        `Workspace registration failed: HTTP ${response.status}`,
      );
    }
  
    const data = (await response.json()) as {
      workspace: RegisteredWorkspace;
    };
  
    if (!data.workspace?.id) {
      throw new Error("The server did not return a workspace ID.");
    }
  
    return data.workspace;
  }

  async saveWorkspaceId(workspaceId: string): Promise<void> {
    await this.secrets.store(
      "aiReminder.workspaceId",
      workspaceId,
    );
  }
  
  async getWorkspaceId(): Promise<string | undefined> {
    return this.secrets.get("aiReminder.workspaceId");
  }

  async setToken(token: string): Promise<void> {
    await this.secrets.store(TOKEN_KEY, token.trim());
  }

  async getToken(): Promise<string | undefined> {
    return this.secrets.get(TOKEN_KEY);
  }

  async clearToken(): Promise<void> {
    await this.secrets.delete(TOKEN_KEY);
  }

  async setApiUrl(url: string): Promise<void> {
    const parsed = new URL(url);

    if (
      parsed.protocol !== "https:" &&
      parsed.hostname !== "localhost" &&
      parsed.hostname !== "127.0.0.1"
    ) {
      throw new Error("The API URL must use HTTPS.");
    }

    await this.secrets.store(API_URL_KEY, parsed.origin);
  }

  async getApiUrl(): Promise<string | undefined> {
    return this.secrets.get(API_URL_KEY);
  }

  async connect(): Promise<void> {
    const apiUrl = await vscode.window.showInputBox({
      title: "Connect AI Reminder",
      prompt: "Enter your AI Reminder backend URL",
      placeHolder: "https://your-domain.com",
      ignoreFocusOut: true,
      validateInput: (value) => {
        try {
          const parsed = new URL(value);

          if (
            parsed.protocol !== "https:" &&
            parsed.hostname !== "localhost" &&
            parsed.hostname !== "127.0.0.1"
          ) {
            return "Use HTTPS, except for localhost development.";
          }

          return undefined;
        } catch {
          return "Enter a valid URL.";
        }
      },
    });

    if (!apiUrl) return;

    const token = await vscode.window.showInputBox({
      title: "AI Reminder Extension Token",
      prompt: "Paste your extension token",
      password: true,
      ignoreFocusOut: true,
    });

    if (!token?.trim()) return;

    await this.setApiUrl(apiUrl);
    await this.setToken(token);

    vscode.window.showInformationMessage(
      "AI Reminder credentials saved securely.",
    );

    this.output.appendLine("Extension credentials configured.");
  }

  async disconnect(): Promise<void> {
    await this.clearToken();

    vscode.window.showInformationMessage(
      "AI Reminder extension disconnected.",
    );

    this.output.appendLine("Extension token removed.");
  }
}