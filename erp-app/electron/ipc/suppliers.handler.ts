import { handle } from './index'
import { getDb } from '../database/connection'

export function registerSupplierHandlers(): void {
  handle('suppliers:getAll', (filters?: { search?: string; page?: number; limit?: number }) => {
    const db = getDb()
    const page  = filters?.page  ?? 1
    const limit = filters?.limit ?? 50
    const offset = (page - 1) * limit

    let query = 'SELECT * FROM suppliers WHERE is_deleted = 0'
    const params: any[] = []

    if (filters?.search) {
      query += ' AND (name LIKE ? OR ice LIKE ? OR phone LIKE ?)'
      const s = `%${filters.search}%`
      params.push(s, s, s)
    }

    query += ' ORDER BY name ASC LIMIT ? OFFSET ?'
    params.push(limit, offset)

    const rows = db.prepare(query).all(...params)
    const countQuery = filters?.search
      ? `SELECT COUNT(*) as c FROM suppliers WHERE is_deleted = 0 AND (name LIKE ? OR ice LIKE ? OR phone LIKE ?)`
      : `SELECT COUNT(*) as c FROM suppliers WHERE is_deleted = 0`
    const countParams = filters?.search ? [`%${filters.search}%`, `%${filters.search}%`, `%${filters.search}%`] : []
    const total = (db.prepare(countQuery).get(...countParams) as any).c
    return { rows, total, page, limit }
  })

  handle('suppliers:getOne', (id: number) => {
    const db = getDb()
    const supplier = db.prepare('SELECT * FROM suppliers WHERE id = ? AND is_deleted = 0').get(id)
    if (!supplier) throw new Error('Fournisseur introuvable')
    return supplier
  })

  handle('suppliers:create', (data) => {
    const db = getDb()
    const result = db.prepare(`
      INSERT INTO suppliers (name, address, email, phone, ice, if_number, rc, notes, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      data.name, data.address ?? null, data.email ?? null, data.phone ?? null,
      data.ice ?? null, data.if_number ?? null, data.rc ?? null,
      data.notes ?? null, data.created_by ?? 1
    )
    return { id: result.lastInsertRowid }
  })

  handle('suppliers:update', (data) => {
    const db = getDb()
    db.prepare(`
      UPDATE suppliers SET name=?, address=?, email=?, phone=?, ice=?, if_number=?, rc=?,
        notes=?, updated_at=CURRENT_TIMESTAMP WHERE id=?
    `).run(data.name, data.address, data.email, data.phone, data.ice, data.if_number, data.rc, data.notes, data.id)
    return { success: true }
  })

  handle('suppliers:delete', (id: number) => {
    const db = getDb()
    db.prepare('UPDATE suppliers SET is_deleted = 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(id)
    return { success: true }
  })
}
