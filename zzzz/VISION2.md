# VISION2.md — نظام ERP محاسبي متكامل
### النسخة الثانية المحسّنة — بالتعاون بين كيرو و DeepSeek

---

## 1. نظرة عامة وأهداف

تطبيق Desktop على Windows مبني بـ Electron + React + TypeScript.
يعمل بدون إنترنت بشكل كامل.

**سيناريوان فقط، واضحان:**
```
السيناريو 1: جهاز واحد
  → SQLite محلي على الجهاز، يعمل مباشرة بدون أي إعداد شبكة

السيناريو 2: أجهزة متعددة + شبكة محلية (LAN)
  → جهاز رئيسي واحد (Master) يحتوي PostgreSQL
  → باقي الأجهزة تتصل به عبر Express API
  → المزامنة فورية وتلقائية
```

**الأهداف الجوهرية:**
- تغطية 100% من العمليات اليومية لشركة صغيرة إلى متوسطة (مصنع/تجارة)
- أداء سلس مع آلاف الفواتير وآلاف العملاء دون تدهور
- محاسبة صحيحة من اليوم الأول — لا إعادة كتابة لاحقاً
- واجهة فرنسية احترافية مع بنية جاهزة لدعم العربية مستقبلاً
- بساطة التثبيت والاستخدام — لا تعقيد غير ضروري

---

## 2. القرارات التقنية المبررة (Architecture Decisions)


```
القرار                  الخيار المختار              السبب
─────────────────────────────────────────────────────────────────────
Framework Desktop       Electron                    توزيع سهل على Windows، وصول كامل لنظام الملفات
UI Framework            React + TypeScript          واجهة حديثة، مجتمع ضخم، أمان في الأنواع
Styling                 Tailwind CSS                سرعة في التطوير، Dark/Light Mode بسهولة
DB محلية                SQLite (better-sqlite3)     سريعة، لا تثبيت، تعمل بدون إنترنت
DB شبكة                 PostgreSQL                  تزامن حقيقي، أداء عالٍ مع تعدد المستخدمين
IPC                     Electron IPC                اتصال آمن بين Renderer و Main
HTTP API                Express.js                  للاتصال عبر الشبكة المحلية فقط
State Management        Zustand                     خفيف، بسيط، كافٍ للمشروع
Validation              Zod                         validation موحد في Main و Renderer معاً
PDF                     jsPDF + html2canvas         مرونة في التصميم، لا اعتماد على خادم
Excel                   ExcelJS                     تصدير/استيراد احترافي
i18n                    react-i18next               دعم FR/AR مع RTL/LTR تلقائي
Testing                 Jest + React Testing Library اختبار المنطق المحاسبي والواجهة
Migrations              better-sqlite3 + custom     إدارة تغييرات schema بأمان
Auto-Update             electron-updater            تحديث من مجلد شبكة أو خادم
```

---

## 3. نظام الترقيم التلقائي

صيغة بسيطة وواضحة، تسلسلية، مركزية من قاعدة البيانات:

```
F-{YEAR}-{SEQUENCE}

أمثلة:
  F-26-0001   ← أول فاتورة
  F-26-0002   ← ثانية
  BL-26-0001  ← بوليصة تسليم
  PO-26-0001  ← أمر شراء
  AV-26-0001  ← أمر إرجاع
```

- الرقم يُولَّد من قاعدة البيانات (atomic increment) — لا تكرار ممكن
- في السيناريو 1 (جهاز واحد): SQLite يضمن التسلسل
- في السيناريو 2 (شبكة): PostgreSQL يضمن التسلسل عبر كل الأجهزة

```sql
document_sequences (
  doc_type   TEXT PRIMARY KEY,  -- 'invoice' | 'bl' | 'quote' | ...
  year       INTEGER,
  last_seq   INTEGER DEFAULT 0
)
-- عند إنشاء مستند جديد:
-- UPDATE document_sequences SET last_seq = last_seq + 1
-- WHERE doc_type = ? AND year = ?
-- هذا atomic في SQLite و PostgreSQL معاً
```

---

## 4. التقنيات الكاملة

```
Frontend:    React 18 + TypeScript + Tailwind CSS
Desktop:     Electron 28+ (Windows)
DB Local:    SQLite via better-sqlite3
DB Server:   PostgreSQL 15+ (خادم الشبكة المحلية)
Backend:     Node.js + Express (HTTP API للشبكة فقط)
IPC:         Electron IPC (اتصال داخلي آمن)
State:       Zustand
Validation:  Zod (مشترك بين Main و Renderer)
PDF:         jsPDF + html2canvas
Excel:       ExcelJS
i18n:        react-i18next (FR أساسي، AR جاهز)
Testing:     Jest + React Testing Library
Migrations:  نظام migrations مخصص مع better-sqlite3
Updates:     electron-updater
Packaging:   electron-builder → .exe installer
```


---

## 5. الهيكل البصري للتطبيق

```
┌────────────────────────────────────────────────────────────────────┐
│    Documents  Parties  Stock  Achats  Production                   │
│  Comptabilité  Rapports  Paramètres          [🔔]  [👤 Admin ▼]    │  ← Navbar
├────────────────────────────────────────────────────────────────────┤
│  [Factures]  [Devis]  [Bons Livraison]  [Proforma]  [Avoirs]       │  ← تبويبات فرعية
├────────────────────────────────────────────────────────────────────┤
│                                                                    │
│   [+ Nouveau]  [🔍 Rechercher...]   [Filtres ▼]   [Export ▼]       │
│                                                                    │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ ☐  Numéro        Date      Client      Montant    Statut    │   │
│  │ ☐  F-26-0001  01/01     Client A    5,000 MAD  ✅ Payée  │   │
│  │ ☐  F-26-0002  02/01     Client B    3,200 MAD  ⏳ En att │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                    │
└────────────────────────────────────────────────────────────────────┘
```

- لا Sidebar. Navigation bar أفقية في الأعلى فقط.
- عند الضغط على تبويب رئيسي → تبويباته الفرعية تظهر في صف ثانٍ.
- شريط أدوات سياقي يظهر عند تحديد صفوف متعددة (Batch Operations).

---

## 6. صفحات التطبيق (7 تبويبات رئيسية)

### 6.1 المستندات التجارية
تبويبات فرعية: Factures | Devis | Bons de Livraison | Proforma | Avoirs

**سير العمل والحالات:**
```
Devis:      Brouillon → Envoyé → Accepté → [→ Facture] | Refusé
Proforma:   Brouillon → Envoyée → [→ Facture]
Facture:    Brouillon → Confirmée → [Partiellement payée] → Payée | Annulée
BL:         Brouillon → Confirmé → Livré
Avoir:      Brouillon → Confirmé → Appliqué
```

**حركة المخزون — قرار المستخدم:**

أي مستند يؤثر على المخزون (BL، Bon de Réception، Avoir retour) يعرض للمستخدم:
```
┌─────────────────────────────────────────────────────┐
│  Appliquer le mouvement de stock ?                  │
│                                                     │
│  Produit A : sortie de 50 unités (200 → 150)        │
│  Produit B : sortie de 20 unités (80 → 60)          │
│                                                     │
│      [Appliquer maintenant]      [Plus tard]        │
└─────────────────────────────────────────────────────┘
```

في تفاصيل كل مستند يظهر دائماً:
```
Mouvement stock : ✅ Appliqué le 15/01/2026 par Ahmed
              ou : ⏳ Non appliqué    [Appliquer maintenant]
```

المستخدم يستطيع تطبيق الحركة في أي وقت لاحقاً من تفاصيل المستند.

**ربط المستندات (Documents liés):**
```
Devis #D-2026-01-0012
    └── Proforma #P-2026-01-0005
            └── Facture #F-2026-01-0045
                    ├── BL #BL-2026-01-0031
                    └── Avoir #AV-2026-01-0003
```

**حقول الفاتورة:**
- رقم تلقائي: F-{YEAR}-{SEQ}
- التاريخ، العميل (Searchable Combobox بالاسم/ICE/كود)
- جدول المنتجات: Produit | Qté | Prix HT | Remise% | TVA | TTC
- العملة + سعر الصرف (MAD افتراضي، EUR/USD للفواتير الأجنبية)
- ملخص: Total HT | TVA | Remise | Total TTC
- طريقة الدفع: Espèces | Virement | Chèque | LCN
- ملاحظات، تصدير PDF

---

### 6.2 الأطراف (Clients & Fournisseurs)
تبويبات فرعية: Clients | Fournisseurs

**بطاقة العميل/المورد:**
- المعلومات: Nom | Adresse | Téléphone | Email | ICE | IF | RC
- تبويبات داخلية:
  - Documents liés (كل مستنداته)
  - Historique paiements (سجل المدفوعات)
  - Solde & Dettes (الرصيد والديون)
  - Chèques & LCN (مع تنبيه 7 أيام قبل الاستحقاق)
- استيراد/تصدير: Excel أو CSV

**إدارة المدفوعات:**
- ربط الدفعة بفاتورة محددة أو "sur compte" (دفع مسبق)
- دعم الدفع الجزئي مع تتبع الرصيد المتبقي
- تتبع الشيكات: رقم | البنك | تاريخ الاستحقاق | الحالة

---

### 6.3 المخزون والمنتجات
تبويبات فرعية: Matières Premières | Produits Finis | Transformation

**بطاقة المنتج:**
- Code | Désignation | Unité | Stock min | TVA | Méthode valorisation
- تبويبات داخلية: Stock actuel | Mouvements | Factures liées | Prix de revient

**التحويل (Transformation Aluminium):**
- إدخال: قضيب ألومنيوم (الطول × الكمية) + تكلفة التحويل/متر
- الناتج: منتجات مع توزيع التكلفة تلقائياً بالتناسب

**تقييم المخزون:** CMUP (Coût Moyen Unitaire Pondéré) — الطريقة المعتمدة في المحاسبة المغربية للشركات الصغيرة والمتوسطة. يُحسب تلقائياً عند كل دخول مخزون.

---

### 6.4 المشتريات
تبويبات فرعية: Achats Locaux | Importations

**المشتريات المحلية:**
```
Bon de Commande → Bon de Réception → [Stock?] → Facture Fournisseur → Paiement
```

**الاستيراد (Landed Cost):**
- فاتورة المورد الأجنبي (بالعملة + سعر الصرف → MAD)
- إضافة التكاليف: Douanes | Transitaire | TVA import | Autres
- توزيع التكلفة الإجمالية على كل منتج تلقائياً (بالتناسب مع القيمة أو الوزن)

---

### 6.5 الإنتاج
- Fiche de production: المنتج النهائي | الكمية | المواد المستخدمة | تكاليف العمالة
- BOM Templates: قوالب قابلة للحفظ وإعادة الاستخدام
- عند التأكيد: ينقص المواد الأولية ويضيف للمنتجات النهائية
- حساب سعر التكلفة تلقائياً

---

### 6.6 المحاسبة العامة
تبويبات فرعية: Plan Comptable | Saisies | Grand Livre | Balance | TVA

**Plan Comptable Général Marocain (CGNC) — الفئات الرسمية:**
```
Classe 1 : Comptes de financement permanent     (رأس المال، الديون طويلة الأمد)
Classe 2 : Comptes d'actif immobilisé           (الأصول الثابتة والإهلاك)
Classe 3 : Comptes d'actif circulant            (المخزون، العملاء، TVA récupérable)
Classe 4 : Comptes du passif circulant          (الموردون، TVA facturée، الدولة)
Classe 5 : Comptes de trésorerie                (البنك، الصندوق)
Classe 6 : Comptes de charges                   (المشتريات، الأعباء)
Classe 7 : Comptes de produits                  (المبيعات، النواتج)
```
ملاحظة: الفئات 8 و9 و0 موجودة في CGNC لكن لا تُستخدم في التطبيق اليومي لهذا النوع من الشركات.

**الحسابات الرئيسية المستخدمة في التطبيق (من CGNC الرسمي):**
```
3121  Matières premières (stock)
3151  Produits finis (stock)
3421  Clients
3455  État — TVA récupérable sur charges        ← TVA déductible على المشتريات
4411  Fournisseurs
4455  État — TVA facturée                       ← TVA collectée على المبيعات
4456  État — TVA due (suivant déclarations)
5141  Banques (solde débiteur)
5161  Caisses
6111  Achats de marchandises / matières
7111  Ventes de marchandises
7121  Ventes de biens produits (produits finis)
7131  Variation des stocks de produits en cours ← للإنتاج
4481  Dettes sur acquisitions (douanes, transitaire)
```

**القيود التلقائية — مبررة من CGNC:**
```
① تأكيد فاتورة بيع (Facture client confirmée):
   Débit:  3421  Clients                    = Montant TTC
   Crédit: 7111  Ventes de marchandises     = Montant HT
   Crédit: 4455  État — TVA facturée        = Montant TVA
   (إذا كانت منتجات مصنّعة: 7121 بدل 7111)

② تسجيل دفعة عميل (Règlement client):
   Débit:  5141  Banques   (أو 5161 Caisses حسب طريقة الدفع)
   Crédit: 3421  Clients                    = المبلغ المدفوع

③ تأكيد فاتورة شراء محلية (Facture fournisseur local):
   Débit:  6111  Achats de matières         = Montant HT
   Débit:  3455  État — TVA récupérable     = Montant TVA
   Crédit: 4411  Fournisseurs               = Montant TTC

④ Bon de Réception (استلام بضاعة مع تحديث المخزون):
   Débit:  3121  Matières premières (stock) = Montant HT
   Débit:  3455  État — TVA récupérable     = Montant TVA
   Crédit: 4411  Fournisseurs               = Montant TTC

⑤ تأكيد استيراد — Landed Cost:
   Débit:  3121  Matières premières         = Coût total réparti par produit
   Crédit: 4411  Fournisseurs étrangers     = Montant facture × taux de change
   Crédit: 4481  Dettes — Douanes           = Frais de douane
   Crédit: 4481  Dettes — Transitaire       = Frais transitaire
   Crédit: 3455  État — TVA récupérable     = TVA import

⑥ تأكيد فيشة إنتاج (Production confirmée):
   Débit:  3151  Produits finis (stock)     = Coût unitaire × Quantité
   Crédit: 3121  Matières premières         = Σ(matière × CMUP)
   Crédit: 7131  Variation stocks prod.     = Coût main d'œuvre

⑦ تأكيد تحويل (Transformation aluminium):
   Débit:  3151  Produits finis             = Coût total transformation
   Crédit: 3121  Matières premières         = CMUP × Quantité consommée
   Crédit: 7131  Variation stocks prod.     = Coût de transformation

⑧ Avoir retour (إرجاع بضاعة من عميل):
   Débit:  7111  Ventes                     = Montant HT
   Débit:  4455  État — TVA facturée        = Montant TVA
   Crédit: 3421  Clients                    = Montant TTC
   + حركة مخزون IN بـ CMUP الحالي

⑨ Avoir commercial (تخفيض على فاتورة سابقة):
   Débit:  7111  Ventes                     = Montant HT
   Débit:  4455  État — TVA facturée        = Montant TVA
   Crédit: 3421  Clients                    = Montant TTC
   (لا حركة مخزون)

⑩ Avoir annulation (إلغاء فاتورة كاملة):
   عكس كامل لكل سطور قيد الفاتورة الأصلية
```

⚠️ **ملاحظة مهمة:** هذه القيود قابلة للمراجعة والتعديل من طرف المحاسب مباشرة في التطبيق. التطبيق يقترح القيد تلقائياً، والمحاسب يراجعه ويعدله إذا احتاج. هذا هو المنهج الصحيح لكل أنظمة ERP.

**إقرار TVA (مفصل حسب النسبة — حسب CGI المغربي):**
```
TVA facturée (collectée):    0% | 7% | 10% | 14% | 20%
TVA récupérable (déductible): 0% | 7% | 10% | 14% | 20%

TVA due = TVA facturée - TVA récupérable
Crédit de TVA = رصيد سالب مرحّل من الفترة السابقة (حساب 3456)
```

---

### 6.7 التقارير

| التقرير | الفلاتر | التصدير |
|---------|---------|---------|
| Ventes | فترة / عميل / منتج | Excel + PDF |
| Achats | فترة / مورد | Excel + PDF |
| Stock | منتج / حركات / inventaire | Excel + PDF |
| Dettes & Créances | عميل / تاريخ | Excel + PDF |
| Chèques & LCN | تاريخ الاستحقاق | Excel + PDF |
| TVA (مفصل) | فترة | Excel + PDF |
| Résultat (P&L) | فترة | Excel + PDF |
| Mouvements stock | منتج / فترة | Excel + PDF |


---

## 7. هيكل قاعدة البيانات النهائي

### مبادئ عامة
```
- كل جدول يحمل: sync_id (UUID), version (int), created_at, updated_at, created_by
- الحذف: Soft Delete (is_deleted boolean) — لا نحذف أبداً
- audit_log يسجل كل إجراء مع old_values كاملة
- تقييم المخزون: CMUP (Coût Moyen Unitaire Pondéré) — الطريقة الوحيدة المعتمدة
- كل العمليات التي تمس المخزون والمحاسبة تتم داخل Transaction واحدة
```

### إعدادات الجهاز
```sql
device_config (
  id            INTEGER PRIMARY KEY,
  company_name  TEXT,
  mode          TEXT,    -- 'standalone' | 'master' | 'client'
  server_ip     TEXT,    -- IP الجهاز الرئيسي (للـ client فقط)
  server_port   INTEGER DEFAULT 3000,
  setup_done    BOOLEAN DEFAULT FALSE,
  created_at    DATETIME
)
```

### الأطراف
```sql
clients (
  id, name, address, email, phone, ice, rc, if_number,
  credit_limit, notes,
  sync_id, version, created_at, updated_at, created_by, is_deleted
)

suppliers (
  id, name, address, email, phone, ice, rc,
  notes,
  sync_id, version, created_at, updated_at, created_by, is_deleted
)
```

### المنتجات والمخزون
```sql
products (
  id, code, name, unit,
  type,              -- 'raw' | 'finished' | 'semi_finished'
  min_stock,
  sale_price,
  tva_rate_id,       -- FK → tva_rates
  cmup_price,        -- Coût Moyen Unitaire Pondéré — يُحدَّث عند كل دخول
  stock_quantity,    -- يُحدَّث تلقائياً عند كل حركة مُطبَّقة
  supplier_id,
  sync_id, version, created_at, updated_at, created_by, is_deleted
)

stock_movements (
  id, product_id,
  type,              -- 'in' | 'out'
  quantity,
  cmup_before, cmup_after,
  unit_cost,
  applied,           -- boolean: هل طُبِّقت الحركة فعلاً؟
  applied_at,        -- تاريخ التطبيق
  applied_by,        -- من طبّقها
  -- مرجع واحد فقط غير NULL
  bl_id, reception_id, production_id, transformation_id, avoir_id, manual_ref,
  date, notes, created_by
)
```

### المستندات (Table Inheritance)
```sql
-- الجدول الأساسي المشترك
documents (
  id, type,
  -- 'invoice'|'quote'|'bl'|'proforma'|'avoir'
  -- 'purchase_order'|'bl_reception'|'purchase_invoice'|'import_invoice'
  number,            -- F-{YEAR}-{SEQ}
  date,
  party_id, party_type,   -- 'client' | 'supplier'
  status,
  total_ht, tva, total_ttc,
  notes,
  sync_id, version, created_at, updated_at, created_by, is_deleted
)

document_lines (
  id, document_id,
  product_id,
  quantity, unit_price, discount, tva_rate, total_ttc,
  original_line_id   -- FK → document_lines (للأوير)
)

document_links (
  id, parent_id, child_id,
  link_type,         -- 'bl_to_invoice' | 'devis_to_invoice' | ...
  created_at
)

-- جداول فرعية خاصة بكل نوع
invoices        (document_id PK FK, currency, exchange_rate, payment_method, due_date, payment_status)
purchase_orders (document_id PK FK, expected_delivery_date)
purchase_invoices (document_id PK FK, payment_method, due_date, payment_status)
import_invoices (document_id PK FK, currency, exchange_rate, invoice_amount,
                 customs, transitaire, tva_import, other_costs, total_cost,
                 payment_method, due_date, payment_status)
quotes          (document_id PK FK, validity_date, probability)
bons_livraison  (document_id PK FK, delivery_address, delivery_date, stock_applied)
bons_reception  (document_id PK FK, reception_date, stock_applied, purchase_order_id)
proformas       (document_id PK FK, validity_date, incoterm, currency, exchange_rate)
avoirs          (document_id PK FK, avoir_type, affects_stock, reason)
                -- avoir_type: 'retour' | 'commercial' | 'annulation'
```

### المدفوعات
```sql
payments (
  id, party_id, party_type,
  amount, method, date, due_date,
  cheque_number, bank,
  status,            -- 'pending' | 'collected' | 'rejected'
  document_id,       -- nullable = دفع على الحساب
  notes,
  sync_id, version, created_at, updated_at, created_by
)

payment_allocations (
  id, payment_id, document_id, amount
)
```

### الإنتاج والتحويل
```sql
bom_templates (
  id, product_id, name, is_default, labor_cost, notes, created_at
)

bom_lines (
  id, bom_id, material_id, quantity, unit, notes
)

production_orders (
  id, product_id, bom_id, bom_snapshot,
  quantity, date, status, unit_cost,
  sync_id, version, created_at, updated_at, created_by, is_deleted
)

transformations (
  id, raw_material_id, input_quantity, cost_per_unit, total_cost,
  date, notes,
  sync_id, version, created_at, updated_at, created_by
)

transformation_outputs (
  id, transformation_id, product_id, quantity, allocated_cost
)
```

### TVA
```sql
tva_rates (
  id, rate,           -- 0, 7, 10, 14, 20
  label,              -- 'Exonéré' | 'TVA 7%' | 'TVA 10%' | 'TVA 14%' | 'TVA 20%'
  account_facturee,   -- FK → accounts (4455 — TVA facturée)
  account_recuperable,-- FK → accounts (3455 — TVA récupérable)
  is_active
)
```

### المحاسبة
```sql
accounting_periods (
  id, name, start_date, end_date, fiscal_year,
  status,            -- 'open' | 'closed' | 'locked'
  closed_by, closed_at, notes
)

accounts (
  id, code, name,
  type,              -- 'asset'|'liability'|'equity'|'revenue'|'expense'
  parent_id,         -- شجرة هرمية
  is_active
)

journal_entries (
  id, date, period_id,
  reference, description,
  is_auto,           -- true = قيد تلقائي من عملية
  source_type, source_id,
  created_by
)

journal_lines (
  id, entry_id, account_id,
  debit, credit, notes
)
```

### المستخدمون والصلاحيات
```sql
users (
  id, name, email, password_hash,
  role,              -- 'admin'|'accountant'|'sales'|'warehouse'
  is_active, last_login,
  sync_id, version, created_at, updated_at
)

permissions (
  id, user_id, page,
  can_read, can_create, can_edit, can_delete, can_export
)
```

### Audit Log والمزامنة
```sql
audit_log (
  id, user_id, action, table_name, record_id,
  old_values, new_values,  -- JSON
  reason, created_at
)

sync_log (
  id, table_name, record_id,
  sync_id, version,
  updated_at, synced_at
)
```

### الفهارس الأساسية
```sql
CREATE INDEX idx_document_lines_document_id  ON document_lines(document_id);
CREATE INDEX idx_stock_movements_product_id  ON stock_movements(product_id);
CREATE INDEX idx_journal_entries_period_id   ON journal_entries(period_id);
CREATE INDEX idx_journal_lines_entry_id      ON journal_lines(entry_id);
CREATE INDEX idx_payments_party_id           ON payments(party_id);
CREATE INDEX idx_documents_party_id          ON documents(party_id);
CREATE INDEX idx_documents_number            ON documents(number);
CREATE INDEX idx_documents_date              ON documents(date);
CREATE INDEX idx_products_code               ON products(code);
```


---

## 8. الاستراتيجيات التقنية

### 8.1 Error Handling
```
Main Process (IPC handlers):
  - كل handler مغلف بـ try/catch
  - يُرجع: { success: true, data: ... } أو { success: false, error: { code, message } }
  - أكواد الأخطاء موحدة: DB_ERROR | VALIDATION_ERROR | NOT_FOUND | CONFLICT

Renderer (React):
  - كل استدعاء IPC يتحقق من success
  - Toast notifications: أخضر للنجاح، أحمر للخطأ، أصفر للتحذير
  - لا يُعرض stack trace للمستخدم — رسائل واضحة بالفرنسية
```

### 8.2 Validation Layer (Zod)
```
src/validation/
  ├── invoice.schema.ts
  ├── client.schema.ts
  ├── product.schema.ts
  └── ...

- نفس الـ schema يُستخدم في:
  1. الواجهة (React Hook Form + Zod) — validation فوري
  2. Main Process — قبل أي كتابة في قاعدة البيانات
- هذا يضمن: لا بيانات فاسدة تصل لقاعدة البيانات أبداً
```

### 8.3 Migration Strategy
```
electron/database/migrations/
  ├── 001_initial_schema.sql
  ├── 002_add_device_config.sql
  ├── 003_add_bom_templates.sql
  └── ...

- جدول meta يحفظ رقم الإصدار الحالي
- عند كل تشغيل: يقارن الإصدار المحلي بالإصدار المطلوب
- يُطبق الـ migrations المفقودة بالترتيب تلقائياً
- كل migration داخل Transaction (إما كل شيء أو لا شيء)
```

### 8.4 Testing Strategy
```
اختبارات إلزامية (Jest):
  - كل service محاسبي (حساب TVA، CMUP، Landed Cost)
  - منطق الترقيم التلقائي
  - Validation schemas (Zod)
  - منطق حركة المخزون (applied/not applied)

اختبارات واجهة (React Testing Library):
  - نموذج الفاتورة (إضافة منتج، حساب الإجماليات)
  - نموذج العميل

تشغيل الاختبارات:
  jest --runInBand   ← للـ CI
  jest --watch       ← للتطوير
```

### 8.5 Performance
```
الأهداف:
  - فتح قائمة 10,000 فاتورة: < 500ms
  - إنشاء فاتورة مع قيد محاسبي: < 200ms
  - تصدير 1,000 سجل إلى Excel: < 3s
  - بحث فوري في 5,000 عميل: < 100ms

الحلول:
  - Pagination في كل الجداول (50 سجل افتراضياً)
  - Virtual scrolling للقوائم الطويلة
  - Indexes على كل حقول البحث والفلترة
  - Prepared statements لكل الاستعلامات المتكررة
  - React.memo + useMemo للمكونات الثقيلة
```

### 8.6 Print Templates
```
- قوالب HTML/CSS مخزنة في قاعدة البيانات
- محرر بسيط في الإعدادات: شعار | ألوان | نصوص ثابتة | تذييل
- المعاينة الفورية قبل الطباعة
- تصدير PDF عبر jsPDF + html2canvas
- قالب افتراضي احترافي جاهز من البداية
```

### 8.7 نظام i18n (الترجمة)
```
src/locales/
  ├── fr.json    ← الفرنسية (اللغة الأساسية)
  └── ar.json    ← العربية (جاهزة للتفعيل)

- react-i18next للتبديل بين اللغات
- direction: LTR للفرنسية، RTL للعربية (تلقائي)
- الخط: Inter للفرنسية، Noto Sans Arabic للعربية
- التبديل من الإعدادات بدون إعادة تشغيل
```

---

## 9. نظام المزامنة

### السيناريو 1: جهاز واحد
- SQLite محلي، يعمل مباشرة
- لا إعداد شبكة، لا خادم، لا تعقيد

### السيناريو 2: أجهزة متعددة + شبكة محلية
```
┌─────────────────────────────────────────────────┐
│  الجهاز الرئيسي (Master)                        │
│  - PostgreSQL يعمل عليه                         │
│  - Express API يستمع على المنفذ 3000            │
│  - كل حسابات المستخدمين مخزنة هنا              │
└──────────────────┬──────────────────────────────┘
                   │ شبكة محلية (LAN)
        ┌──────────┴──────────┐
        ▼                     ▼
   جهاز البائع           جهاز المخزن
   يتصل بـ Master        يتصل بـ Master
   عبر IP + Port         عبر IP + Port
```

**الإعداد (مرة واحدة فقط):**
1. على الجهاز الرئيسي: تثبيت التطبيق → اختيار "وضع الخادم"
2. على باقي الأجهزة: تثبيت التطبيق → إدخال IP الجهاز الرئيسي
3. تسجيل الدخول يعمل على كل الأجهزة عبر نفس الحسابات

**ضمان عدم تعارض الأرقام:**
PostgreSQL يضمن atomic increment — مستحيل أن ينشئ جهازان نفس الرقم.



---

## 10. نظام الإشعارات

**Notification Center (🔔):**
- Chèque/LCN يستحق خلال 7 أيام
- منتج وصل للحد الأدنى في المخزون
- فاتورة متأخرة أكثر من 30 يوم

**Toast Notifications:**
- Succès: أخضر | Erreur: أحمر | Avertissement: أصفر

---

## 11. نظام الصلاحيات

```
Admin:        كل الصلاحيات
Comptable:    محاسبة + تقارير + مدفوعات (قراءة + تعديل)
Commercial:   مستندات + عملاء (قراءة + إنشاء، بدون حذف)
Magasinier:   مخزون + إنتاج + مشتريات (قراءة + تعديل)
```

- لكل صفحة: Lire | Créer | Modifier | Supprimer | Exporter
- الأدمن يختار دوراً → تُحدد الصلاحيات تلقائياً ويمكن تعديلها يدوياً

---

## 12. الإعدادات

- بيانات الشركة: Nom | Logo | Adresse | ICE | IF | RC | Téléphone
- وضع التشغيل: Standalone (جهاز واحد) أو Master/Client (شبكة)
- إعدادات الشبكة: IP الخادم + المنفذ (للوضع Client فقط)
- إعدادات TVA: النسب الافتراضية (7%, 10%, 14%, 20%)
- العملة الأساسية: MAD
- النسخ الاحتياطي: مجلد الحفظ + جدولة تلقائية
- تخصيص قالب الفاتورة (شعار، ألوان، تذييل)
- إدارة المستخدمين والصلاحيات
- اللغة: Français | العربية

---

## 13. التصميم العام

```
الألوان:
  Primary:  #1E3A5F  (أزرق داكن)
  Accent:   #F0A500  (ذهبي)
  Success:  #10B981  (أخضر)
  Danger:   #EF4444  (أحمر)
  Warning:  #F59E0B  (برتقالي)
  BG:       #F8FAFC  (رمادي فاتح)
  Dark BG:  #0F172A  (Dark Mode)

اللغة الافتراضية: الفرنسية — LTR
الخط: Inter (FR) | Noto Sans Arabic (AR)
المكونات:
  - جداول قابلة للفرز والفلترة مع Pagination
  - نماذج مع Validation فوري (Zod + React Hook Form)
  - Modals للإضافة/التعديل
  - Drawer للتفاصيل
  - Skeleton Loading + Empty States
  - Searchable Combobox: بحث فوري بالاسم/الكود/ICE
  - Batch Operations: Checkboxes + شريط أدوات سياقي
```

---

## 14. اختصارات لوحة المفاتيح

| الاختصار | الوظيفة |
|----------|---------|
| `Ctrl + S` | Enregistrer |
| `Ctrl + N` | Nouveau |
| `Ctrl + P` | Imprimer / PDF |
| `F2` | Rechercher |
| `Escape` | Fermer modal |
| `Tab` | التنقل بين الحقول |

---

## 15. هيكل الملفات

```
/
├── electron/
│   ├── main.ts                  ← نقطة دخول Electron
│   ├── preload.ts               ← جسر IPC آمن
│   ├── database/
│   │   ├── connection.ts        ← إعداد better-sqlite3
│   │   ├── migrations/          ← 001_initial.sql, 002_...sql
│   │   └── queries/             ← queries منظمة بالوحدة
│   ├── ipc/                     ← handlers: clients, invoices, stock...
│   ├── services/                ← المنطق: accounting.service, stock.service...
│   ├── api/                     ← Express HTTP API (للشبكة فقط)
│   └── sync/                    ← منطق المزامنة
├── src/
│   ├── pages/
│   ├── components/
│   │   ├── ui/                  ← Button, Input, Table, Modal...
│   │   ├── forms/               ← InvoiceForm, ClientForm...
│   │   └── shared/              ← Navbar, Notifications, DeviceBadge...
│   ├── store/                   ← Zustand stores
│   ├── hooks/                   ← useInvoice, useClient, useStock...
│   ├── validation/              ← Zod schemas
│   ├── locales/                 ← fr.json, ar.json
│   ├── utils/                   ← pdf, excel, formatters, date...
│   └── types/                   ← TypeScript interfaces
├── assets/
└── dist/                        ← .exe installer
```

---

## 16. خطة التنفيذ (4 مراحل + Pilot)

### المرحلة 0 — الأساس (أسبوع)
- إعداد المشروع: Electron + React + TypeScript + Tailwind
- قاعدة البيانات: better-sqlite3 + نظام migrations
- نظام IPC الآمن (preload + handlers)
- **Wizard أول تشغيل:** بيانات الشركة + وضع التشغيل (Standalone/Master/Client)
- شاشة تسجيل الدخول + إدارة المستخدمين والصلاحيات
- Layout كامل: Navbar + تبويبات فرعية + Dark/Light Mode
- **هيكل المحاسبة: جداول accounts + journal_entries + journal_lines**
- accounting.service.ts: منطق القيود التلقائية جاهز للاستدعاء من أي وحدة

### المرحلة 1 — MVP التجاري (3-4 أسابيع)
- المستندات: فواتير + عروض أسعار + BL + Proforma + Avoir
- إدارة العملاء والموردين
- المنتجات والمخزون (حركات + CMUP)
- المدفوعات: نقد/شيك/LCN/تحويل
- تصدير PDF احترافي
- **كل عملية تُولّد قيدها المحاسبي تلقائياً**

**معيار الإكمال:** إنشاء فاتورة كاملة + طباعة PDF + قيد محاسبي صحيح

### المرحلة 2 — المشتريات والمحاسبة الكاملة (3 أسابيع)
- المشتريات المحلية: أوامر شراء + استلام + فواتير موردين
- الاستيراد: Landed Cost + قيود محاسبية
- واجهة المحاسبة: Plan Comptable + Grand Livre + Balance
- إقرار TVA مفصل حسب النسبة

### المرحلة 3 — الإنتاج والتقارير (3-4 أسابيع)
- وحدة الإنتاج: BOM + بطاقات إنتاج + توزيع التكلفة
- التحويل (Transformation Aluminium)
- صفحة التقارير الشاملة (Excel + PDF)
- المزامنة: LAN تلقائية + USB احتياطي
- الإشعارات: شيكات + مخزون + فواتير متأخرة

### المرحلة 4 — الأصول الثابتة والرواتب (2-3 أسابيع)
- وحدة الأصول الثابتة: إدارة + إهلاك تلقائي + قيود محاسبية
- وحدة الرواتب: CNSS + IR + ترحيل للمحاسبة
- تحسينات الأداء + اختبار شامل

### Pilot (أسبوع بعد المرحلة 1)
- 3-5 مستخدمين حقيقيين في بيئة العمل الفعلية
- جمع الملاحظات: أخطاء حرجة | تحسينات UX | طلبات جديدة
- إصلاح الأخطاء الحرجة قبل الانتقال للمرحلة التالية

---

## 19. نظام الترخيص والاشتراك (License System)

### المبدأ الأساسي

لا إنترنت مطلوب للتحقق. كل شيء يعمل محلياً بالتشفير.

```
عند الشراء:
  العميل يُعطيك اسم شركته (مثال: "Aluminium Atlas SARL")
  أنت تُدخله في سكريبت مع تاريخ الانتهاء
  السكريبت يولّد كوداً مشفراً → ترسله للعميل

عند التفعيل:
  التطبيق يطلب: اسم الشركة + الكود
  يتحقق محلياً بنفس الخوارزمية
  إذا تطابق → مفعّل، يقرأ تاريخ الانتهاء من الكود مباشرة
```

### لماذا اسم الشركة وليس "أي شيء"؟

اسم الشركة فريد عملياً — شركتان نادراً ما يحملان نفس الاسم بالضبط.
العميل لن ينساه أبداً. يظهر في التطبيق كـ: `Licencié à: Aluminium Atlas SARL`

### آلية التشفير (HMAC-SHA256)

```
المدخلات:
  company_name = "Aluminium Atlas SARL"
  expiry_date  = "2027-01-15"
  secret_key   = [كلمة سرية طويلة تحفظها أنت فقط — لا تُكتب في الكود أبداً]

العملية:
  payload  = base64(company_name + "|" + expiry_date)
  signature = HMAC-SHA256(payload, secret_key) → أول 16 حرف
  الكود    = payload + "." + signature

مثال ناتج:
  QWx1bWluaXVtIEF0bGFzIFNBUkx8MjAyNy0wMS0xNQ==.A3F9KL2M9XPQ7RWT

التطبيق يفك base64 → يقرأ اسم الشركة وتاريخ الانتهاء
يعيد حساب HMAC ويقارن → إذا تطابق: صحيح
```

**لماذا هذا محكم؟**
- بدون `secret_key` لا أحد يستطيع توليد كود صحيح حتى لو عرف الخوارزمية
- تاريخ الانتهاء مدمج في الكود — لا قاعدة بيانات خارجية
- لا إنترنت مطلوب أبداً

### منع إعادة الاستخدام (Machine Binding)

```sql
license (
  id            INTEGER PRIMARY KEY,
  company_name  TEXT NOT NULL,
  license_key   TEXT NOT NULL,
  expiry_date   DATE NOT NULL,
  machine_id    TEXT NOT NULL,   -- بصمة الجهاز: SHA256(MAC + CPU + hostname)
  activated_at  DATETIME,
  is_active     BOOLEAN DEFAULT TRUE
)
```

بصمة الجهاز تمنع نسخ ملف SQLite لجهاز آخر واستخدام نفس الترخيص.

### سير التفعيل الكامل (من الموقع إلى التطبيق)

```
1. العميل يزور الموقع ويدفع
2. يُدخل اسم شركته: "Aluminium Atlas SARL"
3. الموقع يولّد الكود ويحفظ في قاعدة بياناته:
     company_name = "Aluminium Atlas SARL"  ← بالضبط كما أُدخل
     license_key  = الكود المولّد
     expiry_date  = تاريخ الانتهاء
     paid         = true

4. يظهر للعميل في الموقع:
   ┌─────────────────────────────────────────────┐
   │  ✅ Paiement confirmé !                      │
   │                                             │
   │  Nom de l'entreprise:                       │
   │  Aluminium Atlas SARL    [📋 Copier]        │
   │                                             │
   │  Clé de licence:                            │
   │  QWx1bWlu...A3F9KL2M    [📋 Copier]        │
   │                                             │
   │  [📋 Copier les deux d'un coup]             │
   │  [⬇️  Télécharger le logiciel]              │
   └─────────────────────────────────────────────┘

5. العميل يثبّت التطبيق → يلصق البيانات → مفعّل فوراً ✅
```

**فائدة إضافية:** الموقع يمنحك لوحة تحكم كاملة:
- قائمة كل العملاء
- من دفع / من انتهى اشتراكه / من لم يجدد
- إمكانية إلغاء ترخيص فوراً (تولّد كوداً منتهياً)
- إرسال تذكير تلقائي قبل 7 أيام من انتهاء الاشتراك

```
┌──────────────────────────────────────────────────┐
│  Activation du logiciel                          │
│                                                  │
│  Nom de l'entreprise (exactement comme fourni):  │
│  [Aluminium Atlas SARL_____________________]     │
│                                                  │
│  Clé de licence:                                 │
│  [QWx1bWluaXVtIEF0bGFzIFNBUkx8...............]  │
│                                                  │
│  ✅ Licence valide — Aluminium Atlas SARL         │
│     Expire le: 15/01/2027                        │
│                                                  │
│              [Activer et continuer →]            │
└──────────────────────────────────────────────────┘
```

### التحقق عند كل تشغيل

```
1. يقرأ license من SQLite
2. يتحقق: machine_id الحالي = machine_id المحفوظ؟
   → لا: "Licence liée à un autre appareil. Contactez le support."
3. يفك الكود → يقرأ expiry_date
   → صالح + أكثر من 7 أيام: يعمل عادي ✅
   → أقل من 7 أيام: تحذير "Abonnement expire dans X jours" 🟡
   → منتهٍ: وضع قراءة فقط — البيانات محفوظة، لا إنشاء جديد 🔴
```

### تجديد الاشتراك

```
العميل يدفع → أنت تولّد كوداً جديداً بتاريخ انتهاء جديد → ترسله
في التطبيق: Paramètres → Licence → [Renouveler]
  → يُدخل الكود الجديد فقط (اسم الشركة محفوظ)
  → يُحدَّث expiry_date في SQLite
```

### سكريبت توليد الأكواد (عندك أنت فقط)

```javascript
// generate-license.js — يعمل على جهازك فقط، لا يُرفق مع التطبيق
const crypto = require('crypto')

// SECRET_KEY محفوظ في متغير بيئة — لا تكتبه مباشرة في الكود
const SECRET_KEY = process.env.LICENSE_SECRET

function generateLicense(companyName, expiryDate) {
  const payload = Buffer.from(`${companyName}|${expiryDate}`).toString('base64')
  const signature = crypto
    .createHmac('sha256', SECRET_KEY)
    .update(payload)
    .digest('hex')
    .substring(0, 16)
    .toUpperCase()
  return `${payload}.${signature}`
}

// الاستخدام:
// LICENSE_SECRET=mysecret node generate-license.js "Aluminium Atlas SARL" "2027-01-15"
const [,, company, expiry] = process.argv
console.log('Clé générée:', generateLicense(company, expiry))
```

### التحقق داخل التطبيق (Electron)

```typescript
// electron/services/license.service.ts
import crypto from 'crypto'

// SECRET_KEY مدمج في الكود لكن مُشوَّش (obfuscated) عند البناء
const SECRET_KEY = process.env.LICENSE_SECRET || 'OBFUSCATED_AT_BUILD_TIME'

export function verifyLicense(companyName: string, licenseKey: string): {
  valid: boolean
  expiryDate?: string
  error?: string
} {
  try {
    const [payload, signature] = licenseKey.split('.')
    if (!payload || !signature) return { valid: false, error: 'Format invalide' }

    // التحقق من الـ signature
    const expectedSig = crypto
      .createHmac('sha256', SECRET_KEY)
      .update(payload)
      .digest('hex')
      .substring(0, 16)
      .toUpperCase()

    if (signature !== expectedSig) return { valid: false, error: 'Clé invalide' }

    // فك الـ payload
    const decoded = Buffer.from(payload, 'base64').toString('utf8')
    const [encodedCompany, expiryDate] = decoded.split('|')

    // التحقق من اسم الشركة
    if (encodedCompany !== companyName)
      return { valid: false, error: 'Nom d\'entreprise incorrect' }

    return { valid: true, expiryDate }
  } catch {
    return { valid: false, error: 'Clé corrompue' }
  }
}
```

### ملخص الضمانات

| التهديد | الحل |
|---------|------|
| تزوير كود | بدون secret_key مستحيل |
| مشاركة كود بين شركتين | اسم الشركة مدمج في الكود |
| نسخ SQLite لجهاز آخر | machine_id لا يتطابق → رفض |
| استخدام بعد انتهاء الاشتراك | expiry_date مدمج في الكود |
| تغيير تاريخ الجهاز | لا يؤثر — التاريخ في الكود نفسه |

---

## 20. النسخ الاحتياطي (Sauvegarde)

```
تلقائي:
  - كل يوم في وقت محدد (قابل للضبط في الإعدادات)
  - يُنشئ نسخة من ملف SQLite في مجلد محدد
  - يحتفظ بآخر 30 نسخة ويحذف الأقدم تلقائياً

يدوي:
  - زر "Sauvegarder maintenant" في الإعدادات
  - يُصدر ملف .db مع timestamp في الاسم

استعادة:
  - زر "Restaurer" في الإعدادات
  - يختار المستخدم ملف .db
  - تحذير واضح: "هذا سيستبدل كل البيانات الحالية"
```

---

## 21. Wizard أول تشغيل

عند تشغيل التطبيق لأول مرة، يظهر wizard من 3 خطوات:

```
الخطوة 1: بيانات الشركة
  ┌─────────────────────────────────────┐
  │  Bienvenue !                        │
  │  Configurez votre entreprise        │
  │                                     │
  │  Nom de l'entreprise: [__________]  │
  │  ICE:                 [__________]  │
  │  Adresse:             [__________]  │
  │  Téléphone:           [__________]  │
  │  Logo:                [Choisir...] │
  └─────────────────────────────────────┘

الخطوة 2: وضع التشغيل
  ┌─────────────────────────────────────┐
  │  Comment utilisez-vous ce logiciel? │
  │                                     │
  │  ◉ Un seul poste                    │
  │    (SQLite local, simple)           │
  │                                     │
  │  ○ Plusieurs postes en réseau       │
  │    Ce poste est: ○ Serveur ○ Client │
  │    IP Serveur: [_____________]      │
  └─────────────────────────────────────┘

الخطوة 3: حساب المدير
  ┌─────────────────────────────────────┐
  │  Créer le compte administrateur     │
  │                                     │
  │  Nom:        [__________]           │
  │  Email:      [__________]           │
  │  Mot de passe: [________]           │
  │  Confirmer:    [________]           │
  └─────────────────────────────────────┘
```

---

*VISION2.md — المرجع الثابت للمشروع. أي قرار أو تعديل يُسجل هنا أولاً.*
*كيرو (Kiro) + صاحب المشروع*
