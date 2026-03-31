"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerSettingsHandlers = registerSettingsHandlers;
const index_1 = require("./index");
const connection_1 = require("../database/connection");
function registerSettingsHandlers() {
    (0, index_1.handle)('settings:get', (key) => {
        const db = (0, connection_1.getDb)();
        if (key) {
            const row = db.prepare('SELECT value FROM app_settings WHERE key = ?').get(key);
            return row?.value ?? null;
        }
        const rows = db.prepare('SELECT key, value FROM app_settings').all();
        return Object.fromEntries(rows.map(r => [r.key, r.value]));
    });
    (0, index_1.handle)('settings:set', ({ key, value }) => {
        const db = (0, connection_1.getDb)();
        db.prepare(`
      INSERT INTO app_settings (key, value, updated_at)
      VALUES (?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(key) DO UPDATE SET value = ?, updated_at = CURRENT_TIMESTAMP
    `).run(key, value, value);
        return { success: true };
    });
    (0, index_1.handle)('settings:setMany', (settings) => {
        const db = (0, connection_1.getDb)();
        const tx = db.transaction(() => {
            for (const [key, value] of Object.entries(settings)) {
                db.prepare(`
          INSERT INTO app_settings (key, value, updated_at)
          VALUES (?, ?, CURRENT_TIMESTAMP)
          ON CONFLICT(key) DO UPDATE SET value = ?, updated_at = CURRENT_TIMESTAMP
        `).run(key, value, value);
            }
        });
        tx();
        return { success: true };
    });
}
