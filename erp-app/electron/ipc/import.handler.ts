import { handle } from './index'
import { dialog, app, BrowserWindow } from 'electron'
import { join } from 'path'
import { writeFileSync } from 'fs'
import { importClients, importSuppliers, importProducts, generateImportTemplate } from '../services/import.service'

export function registerImportHandlers(): void {
  // Ouvrir dialogue de sélection de fichier
  handle('import:selectFile', async () => {
    const win = BrowserWindow.getFocusedWindow() ?? BrowserWindow.getAllWindows()[0]
    const result = await dialog.showOpenDialog(win, {
      title: 'Sélectionner un fichier',
      filters: [
        { name: 'Excel & CSV', extensions: ['xlsx', 'xls', 'csv'] },
        { name: 'Excel', extensions: ['xlsx', 'xls'] },
        { name: 'CSV', extensions: ['csv'] },
      ],
      properties: ['openFile'],
    })
    win?.focus()
    if (result.canceled || result.filePaths.length === 0) return null
    return result.filePaths[0]
  })

  // Import clients
  handle('import:clients', async (data: { filePath: string; userId?: number }) => {
    return importClients(data.filePath, data.userId ?? 1)
  })

  // Import fournisseurs
  handle('import:suppliers', async (data: { filePath: string; userId?: number }) => {
    return importSuppliers(data.filePath, data.userId ?? 1)
  })

  // Import produits
  handle('import:products', async (data: { filePath: string; userId?: number }) => {
    return importProducts(data.filePath, data.userId ?? 1)
  })

  // Télécharger template
  handle('import:downloadTemplate', async (type: 'clients' | 'suppliers' | 'products') => {
    const buffer = await generateImportTemplate(type)
    const fileName = `template-import-${type}.xlsx`
    const filePath = join(app.getPath('downloads'), fileName)
    writeFileSync(filePath, buffer)
    return { path: filePath }
  })
}
