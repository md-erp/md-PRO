"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerSettingsHandlers = registerSettingsHandlers;
const index_1 = require("./index");
const connection_1 = require("../database/connection");
const updater_service_1 = require("../services/updater.service");
const electron_1 = require("electron");
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
        const PROTECTED_KEYS = ['api_key'];
        if (PROTECTED_KEYS.includes(key)) {
            throw new Error('Action non autorisée: modification des clés système restreintes.');
        }
        const db = (0, connection_1.getDb)();
        db.prepare(`
      INSERT INTO app_settings (key, value, updated_at)
      VALUES (?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(key) DO UPDATE SET value = ?, updated_at = CURRENT_TIMESTAMP
    `).run(key, value, value);
        return { success: true };
    });
    (0, index_1.handle)('settings:setMany', (settings) => {
        const PROTECTED_KEYS = ['api_key'];
        const db = (0, connection_1.getDb)();
        const tx = db.transaction(() => {
            for (const [key, value] of Object.entries(settings)) {
                if (PROTECTED_KEYS.includes(key))
                    continue; // Ignore silently protected keys
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
    // تحديث محلي مباشر
    (0, index_1.handle)('update:selectLocalFile', async () => {
        const result = await electron_1.dialog.showOpenDialog({
            title: 'Sélectionner le fichier de mise à jour',
            filters: [
                { name: 'Installateurs', extensions: ['exe', 'msi', 'dmg', 'appimage'] }
            ],
            properties: ['openFile']
        });
        if (result.canceled || result.filePaths.length === 0) {
            return { success: false, error: 'Aucun fichier sélectionné' };
        }
        const filePath = result.filePaths[0];
        const checkResult = (0, updater_service_1.checkLocalUpdate)(filePath);
        if (!checkResult.success) {
            return checkResult;
        }
        return { success: true, filePath, version: checkResult.version, fileSize: checkResult.fileSize };
    });
    (0, index_1.handle)('update:installLocal', ({ filePath }) => {
        return (0, updater_service_1.installLocalUpdate)(filePath);
    });
}
