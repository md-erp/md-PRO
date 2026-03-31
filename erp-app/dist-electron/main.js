"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
const path_1 = require("path");
const connection_1 = require("./database/connection");
const ipc_1 = require("./ipc");
const server_1 = require("./api/server");
const config_service_1 = require("./services/config.service");
const fs_1 = require("fs");
let mainWindow = null;
function createWindow() {
    mainWindow = new electron_1.BrowserWindow({
        width: 1400,
        height: 900,
        minWidth: 1200,
        minHeight: 700,
        webPreferences: {
            preload: (0, path_1.join)(__dirname, 'preload.js'),
            contextIsolation: true,
            nodeIntegration: false,
        },
        titleBarStyle: 'hiddenInset',
        show: false,
    });
    // في وضع التطوير نفتح Vite dev server
    if (process.env.NODE_ENV === 'development') {
        // نجرب 5173 أولاً ثم 5174
        const port = process.env.VITE_PORT ?? '5173';
        mainWindow.loadURL(`http://localhost:${port}`);
        mainWindow.webContents.openDevTools();
    }
    else {
        mainWindow.loadFile((0, path_1.join)(__dirname, '../dist/index.html'));
    }
    mainWindow.once('ready-to-show', () => {
        mainWindow?.show();
    });
    mainWindow.on('closed', () => {
        mainWindow = null;
    });
}
electron_1.app.whenReady().then(async () => {
    // 1. تهيئة قاعدة البيانات
    (0, connection_1.initDatabase)();
    // 2. تسجيل كل IPC handlers
    (0, ipc_1.registerAllHandlers)();
    // 3. تشغيل API server إذا كان الجهاز Master
    const config = (0, config_service_1.getDeviceConfig)();
    if (config?.mode === 'master') {
        (0, server_1.startApiServer)(config.server_port ?? 3000);
    }
    // 4. إنشاء النافذة
    createWindow();
    // 5. نسخ احتياطي تلقائي يومي
    scheduleAutoBackup();
    electron_1.app.on('activate', () => {
        if (electron_1.BrowserWindow.getAllWindows().length === 0)
            createWindow();
    });
});
electron_1.app.on('window-all-closed', () => {
    (0, server_1.stopApiServer)();
    if (process.platform !== 'darwin')
        electron_1.app.quit();
});
function scheduleAutoBackup() {
    const INTERVAL = 24 * 60 * 60 * 1000; // كل 24 ساعة
    setInterval(() => {
        try {
            const userData = electron_1.app.getPath('userData');
            const backupDir = (0, path_1.join)(userData, 'backups');
            (0, fs_1.mkdirSync)(backupDir, { recursive: true });
            const ts = new Date().toISOString().replace(/[:.]/g, '-');
            (0, fs_1.copyFileSync)((0, path_1.join)(userData, 'erp.db'), (0, path_1.join)(backupDir, `erp-auto-${ts}.db`));
            console.log('[Backup] Auto backup created');
        }
        catch (e) {
            console.error('[Backup] Auto backup failed:', e);
        }
    }, INTERVAL);
}
