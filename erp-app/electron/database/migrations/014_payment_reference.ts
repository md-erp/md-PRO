import type Database from 'better-sqlite3'

export function migration_014_payment_reference(db: Database.Database): void {
  db.exec(`ALTER TABLE payments ADD COLUMN reference TEXT;`)

  const payments = db.prepare('SELECT id, created_at FROM payments ORDER BY id ASC').all() as any[]
  const stmt = db.prepare('UPDATE payments SET reference = ? WHERE id = ?')

  payments.forEach((p, i) => {
    const seq  = String(i + 1).padStart(4, '0')
    stmt.run(`P-${seq}`, p.id)
  })
}
