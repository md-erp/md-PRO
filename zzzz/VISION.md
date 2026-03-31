# رؤية المشروع الشاملة - نظام ERP للمحاسبة والفوترة

---

## 1. نظرة عامة

تطبيق Desktop على Windows مبني بـ Electron + React + TypeScript.
يعمل بدون إنترنت. قاعدة بيانات SQLite محلية على كل جهاز.
عند وجود شبكة محلية (LAN): يتصل بـ Server مركزي (PostgreSQL).
المزامنة التلقائية عند توفر الشبكة. المزامنة اليدوية عبر USB تبقى خياراً احتياطياً.

---

## 2. التقنيات

```
Frontend:   React + TypeScript + Tailwind CSS (RTL)
Desktop:    Electron (Windows)
DB Local:   SQLite (على كل جهاز — خفيفة، لا تثبيت، لا صلاحيات)
DB Server:  PostgreSQL (على الخادم المركزي فقط — جهاز واحد في الشبكة)
Backend:    Node.js
            IPC (Electron IPC): للاتصال الداخلي بين Renderer و Main
            HTTP API (Express): للاتصال عبر الشبكة المحلية فقط
            الفصل واضح في الكود + آلية restart آمنة للـ API
PDF:        jsPDF + html2canvas
Excel:      ExcelJS
State:      Zustand
اللغة:      الفرنسية (واجهة كاملة بالفرنسية)
الاتجاه:    LTR
الخط:       Inter (للفرنسية والأرقام)
الوضع:      Light / Dark Mode
```

---

## 3. الهيكل البصري للتطبيق

```
┌─────────────────────────────────────────────────────────┐
│  [شعار الشركة]  [المستندات] [الأطراف] [المخزون]        │
│  [المشتريات] [الإنتاج] [المحاسبة] [التقارير]           │  ← Navbar أعلى
│  [الإعدادات]                    [🔔] [المستخدم ▼]      │
├─────────────────────────────────────────────────────────┤
│  [فرعي 1] [فرعي 2] [فرعي 3] [فرعي 4] [فرعي 5]        │  ← صف ثانٍ للتبويبات الفرعية
├─────────────────────────────────────────────────────────┤
│                                                         │
│                   منطقة المحتوى                         │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

لا Sidebar جانبية. Navigation bar أفقية في الأعلى.
عند الضغط على تبويب رئيسي، تظهر تبويباته الفرعية في صف ثانٍ أسفله مباشرة.

---

## 4. صفحات التطبيق (7 تبويبات رئيسية)

### 4.1 المستندات التجارية
تبويبات فرعية: الفواتير | عروض الأسعار | بوالص التسليم | الفواتير المبدئية | أوامر الإرجاع

**حالات المستند وسير العمل:**
```
عرض السعر (Devis):
  مسودة → مرسل → مقبول → [تحويل لفاتورة] | مرفوض

فاتورة مبدئية (Proforma):
  مسودة → مرسلة → [تحويل لفاتورة]

فاتورة (Facture):
  مسودة → مؤكدة → [مدفوعة جزئياً] → مدفوعة كلياً | ملغاة

بوليصة التسليم (BL):
  مسودة → مؤكدة → [تطبيق حركة مخزون؟ نعم/لا] → مسلمة

أمر الإرجاع (Avoir):
  مسودة → مؤكد → [تطبيق حركة مخزون عكسية؟ نعم/لا] → مطبق
```

**قاعدة المخزون:** أي مستند يؤثر على المخزون يسأل المستخدم صراحةً:
"هل تريد تطبيق حركة المخزون الآن؟ [نعم] [لا]"

**ربط المستندات ببعضها:**
عند تحويل مستند لآخر أو ربطهما، تظهر في تفاصيل كل مستند قسم "Documents liés":

```
Devis #D-2026-0012
    └── Facture Proforma #P-2026-0005
            └── Facture #F-2026-0045
                    ├── Bon de Livraison #BL-2026-0031
                    └── Avoir #AV-2026-0003
```

**منطق بوليصة التسليم (Bon de Livraison):**
BL مرتبط دائماً بفاتورة. فاتورة واحدة يمكن أن تولد عدة BL (تسليم جزئي).

**حقول الفاتورة:**
- رقم القطعة (تلقائي: F-2026-XXXX)
- التاريخ، العميل (بحث ذكي)
- جدول المنتجات: المنتج | الكمية | سعر HT | خصم% | TVA | TTC
- العملة + سعر الصرف (للفواتير بالعملة الأجنبية: EUR, USD...)
- ملخص: HT | TVA | الخصم | الإجمالي TTC
- طريقة الدفع: نقد | تحويل بنكي | شيك | LCN
- ملاحظات، تصدير PDF

---

### 4.2 الأطراف (العملاء والموردون)
تبويبات فرعية: العملاء | الموردون

**بطاقة العميل/المورد:**
- المعلومات: الاسم | العنوان | الهاتف | الإيميل | ICE | IF | RC
- تبويبات داخلية: المستندات المرتبطة | سجل المدفوعات | الرصيد والديون | الشيكات والكمبيالات
- استيراد/تصدير: Excel أو CSV

**إدارة المدفوعات:**
- ربط الدفعة بفاتورة محددة، دعم الدفع الجزئي
- تتبع الشيكات: رقم الشيك | البنك | تاريخ الاستحقاق | الحالة
- تنبيه تلقائي قبل 7 أيام من الاستحقاق

---

### 4.3 المخزون والمنتجات
تبويبات فرعية: المواد الأولية | المنتجات النهائية | التحويل

**بطاقة المنتج:** الكود | التسمية | الوحدة | الحد الأدنى | TVA | طريقة التقييم
تبويبات داخلية: الكمية الحالية | حركات المخزون | الفواتير المرتبطة | سعر التكلفة والهامش

**التحويل (Transformation الألومنيوم):**
- إدخال: قضيب ألومنيوم (الطول × الكمية) + تكلفة التحويل لكل متر
- الناتج: منتجات مع توزيع التكلفة تلقائياً

---

### 4.4 المشتريات
تبويبات فرعية: المحلية | الاستيراد

**المشتريات المحلية:**
```
أمر شراء → استلام البضاعة → [تطبيق حركة مخزون؟] → فاتورة المورد → دفع
```

**الاستيراد:**
- فاتورة المورد الأجنبي (بالعملة الأجنبية + سعر الصرف → درهم)
- إضافة التكاليف: رسوم الجمارك | أتعاب الوكيل | TVA الاستيراد | تكاليف أخرى
- توزيع التكلفة الإجمالية على كل منتج (Landed Cost) تلقائياً

---

### 4.5 الإنتاج
- بطاقة الإنتاج: المنتج النهائي | الكمية | المواد المستخدمة | تكاليف العمالة
- عند التأكيد: ينقص المواد الأولية ويضيف للمنتجات النهائية
- حساب سعر التكلفة تلقائياً

---

### 4.6 المحاسبة العامة
تبويبات فرعية: مخطط الحسابات | القيود | دفتر الأستاذ | ميزان المراجعة | TVA

**مخطط الحسابات (Plan Comptable Marocain):**
```
1 - حسابات الأموال الدائمة
2 - حسابات الأصول الثابتة (جاهزة للتوسع)
3 - حسابات المخزون
4 - حسابات الأطراف (عملاء/موردون)
5 - حسابات المالية (بنك/صندوق)
6 - حسابات الأعباء (مصاريف)
7 - حسابات النواتج (مداخيل)
```

**القيود التلقائية:**
```
① تأكيد فاتورة بيع:
  مدين:  3421 (Clients)              = TTC
  دائن:  7111 (Ventes)               = HT
  دائن:  4455 (TVA collectée)        = TVA (مجمّعة حسب النسبة)

② تسجيل دفعة عميل:
  مدين:  5141 (Banque) أو 5161 (Caisse)
  دائن:  3421 (Clients)              = المبلغ المدفوع

③ تأكيد فاتورة شراء (محلية):
  مدين:  6111 (Achats)               = HT
  مدين:  3455 (TVA déductible)       = TVA
  دائن:  4411 (Fournisseurs)         = TTC

④ Bon de réception:
  مدين:  3111 (Stock matières)       = HT
  مدين:  3455 (TVA déductible)       = TVA
  دائن:  4411 (Fournisseurs)         = TTC

⑤ تأكيد استيراد (Landed Cost):
  مدين:  3111/3121 (Stock)           = total_cost موزع على كل منتج
  دائن:  4411 (Fournisseurs étrangers) = invoice_amount × exchange_rate
  دائن:  4481 (Douanes à payer)      = customs
  دائن:  4482 (Transitaire à payer)  = transitaire
  دائن:  3455 (TVA déductible import)= tva_import

⑥ تأكيد فيشة إنتاج:
  مدين:  3121 (Stock produits finis) = unit_cost × quantity
  دائن:  3111 (Stock matières)       = Σ(matière × avco_price)
  دائن:  7131 (Production immobilisée) = labor_cost × quantity

⑦ تأكيد تحويل (Transformation):
  مدين:  3121 (Stock produits finis) = التكلفة الإجمالية
  دائن:  3111 (Stock matières)       = avco_price × الكمية المستهلكة
  دائن:  7131 (Production immobilisée) = تكلفة التحويل

⑧ Avoir retour:
  مدين:  7111 (Ventes)               = HT
  مدين:  4455 (TVA collectée)        = TVA
  دائن:  3421 (Clients)              = TTC
  + حركة مخزون IN بـ avco_price الحالي

⑨ Avoir commercial:
  مدين:  7111 (Ventes)               = HT
  مدين:  4455 (TVA collectée)        = TVA
  دائن:  3421 (Clients)              = TTC

⑩ Avoir annulation:
  عكس كامل لكل سطور قيد الفاتورة الأصلية
```

**إقرار TVA (تفصيل حسب النسبة):**
```
TVA collectée:
  7%:  Σ TVA مبيعات بنسبة 7%
  10%: Σ TVA مبيعات بنسبة 10%
  14%: Σ TVA مبيعات بنسبة 14%
  20%: Σ TVA مبيعات بنسبة 20%

TVA déductible:
  7%:  Σ TVA مشتريات بنسبة 7%
  10%: Σ TVA مشتريات بنسبة 10%
  14%: Σ TVA مشتريات بنسبة 14%
  20%: Σ TVA مشتريات بنسبة 20%

TVA due = TVA collectée - TVA déductible
Crédit de TVA (مرحّل من الفترة السابقة إذا كان الرصيد سالباً)
```

**دفتر الأستاذ:** فلترة بالحساب والفترة + رصيد تراكمي
**ميزان المراجعة:** مجموع مدين/دائن/رصيد لكل حساب

---

### 4.7 التقارير

| التقرير | الفلاتر | التصدير |
|---------|---------|---------|
| المبيعات | فترة / عميل / منتج | Excel + PDF |
| المشتريات | فترة / مورد | Excel + PDF |
| المخزون | منتج / حركات / جرد | Excel + PDF |
| الديون والمستحقات | عميل / تاريخ | Excel + PDF |
| الشيكات والكمبيالات | تاريخ الاستحقاق | Excel + PDF |
| TVA (مفصل حسب النسبة) | فترة | Excel + PDF |
| الأرباح والخسائر | فترة | Excel + PDF |
| حركات المخزون | منتج / فترة | Excel + PDF |

---

## 5. اختصارات لوحة المفاتيح

| الاختصار | الوظيفة |
|----------|---------|
| `Ctrl + S` | حفظ |
| `F2` | بحث |
| `Ctrl + N` | جديد |
| `Ctrl + P` | طباعة / PDF |

---

## 6. عمليات دفعة (Batch Operations)

- Checkboxes في كل جدول للتحديد المتعدد
- شريط أدوات سياقي يظهر عند التحديد: تغيير الحالة | تصدير | حذف

---

## 7. نظام الصلاحيات

```
مدير (Admin):     كل الصلاحيات
محاسب:            محاسبة + تقارير + مدفوعات (قراءة + تعديل)
بائع:             مستندات + عملاء (قراءة + إنشاء، بدون حذف)
أمين مخزن:        مخزون + إنتاج + مشتريات (قراءة + تعديل)
```

- الأدمن يختار دوراً افتراضياً → تُحدد الصلاحيات تلقائياً ويمكن تعديلها يدوياً
- لكل صفحة: قراءة | إنشاء | تعديل | حذف | تصدير

---

## 8. نظام المزامنة

**الحالة 1: شبكة LAN موجودة**
- كل جهاز يتصل بـ PostgreSQL على Server PC عبر IP محدد في الإعدادات
- المزامنة فورية وتلقائية بين كل الأجهزة

**الحالة 2: بدون شبكة**
- كل جهاز يعمل على SQLite المحلي
- تنبيه: "وضع غير متصل - البيانات محلية فقط"
- عند عودة الشبكة: مزامنة تلقائية

**الحالة 3: مزامنة USB (احتياطي)**
- تصدير: ملف `.erpsync` (JSON مضغوط) يحتوي كل التغييرات منذ آخر مزامنة
- استيراد: مقارنة كل سجل مع القاعدة المحلية
- عند التعارض: نافذة مقارنة "النسخة المحلية" vs "النسخة المستوردة" — المستخدم يختار
- كل سجل يحمل: `sync_id` (UUID) + `version` (integer) + `updated_at`

---

## 9. الإشعارات

**Notification Center (🔔):**
- شيك/LCN يستحق خلال 7 أيام
- منتج وصل للحد الأدنى في المخزون
- فاتورة متأخرة أكثر من 30 يوم

**Toast Notifications:**
- نجاح: أخضر | خطأ: أحمر | تحذير: أصفر

---

## 10. الإعدادات

- بيانات الشركة: الاسم | الشعار | العنوان | ICE | IF | RC | الهاتف
- إعدادات الشبكة: IP الـ Server + المنفذ
- إعدادات TVA: النسب الافتراضية (7%, 10%, 14%, 20%)
- العملة الأساسية: درهم مغربي (MAD)
- النسخ الاحتياطي: مجلد الحفظ + جدولة تلقائية
- تخصيص نموذج الفاتورة (الشعار، الألوان، التذييل)
- إدارة المستخدمين والصلاحيات

---

## 11. التصميم العام

```
الألوان:
  Primary:  #1E3A5F  (أزرق داكن)
  Accent:   #F0A500  (ذهبي)
  Success:  #10B981  (أخضر)
  Danger:   #EF4444  (أحمر)
  Warning:  #F59E0B  (برتقالي)
  BG:       #F8FAFC  (رمادي فاتح)
  Dark BG:  #0F172A  (للـ Dark Mode)

اللغة: الفرنسية - LTR
الخط: Inter
المكونات: جداول قابلة للفرز والفلترة | نماذج مع Validation فوري
          Modals للإضافة/التعديل | Drawer للتفاصيل
          Skeleton Loading | Empty States
          Searchable Combobox: بحث فوري بالاسم/الكود/ICE لكل كيان
```

---

## 12. هيكل الملفات

```
/
├── electron/
│   ├── main.ts              ← نقطة دخول Electron
│   ├── preload.ts           ← جسر IPC آمن
│   ├── database/
│   │   ├── schema.sql       ← هيكل قاعدة البيانات
│   │   ├── migrations/      ← تحديثات الهيكل
│   │   └── queries/         ← كل الـ queries منظمة بالوحدة
│   ├── ipc/                 ← معالجات IPC (clients, invoices...)
│   ├── api/                 ← Express HTTP API (للشبكة فقط)
│   └── sync/                ← منطق المزامنة
├── src/
│   ├── pages/
│   ├── components/
│   │   ├── ui/              ← مكونات أساسية (Button, Input, Table...)
│   │   ├── forms/           ← نماذج (InvoiceForm, ClientForm...)
│   │   └── shared/          ← مكونات مشتركة (Navbar, Notifications...)
│   ├── store/               ← Zustand stores
│   ├── hooks/
│   ├── utils/               ← PDF, Excel, formatters, validators
│   └── types/
├── assets/
└── dist/                    ← ملف التثبيت النهائي (.exe)
```

---

## 13. قاعدة البيانات - الهيكل النهائي

### مبادئ عامة
```
- كل جدول يحمل: sync_id (UUID), version (int), created_at, updated_at, created_by
- الحذف: Soft Delete (is_deleted boolean) — لا نحذف أبداً
- audit_log يسجل كل إجراء استثنائي مع old_values كاملة
- تقييم المخزون: AVCO افتراضياً — حقل valuation_method جاهز لـ FIFO/LIFO مستقبلاً
```

---

### الأطراف
```sql
clients (
  id, name, address, email, phone, ice, rc,
  credit_limit, notes,
  sync_id, version, created_at, updated_at, created_by, is_deleted
)

suppliers (
  id, name, address, email, phone, ice, rc,
  notes,
  sync_id, version, created_at, updated_at, created_by, is_deleted
)
```

---

### المنتجات والمخزون
```sql
products (
  id, code, name, unit,
  type,              -- 'raw' | 'finished' | 'semi_finished'
  min_stock,
  sale_price,
  tva_rate_id,       -- FK → tva_rates
  avco_price,        -- يُحدَّث تلقائياً عند كل دخول مخزون
  stock_quantity,    -- يُحدَّث تلقائياً عند كل حركة
  valuation_method,  -- 'AVCO' (افتراضي) | 'FIFO' | 'LIFO' — FIFO/LIFO للمرحلة 4
  supplier_id,       -- FK → suppliers
  sync_id, version, created_at, updated_at, created_by, is_deleted
)

stock_movements (
  id,
  product_id,        -- FK → products
  type,              -- 'in' | 'out'
  quantity,
  avco_before, avco_after,
  -- مراجع nullable (واحد فقط غير NULL)
  bl_id, reception_id, production_id, transformation_id, avoir_id, manual_ref,
  date, notes, created_by,
  CONSTRAINT one_ref_only CHECK (
    (bl_id IS NOT NULL)::int + (reception_id IS NOT NULL)::int +
    (production_id IS NOT NULL)::int + (transformation_id IS NOT NULL)::int +
    (avoir_id IS NOT NULL)::int + (manual_ref IS NOT NULL)::int = 1
  )
)
```

---

### المستندات (Table Inheritance)
```sql
-- الجدول الأساسي
documents (
  id, type,
  -- أنواع المبيعات:    'invoice' | 'quote' | 'bl' | 'proforma' | 'avoir'
  -- أنواع المشتريات:   'purchase_order' | 'bl_reception' | 'purchase_invoice' | 'import_invoice'
  number,            -- F-2026-XXXX / PO-2026-XXXX / IMP-2026-XXXX ...
  date,
  party_id,          -- FK → clients أو suppliers
  party_type,        -- 'client' | 'supplier'
  status,
  total_ht, tva, total_ttc,
  notes,
  sync_id, version, created_at, updated_at, created_by, is_deleted
)

document_lines (
  id, document_id,   -- FK → documents (INDEX)
  product_id,
  quantity, unit_price, discount, tva_rate, total_ttc,
  original_line_id   -- FK → document_lines (للأوير)
)

document_links (
  id,
  parent_id,         -- FK → documents
  child_id,          -- FK → documents
  link_type,         -- 'bl_to_invoice' | 'devis_to_invoice' | 'avoir_to_invoice' | ...
  created_at,
  UNIQUE (child_id) WHERE link_type = 'bl_to_invoice'
)

-- جداول فرعية خاصة بكل نوع (document_id PK FK)
invoices (           -- فاتورة بيع
  document_id PK FK,
  currency,          -- MAD افتراضياً، EUR/USD للفواتير الأجنبية
  exchange_rate,     -- 1 إذا MAD
  payment_method, due_date, payment_status
)

purchase_orders (    -- أمر شراء محلي
  document_id PK FK,
  expected_delivery_date
)

purchase_invoices (  -- فاتورة شراء محلية
  document_id PK FK,
  payment_method, due_date, payment_status
)

import_invoices (    -- فاتورة استيراد
  document_id PK FK,
  currency, exchange_rate,
  invoice_amount,    -- بالعملة الأصلية
  customs, transitaire, tva_import, other_costs,
  total_cost,        -- يُحسب تلقائياً بالدرهم
  payment_method, due_date, payment_status
)

quotes (             -- عرض السعر
  document_id PK FK,
  validity_date, probability
)

bons_livraison (     -- تسليم للعميل
  document_id PK FK,
  delivery_address, delivery_date, stock_applied
)

bons_reception (     -- استلام من مورد
  document_id PK FK,
  reception_date, stock_applied,
  purchase_order_id  -- FK → documents (type='purchase_order')
)

proformas (
  document_id PK FK,
  validity_date, incoterm, currency, exchange_rate
)

avoirs (
  document_id PK FK,
  avoir_type,        -- 'retour' | 'commercial' | 'annulation'
  affects_stock, reason
)
```

---

### المدفوعات
```sql
payments (
  id,
  party_id, party_type,
  amount, method, date, due_date,
  cheque_number, bank,
  status,            -- 'pending' | 'collected' | 'rejected'
  document_id,       -- nullable: إذا NULL = دفع على الحساب (Acompte)
  notes,
  sync_id, version, created_at, updated_at, created_by
)

-- INDEX على: payments.party_id

payment_allocations (
  id, payment_id, document_id, amount
)
```

---

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

---

### TVA
```sql
tva_rates (
  id, rate,           -- 0, 7, 10, 14, 20
  label,              -- 'Exonéré' | 'TVA 7%' | ...
  account_collected,  -- FK → accounts
  account_deductible, -- FK → accounts
  is_active
)
```

---

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
  parent_id,         -- FK → accounts (شجرة هرمية)
  is_active
)

journal_entries (
  id, date,
  period_id,         -- FK → accounting_periods (INDEX)
  reference, description,
  is_auto,           -- true = قيد تلقائي
  source_type, source_id,
  created_by
)

journal_lines (
  id,
  entry_id,          -- FK → journal_entries (INDEX)
  account_id,
  debit, credit, notes
)
```

---

### الأصول الثابتة والموظفون (هيكل مبسط — جاهز للتوسع في المرحلة 4)
```sql
fixed_assets (
  id, code, name,
  acquisition_date, acquisition_cost,
  account_asset_id,        -- FK → accounts (حساب الأصل)
  account_depreciation_id, -- FK → accounts (حساب الإهلاك)
  notes,
  sync_id, version, created_at, updated_at, is_deleted
)

employees (
  id,
  user_id,           -- FK → users (nullable — الموظف قد لا يكون مستخدماً)
  name, position, hire_date,
  salary_base,       -- الراتب الأساسي (للمرحلة 4: CNSS, IR)
  sync_id, version, created_at, updated_at, is_deleted
)
```

---

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

---

### Audit Log والمزامنة
```sql
audit_log (
  id, user_id, action, table_name, record_id,
  old_values, new_values,  -- JSONB
  reason, created_at
)

sync_log (
  id, table_name, record_id,
  sync_id, version, device_id,
  updated_at, synced_at
)
```

---

### الفهارس الأساسية
```sql
CREATE INDEX idx_document_lines_document_id  ON document_lines(document_id);
CREATE INDEX idx_stock_movements_product_id  ON stock_movements(product_id);
CREATE INDEX idx_journal_entries_period_id   ON journal_entries(period_id);
CREATE INDEX idx_journal_lines_entry_id      ON journal_lines(entry_id);
CREATE INDEX idx_payments_party_id           ON payments(party_id);
CREATE INDEX idx_documents_party_id          ON documents(party_id);
```

---

## 14. خطة التنفيذ (4 مراحل)

### المرحلة 1 — MVP (3-4 أسابيع)

**المخرجات:**
- المستندات التجارية: فواتير + عروض أسعار + BL + Proforma + Avoir
- إدارة العملاء والموردين
- المنتجات والمخزون الأساسي (حركات + AVCO)
- تصدير PDF احترافي
- نظام Auth + صلاحيات أساسية
- Layout كامل: Navbar + تبويبات فرعية + Dark/Light Mode

**معايير الإكمال:**
- إنشاء فاتورة بيع كاملة وطباعتها PDF
- إدارة بطاقة عميل مع سجل مستنداته
- متابعة مخزون منتج (دخول/خروج تلقائي من المستندات)
- تغطية ~80% من العمليات اليومية للبائع وأمين المخزن

---

### المرحلة 2 — المحاسبة والمشتريات (3 أسابيع)

**المخرجات:**
- المحاسبة العامة: مخطط الحسابات + قيود تلقائية + دفتر الأستاذ + ميزان المراجعة
- إقرار TVA مفصل حسب النسبة (7%, 10%, 14%, 20%)
- المشتريات المحلية: أوامر شراء + استلام + فواتير موردين
- الاستيراد: Landed Cost + قيود محاسبية
- إدارة المدفوعات: نقد/شيك/LCN/تحويل + تتبع الاستحقاقات

**معايير الإكمال:**
- قيد محاسبي تلقائي صحيح لكل عملية (فاتورة/دفعة/استيراد)
- إقرار TVA يطابق المتطلبات الضريبية المغربية
- دورة شراء كاملة من أمر الشراء حتى الدفع

---

### المرحلة 3 — الإنتاج والتقارير المتقدمة (3-4 أسابيع)

**المخرجات:**
- وحدة الإنتاج: BOM + بطاقات إنتاج + توزيع التكلفة
- التحويل (Transformation الألومنيوم)
- صفحة التقارير الشاملة (Excel + PDF لكل التقارير)
- المزامنة: LAN تلقائية + USB احتياطي
- الإشعارات: شيكات + مخزون + فواتير متأخرة

**معايير الإكمال:**
- دورة إنتاج كاملة مع تأثير صحيح على المخزون والمحاسبة
- كل التقارير قابلة للتصدير بجودة احترافية
- المزامنة تعمل بين جهازين على نفس الشبكة

---

### المرحلة 4 — الأصول الثابتة والرواتب (2-3 أسابيع)

**المخرجات:**
- وحدة الأصول الثابتة: إدارة + إهلاك تلقائي + قيود محاسبية
- وحدة الرواتب: معالجة الرواتب + CNSS + IR + ترحيل للمحاسبة
- دعم FIFO/LIFO في تقييم المخزون (إذا طُلب)
- تحسينات الأداء + اختبار شامل

**معايير الإكمال:**
- قيود إهلاك تلقائية شهرية صحيحة
- كشف راتب قابل للطباعة مع تفاصيل CNSS وIR
- النظام مستقر تحت حمل بيانات حقيقية

---

### مرحلة تجريبية (Pilot) — أسبوع بعد المرحلة 1 أو 2

- 3-5 مستخدمين حقيقيين يستخدمون النظام في بيئة العمل الفعلية
- جمع الملاحظات وتصنيفها: أخطاء حرجة | تحسينات UX | طلبات جديدة
- إصلاح الأخطاء الحرجة قبل الانتقال للمرحلة التالية
- الإطلاق الرسمي بعد اجتياز الـ Pilot بنجاح

---

*هذا الملف هو المرجع الثابت للمشروع. أي قرار أو تعديل يُسجل هنا أولاً. (VISION.md)*
