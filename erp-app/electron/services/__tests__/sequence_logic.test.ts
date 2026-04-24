/**
 * اختبارات منطق الترقيم — بدون قاعدة بيانات
 * تختبر الخوارزميات مباشرة
 */

// ── منطق findNextAvailable ────────────────────────────────────────────────
function findNextAvailable(usedSet: Set<number>, startFrom: number): number {
  let seq = startFrom
  while (usedSet.has(seq)) seq++
  return seq
}

// ── منطق extractSeqFromRef ────────────────────────────────────────────────
function extractSeqFromRef(ref: string): number {
  const parts = ref.split('-')
  return parseInt(parts[parts.length - 1] ?? '0', 10) || 0
}

// ── منطق buildUsedSet ─────────────────────────────────────────────────────
function buildUsedSet(refs: string[]): Set<number> {
  return new Set(
    refs.map(r => extractSeqFromRef(r)).filter(n => n > 0)
  )
}

// ── منطق formatPaymentRef ─────────────────────────────────────────────────
function formatPaymentRef(seq: number): string {
  return `P-${String(seq).padStart(4, '0')}`
}

// ── منطق formatDocNumber ──────────────────────────────────────────────────
function formatDocNumber(prefix: string, year: number, seq: number): string {
  return `${prefix}-${year}-${seq}`
}

// ==========================================================================
// TESTS
// ==========================================================================

describe('findNextAvailable — منطق إيجاد أول رقم متاح', () => {
  test('رقم فارغ → يبدأ من 1', () => {
    expect(findNextAvailable(new Set(), 1)).toBe(1)
  })

  test('1 مستخدم → يعطي 2', () => {
    expect(findNextAvailable(new Set([1]), 1)).toBe(2)
  })

  test('1,2,3 مستخدمة → يعطي 4', () => {
    expect(findNextAvailable(new Set([1, 2, 3]), 1)).toBe(4)
  })

  test('اختار 42، 42 و 43 مستخدمان → يعطي 44', () => {
    expect(findNextAvailable(new Set([42, 43]), 42)).toBe(44)
  })

  test('اختار 100، 100 مستخدم لكن 101 حر → يعطي 101', () => {
    expect(findNextAvailable(new Set([100]), 100)).toBe(101)
  })

  test('اختار 5، لا شيء مستخدم → يعطي 5', () => {
    expect(findNextAvailable(new Set([1, 2, 3, 4]), 5)).toBe(5)
  })

  test('فجوة في الأرقام → يجد الفجوة', () => {
    // 1,2,4,5 مستخدمة → 3 متاح
    expect(findNextAvailable(new Set([1, 2, 4, 5]), 1)).toBe(3)
  })
})

describe('extractSeqFromRef — استخراج الرقم من المرجع', () => {
  test('P-0042 → 42', () => {
    expect(extractSeqFromRef('P-0042')).toBe(42)
  })

  test('P-5 (صيغة قديمة) → 5', () => {
    expect(extractSeqFromRef('P-5')).toBe(5)
  })

  test('F-26-100 → 100', () => {
    expect(extractSeqFromRef('F-26-100')).toBe(100)
  })

  test('P-0001 → 1', () => {
    expect(extractSeqFromRef('P-0001')).toBe(1)
  })

  test('سلسلة فارغة → 0', () => {
    expect(extractSeqFromRef('')).toBe(0)
  })
})

describe('buildUsedSet — بناء مجموعة الأرقام المستخدمة', () => {
  test('مزيج من الصيغ القديمة والجديدة', () => {
    const refs = ['P-1', 'P-0002', 'P-0003', 'P-42']
    const set = buildUsedSet(refs)
    expect(set.has(1)).toBe(true)
    expect(set.has(2)).toBe(true)
    expect(set.has(3)).toBe(true)
    expect(set.has(42)).toBe(true)
    expect(set.has(5)).toBe(false)
  })

  test('قائمة فارغة → set فارغ', () => {
    expect(buildUsedSet([]).size).toBe(0)
  })

  test('يتجاهل الأرقام غير الصالحة', () => {
    const refs = ['P-abc', 'P-0', 'P-5']
    const set = buildUsedSet(refs)
    expect(set.has(5)).toBe(true)
    expect(set.size).toBe(1)
  })
})

describe('formatPaymentRef — تنسيق مرجع الدفعة', () => {
  test('1 → P-0001', () => {
    expect(formatPaymentRef(1)).toBe('P-0001')
  })

  test('42 → P-0042', () => {
    expect(formatPaymentRef(42)).toBe('P-0042')
  })

  test('1000 → P-1000', () => {
    expect(formatPaymentRef(1000)).toBe('P-1000')
  })
})

describe('formatDocNumber — تنسيق رقم المستند', () => {
  test('فاتورة → F-26-1', () => {
    expect(formatDocNumber('F', 26, 1)).toBe('F-26-1')
  })

  test('بون تسليم → BL-26-42', () => {
    expect(formatDocNumber('BL', 26, 42)).toBe('BL-26-42')
  })
})

describe('سيناريوهات متكاملة', () => {
  test('سيناريو: عميل أضاف 42 يدوياً في الماضي، التلقائي وصل لـ 42 → يتجاوز لـ 43', () => {
    // الأرقام المستخدمة: 1..41 + 42 (يدوي)
    const used = new Set(Array.from({length: 42}, (_, i) => i + 1))
    const next = findNextAvailable(used, 42)
    expect(next).toBe(43)
  })

  test('سيناريو: فجوات متعددة → يجد أول فجوة', () => {
    // 1,2,3,5,6,7 مستخدمة → 4 متاح
    const used = new Set([1, 2, 3, 5, 6, 7])
    expect(findNextAvailable(used, 1)).toBe(4)
  })

  test('سيناريو: المستخدم يختار 100، 100 موجود → يُرفض (available: false)', () => {
    const used = new Set([100])
    const isAvailable = !used.has(100)
    expect(isAvailable).toBe(false)
    // الاقتراح
    const suggestion = findNextAvailable(used, 101)
    expect(suggestion).toBe(101)
  })

  test('سيناريو: المستخدم يختار 100، 100 غير موجود → يُقبل (available: true)', () => {
    const used = new Set([1, 2, 3])
    const isAvailable = !used.has(100)
    expect(isAvailable).toBe(true)
  })

  test('سيناريو: صيغ مختلطة P-5 و P-0042 → يحسب max صحيح', () => {
    const refs = ['P-1', 'P-2', 'P-0003', 'P-0042', 'P-5']
    const used = buildUsedSet(refs)
    const max = Math.max(...used)
    expect(max).toBe(42)
    const next = findNextAvailable(used, max + 1)
    expect(next).toBe(43)
  })
})
