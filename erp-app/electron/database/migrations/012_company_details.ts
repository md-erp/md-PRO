import Database from 'better-sqlite3'

export function migration_012_company_details(db: Database.Database): void {
  // التحقق من وجود الأعمدة قبل إضافتها
  const pragmaResult = db.pragma('table_info(device_config)') as Array<{ name: string }>
  const columns = pragmaResult.map((col) => col.name)
  
  const newColumns = [
    { name: 'company_fax', type: 'TEXT DEFAULT ""' },
    { name: 'company_email', type: 'TEXT DEFAULT ""' },
    { name: 'company_website', type: 'TEXT DEFAULT ""' },
    { name: 'company_cnss', type: 'TEXT DEFAULT ""' },
    { name: 'company_bank_name', type: 'TEXT DEFAULT ""' },
    { name: 'company_bank_rib', type: 'TEXT DEFAULT ""' },
    { name: 'company_bank_account', type: 'TEXT DEFAULT ""' },
    { name: 'company_capital', type: 'TEXT DEFAULT ""' },
    { name: 'company_legal_form', type: 'TEXT DEFAULT ""' },
    { name: 'company_city', type: 'TEXT DEFAULT ""' },
    { name: 'company_country', type: 'TEXT DEFAULT "Maroc"' },
  ]

  for (const col of newColumns) {
    if (!columns.includes(col.name)) {
      db.exec(`ALTER TABLE device_config ADD COLUMN ${col.name} ${col.type}`)
    }
  }
}
