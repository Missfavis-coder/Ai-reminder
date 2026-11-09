import { randomUUID } from "node:crypto";
import { chmod, mkdir, readFile, writeFile, } from "node:fs/promises";
import * as path from "node:path";
import envPaths from "env-paths";
const paths = envPaths("ai-reminder", { suffix: "" });
const CONFIG_FILE = path.join(paths.config, "config.json");
export async function getConfig() {
    try {
        const contents = await readFile(CONFIG_FILE, "utf8");
        return JSON.parse(contents);
    }
    catch {
        return {};
    }
}
export async function saveConfig(updates) {
    const current = await getConfig();
    const next = {
        ...current,
        ...updates,
    };
    await mkdir(paths.config, {
        recursive: true,
        mode: 0o700,
    });
    await chmod(paths.config, 0o700);
    await writeFile(CONFIG_FILE, JSON.stringify(next, null, 2), { mode: 0o600 });
    await chmod(CONFIG_FILE, 0o600);
}
export async function getOrCreateDeviceId() {
    const config = await getConfig();
    if (config.deviceId) {
        return config.deviceId;
    }
    const deviceId = randomUUID();
    await saveConfig({ deviceId });
    return deviceId;
}
export async function saveToken(token) {
    await saveConfig({ token });
}
export async function getToken() {
    const config = await getConfig();
    return config.token ?? null;
}
export async function deleteToken() {
    const config = await getConfig();
    delete config.token;
    await saveConfig(config);
}
export async function saveWorkspaceId(workspacePath, workspaceId) {
    const config = await getConfig();
    await saveConfig({
        workspaces: {
            ...config.workspaces,
            [workspacePath]: workspaceId,
        },
    });
}
export async function getWorkspaceId(workspacePath) {
    const config = await getConfig();
    return config.workspaces?.[workspacePath];
}
export async function deleteWorkspaceId(workspacePath) {
    const config = await getConfig();
    const workspaces = { ...config.workspaces };
    delete workspaces[workspacePath];
    await saveConfig({ workspaces });
}
