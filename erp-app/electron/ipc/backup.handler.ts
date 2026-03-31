import { handle } from './index'
import { app } from 'electron'
import { join } from 'path'
import { copyFileSync, readdirSync, statSync, unlinkSync } from 'fs'
import { mkdirSync } from 'fs'

export function registerBackupHandlers(): void {
  handle('backup:create', () => {
    const userData = app.getPath('userData')
    const backupDir = join(userData, 'backups')
    mkdirSync(backupDir, { recursive: true })

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const backupPath = join(backupDir, `erp-backup-${timestamp}.db`)

    copyFileSync(join(userData, 'erp.db'), backupPath)

    // الاحتفاظ بآخر 30 نسخة فقط
    const backups = readdirSync(backupDir)
      .filter(f => f.endsWith('.db'))
      .map(f => ({ name: f, time: statSync(join(backupDir, f)).mtime.getTime() }))
      .sort((a, b) => b.time - a.time)

    if (backups.length > 30) {
      backups.slice(30).forEach(b => unlinkSync(join(backupDir, b.name)))
    }

    return { path: backupPath, timestamp }
  })

  handle('backup:list', () => {
    const backupDir = join(app.getPath('userData'), 'backups')
    try {
      return readdirSync(backupDir)
        .filter(f => f.endsWith('.db'))
        .map(f => ({
          name: f,
          path: join(backupDir, f),
          size: statSync(join(backupDir, f)).size,
          date: statSync(join(backupDir, f)).mtime,
        }))
        .sort((a, b) => b.date.getTime() - a.date.getTime())
    } catch {
      return []
    }
  })

  handle('backup:restore', (backupPath: string) => {
    const userData = app.getPath('userData')
    const dbPath = join(userData, 'erp.db')
    // نسخ احتياطي قبل الاستعادة
    const safetyPath = join(userData, `erp-before-restore-${Date.now()}.db`)
    copyFileSync(dbPath, safetyPath)
    copyFileSync(backupPath, dbPath)
    return { success: true, safetyBackup: safetyPath }
  })
}
