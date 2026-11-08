type ActivityEventType = "workspace_focused" | "workspace_blurred" | "editor_changed" | "heartbeat" | "workspace_stopped" | "idle_started" | "idle_ended";
export declare function login(apiUrlInput: string): Promise<void>;
export declare class AiReminderClient {
    private readonly apiUrl;
    private readonly token;
    constructor(apiUrl: string, token: string);
    private request;
    registerWorkspace(name: string, deviceId: string): Promise<{
        id: string;
        name: string;
    }>;
    setMonitoring(workspaceId: string, enabled: boolean): Promise<void>;
    disconnectWorkspace(workspaceId: string): Promise<void>;
    sendActivity(workspaceId: string, eventType: ActivityEventType, metadata?: Record<string, unknown>): Promise<void>;
}
export declare function getClient(): Promise<AiReminderClient>;
export {};
