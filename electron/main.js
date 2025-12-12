// electron/main.js
const { app, BrowserWindow, Menu, ipcMain, Notification } = require("electron");
const path = require("path");

const APP_NAME = "ChatBot Maker";

const isDev = !app.isPackaged; // true en dev, false en prod

// Backend URL (configurable via env)
const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:4000";

let mainWindow = null;

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1280,
        height: 720,
        minWidth: 900,
        minHeight: 600,
        title: APP_NAME,
        backgroundColor: "#0a0a0f",
        frame: false, // Désactiver la barre de titre native
        titleBarStyle: 'hidden',
        autoHideMenuBar: true,
        webPreferences: {
            preload: path.join(__dirname, "preload.js"),
            contextIsolation: true,
            nodeIntegration: false,
            additionalArguments: [`--backend-url=${BACKEND_URL}`]
        }
    });

    if (isDev) {
        mainWindow.loadURL("http://localhost:5173");
    } else {
        mainWindow.loadFile(path.join(__dirname, "../renderer/dist/index.html"));
    }

    // Envoyer l'état de la fenêtre au renderer
    mainWindow.on('maximize', () => {
        mainWindow.webContents.send('window-state-changed', { isMaximized: true });
    });

    mainWindow.on('unmaximize', () => {
        mainWindow.webContents.send('window-state-changed', { isMaximized: false });
    });
}

// IPC handlers pour les contrôles de fenêtre
ipcMain.handle('window:minimize', () => {
    if (mainWindow) mainWindow.minimize();
});

ipcMain.handle('window:maximize', () => {
    if (mainWindow) {
        if (mainWindow.isMaximized()) {
            mainWindow.unmaximize();
        } else {
            mainWindow.maximize();
        }
    }
});

ipcMain.handle('window:close', () => {
    if (mainWindow) mainWindow.close();
});

ipcMain.handle('window:isMaximized', () => {
    return mainWindow ? mainWindow.isMaximized() : false;
});

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
