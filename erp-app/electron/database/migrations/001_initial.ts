import Database from 'better-sqlite3'

export function migration_001_initial(db: Database.Database): void {
  db.exec(`
    -- ==========================================
    -- CONFIGURATION & LICENSE
    -- ==========================================
    CREATE TABLE IF NOT EXISTS device_config (
      id           INTEGER PRIMARY KEY,
      company_name TEXT,
      company_ice  TEXT,
      company_if   TEXT,
      company_rc   TEXT,
      company_address TEXT,
      company_phone TEXT,
      company_logo TEXT,
      mode         TEXT DEFAULT 'standalone', -- 'standalone' | 'master' | 'client'
      server_ip    TEXT,
      server_port  INTEGER DEFAULT 3000,
      currency     TEXT DEFAULT 'MAD',
      setup_done   INTEGER DEFAULT 0,
      created_at   DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS license (
      id            INTEGER PRIMARY KEY,
      company_name  TEXT NOT NULL,
      license_key   TEXT NOT NULL,
      expiry_date   TEXT NOT NULL,
      machine_id    TEXT NOT NULL,
      activated_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
      is_active     INTEGER DEFAULT 1
    );

    -- ==========================================
    -- USERS & PERMISSIONS
    -- ==========================================
    CREATE TABLE IF NOT EXISTS users (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      name          TEXT NOT NULL,
      email         TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      role          TEXT NOT NULL DEFAULT 'sales',
      is_active     INTEGER DEFAULT 1,
      last_login    DATETIME,
      created_at    DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at    DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS permissions (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      page       TEXT NOT NULL,
      can_read   INTEGER DEFAULT 1,
      can_create INTEGER DEFAULT 0,
      can_edit   INTEGER DEFAULT 0,
      can_delete INTEGER DEFAULT 0,
      can_export INTEGER DEFAULT 0,
      UNIQUE(user_id, page)
    );

    -- ==========================================
    -- CLIENTS & SUPPLIERS
    -- ==========================================
    CREATE TABLE IF NOT EXISTS clients (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      name         TEXT NOT NULL,
      address      TEXT,
      email        TEXT,
      phone        TEXT,
      ice          TEXT,
      if_number    TEXT,
      rc           TEXT,
      credit_limit REAL DEFAULT 0,
      notes        TEXT,
      is_deleted   INTEGER DEFAULT 0,
      created_by   INTEGER REFERENCES users(id),
      created_at   DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at   DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS suppliers (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      name       TEXT NOT NULL,
      address    TEXT,
      email      TEXT,
      phone      TEXT,
      ice        TEXT,
      if_number  TEXT,
      rc         TEXT,
      notes      TEXT,
      is_deleted INTEGER DEFAULT 0,
      created_by INTEGER REFERENCES users(id),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- ==========================================
    -- TVA RATES
    -- ==========================================
    CREATE TABLE IF NOT EXISTS tva_rates (
      id                   INTEGER PRIMARY KEY AUTOINCREMENT,
      rate                 REAL NOT NULL,
      label                TEXT NOT NULL,
      account_facturee_id  INTEGER,
      account_recuperable_id INTEGER,
      is_active            INTEGER DEFAULT 1
    );

    -- ==========================================
    -- PRODUCTS & STOCK
    -- ==========================================
    CREATE TABLE IF NOT EXISTS products (
      id             INTEGER PRIMARY KEY AUTOINCREMENT,
      code           TEXT NOT NULL UNIQUE,
      name           TEXT NOT NULL,
      unit           TEXT NOT NULL DEFAULT 'unité',
      type           TEXT NOT NULL DEFAULT 'finished', -- 'raw' | 'finished' | 'semi_finished'
      min_stock      REAL DEFAULT 0,
      sale_price     REAL DEFAULT 0,
      tva_rate_id    INTEGER REFERENCES tva_rates(id),
      cmup_price     REAL DEFAULT 0,
      stock_quantity REAL DEFAULT 0,
      supplier_id    INTEGER REFERENCES suppliers(id),
      notes          TEXT,
      is_deleted     INTEGER DEFAULT 0,
      created_by     INTEGER REFERENCES users(id),
      created_at     DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at     DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS stock_movements (
      id                INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id        INTEGER NOT NULL REFERENCES products(id),
      type              TEXT NOT NULL, -- 'in' | 'out'
      quantity          REAL NOT NULL,
      unit_cost         REAL DEFAULT 0,
      cmup_before       REAL DEFAULT 0,
      cmup_after        REAL DEFAULT 0,
      applied           INTEGER DEFAULT 0,
      applied_at        DATETIME,
      applied_by        INTEGER REFERENCES users(id),
      -- مرجع المستند (واحد فقط غير NULL)
      document_id       INTEGER REFERENCES documents(id),
      production_id     INTEGER,
      transformation_id INTEGER,
      manual_ref        TEXT,
      date              TEXT NOT NULL,
      notes             TEXT,
      created_by        INTEGER REFERENCES users(id),
      created_at        DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- ==========================================
    -- DOCUMENT SEQUENCES (ترقيم تلقائي)
    -- ==========================================
    CREATE TABLE IF NOT EXISTS document_sequences (
      doc_type TEXT NOT NULL,
      year     INTEGER NOT NULL,
      last_seq INTEGER DEFAULT 0,
      PRIMARY KEY (doc_type, year)
    );

    -- ==========================================
    -- DOCUMENTS (Table Inheritance)
    -- ==========================================
    CREATE TABLE IF NOT EXISTS documents (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      type        TEXT NOT NULL,
      number      TEXT NOT NULL UNIQUE,
      date        TEXT NOT NULL,
      party_id    INTEGER,
      party_type  TEXT, -- 'client' | 'supplier'
      status      TEXT NOT NULL DEFAULT 'draft',
      total_ht    REAL DEFAULT 0,
      total_tva   REAL DEFAULT 0,
      total_ttc   REAL DEFAULT 0,
      notes       TEXT,
      is_deleted  INTEGER DEFAULT 0,
      created_by  INTEGER REFERENCES users(id),
      created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at  DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS document_lines (
      id               INTEGER PRIMARY KEY AUTOINCREMENT,
      document_id      INTEGER NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
      product_id       INTEGER REFERENCES products(id),
      description      TEXT,
      quantity         REAL NOT NULL DEFAULT 1,
      unit_price       REAL NOT NULL DEFAULT 0,
      discount         REAL DEFAULT 0,
      tva_rate         REAL DEFAULT 20,
      total_ht         REAL DEFAULT 0,
      total_tva        REAL DEFAULT 0,
      total_ttc        REAL DEFAULT 0,
      original_line_id INTEGER REFERENCES document_lines(id)
    );

    CREATE TABLE IF NOT EXISTS document_links (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      parent_id  INTEGER NOT NULL REFERENCES documents(id),
      child_id   INTEGER NOT NULL REFERENCES documents(id),
      link_type  TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(child_id)
    );

    -- جداول فرعية للمستندات
    CREATE TABLE IF NOT EXISTS doc_invoices (
      document_id    INTEGER PRIMARY KEY REFERENCES documents(id),
      currency       TEXT DEFAULT 'MAD',
      exchange_rate  REAL DEFAULT 1,
      payment_method TEXT,
      due_date       TEXT,
      payment_status TEXT DEFAULT 'unpaid' -- 'unpaid'|'partial'|'paid'
    );

    CREATE TABLE IF NOT EXISTS doc_quotes (
      document_id  INTEGER PRIMARY KEY REFERENCES documents(id),
      validity_date TEXT,
      probability  INTEGER DEFAULT 50
    );

    CREATE TABLE IF NOT EXISTS doc_bons_livraison (
      document_id      INTEGER PRIMARY KEY REFERENCES documents(id),
      delivery_address TEXT,
      delivery_date    TEXT,
      stock_applied    INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS doc_bons_reception (
      document_id       INTEGER PRIMARY KEY REFERENCES documents(id),
      reception_date    TEXT,
      stock_applied     INTEGER DEFAULT 0,
      purchase_order_id INTEGER REFERENCES documents(id)
    );

    CREATE TABLE IF NOT EXISTS doc_proformas (
      document_id   INTEGER PRIMARY KEY REFERENCES documents(id),
      validity_date TEXT,
      incoterm      TEXT,
      currency      TEXT DEFAULT 'MAD',
      exchange_rate REAL DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS doc_avoirs (
      document_id   INTEGER PRIMARY KEY REFERENCES documents(id),
      avoir_type    TEXT NOT NULL, -- 'retour'|'commercial'|'annulation'
      affects_stock INTEGER DEFAULT 0,
      reason        TEXT
    );

    CREATE TABLE IF NOT EXISTS doc_purchase_invoices (
      document_id    INTEGER PRIMARY KEY REFERENCES documents(id),
      payment_method TEXT,
      due_date       TEXT,
      payment_status TEXT DEFAULT 'unpaid'
    );

    CREATE TABLE IF NOT EXISTS doc_import_invoices (
      document_id    INTEGER PRIMARY KEY REFERENCES documents(id),
      currency       TEXT NOT NULL,
      exchange_rate  REAL NOT NULL DEFAULT 1,
      invoice_amount REAL DEFAULT 0,
      customs        REAL DEFAULT 0,
      transitaire    REAL DEFAULT 0,
      tva_import     REAL DEFAULT 0,
      other_costs    REAL DEFAULT 0,
      total_cost     REAL DEFAULT 0,
      payment_method TEXT,
      due_date       TEXT,
      payment_status TEXT DEFAULT 'unpaid'
    );

    -- ==========================================
    -- PAYMENTS
    -- ==========================================
    CREATE TABLE IF NOT EXISTS payments (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      party_id      INTEGER NOT NULL,
      party_type    TEXT NOT NULL,
      amount        REAL NOT NULL,
      method        TEXT NOT NULL, -- 'cash'|'bank'|'cheque'|'lcn'
      date          TEXT NOT NULL,
      due_date      TEXT,
      cheque_number TEXT,
      bank          TEXT,
      status        TEXT DEFAULT 'pending', -- 'pending'|'collected'|'rejected'
      document_id   INTEGER REFERENCES documents(id),
      notes         TEXT,
      created_by    INTEGER REFERENCES users(id),
      created_at    DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at    DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS payment_allocations (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      payment_id  INTEGER NOT NULL REFERENCES payments(id),
      document_id INTEGER NOT NULL REFERENCES documents(id),
      amount      REAL NOT NULL
    );

    -- ==========================================
    -- AUDIT LOG
    -- ==========================================
    CREATE TABLE IF NOT EXISTS audit_log (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id    INTEGER REFERENCES users(id),
      action     TEXT NOT NULL,
      table_name TEXT NOT NULL,
      record_id  INTEGER,
      old_values TEXT, -- JSON
      new_values TEXT, -- JSON
      reason     TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- ==========================================
    -- INDEXES
    -- ==========================================
    CREATE INDEX IF NOT EXISTS idx_documents_type       ON documents(type);
    CREATE INDEX IF NOT EXISTS idx_documents_party      ON documents(party_id, party_type);
    CREATE INDEX IF NOT EXISTS idx_documents_date       ON documents(date);
    CREATE INDEX IF NOT EXISTS idx_documents_number     ON documents(number);
    CREATE INDEX IF NOT EXISTS idx_documents_status     ON documents(status);
    CREATE INDEX IF NOT EXISTS idx_doc_lines_document   ON document_lines(document_id);
    CREATE INDEX IF NOT EXISTS idx_stock_product        ON stock_movements(product_id);
    CREATE INDEX IF NOT EXISTS idx_stock_applied        ON stock_movements(applied);
    CREATE INDEX IF NOT EXISTS idx_payments_party       ON payments(party_id, party_type);
    CREATE INDEX IF NOT EXISTS idx_payments_document    ON payments(document_id);
    CREATE INDEX IF NOT EXISTS idx_products_code        ON products(code);
    CREATE INDEX IF NOT EXISTS idx_products_type        ON products(type);
  `)

  // بيانات TVA الافتراضية
  db.exec(`
    INSERT OR IGNORE INTO tva_rates (id, rate, label, is_active) VALUES
      (1, 0,  'Exonéré (0%)',  1),
      (2, 7,  'TVA 7%',        1),
      (3, 10, 'TVA 10%',       1),
      (4, 14, 'TVA 14%',       1),
      (5, 20, 'TVA 20%',       1);
  `)
}
