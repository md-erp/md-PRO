"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
const path_1 = require("path");
const connection_1 = require("./database/connection");
const ipc_1 = require("./ipc");
const server_1 = require("./api/server");
const config_service_1 = require("./services/config.service");
const sync_service_1 = require("./services/sync.service");
const updater_service_1 = require("./services/updater.service");
const fs_1 = require("fs");
const connection_2 = require("./database/connection");
let mainWindow = null;
let syncInterval = null;
let updateCheckInterval = null;
// ==========================================
// WINDOW
// ==========================================
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
    if (process.env.NODE_ENV === 'development') {
        const port = process.env.VITE_PORT ?? '5173';
        mainWindow.loadURL(`http://localhost:${port}`);
        mainWindow.webContents.openDevTools();
    }
    else {
        mainWindow.loadFile((0, path_1.join)(__dirname, '../dist/index.html'));
    }
    mainWindow.once('ready-to-show', () => mainWindow?.show());
    mainWindow.on('closed', () => { mainWindow = null; });
}
// ==========================================
// APP LIFECYCLE
// ==========================================
electron_1.app.whenReady().then(async () => {
    (0, connection_1.initDatabase)();
    (0, ipc_1.registerAllHandlers)();
    const config = (0, config_service_1.getDeviceConfig)();
    // تشغيل API server إذا كان Master
    if (config?.mode === 'master') {
        (0, server_1.startApiServer)(config.server_port ?? 3000);
        scheduleAutoSync('master');
    }
    else if (config?.mode === 'client') {
        scheduleAutoSync('client');
    }
    // جدولة التحقق من التحديثات
    scheduleUpdateCheck();
    createWindow();
    scheduleAutoBackup();
    electron_1.app.on('activate', () => {
        if (electron_1.BrowserWindow.getAllWindows().length === 0)
            createWindow();
    });
}).catch((err) => {
    console.error('[App] Startup error:', err);
});
electron_1.app.on('window-all-closed', () => {
    (0, server_1.stopApiServer)();
    if (syncInterval)
        clearInterval(syncInterval);
    if (updateCheckInterval)
        clearInterval(updateCheckInterval);
    if (process.platform !== 'darwin')
        electron_1.app.quit();
});
// ==========================================
// AUTO SYNC SCHEDULER
// ==========================================
function scheduleAutoSync(mode) {
    const SYNC_INTERVAL = 30000; // كل 30 ثانية
    syncInterval = setInterval(async () => {
        try {
            if (mode === 'client') {
                await performClientSync();
            }
            // Master لا يحتاج sync — الـ Clients يتصلون به
        }
        catch (err) {
            console.error('[Sync] Auto-sync error:', err.message);
        }
    }, SYNC_INTERVAL);
    console.log(`[Sync] Auto-sync scheduled every ${SYNC_INTERVAL / 1000}s (${mode} mode)`);
}
async function performClientSync() {
    const config = (0, config_service_1.getDeviceConfig)();
    if (!config?.server_ip)
        return;
    const db = (0, connection_2.getDb)();
    const deviceId = (0, sync_service_1.getOrCreateDeviceId)();
    const state = (0, sync_service_1.getSyncState)(db, deviceId);
    const sinceId = state?.last_change_id ?? 0;
    (0, sync_service_1.updateSyncState)(db, deviceId, { status: 'syncing' });
    try {
        const url = `http://${config.server_ip}:${config.server_port ?? 3000}`;
        const apiKey = require('./api/server').getApiKey();
        // 1. Pull — سحب التغييرات من Master
        const pullRes = await fetchWithTimeout(`${url}/sync/pull?since_id=${sinceId}`, {
            headers: { 'x-api-key': apiKey, 'x-device-id': deviceId },
        }, 8000);
        if (pullRes.ok) {
            const pullData = await pullRes.json();
            if ((pullData.changes?.length ?? 0) > 0) {
                const result = (0, sync_service_1.applyChanges)(db, pullData.changes ?? []);
                console.log(`[Sync] Pull: ${result.applied} applied, ${result.conflicts} conflicts`);
            }
            (0, sync_service_1.updateSyncState)(db, deviceId, {
                last_pull_at: new Date().toISOString(),
                last_change_id: pullData.latest_id ?? sinceId,
            });
        }
        // 2. Push — دفع التغييرات المحلية إلى Master
        const localChanges = (0, sync_service_1.getChangesSince)(db, 0).filter(c => c.device_id === deviceId && c.synced === 0);
        if (localChanges.length > 0) {
            const pushRes = await fetchWithTimeout(`${url}/sync/push`, {
                method: 'POST',
                headers: {
                    'x-api-key': apiKey,
                    'x-device-id': deviceId,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ changes: localChanges, device_id: deviceId }),
            }, 10000);
            if (pushRes.ok) {
                const ids = localChanges.map(c => c.id);
                (0, sync_service_1.markChangesSynced)(db, ids);
                console.log(`[Sync] Push: ${localChanges.length} changes sent`);
            }
        }
        (0, sync_service_1.updateSyncState)(db, deviceId, { status: 'idle', error_message: null });
        // إشعار الـ Frontend بالتحديث
        mainWindow?.webContents.send('sync:updated', { timestamp: new Date().toISOString() });
    }
    catch (err) {
        (0, sync_service_1.updateSyncState)(db, deviceId, { status: 'offline', error_message: err.message });
        mainWindow?.webContents.send('sync:offline', { error: err.message });
    }
}
// ==========================================
// UPDATE CHECK SCHEDULER
// ==========================================
function scheduleUpdateCheck() {
    const CHECK_INTERVAL = 60 * 60 * 1000; // كل ساعة
    // تحقق فوري عند البدء (بعد 10 ثوانٍ)
    setTimeout(() => checkAndNotifyUpdate().catch((err) => console.error('[Update] Check error:', err)), 10000);
    updateCheckInterval = setInterval(() => checkAndNotifyUpdate().catch((err) => console.error('[Update] Check error:', err)), CHECK_INTERVAL);
}
async function checkAndNotifyUpdate() {
    try {
        const config = (0, config_service_1.getDeviceConfig)();
        if (config?.mode !== 'client' || !config.server_ip)
            return;
        const apiKey = require('./api/server').getApiKey();
        const url = `http://${config.server_ip}:${config.server_port ?? 3000}`;
        const update = await (0, updater_service_1.checkForUpdate)(url, apiKey);
        if (update?.isAvailable) {
            console.log(`[Update] New version available: ${update.version}`);
            mainWindow?.webContents.send('update:available', update);
        }
    }
    catch { }
}
// ==========================================
// AUTO BACKUP
// ==========================================
function scheduleAutoBackup() {
    const INTERVAL = 24 * 60 * 60 * 1000;
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
// ==========================================
// HELPERS
// ==========================================
async function fetchWithTimeout(url, options, timeoutMs) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
        return await fetch(url, { ...options, signal: controller.signal });
    }
    finally {
        clearTimeout(timer);
    }
}
