
import { randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import * as path from "node:path";

import envPaths from "env-paths";
import keytar from "keytar";

const paths = envPaths("ai-reminder", { suffix: "" });

const CONFIG_FILE = path.join(paths.config, "config.json");

const KEYCHAIN_SERVICE = "ai-reminder-cli";
const KEYCHAIN_ACCOUNT = "access-token";

export interface CliConfig {
  apiUrl?: string;
  deviceId?: string;
  workspaces?: Record<string, string>;
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

  await mkdir(paths.config, { recursive: true });

  await writeFile(
    CONFIG_FILE,
    JSON.stringify(next, null, 2),
    { mode: 0o600 },
  );
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
  await keytar.setPassword(
    KEYCHAIN_SERVICE,
    KEYCHAIN_ACCOUNT,
    token,
  );
}

export async function getToken(): Promise<string | null> {
  return keytar.getPassword(
    KEYCHAIN_SERVICE,
    KEYCHAIN_ACCOUNT,
  );
}

export async function deleteToken(): Promise<void> {
  await keytar.deletePassword(
    KEYCHAIN_SERVICE,
    KEYCHAIN_ACCOUNT,
  );
}

export async function saveWorkspaceId(
  workspacePath: string,
  workspaceId: string,
): Promise<void> {
  const config = await getConfig();

  await saveConfig({
    workspaces: {
      ...config.workspaces,
      [workspacePath]: workspaceId,
    },
  });
}

export async function getWorkspaceId(
  workspacePath: string,
): Promise<string | undefined> {
  const config = await getConfig();

  return config.workspaces?.[workspacePath];
}

export async function deleteWorkspaceId(
  workspacePath: string,
): Promise<void> {
  const config = await getConfig();
  const workspaces = { ...config.workspaces };

  delete workspaces[workspacePath];

  await saveConfig({ workspaces });
}
