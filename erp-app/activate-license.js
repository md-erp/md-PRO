const { app } = require('electron');
const path = require('path');
const crypto = require('crypto');

app.whenReady().then(() => {
  const Database = require('better-sqlite3');
  const { machineIdSync } = require('node-machine-id');
  const { runMigrations } = require('./dist-electron/database/migrations/index');

  const dbPath = path.join(app.getPath('userData'), 'erp.db');
  const db = new Database(dbPath);

  runMigrations(db);

  const SECRET = 'ERP_PRO_SECRET_2026_CHANGE_IN_PROD';
  const company = 'Demo Company';
  // ترخيص لمدة 10 دقائق
  const expiry = new Date(Date.now() + 10 * 60 * 1000).toISOString();

  const payload = Buffer.from(company + '|' + expiry).toString('base64');
  const sig = crypto.createHmac('sha256', SECRET).update(payload).digest('hex').substring(0, 16).toUpperCase();
  const key = payload + '.' + sig;

  // نستخدم نفس machine_id الذي يستخدمه التطبيق
  const machineId = machineIdSync(true);

  // تفعيل الترخيص
  db.prepare('DELETE FROM license').run();
  db.prepare('INSERT INTO license (company_name, license_key, expiry_date, machine_id, is_active) VALUES (?, ?, ?, ?, 1)')
    .run(company, key, expiry, machineId);

  // التحقق من setup_done
  const config = db.prepare('SELECT * FROM device_config WHERE id = 1').get();
  if (!config) {
    // إنشاء إعداد افتراضي مع setup_done = 1
    db.prepare(`INSERT INTO device_config (id, company_name, mode, currency, setup_done) VALUES (1, ?, 'standalone', 'MAD', 1)`)
      .run(company);
    console.log('[SETUP] Default config created');
  } else if (!config.setup_done) {
    db.prepare('UPDATE device_config SET setup_done = 1 WHERE id = 1').run();
    console.log('[SETUP] setup_done set to 1');
  } else {
    console.log('[SETUP] Config already done');
  }

  // التحقق من وجود admin
  const admin = db.prepare("SELECT * FROM users WHERE role = 'admin' LIMIT 1").get();
  if (!admin) {
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = crypto.createHash('sha256').update(salt + 'admin123').digest('hex');
    const passwordHash = salt + ':' + hash;
    const result = db.prepare(`INSERT INTO users (name, email, password_hash, role, is_active) VALUES (?, ?, ?, 'admin', 1)`)
      .run('Administrateur', 'admin@erp.local', passwordHash);
    const userId = result.lastInsertRowid;
    // إضافة صلاحيات كاملة
    const pages = ['rapports', 'documents', 'paiements', 'parties', 'stock', 'achats', 'production', 'comptabilite', 'parametres'];
    for (const page of pages) {
      db.prepare('INSERT OR IGNORE INTO user_permissions (user_id, page) VALUES (?, ?)').run(userId, page);
    }
    console.log('[AUTH] Admin created: admin@erp.local / admin123');
  } else {
    console.log('[AUTH] Admin already exists:', admin.email);
  }

  const row = db.prepare('SELECT * FROM license').get();
  console.log('[LICENSE] Activated!');
  console.log('[LICENSE] Company:', row.company_name);
  console.log('[LICENSE] Expiry:', row.expiry_date);
  console.log('[LICENSE] Machine:', row.machine_id);
  console.log('[LICENSE] Stored machine:', machineId);
  console.log('[LICENSE] Match:', row.machine_id === machineId);

  db.close();
  app.quit();
});
