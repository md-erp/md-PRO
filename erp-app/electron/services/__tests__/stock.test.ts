import Database from 'better-sqlite3'
import { migration_001_initial } from '../../database/migrations/001_initial'
import { createStockMovement, applyMovement } from '../stock.service'

function createTestDb() {
  const db = new Database(':memory:')
  db.pragma('foreign_keys = ON')
  migration_001_initial(db)

  // Produit de test
  db.prepare(`INSERT INTO products (id, code, name, unit, type, stock_quantity, cmup_price, tva_rate_id)
    VALUES (1, 'TEST001', 'Produit Test', 'kg', 'raw', 100, 50, 5)`).run()

  // User de test
  db.prepare(`INSERT INTO users (id, name, email, password_hash, role)
    VALUES (1, 'Admin', 'admin@test.ma', 'hash', 'admin')`).run()

  return db
}

describe('Stock Service', () => {
  it('calcule le CMUP correctement à l\'entrée', () => {
    const db = createTestDb()

    // Stock initial: 100 unités à 50 MAD
    // Nouvelle entrée: 50 unités à 80 MAD
    // CMUP attendu: (100×50 + 50×80) / 150 = 60 MAD

    const movId = createStockMovement(db, {
      product_id: 1,
      type: 'in',
      quantity: 50,
      unit_cost: 80,
      date: '2026-01-15',
      applied: false,
      created_by: 1,
    })

    applyMovement(db, movId, 1)

    const product = db.prepare('SELECT * FROM products WHERE id = 1').get() as any
    expect(product.stock_quantity).toBe(150)
    expect(product.cmup_price).toBeCloseTo(60, 2)
  })

  it('refuse une sortie si stock insuffisant', () => {
    const db = createTestDb()

    const movId = createStockMovement(db, {
      product_id: 1,
      type: 'out',
      quantity: 200, // plus que le stock disponible (100)
      date: '2026-01-15',
      applied: false,
      created_by: 1,
    })

    expect(() => applyMovement(db, movId, 1)).toThrow('Stock insuffisant')
  })

  it('ne change pas le CMUP à la sortie', () => {
    const db = createTestDb()

    const movId = createStockMovement(db, {
      product_id: 1,
      type: 'out',
      quantity: 30,
      date: '2026-01-15',
      applied: false,
      created_by: 1,
    })

    applyMovement(db, movId, 1)

    const product = db.prepare('SELECT * FROM products WHERE id = 1').get() as any
    expect(product.stock_quantity).toBe(70)
    expect(product.cmup_price).toBe(50) // CMUP inchangé
  })
})
