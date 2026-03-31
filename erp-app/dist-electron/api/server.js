"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.startApiServer = startApiServer;
exports.stopApiServer = stopApiServer;
const express_1 = __importDefault(require("express"));
const connection_1 = require("../database/connection");
let server = null;
function startApiServer(port) {
    const app = (0, express_1.default)();
    app.use(express_1.default.json());
    // Middleware: التحقق من الـ API key البسيط
    app.use((req, res, next) => {
        const key = req.headers['x-api-key'];
        if (!key) {
            res.status(401).json({ error: 'Unauthorized' });
            return;
        }
        next();
    });
    // Health check
    app.get('/health', (_req, res) => {
        res.json({ status: 'ok', timestamp: new Date().toISOString() });
    });
    // Sync endpoint — يُرجع آخر التغييرات
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
        console.log(`[API] Server running on port ${port}`);
    });
}
function stopApiServer() {
    server?.close();
    server = null;
}
