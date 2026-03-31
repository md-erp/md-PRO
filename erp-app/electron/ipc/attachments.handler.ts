import { handle } from './index'
import { dialog, app, BrowserWindow } from 'electron'
import { join, basename, extname } from 'path'
import { copyFileSync, mkdirSync, readdirSync, statSync, unlinkSync, existsSync } from 'fs'

function getAttachmentsDir(entityType: string, entityId: number): string {
  const dir = join(app.getPath('userData'), 'attachments', entityType, String(entityId))
  mkdirSync(dir, { recursive: true })
  return dir
}

export function registerAttachmentsHandlers(): void {
  // Sélectionner et attacher un fichier
  handle('attachments:add', async (data: { entityType: string; entityId: number }) => {
    const win = BrowserWindow.getFocusedWindow() ?? BrowserWindow.getAllWindows()[0]
    const result = await dialog.showOpenDialog(win, {
      title: 'Joindre un document',
      filters: [
        { name: 'Documents', extensions: ['pdf', 'jpg', 'jpeg', 'png', 'xlsx', 'xls', 'doc', 'docx'] },
        { name: 'Tous les fichiers', extensions: ['*'] },
      ],
      properties: ['openFile', 'multiSelections'],
    })
    win?.focus()
    if (result.canceled || result.filePaths.length === 0) return []

    const dir = getAttachmentsDir(data.entityType, data.entityId)
    const attached: string[] = []

    for (const srcPath of result.filePaths) {
      const fileName = `${Date.now()}_${basename(srcPath)}`
      const destPath = join(dir, fileName)
      copyFileSync(srcPath, destPath)
      attached.push(fileName)
    }

    return attached
  })

  // Lister les pièces jointes
  handle('attachments:list', (data: { entityType: string; entityId: number }) => {
    const dir = getAttachmentsDir(data.entityType, data.entityId)
    try {
      return readdirSync(dir)
        .filter(f => !f.startsWith('.'))
        .map(f => ({
          name: f,
          originalName: f.replace(/^\d+_/, ''), // enlever le timestamp
          path: join(dir, f),
          size: statSync(join(dir, f)).size,
          ext: extname(f).toLowerCase().replace('.', ''),
          date: statSync(join(dir, f)).mtime,
        }))
        .sort((a, b) => b.date.getTime() - a.date.getTime())
    } catch {
      return []
    }
  })

  // Ouvrir un fichier joint
  handle('attachments:open', async (filePath: string) => {
    const { shell } = await import('electron')
    await shell.openPath(filePath)
    return { success: true }
  })

  // Supprimer une pièce jointe
  handle('attachments:delete', (filePath: string) => {
    if (existsSync(filePath)) unlinkSync(filePath)
    return { success: true }
  })
}
