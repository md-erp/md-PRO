import Database from 'better-sqlite3'
import { join } from 'path'
import { app } from 'electron'
import { runMigrations } from './migrations'

let db: Database.Database | null = null

export function getDb(): Database.Database {
  if (!db) throw new Error('Database not initialized. Call initDatabase() first.')
  return db
}

export function initDatabase(): void {
  const dbPath = app
    ? join(app.getPath('userData'), 'erp.db')
    : join(process.cwd(), 'erp.db') // للاختبارات

  db = new Database(dbPath)

  // أداء أفضل
  db.pragma('journal_mode = WAL')
  db.pragma('foreign_keys = ON')
  db.pragma('synchronous = NORMAL')

  runMigrations(db)
  console.log(`[DB] Connected: ${dbPath}`)
}

export function closeDatabase(): void {
  db?.close()
  db = null
}
