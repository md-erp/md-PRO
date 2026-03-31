import { app, BrowserWindow, ipcMain } from 'electron'
import { join } from 'path'
import { initDatabase } from './database/connection'
import { registerAllHandlers } from './ipc'
import { startApiServer, stopApiServer } from './api/server'
import { getDeviceConfig } from './services/config.service'
import { copyFileSync, mkdirSync } from 'fs'

let mainWindow: BrowserWindow | null = null

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1200,
    minHeight: 700,
    webPreferences: {
      preload: join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    titleBarStyle: 'hiddenInset',
    show: false,
  })

  // في وضع التطوير نفتح Vite dev server
  if (process.env.NODE_ENV === 'development') {
    // نجرب 5173 أولاً ثم 5174
    const port = process.env.VITE_PORT ?? '5173'
    mainWindow.loadURL(`http://localhost:${port}`)
    mainWindow.webContents.openDevTools()
  } else {
    mainWindow.loadFile(join(__dirname, '../dist/index.html'))
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow?.show()
  })

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

app.whenReady().then(async () => {
  // 1. تهيئة قاعدة البيانات
  initDatabase()

  // 2. تسجيل كل IPC handlers
  registerAllHandlers()

  // 3. تشغيل API server إذا كان الجهاز Master
  const config = getDeviceConfig()
  if (config?.mode === 'master') {
    startApiServer(config.server_port ?? 3000)
  }

  // 4. إنشاء النافذة
  createWindow()

  // 5. نسخ احتياطي تلقائي يومي
  scheduleAutoBackup()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  stopApiServer()
  if (process.platform !== 'darwin') app.quit()
})

function scheduleAutoBackup(): void {
  const INTERVAL = 24 * 60 * 60 * 1000 // كل 24 ساعة
  setInterval(() => {
    try {
      const userData  = app.getPath('userData')
      const backupDir = join(userData, 'backups')
      mkdirSync(backupDir, { recursive: true })
      const ts = new Date().toISOString().replace(/[:.]/g, '-')
      copyFileSync(join(userData, 'erp.db'), join(backupDir, `erp-auto-${ts}.db`))
      console.log('[Backup] Auto backup created')
    } catch (e) {
      console.error('[Backup] Auto backup failed:', e)
    }
  }, INTERVAL)
}
