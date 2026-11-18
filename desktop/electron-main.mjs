import { app, BrowserWindow, ipcMain } from "electron";
import { spawn } from "node:child_process";
import readline from "node:readline";
import crypto from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";

const currentFile = fileURLToPath(import.meta.url);
const desktopDirectory = path.dirname(currentFile);
const projectDirectory = path.dirname(desktopDirectory);
let cryptoBridge;
const pendingBridgeRequests = new Map();

const startCryptoBridge = () => {
    cryptoBridge = spawn(process.execPath, [path.join(desktopDirectory, "crypto-bridge.mjs")], {
        cwd: projectDirectory,
        stdio: ["pipe", "pipe", "inherit"]
    });
    const output = readline.createInterface({ input: cryptoBridge.stdout });
    output.on("line", (line) => {
        if (!line || !String(line).trim()) return;
        try {
            const response = JSON.parse(line);
            const pending = response.requestId ? pendingBridgeRequests.get(response.requestId) : null;
            if (!pending) return;
            pendingBridgeRequests.delete(response.requestId);
            if (response.type === "error") pending.reject(new Error(response.error));
            else pending.resolve(response);
        } catch (error) {
            console.error("Invalid crypto bridge response:", error, "line:", String(line).slice(0, 120));
        }
    });
    cryptoBridge.on("exit", (code) => {
        const error = new Error(`Crypto bridge stopped with exit code ${code ?? "unknown"}`);
        for (const { reject } of pendingBridgeRequests.values()) reject(error);
        pendingBridgeRequests.clear();
        if (code !== 0 && !app.isQuitting) {
            console.error(`Crypto bridge stopped with exit code ${code}`);
        }
    });
    cryptoBridge.on("error", (error) => {
        console.error("Crypto bridge process error:", error);
    });
};

const requestCryptoBridge = (payload, timeoutMs = 10000) => new Promise((resolve, reject) => {
    if (!cryptoBridge || cryptoBridge.exitCode !== null) {
        reject(new Error("Crypto bridge is unavailable"));
        return;
    }
    const requestId = crypto.randomUUID();
    const timeout = setTimeout(() => {
        pendingBridgeRequests.delete(requestId);
        reject(new Error("Crypto bridge request timed out"));
    }, timeoutMs);
    pendingBridgeRequests.set(requestId, {
        resolve: (value) => {
            clearTimeout(timeout);
            resolve(value);
        },
        reject: (error) => {
            clearTimeout(timeout);
            reject(error);
        }
    });
    cryptoBridge.stdin.write(`${JSON.stringify({ ...payload, requestId })}\n`);
});

const createWindow = async () => {
    const window = new BrowserWindow({
        width: 1440,
        height: 900,
        webPreferences: {
            contextIsolation: true,
            nodeIntegration: false,
            preload: path.join(desktopDirectory, "preload.cjs")
        }
    });

    const frontendUrl = process.env.CHATAPP_FRONTEND_URL || "http://localhost:5173";
    await window.loadURL(frontendUrl);
};

ipcMain.handle("e2ee:status", async () => {
    try {
        const r = await requestCryptoBridge({ type: "status" }, 3000);
        return { available: true, protocol: "signal-native-bridge", messageEncryptionEnabled: Boolean(r?.messageEncryptionEnabled), private: Boolean(r?.private), group: Boolean(r?.group) };
    } catch {
        return { available: Boolean(cryptoBridge), protocol: "signal-native-bridge", messageEncryptionEnabled: false };
    }
});

ipcMain.handle("e2ee:ensure-device", async (_event, accountId) => {
    const response = await requestCryptoBridge({ type: "ensure-device", accountId });
    return response.bundle;
});

ipcMain.handle("e2ee:ensure-session", async (_event, payload) => {
    const response = await requestCryptoBridge({ type: "ensure-session", ...payload });
    return response.ok;
});

ipcMain.handle("e2ee:encrypt-private", async (_event, payload) => {
    return requestCryptoBridge({ type: "encrypt-private", ...payload });
});

ipcMain.handle("e2ee:decrypt-private", async (_event, payload) => {
    const response = await requestCryptoBridge({ type: "decrypt-private", ...payload });
    return response.plaintext;
});

ipcMain.handle("e2ee:create-sender-key", async (_event, payload) => {
    return requestCryptoBridge({ type: "create-sender-key", ...payload });
});

ipcMain.handle("e2ee:process-sender-key", async (_event, payload) => {
    return requestCryptoBridge({ type: "process-sender-key", ...payload });
});

ipcMain.handle("e2ee:encrypt-group", async (_event, payload) => {
    return requestCryptoBridge({ type: "encrypt-group", ...payload });
});

ipcMain.handle("e2ee:decrypt-group", async (_event, payload) => {
    const response = await requestCryptoBridge({ type: "decrypt-group", ...payload });
    return response.plaintext;
});

app.whenReady().then(async () => {
    startCryptoBridge();
    await createWindow();
    app.on("activate", async () => {
        if (BrowserWindow.getAllWindows().length === 0) await createWindow();
    });
});

app.on("window-all-closed", () => {
    if (process.platform !== "darwin") app.quit();
});

app.on("before-quit", () => {
    app.isQuitting = true;
    for (const { reject } of pendingBridgeRequests.values()) {
        reject(new Error("Application is shutting down"));
    }
    pendingBridgeRequests.clear();
    if (cryptoBridge && cryptoBridge.exitCode === null) {
        cryptoBridge.stdin.end();
        cryptoBridge.kill();
    }
});
