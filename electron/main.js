// electron/main.js
const { app, BrowserWindow, Menu, ipcMain, Notification } = require("electron");
const path = require("path");

const APP_NAME = "Mon app";

const isDev = !app.isPackaged; // true en dev, false en prod

// Backend URL (configurable via env)
const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:4000";

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

app.whenReady().then(() => {
    app.setName(APP_NAME);
    createWindow();
});
