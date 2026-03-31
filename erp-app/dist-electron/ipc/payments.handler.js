"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerPaymentHandlers = registerPaymentHandlers;
const index_1 = require("./index");
const connection_1 = require("../database/connection");
const accounting_service_1 = require("../services/accounting.service");
function registerPaymentHandlers() {
    (0, index_1.handle)('payments:getAll', (filters) => {
        const db = (0, connection_1.getDb)();
        let query = 'SELECT * FROM payments WHERE 1=1';
        const params = [];
        if (filters?.party_id) {
            query += ' AND party_id = ?';
            params.push(filters.party_id);
        }
        if (filters?.party_type) {
            query += ' AND party_type = ?';
            params.push(filters.party_type);
        }
        if (filters?.status) {
            query += ' AND status = ?';
            params.push(filters.status);
        }
        query += ' ORDER BY date DESC';
        return db.prepare(query).all(...params);
    });
    (0, index_1.handle)('payments:create', (data) => {
        const db = (0, connection_1.getDb)();
        const tx = db.transaction(() => {
            const result = db.prepare(`
        INSERT INTO payments (party_id, party_type, amount, method, date, due_date,
          cheque_number, bank, status, document_id, notes, created_by)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(data.party_id, data.party_type, data.amount, data.method, data.date, data.due_date ?? null, data.cheque_number ?? null, data.bank ?? null, data.status ?? 'pending', data.document_id ?? null, data.notes ?? null, data.created_by ?? 1);
            const paymentId = result.lastInsertRowid;
            // تخصيص الدفعة على الفاتورة
            if (data.document_id) {
                db.prepare('INSERT INTO payment_allocations (payment_id, document_id, amount) VALUES (?, ?, ?)').run(paymentId, data.document_id, data.amount);
                // تحديث حالة الفاتورة
                updateInvoicePaymentStatus(db, data.document_id);
            }
            // قيد محاسبي تلقائي
            (0, accounting_service_1.createPaymentEntry)(db, {
                id: paymentId,
                party_id: data.party_id,
                party_type: data.party_type,
                amount: data.amount,
                method: data.method,
                date: data.date,
                reference: `PAY-${paymentId}`,
            }, data.created_by ?? 1);
            return { id: paymentId };
        });
        return tx();
    });
    (0, index_1.handle)('payments:update', (data) => {
        const db = (0, connection_1.getDb)();
        db.prepare(`UPDATE payments SET status=?, updated_at=CURRENT_TIMESTAMP WHERE id=?`).run(data.status, data.id);
        return { success: true };
    });
}
function updateInvoicePaymentStatus(db, documentId) {
    const doc = db.prepare('SELECT total_ttc, type FROM documents WHERE id = ?').get(documentId);
    if (!doc)
        return;
    const paid = db.prepare('SELECT COALESCE(SUM(amount), 0) as total FROM payment_allocations WHERE document_id = ?').get(documentId).total;
    let status = 'unpaid';
    if (paid >= doc.total_ttc - 0.01)
        status = 'paid'; // tolerance 1 centime
    else if (paid > 0)
        status = 'partial';
    // تحديث الجدول الفرعي المناسب
    if (doc.type === 'invoice') {
        db.prepare('UPDATE doc_invoices SET payment_status = ? WHERE document_id = ?').run(status, documentId);
    }
    else if (doc.type === 'purchase_invoice') {
        db.prepare('UPDATE doc_purchase_invoices SET payment_status = ? WHERE document_id = ?').run(status, documentId);
    }
    else if (doc.type === 'import_invoice') {
        db.prepare('UPDATE doc_import_invoices SET payment_status = ? WHERE document_id = ?').run(status, documentId);
    }
    // تحديث حالة المستند الرئيسي
    if (status === 'paid') {
        db.prepare(`UPDATE documents SET status = 'paid', updated_at = CURRENT_TIMESTAMP WHERE id = ?`).run(documentId);
    }
    else if (status === 'partial') {
        db.prepare(`UPDATE documents SET status = 'partial', updated_at = CURRENT_TIMESTAMP WHERE id = ?`).run(documentId);
    }
}
