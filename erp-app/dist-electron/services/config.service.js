"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDeviceConfig = getDeviceConfig;
exports.saveDeviceConfig = saveDeviceConfig;
const connection_1 = require("../database/connection");
function getDeviceConfig() {
    const db = (0, connection_1.getDb)();
    const row = db.prepare('SELECT * FROM device_config WHERE id = 1').get();
    if (!row)
        return null;
    return { ...row, setup_done: row.setup_done === 1 };
}
function sanitize(v) {
    if (v === undefined)
        return null;
    if (v === true)
        return 1;
    if (v === false)
        return 0;
    return v;
}
const ALLOWED_CONFIG_FIELDS = new Set([
    'company_name', 'company_ice', 'company_if', 'company_rc',
    'company_address', 'company_phone', 'company_fax', 'company_email',
    'company_website', 'company_cnss', 'company_bank_name', 'company_bank_rib',
    'company_bank_account', 'company_capital', 'company_legal_form',
    'company_city', 'company_country', 'company_logo',
    'mode', 'server_ip', 'server_port', 'currency', 'setup_done',
]);
function saveDeviceConfig(data) {
    const db = (0, connection_1.getDb)();
    const existing = db.prepare('SELECT id FROM device_config WHERE id = 1').get();
    if (existing) {
        const safeData = Object.fromEntries(Object.entries(data).filter(([k]) => ALLOWED_CONFIG_FIELDS.has(k)));
        if (Object.keys(safeData).length === 0)
            return;
        const fields = Object.keys(safeData).map(k => `${k} = ?`).join(', ');
        const values = Object.values(safeData).map(sanitize);
        db.prepare(`UPDATE device_config SET ${fields} WHERE id = 1`).run(...values);
    }
    else {
        db.prepare(`
      INSERT INTO device_config (id, company_name, company_ice, company_if, company_rc,
        company_address, company_phone, company_fax, company_email, company_website,
        company_cnss, company_bank_name, company_bank_rib, company_bank_account,
        company_capital, company_legal_form, company_city, company_country,
        company_logo, mode, server_ip, server_port, currency, setup_done)
      VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(data.company_name ?? '', data.company_ice ?? '', data.company_if ?? '', data.company_rc ?? '', data.company_address ?? '', data.company_phone ?? '', data.company_fax ?? '', data.company_email ?? '', data.company_website ?? '', data.company_cnss ?? '', data.company_bank_name ?? '', data.company_bank_rib ?? '', data.company_bank_account ?? '', data.company_capital ?? '', data.company_legal_form ?? '', data.company_city ?? '', data.company_country ?? 'Maroc', data.company_logo ?? '', data.mode ?? 'standalone', data.server_ip ?? '', data.server_port ?? 3000, data.currency ?? 'MAD', data.setup_done ? 1 : 0);
    }
}
