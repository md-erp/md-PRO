"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.runMigrations = runMigrations;
const _001_initial_1 = require("./001_initial");
const _002_accounting_1 = require("./002_accounting");
const _003_production_1 = require("./003_production");
const _004_settings_1 = require("./004_settings");
const _005_fix_document_status_1 = require("./005_fix_document_status");
const _006_user_permissions_1 = require("./006_user_permissions");
const _007_user_sessions_1 = require("./007_user_sessions");
const _007_sessions_1 = require("./007_sessions");
const _008_constraints_1 = require("./008_constraints");
const _009_network_sync_1 = require("./009_network_sync");
const _010_change_tracking_1 = require("./010_change_tracking");
const _011_invoice_template_1 = require("./011_invoice_template");
const MIGRATIONS = [
    { version: 1, name: 'initial', run: _001_initial_1.migration_001_initial },
    { version: 2, name: 'accounting', run: _002_accounting_1.migration_002_accounting },
    { version: 3, name: 'production', run: _003_production_1.migration_003_production },
    { version: 4, name: 'settings', run: _004_settings_1.migration_004_settings },
    { version: 5, name: 'fix_document_status', run: _005_fix_document_status_1.migration_005_fix_document_status },
    { version: 6, name: 'user_permissions', run: _006_user_permissions_1.migration_006_user_permissions },
    { version: 7, name: 'user_sessions', run: _007_user_sessions_1.migration_007_user_sessions },
    { version: 71, name: 'sessions', run: _007_sessions_1.migration_007_sessions },
    { version: 8, name: 'constraints', run: _008_constraints_1.migration_008_constraints },
    { version: 9, name: 'network_sync', run: _009_network_sync_1.migration_009_network_sync },
    { version: 10, name: 'change_tracking', run: _010_change_tracking_1.migration_010_change_tracking },
    { version: 11, name: 'invoice_template', run: _011_invoice_template_1.migration_011_invoice_template },
];
function runMigrations(db) {
    // جدول تتبع الإصدارات
    db.exec(`
    CREATE TABLE IF NOT EXISTS _migrations (
      version   INTEGER PRIMARY KEY,
      name      TEXT NOT NULL,
      applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
    const applied = db
        .prepare('SELECT version FROM _migrations')
        .all()
        .map((r) => r.version);
    for (const migration of MIGRATIONS) {
        if (!applied.includes(migration.version)) {
            console.log(`[Migration] Applying v${migration.version}: ${migration.name}`);
            const tx = db.transaction(() => {
                migration.run(db);
                db.prepare('INSERT INTO _migrations (version, name) VALUES (?, ?)').run(migration.version, migration.name);
            });
            tx();
            console.log(`[Migration] v${migration.version} applied ✓`);
        }
    }
}
