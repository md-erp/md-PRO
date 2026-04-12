import Database from 'better-sqlite3'

export function migration_011_invoice_template(db: Database.Database): void {
  db.exec(`
    INSERT OR IGNORE INTO app_settings (key, value) VALUES ('invoice_template', 'classic');
  `)
}
