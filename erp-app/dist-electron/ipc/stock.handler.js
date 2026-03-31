"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerStockHandlers = registerStockHandlers;
const index_1 = require("./index");
const connection_1 = require("../database/connection");
const stock_service_1 = require("../services/stock.service");
function registerStockHandlers() {
    (0, index_1.handle)('stock:getMovements', (filters) => {
        const db = (0, connection_1.getDb)();
        const page = filters?.page ?? 1;
        const limit = filters?.limit ?? 50;
        const offset = (page - 1) * limit;
        const params = [];
        let query = `
      SELECT sm.*, p.name as product_name, p.unit, p.code as product_code
      FROM stock_movements sm
      JOIN products p ON p.id = sm.product_id
      WHERE 1=1
    `;
        if (filters?.product_id !== undefined) {
            query += ' AND sm.product_id = ?';
            params.push(filters.product_id);
        }
        if (filters?.applied !== undefined) {
            query += ' AND sm.applied = ?';
            params.push(filters.applied ? 1 : 0);
        }
        query += ' ORDER BY sm.created_at DESC LIMIT ? OFFSET ?';
        params.push(limit, offset);
        return db.prepare(query).all(...params);
    });
    (0, index_1.handle)('stock:applyMovement', (id, userId = 1) => {
        const db = (0, connection_1.getDb)();
        (0, stock_service_1.applyMovement)(db, id, userId);
        return { success: true };
    });
    (0, index_1.handle)('stock:createManual', (data) => {
        const db = (0, connection_1.getDb)();
        const id = (0, stock_service_1.createStockMovement)(db, {
            ...data,
            manual_ref: data.reference ?? `MANUAL-${Date.now()}`,
            applied: true,
        });
        return { id };
    });
}
