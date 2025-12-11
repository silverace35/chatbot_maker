// electron/main.js
const { app, BrowserWindow, Menu, ipcMain, Notification } = require("electron");
const path = require("path");
const { spawn } = require("child_process");
const http = require("http");

const APP_NAME = "Mon app";

const isDev = !app.isPackaged; // true en dev, false en prod

// Backend URL (configurable via env)
const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:4000";

function waitForBackend(url, timeoutMs = 60000, intervalMs = 3000) {
    return new Promise((resolve, reject) => {
        const endTime = Date.now() + timeoutMs;

        const check = () => {
            const req = http.get(url + "/health", (res) => {
                if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
                    res.resume();
                    resolve(true);
                } else {
                    res.resume();
                    retry();
                }
            });

            req.on("error", () => retry());
        };

        const retry = () => {
            if (Date.now() > endTime) {
                reject(new Error("Backend non disponible après le délai imparti"));
                return;
            }
            setTimeout(check, intervalMs);
        };

        check();
    });
}

function startDockerStackIfNeeded() {
    return new Promise((resolve, reject) => {
        if (isDev) {
            // En dev, on suppose que la stack est gérée à part
            resolve();
            return;
        }

        const exePath = app.getPath("exe");
        const installDir = path.dirname(exePath);
        const scriptsDir = path.join(installDir, "scripts");
        const startScript = path.join(scriptsDir, "start-stack.ps1");

        const ps = spawn("powershell.exe", [
            "-NoProfile",
            "-ExecutionPolicy",
            "Bypass",
            "-File",
            startScript,
        ], { windowsHide: true });

        ps.stdout.on("data", (data) => {
            console.log("[start-stack.ps1]", data.toString());
        });

        ps.stderr.on("data", (data) => {
            console.error("[start-stack.ps1][ERR]", data.toString());
        });

        ps.on("close", (code) => {
            if (code === 0) {
                resolve();
            } else {
                reject(new Error("start-stack.ps1 s'est terminé avec le code " + code));
            }
        });
    });
}

function createWindow() {
    const win = new BrowserWindow({
        width: 1280,
        height: 720,
        title: APP_NAME,
        backgroundColor: "#ffffff",
        autoHideMenuBar: true,
        webPreferences: {
            preload: path.join(__dirname, "preload.js"),
            contextIsolation: true,
            nodeIntegration: false,
            additionalArguments: [`--backend-url=${BACKEND_URL}`]
        }
    });

    if (isDev) {
        win.loadURL("http://localhost:5173");
    } else {
        win.loadFile(path.join(__dirname, "../renderer/dist/index.html"));
    }
}

ipcMain.handle('jokes:notify-added', (_event, joke) => {
    if (Notification.isSupported()) {
        new Notification({
            title: 'Nouvelle blague ajoutée',
            body: joke?.question || 'Une nouvelle blague a été ajoutée.',
        }).show();
    }
});

app.whenReady().then(async () => {
    app.setName(APP_NAME);

    try {
        await startDockerStackIfNeeded();
        await waitForBackend(BACKEND_URL);
    } catch (err) {
        console.error("Erreur lors du démarrage de la stack ou du backend :", err);
        // On ouvre malgré tout la fenêtre, mais l'UI devra gérer l'absence de backend.
    }

    createWindow();
});
