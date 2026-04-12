import Database from 'better-sqlite3'

export function migration_007_sessions(db: Database.Database): void {
  // الجدول موجود بالفعل من migration 7 — نضيف عمود date فقط إذا لم يكن موجوداً
  try {
    db.exec(`ALTER TABLE user_sessions ADD COLUMN date TEXT NOT NULL DEFAULT (date('now'))`)
  } catch {
    // العمود موجود بالفعل — نتجاهل الخطأ
  }
  try {
    db.exec(`CREATE INDEX IF NOT EXISTS idx_sessions_date ON user_sessions(date)`)
  } catch {}
}
