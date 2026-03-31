"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.migration_003_production = migration_003_production;
function migration_003_production(db) {
    db.exec(`
    -- ==========================================
    -- BOM TEMPLATES (Bill of Materials)
    -- ==========================================
    CREATE TABLE IF NOT EXISTS bom_templates (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id INTEGER NOT NULL REFERENCES products(id),
      name       TEXT NOT NULL,
      is_default INTEGER DEFAULT 0,
      labor_cost REAL DEFAULT 0,
      notes      TEXT,
      is_deleted INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS bom_lines (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      bom_id      INTEGER NOT NULL REFERENCES bom_templates(id) ON DELETE CASCADE,
      material_id INTEGER NOT NULL REFERENCES products(id),
      quantity    REAL NOT NULL,
      unit        TEXT,
      notes       TEXT
    );

    -- ==========================================
    -- PRODUCTION ORDERS
    -- ==========================================
    CREATE TABLE IF NOT EXISTS production_orders (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id   INTEGER NOT NULL REFERENCES products(id),
      bom_id       INTEGER REFERENCES bom_templates(id),
      bom_snapshot TEXT, -- JSON snapshot of BOM at time of production
      quantity     REAL NOT NULL,
      date         TEXT NOT NULL,
      status       TEXT DEFAULT 'draft', -- 'draft'|'confirmed'|'cancelled'
      unit_cost    REAL DEFAULT 0,
      total_cost   REAL DEFAULT 0,
      notes        TEXT,
      is_deleted   INTEGER DEFAULT 0,
      created_by   INTEGER REFERENCES users(id),
      created_at   DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at   DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- ==========================================
    -- TRANSFORMATIONS (Aluminium)
    -- ==========================================
    CREATE TABLE IF NOT EXISTS transformations (
      id               INTEGER PRIMARY KEY AUTOINCREMENT,
      raw_material_id  INTEGER NOT NULL REFERENCES products(id),
      input_quantity   REAL NOT NULL,
      cost_per_unit    REAL DEFAULT 0,
      total_cost       REAL DEFAULT 0,
      date             TEXT NOT NULL,
      status           TEXT DEFAULT 'draft',
      notes            TEXT,
      created_by       INTEGER REFERENCES users(id),
      created_at       DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at       DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS transformation_outputs (
      id                INTEGER PRIMARY KEY AUTOINCREMENT,
      transformation_id INTEGER NOT NULL REFERENCES transformations(id) ON DELETE CASCADE,
      product_id        INTEGER NOT NULL REFERENCES products(id),
      quantity          REAL NOT NULL,
      allocated_cost    REAL DEFAULT 0
    );

    -- ==========================================
    -- INDEXES
    -- ==========================================
    CREATE INDEX IF NOT EXISTS idx_bom_product      ON bom_templates(product_id);
    CREATE INDEX IF NOT EXISTS idx_bom_lines_bom    ON bom_lines(bom_id);
    CREATE INDEX IF NOT EXISTS idx_production_product ON production_orders(product_id);
    CREATE INDEX IF NOT EXISTS idx_transform_material ON transformations(raw_material_id);
  `);
}
