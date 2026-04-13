import Database from 'better-sqlite3'

export function migration_013_custom_templates(db: Database.Database): void {
    const pragma = db.pragma('table_info(device_config)') as Array<{ name: string }>
    const cols = pragma.map((c) => c.name)

    const toAdd = [
        { name: 'company_logo_width', type: 'INTEGER DEFAULT 0' },
        { name: 'company_logo_height', type: 'INTEGER DEFAULT 0' },
        { name: 'custom_pdf_template', type: 'TEXT DEFAULT ""' },
        { name: 'company_if', type: 'TEXT DEFAULT ""' },
    ]

    for (const col of toAdd) {
        if (!cols.includes(col.name)) {
            db.exec(`ALTER TABLE device_config ADD COLUMN ${col.name} ${col.type}`)
        }
    }
}
