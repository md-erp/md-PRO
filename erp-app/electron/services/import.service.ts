import ExcelJS from 'exceljs'
import { getDb } from '../database/connection'
import { readFileSync } from 'fs'

export interface ImportResult {
  success: number
  errors: Array<{ row: number; message: string }>
  total: number
}

// ==========================================
// TRADUCTION DES ERREURS EN MESSAGES CLAIRS
// ==========================================
function translateError(rawError: string, entityType: string, row: Record<string, unknown>): string {
  const e = rawError.toLowerCase()

  if (e.includes('unique') || e.includes('conflict')) {
    if (entityType === 'product') {
      const code = row['Code'] ?? row['code'] ?? ''
      return `Code produit "${code}" existe déjà — ligne ignorée`
    }
    const name = row['Nom'] ?? row['name'] ?? ''
    return `"${name}" existe déjà dans la base — ligne ignorée`
  }

  if (e.includes('not null') || e.includes('null constraint')) {
    return 'Champ obligatoire manquant (vérifiez les colonnes requises)'
  }

  if (e.includes('datatype') || e.includes('type')) {
    return 'Format de données incorrect (ex: nombre attendu mais texte fourni)'
  }

  if (e.includes('foreign key')) {
    return 'Référence invalide (valeur liée introuvable)'
  }

  return "Erreur lors de l'insertion — vérifiez les données de cette ligne"
}

// ==========================================
// IMPORT CLIENTS depuis Excel/CSV
// ==========================================
export async function importClients(filePath: string, userId: number = 1): Promise<ImportResult> {
  const entityType = 'client'
  const db = getDb()
  const result: ImportResult = { success: 0, errors: [], total: 0 }

  const rows = await readExcelOrCsv(filePath)

  if (rows.length === 0) {
    return {
      success: 0,
      errors: [{ row: 0, message: 'Le fichier est vide ou ne contient pas de données. Vérifiez que la première ligne contient les en-têtes.' }],
      total: 0,
    }
  }

  // Vérifier que les colonnes obligatoires existent
  const firstRow = rows[0]
  const hasNom = 'Nom' in firstRow || 'name' in firstRow || 'NOM' in firstRow
  if (!hasNom) {
    const foundCols = Object.keys(firstRow).join(', ')
    return {
      success: 0,
      errors: [{ row: 1, message: `Colonne "Nom" introuvable. Colonnes trouvées dans votre fichier: ${foundCols || 'aucune'}. Téléchargez le template pour voir le format attendu.` }],
      total: rows.length,
    }
  }

  result.total = rows.length

  const stmt = db.prepare(`
    INSERT INTO clients (name, address, email, phone, ice, if_number, rc, notes, created_by)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT DO NOTHING
  `)

  const tx = db.transaction(() => {
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i]
      const rowNum = i + 2

      const name = String(row['Nom'] ?? row['name'] ?? row['NOM'] ?? '').trim()
      if (!name) {
        result.errors.push({ row: rowNum, message: 'Colonne "Nom" vide ou manquante — ce champ est obligatoire' })
        continue
      }

      try {
        stmt.run(
          name,
          String(row['Adresse'] ?? row['address'] ?? '').trim() || null,
          String(row['Email'] ?? row['email'] ?? '').trim() || null,
          String(row['Téléphone'] ?? row['Telephone'] ?? row['phone'] ?? '').trim() || null,
          String(row['ICE'] ?? row['ice'] ?? '').trim() || null,
          String(row['IF'] ?? row['if'] ?? '').trim() || null,
          String(row['RC'] ?? row['rc'] ?? '').trim() || null,
          String(row['Notes'] ?? row['notes'] ?? '').trim() || null,
          userId
        )
        result.success++
      } catch (e: any) {
        result.errors.push({ row: rowNum, message: translateError(e.message, entityType, row) })
      }
    }
  })

  tx()
  return result
}

// ==========================================
// IMPORT FOURNISSEURS depuis Excel/CSV
// ==========================================
export async function importSuppliers(filePath: string, userId: number = 1): Promise<ImportResult> {
  const entityType = 'supplier'
  const db = getDb()
  const result: ImportResult = { success: 0, errors: [], total: 0 }

  const rows = await readExcelOrCsv(filePath)

  if (rows.length === 0) {
    return {
      success: 0,
      errors: [{ row: 0, message: 'Le fichier est vide ou ne contient pas de données. Vérifiez que la première ligne contient les en-têtes.' }],
      total: 0,
    }
  }

  // Vérifier colonnes obligatoires suppliers
  const firstRowS = rows[0]
  const hasNomS = 'Nom' in firstRowS || 'name' in firstRowS || 'NOM' in firstRowS
  if (!hasNomS) {
    const foundCols = Object.keys(firstRowS).join(', ')
    return {
      success: 0,
      errors: [{ row: 1, message: `Colonne "Nom" introuvable. Colonnes trouvées: ${foundCols || 'aucune'}. Téléchargez le template.` }],
      total: rows.length,
    }
  }

  result.total = rows.length

  const stmt = db.prepare(`
    INSERT INTO suppliers (name, address, email, phone, ice, if_number, rc, notes, created_by)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT DO NOTHING
  `)

  const tx = db.transaction(() => {
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i]
      const rowNum = i + 2

      const name = String(row['Nom'] ?? row['name'] ?? row['NOM'] ?? '').trim()
      if (!name) {
        result.errors.push({ row: rowNum, message: 'Colonne "Nom" vide ou manquante — ce champ est obligatoire' })
        continue
      }

      try {
        stmt.run(
          name,
          String(row['Adresse'] ?? row['address'] ?? '').trim() || null,
          String(row['Email'] ?? row['email'] ?? '').trim() || null,
          String(row['Téléphone'] ?? row['Telephone'] ?? row['phone'] ?? '').trim() || null,
          String(row['ICE'] ?? row['ice'] ?? '').trim() || null,
          String(row['IF'] ?? row['if'] ?? '').trim() || null,
          String(row['RC'] ?? row['rc'] ?? '').trim() || null,
          String(row['Notes'] ?? row['notes'] ?? '').trim() || null,
          userId
        )
        result.success++
      } catch (e: any) {
        result.errors.push({ row: rowNum, message: translateError(e.message, entityType, row) })
      }
    }
  })

  tx()
  return result
}

// ==========================================
// IMPORT PRODUITS depuis Excel/CSV
// ==========================================
export async function importProducts(filePath: string, userId: number = 1): Promise<ImportResult> {
  const entityType = 'product'
  const db = getDb()
  const result: ImportResult = { success: 0, errors: [], total: 0 }

  const rows = await readExcelOrCsv(filePath)

  if (rows.length === 0) {
    return {
      success: 0,
      errors: [{ row: 0, message: 'Le fichier est vide ou ne contient pas de données. Vérifiez que la première ligne contient les en-têtes.' }],
      total: 0,
    }
  }

  // Vérifier colonnes obligatoires products
  const firstRowP = rows[0]
  const hasCode = 'Code' in firstRowP || 'code' in firstRowP || 'CODE' in firstRowP
  const hasDesig = 'Désignation' in firstRowP || 'Designation' in firstRowP || 'name' in firstRowP
  if (!hasCode || !hasDesig) {
    const foundCols = Object.keys(firstRowP).join(', ')
    const missing = !hasCode ? '"Code"' : '"Désignation"'
    return {
      success: 0,
      errors: [{ row: 1, message: `Colonne ${missing} introuvable. Colonnes trouvées: ${foundCols || 'aucune'}. Téléchargez le template.` }],
      total: rows.length,
    }
  }

  result.total = rows.length

  const tvaRates = db.prepare('SELECT id, rate FROM tva_rates').all() as any[]
  const tvaMap: Record<number, number> = {}
  for (const t of tvaRates) tvaMap[t.rate] = t.id

  const stmt = db.prepare(`
    INSERT INTO products (code, name, unit, type, min_stock, sale_price, tva_rate_id, notes, created_by)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(code) DO UPDATE SET
      name = excluded.name,
      unit = excluded.unit,
      sale_price = excluded.sale_price,
      updated_at = CURRENT_TIMESTAMP
  `)

  const tx = db.transaction(() => {
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i]
      const rowNum = i + 2

      const code = String(row['Code'] ?? row['code'] ?? row['CODE'] ?? '').trim()
      const name = String(row['Désignation'] ?? row['Designation'] ?? row['name'] ?? row['NOM'] ?? '').trim()

      if (!code) {
        result.errors.push({ row: rowNum, message: 'Colonne "Code" vide ou manquante — ce champ est obligatoire' })
        continue
      }
      if (!name) {
        result.errors.push({ row: rowNum, message: 'Colonne "Désignation" vide ou manquante — ce champ est obligatoire' })
        continue
      }

      const tvaRate = Number(row['TVA'] ?? row['tva'] ?? row['TVA%'] ?? 20)
      const tvaId   = tvaMap[tvaRate] ?? tvaMap[20] ?? 5

      const typeRaw = String(row['Type'] ?? row['type'] ?? 'finished').toLowerCase().trim()
      const validType = ['raw', 'finished', 'semi_finished'].includes(typeRaw) ? typeRaw : 'finished'

      const salePrice = Number(row['Prix vente'] ?? row['Prix HT'] ?? row['sale_price'] ?? 0)
      const minStock  = Number(row['Stock min'] ?? row['min_stock'] ?? 0)

      if (isNaN(salePrice)) {
        result.errors.push({ row: rowNum, message: `Prix de vente invalide pour "${name}" — doit être un nombre` })
        continue
      }

      try {
        stmt.run(
          code, name,
          String(row['Unité'] ?? row['Unite'] ?? row['unit'] ?? 'unité').trim(),
          validType,
          isNaN(minStock) ? 0 : minStock,
          salePrice,
          tvaId,
          String(row['Notes'] ?? row['notes'] ?? '').trim() || null,
          userId
        )
        result.success++
      } catch (e: any) {
        result.errors.push({ row: rowNum, message: translateError(e.message, entityType, row) })
      }
    }
  })

  tx()
  return result
}

// ==========================================
// HELPER: lire Excel ou CSV
// ==========================================
async function readExcelOrCsv(filePath: string): Promise<Record<string, unknown>[]> {
  const ext = filePath.toLowerCase().split('.').pop()

  if (ext === 'csv') {
    return parseCsv(filePath)
  }

  const wb = new ExcelJS.Workbook()
  await wb.xlsx.readFile(filePath)
  const ws = wb.worksheets[0]
  if (!ws) throw new Error('Fichier Excel vide ou corrompu')

  const headers: string[] = []
  const rows: Record<string, unknown>[] = []

  ws.eachRow((row, rowNum) => {
    if (rowNum === 1) {
      // Nettoyer les en-têtes: supprimer *, espaces, et normaliser
      row.eachCell(cell => {
        const raw = String(cell.value ?? '').trim()
        const clean = raw.replace(/\s*\*\s*$/, '').trim() // enlever * en fin
        headers.push(clean)
      })
      return
    }
    const obj: Record<string, unknown> = {}
    row.eachCell((cell, colNum) => {
      const header = headers[colNum - 1]
      if (header) obj[header] = cell.value
    })
    if (Object.values(obj).some(v => v !== null && v !== undefined && v !== '')) {
      rows.push(obj)
    }
  })

  return rows
}

function parseCsv(filePath: string): Record<string, unknown>[] {
  const content = readFileSync(filePath, 'utf-8')
  const lines = content.split('\n').filter(l => l.trim())
  if (lines.length < 2) return []

  const sep = lines[0].includes(';') ? ';' : ','
  // Nettoyer les en-têtes CSV aussi
  const headers = lines[0].split(sep).map(h =>
    h.trim().replace(/^"|"$/g, '').replace(/\s*\*\s*$/, '').trim()
  )

  return lines.slice(1).map(line => {
    const values = line.split(sep).map(v => v.trim().replace(/^"|"$/g, ''))
    const obj: Record<string, unknown> = {}
    headers.forEach((h, i) => { obj[h] = values[i] ?? '' })
    return obj
  }).filter(row => Object.values(row).some(v => v !== ''))
}

// ==========================================
// GENERATE TEMPLATE Excel pour import
// ==========================================
export async function generateImportTemplate(type: 'clients' | 'suppliers' | 'products'): Promise<Buffer> {
  const wb = new ExcelJS.Workbook()
  const ws = wb.addWorksheet('Template')

  const TEMPLATES = {
    clients: {
      headers: ['Nom *', 'Adresse', 'Email', 'Téléphone', 'ICE', 'IF', 'RC', 'Notes'],
      example: ['Client Exemple SARL', '123 Rue Hassan II, Casablanca', 'contact@exemple.ma', '+212 5 22 00 00 00', '001234567000012', '12345678', 'RC12345', ''],
    },
    suppliers: {
      headers: ['Nom *', 'Adresse', 'Email', 'Téléphone', 'ICE', 'IF', 'RC', 'Notes'],
      example: ['Fournisseur Exemple', 'Zone Industrielle, Rabat', 'info@fournisseur.ma', '+212 5 37 00 00 00', '009876543000001', '87654321', 'RC98765', ''],
    },
    products: {
      headers: ['Code *', 'Désignation *', 'Unité', 'Type', 'Prix vente', 'Stock min', 'TVA', 'Notes'],
      example: ['ART001', 'Produit Exemple', 'unité', 'finished', '100.00', '10', '20', ''],
    },
  }

  const tmpl = TEMPLATES[type]

  const headerRow = ws.addRow(tmpl.headers)
  headerRow.eachCell(cell => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E3A5F' } }
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' } }
    cell.alignment = { vertical: 'middle', horizontal: 'center' }
  })
  headerRow.height = 25

  const exRow = ws.addRow(tmpl.example)
  exRow.eachCell(cell => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF0F4F8' } }
    cell.font = { italic: true, color: { argb: 'FF888888' } }
  })

  ws.columns.forEach((col, i) => {
    col.width = Math.max(tmpl.headers[i]?.length ?? 10, tmpl.example[i]?.length ?? 10) + 4
  })

  ws.addRow([])
  const noteRow = ws.addRow(["* Champs obligatoires. Supprimez la ligne exemple avant d'importer."])
  noteRow.getCell(1).font = { italic: true, color: { argb: 'FFEF4444' } }

  return wb.xlsx.writeBuffer() as unknown as Promise<Buffer>
}
