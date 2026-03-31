"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.migration_004_settings = migration_004_settings;
function migration_004_settings(db) {
    db.exec(`
    -- جدول إعدادات عامة (key-value)
    CREATE TABLE IF NOT EXISTS app_settings (
      key        TEXT PRIMARY KEY,
      value      TEXT,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- إعدادات افتراضية
    INSERT OR IGNORE INTO app_settings (key, value) VALUES
      ('invoice_prefix',    'F'),
      ('quote_prefix',      'D'),
      ('bl_prefix',         'BL'),
      ('proforma_prefix',   'PRO'),
      ('avoir_prefix',      'AV'),
      ('po_prefix',         'BC'),
      ('reception_prefix',  'BR'),
      ('pinvoice_prefix',   'FF'),
      ('import_prefix',     'IMP'),
      ('default_tva_rate',  '20'),
      ('currency',          'MAD'),
      ('invoice_footer',    'Merci pour votre confiance'),
      ('payment_terms',     'Paiement à 30 jours'),
      ('auto_backup',       '1'),
      ('backup_interval',   '24');
  `);
}
