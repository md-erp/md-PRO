"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerAssetsHandlers = registerAssetsHandlers;
const index_1 = require("./index");
const connection_1 = require("../database/connection");
function registerAssetsHandlers() {
    // ==========================================
    // FIXED ASSETS
    // ==========================================
    (0, index_1.handle)('assets:getAll', () => {
        const db = (0, connection_1.getDb)();
        return db.prepare(`
      SELECT fa.*,
        aa.code as asset_account_code, aa.name as asset_account_name,
        ad.code as deprec_account_code, ad.name as deprec_account_name
      FROM fixed_assets fa
      LEFT JOIN accounts aa ON aa.id = fa.account_asset_id
      LEFT JOIN accounts ad ON ad.id = fa.account_deprec_id
      WHERE fa.is_deleted = 0
      ORDER BY fa.acquisition_date DESC
    `).all();
    });
    (0, index_1.handle)('assets:create', (data) => {
        const db = (0, connection_1.getDb)();
        const result = db.prepare(`
      INSERT INTO fixed_assets
        (code, name, acquisition_date, acquisition_cost, useful_life_years,
         depreciation_rate, account_asset_id, account_deprec_id, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(data.code, data.name, data.acquisition_date, data.acquisition_cost, data.useful_life_years ?? 5, data.depreciation_rate ?? 20, data.account_asset_id ?? null, data.account_deprec_id ?? null, data.notes ?? null);
        return { id: result.lastInsertRowid };
    });
    (0, index_1.handle)('assets:depreciate', (data) => {
        const db = (0, connection_1.getDb)();
        const asset = db.prepare('SELECT * FROM fixed_assets WHERE id = ?').get(data.asset_id);
        if (!asset)
            throw new Error('Immobilisation introuvable');
        // Calcul amortissement annuel
        const annual = asset.acquisition_cost * (asset.depreciation_rate / 100);
        const monthly = annual / 12;
        // Écriture comptable
        const fakeDoc = {
            id: asset.id, type: 'depreciation',
            number: `AMORT-${asset.code}-${data.date}`,
            date: data.date, party_id: 0, party_type: '',
            total_ht: monthly, total_tva: 0, total_ttc: monthly,
        };
        // Débit: Dotation aux amortissements (6193)
        // Crédit: Amortissements (2833)
        const entryLines = [
            { accountCode: '6193', debit: monthly, credit: 0, notes: `Amort. ${asset.name}` },
            { accountCode: '2833', debit: 0, credit: monthly, notes: `Amort. ${asset.name}` },
        ];
        // On utilise insertEntry directement
        const entry = db.prepare(`
      INSERT INTO journal_entries (date, reference, description, is_auto, source_type, source_id, created_by)
      VALUES (?, ?, ?, 1, 'depreciation', ?, ?)
    `).run(data.date, fakeDoc.number, `Amortissement ${asset.name}`, asset.id, data.userId ?? 1);
        const entryId = entry.lastInsertRowid;
        for (const line of entryLines) {
            const account = db.prepare('SELECT id FROM accounts WHERE code = ?').get(line.accountCode);
            if (account) {
                db.prepare('INSERT INTO journal_lines (entry_id, account_id, debit, credit, notes) VALUES (?, ?, ?, ?, ?)')
                    .run(entryId, account.id, line.debit, line.credit, line.notes);
            }
        }
        return { success: true, amount: monthly, entry_id: entryId };
    });
    (0, index_1.handle)('assets:delete', (id) => {
        const db = (0, connection_1.getDb)();
        db.prepare('UPDATE fixed_assets SET is_deleted = 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(id);
        return { success: true };
    });
    // ==========================================
    // EMPLOYEES
    // ==========================================
    (0, index_1.handle)('employees:getAll', () => {
        const db = (0, connection_1.getDb)();
        return db.prepare('SELECT * FROM employees WHERE is_active = 1 ORDER BY name ASC').all();
    });
    (0, index_1.handle)('employees:create', (data) => {
        const db = (0, connection_1.getDb)();
        const result = db.prepare(`
      INSERT INTO employees (name, cin, position, hire_date, salary_base, cnss_number, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(data.name, data.cin ?? null, data.position ?? null, data.hire_date ?? null, data.salary_base ?? 0, data.cnss_number ?? null, data.notes ?? null);
        return { id: result.lastInsertRowid };
    });
    (0, index_1.handle)('employees:update', (data) => {
        const db = (0, connection_1.getDb)();
        db.prepare(`
      UPDATE employees SET name=?, cin=?, position=?, hire_date=?, salary_base=?,
        cnss_number=?, notes=?, updated_at=CURRENT_TIMESTAMP WHERE id=?
    `).run(data.name, data.cin, data.position, data.hire_date, data.salary_base, data.cnss_number, data.notes, data.id);
        return { success: true };
    });
    (0, index_1.handle)('employees:delete', (id) => {
        const db = (0, connection_1.getDb)();
        db.prepare('UPDATE employees SET is_active = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(id);
        return { success: true };
    });
    // ==========================================
    // PAYROLL — calcul simplifié CNSS + IR Maroc
    // ==========================================
    (0, index_1.handle)('payroll:calculate', (data) => {
        const db = (0, connection_1.getDb)();
        const emp = db.prepare('SELECT * FROM employees WHERE id = ?').get(data.employee_id);
        if (!emp)
            throw new Error('Employé introuvable');
        const salary_base = emp.salary_base ?? 0;
        const bonuses = data.bonuses ?? 0;
        const deductions = data.deductions ?? 0;
        const salary_brut = salary_base + bonuses - deductions;
        // CNSS salarié: 4.48% (plafonné à 6000 MAD/mois)
        const cnss_base = Math.min(salary_brut, 6000);
        const cnss_salarie = Math.round(cnss_base * 0.0448 * 100) / 100;
        // AMO: 2.26%
        const amo = Math.round(salary_brut * 0.0226 * 100) / 100;
        // Salaire net imposable
        const net_imposable = salary_brut - cnss_salarie - amo;
        // IR Maroc 2025 (barème mensuel)
        let ir = 0;
        if (net_imposable <= 2500)
            ir = 0;
        else if (net_imposable <= 4166)
            ir = (net_imposable - 2500) * 0.10;
        else if (net_imposable <= 5000)
            ir = 166.6 + (net_imposable - 4166) * 0.20;
        else if (net_imposable <= 6666)
            ir = 333.4 + (net_imposable - 5000) * 0.30;
        else if (net_imposable <= 15000)
            ir = 833.2 + (net_imposable - 6666) * 0.34;
        else
            ir = 3666.8 + (net_imposable - 15000) * 0.38;
        ir = Math.round(ir * 100) / 100;
        // CNSS patronal: 21.09%
        const cnss_patronal = Math.round(cnss_base * 0.2109 * 100) / 100;
        const salary_net = salary_brut - cnss_salarie - amo - ir;
        return {
            employee_id: emp.id,
            employee_name: emp.name,
            month: data.month,
            salary_base,
            bonuses,
            deductions,
            salary_brut,
            cnss_salarie,
            amo,
            net_imposable,
            ir,
            salary_net: Math.round(salary_net * 100) / 100,
            cnss_patronal,
            cost_total: Math.round((salary_brut + cnss_patronal) * 100) / 100,
        };
    });
}
