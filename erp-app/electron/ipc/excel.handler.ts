import { handle } from './index'
import { dialog, BrowserWindow } from 'electron'
import { exportDocuments, exportParties, exportStock, exportBalance, exportReportData, exportMultipleReports } from '../services/excel.service'

async function chooseExportPath(defaultName: string): Promise<string | null> {
  const win = BrowserWindow.getFocusedWindow() ?? BrowserWindow.getAllWindows()[0]
  const result = await dialog.showSaveDialog(win, {
    title: 'Enregistrer le fichier Excel',
    defaultPath: defaultName,
    filters: [{ name: 'Excel', extensions: ['xlsx'] }],
  })
  // Redonner le focus à la fenêtre principale après le dialog
  win?.focus()
  if (result.canceled || !result.filePath) return null
  return result.filePath
}

export function registerExcelHandlers(): void {
  handle('excel:exportDocuments', async (filters: any) => {
    const path = await chooseExportPath(`documents-${filters.type ?? 'export'}.xlsx`)
    if (!path) return null
    return exportDocuments(filters, path)
  })
  handle('excel:exportParties', async (type: any) => {
    const path = await chooseExportPath(`${type}.xlsx`)
    if (!path) return null
    return exportParties(type, path)
  })
  handle('excel:exportStock', async () => {
    const path = await chooseExportPath('inventaire-stock.xlsx')
    if (!path) return null
    return exportStock(path)
  })
  handle('excel:exportBalance', async (filters: any) => {
    const path = await chooseExportPath('balance-comptable.xlsx')
    if (!path) return null
    return exportBalance(filters, path)
  })
  handle('excel:exportReport', async (data: any) => {
    const path = await chooseExportPath(`rapport-${data.type}.xlsx`)
    if (!path) return null
    return exportReportData(data.type, data.rows, data.filters ?? {}, path)
  })

  // Export multiple rapports dans un seul fichier Excel (onglets séparés)
  handle('excel:exportMultiple', async (data: { reports: Array<{ type: string; label: string; rows: any[] }> }) => {
    const win = BrowserWindow.getFocusedWindow() ?? BrowserWindow.getAllWindows()[0]
    const result = await dialog.showSaveDialog(win, {
      title: 'Enregistrer les rapports groupés',
      defaultPath: `rapports-${new Date().toISOString().split('T')[0]}.xlsx`,
      filters: [{ name: 'Excel', extensions: ['xlsx'] }],
    })
    win?.focus()
    if (result.canceled || !result.filePath) return null
    return exportMultipleReports(data.reports, result.filePath)
  })
}
