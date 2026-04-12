"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getApiKey = getApiKey;
exports.startApiServer = startApiServer;
exports.stopApiServer = stopApiServer;
exports.getServerPort = getServerPort;
/**
 * API Server — Express server للـ Master
 * يخدم الـ Clients على الشبكة المحلية
 * - المزامنة (sync pull/push)
 * - التحديثات (updates)
 * - Health check
 * - Device registry
 */
const express_1 = __importDefault(require("express"));
const crypto_1 = __importDefault(require("crypto"));
const fs_1 = require("fs");
const connection_1 = require("../database/connection");
const sync_service_1 = require("../services/sync.service");
const updater_service_1 = require("../services/updater.service");
let server = null;
let currentPort = 3000;
// ==========================================
// API KEY MANAGEMENT
// ==========================================
function getOrCreateApiKey() {
    const db = (0, connection_1.getDb)();
    const row = db.prepare("SELECT value FROM app_settings WHERE key = 'api_key'").get();
    if (row?.value)
        return row.value;
    const newKey = crypto_1.default.randomBytes(32).toString('hex');
    db.prepare("INSERT OR REPLACE INTO app_settings (key, value) VALUES ('api_key', ?)").run(newKey);
    return newKey;
}
function getApiKey() {
    return getOrCreateApiKey();
}
// ==========================================
// MIDDLEWARE
// ==========================================
function authMiddleware(req, res, next) {
    const publicPaths = ['/health', '/info'];
    if (publicPaths.includes(req.path)) {
        next();
        return;
    }
    const key = req.headers['x-api-key'];
    const validKey = getOrCreateApiKey();
    if (!key || key !== validKey) {
        res.status(401).json({ error: 'Unauthorized — clé API invalide' });
        return;
    }
    // تحديث last_seen للجهاز
    const deviceId = req.headers['x-device-id'];
    if (deviceId) {
        try {
            const db = (0, connection_1.getDb)();
            const ip = req.ip ?? req.socket.remoteAddress;
            (0, sync_service_1.updateDeviceLastSeen)(db, deviceId, ip);
        }
        catch { }
    }
    next();
}
const rateLimitMap = new Map();
function rateLimitMiddleware(req, res, next) {
    const ip = req.ip ?? 'unknown';
    const now = Date.now();
    const entry = rateLimitMap.get(ip);
    if (!entry || now > entry.resetAt) {
        rateLimitMap.set(ip, { count: 1, resetAt: now + 60000 });
        next();
        return;
    }
    entry.count++;
    if (entry.count > 200) { // 200 requêtes/minute max
        res.status(429).json({ error: 'Trop de requêtes — réessayez dans un instant' });
        return;
    }
    next();
}
// ==========================================
// SERVER FACTORY
// ==========================================
function startApiServer(port) {
    if (server)
        stopApiServer();
    const app = (0, express_1.default)();
    app.use(express_1.default.json({ limit: '10mb' }));
    app.use(rateLimitMiddleware);
    app.use(authMiddleware);
    currentPort = port;
    // ── Health & Info ──────────────────────────────────────────
    app.get('/health', (_req, res) => {
        res.json({
            status: 'ok',
            version: process.env.npm_package_version ?? '1.0.0',
            timestamp: new Date().toISOString(),
            uptime: process.uptime(),
        });
    });
    app.get('/info', (_req, res) => {
        try {
            const db = (0, connection_1.getDb)();
            const config = db.prepare('SELECT * FROM device_config WHERE id = 1').get();
            res.json({
                company: config?.company_name ?? 'ERP Pro',
                version: process.env.npm_package_version ?? '1.0.0',
                mode: 'master',
            });
        }
        catch {
            res.json({ company: 'ERP Pro', version: '1.0.0', mode: 'master' });
        }
    });
    // ── Device Registry ────────────────────────────────────────
    app.post('/devices/register', (req, res) => {
        try {
            const { device_id, name, api_key } = req.body;
            if (!device_id || !name || !api_key) {
                res.status(400).json({ error: 'device_id, name, api_key requis' });
                return;
            }
            const db = (0, connection_1.getDb)();
            (0, sync_service_1.registerDevice)(db, device_id, name, 'client', api_key);
            res.json({ success: true, master_api_key: getOrCreateApiKey() });
        }
        catch (err) {
            res.status(500).json({ error: err.message });
        }
    });
    app.get('/devices', (_req, res) => {
        try {
            const db = (0, connection_1.getDb)();
            res.json((0, sync_service_1.getRegisteredDevices)(db));
        }
        catch (err) {
            res.status(500).json({ error: err.message });
        }
    });
    // ── Sync Pull — Client يسحب التغييرات من Master ────────────
    app.get('/sync/pull', (req, res) => {
        try {
            const db = (0, connection_1.getDb)();
            const sinceId = parseInt(req.query.since_id ?? '0', 10);
            const deviceId = req.headers['x-device-id'] ?? 'unknown';
            const changes = (0, sync_service_1.getChangesSince)(db, sinceId, deviceId);
            const latestId = changes.length > 0 ? changes[changes.length - 1].id : sinceId;
            // تحديث sync state
            (0, sync_service_1.updateSyncState)(db, deviceId, {
                last_pull_at: new Date().toISOString(),
                last_change_id: latestId,
                status: 'idle',
                error_message: null,
            });
            res.json({
                changes,
                latest_id: latestId,
                total: changes.length,
                timestamp: new Date().toISOString(),
            });
        }
        catch (err) {
            res.status(500).json({ error: err.message });
        }
    });
    // ── Sync Push — Client يدفع تغييراته إلى Master ────────────
    app.post('/sync/push', (req, res) => {
        try {
            const db = (0, connection_1.getDb)();
            const { changes, device_id } = req.body;
            if (!Array.isArray(changes)) {
                res.status(400).json({ error: 'changes doit être un tableau' });
                return;
            }
            // التحقق من الجداول المسموحة
            const invalidTables = changes.filter((c) => !sync_service_1.SYNC_TABLES.includes(c.table_name));
            if (invalidTables.length > 0) {
                res.status(403).json({ error: `Tables non autorisées: ${invalidTables.map((c) => c.table_name).join(', ')}` });
                return;
            }
            const result = (0, sync_service_1.applyChanges)(db, changes);
            // تحديث sync state
            if (device_id) {
                (0, sync_service_1.updateSyncState)(db, device_id, {
                    last_push_at: new Date().toISOString(),
                    status: result.errors.length > 0 ? 'error' : 'idle',
                    error_message: result.errors.length > 0 ? result.errors[0] : null,
                });
            }
            res.json({
                success: true,
                applied: result.applied,
                conflicts: result.conflicts,
                errors: result.errors,
                timestamp: new Date().toISOString(),
            });
        }
        catch (err) {
            res.status(500).json({ error: err.message });
        }
    });
    // ── Sync Status ────────────────────────────────────────────
    app.get('/sync/status', (req, res) => {
        try {
            const db = (0, connection_1.getDb)();
            const deviceId = req.headers['x-device-id'];
            const pending = deviceId ? (0, sync_service_1.getPendingChangesCount)(db, deviceId) : 0;
            const devices = (0, sync_service_1.getRegisteredDevices)(db);
            res.json({ pending, devices, timestamp: new Date().toISOString() });
        }
        catch (err) {
            res.status(500).json({ error: err.message });
        }
    });
    // ── Full Snapshot — أول مزامنة للـ Client الجديد ──────────
    app.get('/sync/snapshot', (req, res) => {
        try {
            const db = (0, connection_1.getDb)();
            const snapshot = {};
            for (const table of sync_service_1.SYNC_TABLES) {
                try {
                    const hasDeleted = db.prepare(`PRAGMA table_info(${table})`).all()
                        .some((col) => col.name === 'is_deleted');
                    const query = hasDeleted
                        ? `SELECT * FROM ${table} WHERE is_deleted = 0`
                        : `SELECT * FROM ${table}`;
                    snapshot[table] = db.prepare(query).all();
                }
                catch {
                    snapshot[table] = [];
                }
            }
            // آخر change_id
            const lastChange = db.prepare('SELECT MAX(id) as id FROM change_log').get();
            res.json({
                snapshot,
                latest_change_id: lastChange?.id ?? 0,
                timestamp: new Date().toISOString(),
            });
        }
        catch (err) {
            res.status(500).json({ error: err.message });
        }
    });
    // ── Updates ────────────────────────────────────────────────
    app.get('/updates/latest', (_req, res) => {
        try {
            const update = (0, updater_service_1.getLatestUpdate)();
            if (!update) {
                res.json({ isAvailable: false });
                return;
            }
            res.json(update);
        }
        catch (err) {
            res.status(500).json({ error: err.message });
        }
    });
    app.get('/updates/list', (_req, res) => {
        try {
            res.json((0, updater_service_1.listUpdates)());
        }
        catch (err) {
            res.status(500).json({ error: err.message });
        }
    });
    app.get('/updates/download/:version', (req, res) => {
        try {
            const { version } = req.params;
            const filePath = (0, updater_service_1.getUpdateFilePath)(version);
            if (!filePath || !(0, fs_1.existsSync)(filePath)) {
                res.status(404).json({ error: 'Fichier de mise à jour introuvable' });
                return;
            }
            const stat = (0, fs_1.statSync)(filePath);
            const ext = filePath.split('.').pop() ?? 'bin';
            res.setHeader('Content-Type', 'application/octet-stream');
            res.setHeader('Content-Length', stat.size);
            res.setHeader('Content-Disposition', `attachment; filename="erp-update-${version}.${ext}"`);
            res.setHeader('x-file-ext', `.${ext}`);
            res.setHeader('x-checksum', require('../services/updater.service').getUpdateFilePath ? '' : '');
            (0, fs_1.createReadStream)(filePath).pipe(res);
        }
        catch (err) {
            res.status(500).json({ error: err.message });
        }
    });
    // ── Legacy sync (backward compat) ─────────────────────────
    app.get('/sync', (req, res) => {
        const db = (0, connection_1.getDb)();
        const since = req.query.since ?? '1970-01-01';
        const tables = ['clients', 'suppliers', 'products', 'documents', 'payments'];
        const changes = {};
        for (const table of tables) {
            try {
                changes[table] = db.prepare(`SELECT * FROM ${table} WHERE updated_at > ?`).all(since);
            }
            catch {
                changes[table] = [];
            }
        }
        res.json({ changes, timestamp: new Date().toISOString() });
    });
    server = app.listen(port, '0.0.0.0', () => {
        console.log(`[API] Master server running on port ${port}`);
    });
    server.on('error', (err) => {
        console.error('[API] Server error:', err.message);
    });
}
function stopApiServer() {
    server?.close();
    server = null;
}
function getServerPort() {
    return currentPort;
}
