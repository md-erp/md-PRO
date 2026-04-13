import { handle } from './index'
import { getDb } from '../database/connection'
import { checkLocalUpdate, installLocalUpdate } from '../services/updater.service'
import { dialog } from 'electron'

export function registerSettingsHandlers(): void {
  handle('settings:get', (key?: string) => {
    const db = getDb()
    if (key) {
      const row = db.prepare('SELECT value FROM app_settings WHERE key = ?').get(key) as any
      return row?.value ?? null
    }
    const rows = db.prepare('SELECT key, value FROM app_settings').all() as any[]
    return Object.fromEntries(rows.map(r => [r.key, r.value]))
  })

  handle('settings:set', ({ key, value }: { key: string; value: string }) => {
    const PROTECTED_KEYS = ['api_key']
    if (PROTECTED_KEYS.includes(key)) {
      throw new Error('Action non autorisée: modification des clés système restreintes.');
    }
    const db = getDb()
    db.prepare(`
      INSERT INTO app_settings (key, value, updated_at)
      VALUES (?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(key) DO UPDATE SET value = ?, updated_at = CURRENT_TIMESTAMP
    `).run(key, value, value)
    return { success: true }
  })

  handle('settings:setMany', (settings: Record<string, string>) => {
    const PROTECTED_KEYS = ['api_key']
    const db = getDb()
    const tx = db.transaction(() => {
      for (const [key, value] of Object.entries(settings)) {
        if (PROTECTED_KEYS.includes(key)) continue // Ignore silently protected keys
        db.prepare(`
          INSERT INTO app_settings (key, value, updated_at)
          VALUES (?, ?, CURRENT_TIMESTAMP)
          ON CONFLICT(key) DO UPDATE SET value = ?, updated_at = CURRENT_TIMESTAMP
        `).run(key, value, value)
      }
    })
    tx()
    return { success: true }
  })

  // تحديث محلي مباشر
  handle('update:selectLocalFile', async () => {
    const result = await dialog.showOpenDialog({
      title: 'Sélectionner le fichier de mise à jour',
      filters: [
        { name: 'Installateurs', extensions: ['exe', 'msi', 'dmg', 'appimage'] }
      ],
      properties: ['openFile']
    })

    if (result.canceled || result.filePaths.length === 0) {
      return { success: false, error: 'Aucun fichier sélectionné' }
    }

    const filePath = result.filePaths[0]
    const checkResult = checkLocalUpdate(filePath)
    
    if (!checkResult.success) {
      return checkResult
    }

    return { success: true, filePath, version: checkResult.version, fileSize: checkResult.fileSize }
  })

  handle('update:installLocal', ({ filePath }: { filePath: string }) => {
    return installLocalUpdate(filePath)
  })
}
