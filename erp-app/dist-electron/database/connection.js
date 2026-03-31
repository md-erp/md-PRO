"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDb = getDb;
exports.initDatabase = initDatabase;
exports.closeDatabase = closeDatabase;
const better_sqlite3_1 = __importDefault(require("better-sqlite3"));
const path_1 = require("path");
const electron_1 = require("electron");
const migrations_1 = require("./migrations");
let db = null;
function getDb() {
    if (!db)
        throw new Error('Database not initialized. Call initDatabase() first.');
    return db;
}
function initDatabase() {
    const dbPath = electron_1.app
        ? (0, path_1.join)(electron_1.app.getPath('userData'), 'erp.db')
        : (0, path_1.join)(process.cwd(), 'erp.db'); // للاختبارات
    db = new better_sqlite3_1.default(dbPath);
    // أداء أفضل
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
    db.pragma('synchronous = NORMAL');
    (0, migrations_1.runMigrations)(db);
    console.log(`[DB] Connected: ${dbPath}`);
}
function closeDatabase() {
    db?.close();
    db = null;
}
