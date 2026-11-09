export interface CliConfig {
    apiUrl?: string;
    deviceId?: string;
    token?: string;
    workspaces?: Record<string, string>;
}
export declare function getConfig(): Promise<CliConfig>;
export declare function saveConfig(updates: Partial<CliConfig>): Promise<void>;
export declare function getOrCreateDeviceId(): Promise<string>;
export declare function saveToken(token: string): Promise<void>;
export declare function getToken(): Promise<string | null>;
export declare function deleteToken(): Promise<void>;
export declare function saveWorkspaceId(workspacePath: string, workspaceId: string): Promise<void>;
export declare function getWorkspaceId(workspacePath: string): Promise<string | undefined>;
export declare function deleteWorkspaceId(workspacePath: string): Promise<void>;
