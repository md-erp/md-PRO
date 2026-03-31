"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerBackupHandlers = registerBackupHandlers;
const index_1 = require("./index");
const electron_1 = require("electron");
const path_1 = require("path");
const fs_1 = require("fs");
const fs_2 = require("fs");
function registerBackupHandlers() {
    (0, index_1.handle)('backup:create', () => {
        const userData = electron_1.app.getPath('userData');
        const backupDir = (0, path_1.join)(userData, 'backups');
        (0, fs_2.mkdirSync)(backupDir, { recursive: true });
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const backupPath = (0, path_1.join)(backupDir, `erp-backup-${timestamp}.db`);
        (0, fs_1.copyFileSync)((0, path_1.join)(userData, 'erp.db'), backupPath);
        // الاحتفاظ بآخر 30 نسخة فقط
        const backups = (0, fs_1.readdirSync)(backupDir)
            .filter(f => f.endsWith('.db'))
            .map(f => ({ name: f, time: (0, fs_1.statSync)((0, path_1.join)(backupDir, f)).mtime.getTime() }))
            .sort((a, b) => b.time - a.time);
        if (backups.length > 30) {
            backups.slice(30).forEach(b => (0, fs_1.unlinkSync)((0, path_1.join)(backupDir, b.name)));
        }
        return { path: backupPath, timestamp };
    });
    (0, index_1.handle)('backup:list', () => {
        const backupDir = (0, path_1.join)(electron_1.app.getPath('userData'), 'backups');
        try {
            return (0, fs_1.readdirSync)(backupDir)
                .filter(f => f.endsWith('.db'))
                .map(f => ({
                name: f,
                path: (0, path_1.join)(backupDir, f),
                size: (0, fs_1.statSync)((0, path_1.join)(backupDir, f)).size,
                date: (0, fs_1.statSync)((0, path_1.join)(backupDir, f)).mtime,
            }))
                .sort((a, b) => b.date.getTime() - a.date.getTime());
        }
        catch {
            return [];
        }
    });
    (0, index_1.handle)('backup:restore', (backupPath) => {
        const userData = electron_1.app.getPath('userData');
        const dbPath = (0, path_1.join)(userData, 'erp.db');
        // نسخ احتياطي قبل الاستعادة
        const safetyPath = (0, path_1.join)(userData, `erp-before-restore-${Date.now()}.db`);
        (0, fs_1.copyFileSync)(dbPath, safetyPath);
        (0, fs_1.copyFileSync)(backupPath, dbPath);
        return { success: true, safetyBackup: safetyPath };
    });
}
