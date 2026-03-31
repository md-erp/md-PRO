import Database from 'better-sqlite3'
import { migration_001_initial } from './001_initial'
import { migration_002_accounting } from './002_accounting'
import { migration_003_production } from './003_production'
import { migration_004_settings } from './004_settings'

const MIGRATIONS = [
  { version: 1, name: 'initial',    run: migration_001_initial },
  { version: 2, name: 'accounting', run: migration_002_accounting },
  { version: 3, name: 'production', run: migration_003_production },
  { version: 4, name: 'settings',   run: migration_004_settings },
]

export function runMigrations(db: Database.Database): void {
  // جدول تتبع الإصدارات
  db.exec(`
    CREATE TABLE IF NOT EXISTS _migrations (
      version   INTEGER PRIMARY KEY,
      name      TEXT NOT NULL,
      applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `)

  const applied = db
    .prepare('SELECT version FROM _migrations')
    .all()
    .map((r: any) => r.version as number)

  for (const migration of MIGRATIONS) {
    if (!applied.includes(migration.version)) {
      console.log(`[Migration] Applying v${migration.version}: ${migration.name}`)
      const tx = db.transaction(() => {
        migration.run(db)
        db.prepare('INSERT INTO _migrations (version, name) VALUES (?, ?)').run(
          migration.version,
          migration.name
        )
      })
      tx()
      console.log(`[Migration] v${migration.version} applied ✓`)
    }
  }
}
