import { randomUUID } from "node:crypto";
import {
  chmod,
  mkdir,
  readFile,
  writeFile,
} from "node:fs/promises";
import * as path from "node:path";
import envPaths from "env-paths";

const paths = envPaths("ai-reminder", { suffix: "" });
const CONFIG_FILE = path.join(paths.config, "config.json");

export type IdeProvider =
  | "vscode"
  | "cursor"
  | "antigravity"
  | "windsurf";

export interface CliConfig {
  apiUrl?: string;
  deviceId?: string;
  token?: string;

  /**
   * New format:
   * {
   *   "vscode:/project/path": "workspace-id",
   *   "cursor:/project/path": "workspace-id"
   * }
   *
   * Legacy format:
   * {
   *   "/project/path": "workspace-id"
   * }
   */
  workspaces?: Record<string, string>;
}

function workspaceKey(
  workspacePath: string,
  provider: IdeProvider,
): string {
  return `${provider}:${workspacePath}`;
}

export async function getConfig(): Promise<CliConfig> {
  try {
    const contents = await readFile(CONFIG_FILE, "utf8");
    return JSON.parse(contents) as CliConfig;
  } catch {
    return {};
  }
}

export async function saveConfig(
  updates: Partial<CliConfig>,
): Promise<void> {
  const current = await getConfig();

  const next: CliConfig = {
    ...current,
    ...updates,
  };

  await mkdir(paths.config, {
    recursive: true,
    mode: 0o700,
  });

  await chmod(paths.config, 0o700);

  await writeFile(
    CONFIG_FILE,
    JSON.stringify(next, null, 2),
    { mode: 0o600 },
  );

  await chmod(CONFIG_FILE, 0o600);
}

export async function getOrCreateDeviceId(): Promise<string> {
  const config = await getConfig();

  if (config.deviceId) {
    return config.deviceId;
  }

  const deviceId = randomUUID();

  await saveConfig({ deviceId });

  return deviceId;
}

export async function saveToken(token: string): Promise<void> {
  await saveConfig({ token });
}

export async function getToken(): Promise<string | null> {
  const config = await getConfig();
  return config.token ?? null;
}

export async function deleteToken(): Promise<void> {
  const config = await getConfig();
  delete config.token;
  await saveConfig(config);
}

export async function saveWorkspaceId(
  workspacePath: string,
  provider: IdeProvider,
  workspaceId: string,
): Promise<void> {
  const config = await getConfig();

  await saveConfig({
    workspaces: {
      ...config.workspaces,
      [workspaceKey(workspacePath, provider)]: workspaceId,
    },
  });
}
export async function getWorkspaceId(
  workspacePath: string,
  provider: IdeProvider,
): Promise<string | undefined> {
  const config = await getConfig();

  return config.workspaces?.[workspaceKey(workspacePath, provider)];
}

export async function deleteWorkspaceId(
  workspacePath: string,
  provider: IdeProvider,
): Promise<void> {
  const config = await getConfig();
  const workspaces = { ...config.workspaces };

  delete workspaces[workspaceKey(workspacePath, provider)];

  // Remove the old mapping too, if it exists.
  delete workspaces[workspacePath];

  await saveConfig({ workspaces });
}