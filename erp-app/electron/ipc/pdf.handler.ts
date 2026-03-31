import { handle } from './index'
import { BrowserWindow, dialog } from 'electron'
import { getInvoiceDataForPdf, generateInvoiceHtml } from '../services/pdf.service'
import { writeFileSync } from 'fs'

export function registerPdfHandlers(): void {
  // Retourner le HTML pour prévisualisation dans le renderer
  handle('pdf:getHtml', (documentId: number) => {
    const pdfData = getInvoiceDataForPdf(documentId)
    return { html: generateInvoiceHtml(pdfData), number: pdfData.document?.number ?? 'document' }
  })

  // Générer et sauvegarder le PDF avec dialog
  handle('pdf:generate', async (data: { documentId: number }) => {
    const pdfData = getInvoiceDataForPdf(data.documentId)
    const html = generateInvoiceHtml(pdfData)

    const win = BrowserWindow.getFocusedWindow() ?? BrowserWindow.getAllWindows()[0]

    // Demander où sauvegarder
    const defaultName = `${pdfData.document?.number ?? 'document'}.pdf`
    const result = await dialog.showSaveDialog(win, {
      title: 'Enregistrer le PDF',
      defaultPath: defaultName,
      filters: [{ name: 'PDF', extensions: ['pdf'] }],
    })
    win?.focus()
    if (result.canceled || !result.filePath) return { success: false, canceled: true }

    const pdfWin = new BrowserWindow({
      show: false,
      webPreferences: { nodeIntegration: false, contextIsolation: true },
    })

    try {
      await pdfWin.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`)
      const pdfBuffer = await pdfWin.webContents.printToPDF({
        printBackground: true,
        pageSize: 'A4',
        margins: { top: 0, bottom: 0, left: 0, right: 0 },
      })
      writeFileSync(result.filePath, pdfBuffer)
      return { success: true, path: result.filePath }
    } finally {
      if (!pdfWin.isDestroyed()) pdfWin.close()
    }
  })
}
