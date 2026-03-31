import express from 'express'
import { Server } from 'http'
import { getDb } from '../database/connection'

let server: Server | null = null

export function startApiServer(port: number): void {
  const app = express()
  app.use(express.json())

  // Middleware: التحقق من الـ API key البسيط
  app.use((req, res, next) => {
    const key = req.headers['x-api-key']
    if (!key) { res.status(401).json({ error: 'Unauthorized' }); return }
    next()
  })

  // Health check
  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() })
  })

  // Sync endpoint — يُرجع آخر التغييرات
  app.get('/sync', (req, res) => {
    const db = getDb()
    const since = req.query.since as string ?? '1970-01-01'

    const tables = ['clients', 'suppliers', 'products', 'documents', 'payments']
    const changes: Record<string, any[]> = {}

    for (const table of tables) {
      try {
        changes[table] = db.prepare(
          `SELECT * FROM ${table} WHERE updated_at > ?`
        ).all(since) as any[]
      } catch {
        changes[table] = []
      }
    }

    res.json({ changes, timestamp: new Date().toISOString() })
  })

  server = app.listen(port, '0.0.0.0', () => {
    console.log(`[API] Server running on port ${port}`)
  })
}

export function stopApiServer(): void {
  server?.close()
  server = null
}
