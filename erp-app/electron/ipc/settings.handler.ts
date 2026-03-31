import { handle } from './index'
import { getDb } from '../database/connection'

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
    const db = getDb()
    db.prepare(`
      INSERT INTO app_settings (key, value, updated_at)
      VALUES (?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(key) DO UPDATE SET value = ?, updated_at = CURRENT_TIMESTAMP
    `).run(key, value, value)
    return { success: true }
  })

  handle('settings:setMany', (settings: Record<string, string>) => {
    const db = getDb()
    const tx = db.transaction(() => {
      for (const [key, value] of Object.entries(settings)) {
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
}
