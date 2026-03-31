import { handle } from './index'
import { getDb } from '../database/connection'
import { applyMovement, createStockMovement } from '../services/stock.service'

export function registerStockHandlers(): void {
  handle('stock:getMovements', (filters?: { product_id?: number; applied?: boolean; page?: number; limit?: number }) => {
    const db = getDb()
    const page  = filters?.page  ?? 1
    const limit = filters?.limit ?? 50
    const offset = (page - 1) * limit
    const params: any[] = []

    let query = `
      SELECT sm.*, p.name as product_name, p.unit, p.code as product_code
      FROM stock_movements sm
      JOIN products p ON p.id = sm.product_id
      WHERE 1=1
    `

    if (filters?.product_id !== undefined) {
      query += ' AND sm.product_id = ?'
      params.push(filters.product_id)
    }
    if (filters?.applied !== undefined) {
      query += ' AND sm.applied = ?'
      params.push(filters.applied ? 1 : 0)
    }

    query += ' ORDER BY sm.created_at DESC LIMIT ? OFFSET ?'
    params.push(limit, offset)

    return db.prepare(query).all(...params)
  })

  handle('stock:applyMovement', (id: number, userId: number = 1) => {
    const db = getDb()
    applyMovement(db, id, userId)
    return { success: true }
  })

  handle('stock:createManual', (data) => {
    const db = getDb()
    const id = createStockMovement(db, {
      ...data,
      manual_ref: data.reference ?? `MANUAL-${Date.now()}`,
      applied: true,
    })
    return { id }
  })
}
