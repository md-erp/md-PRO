import { useRef, useEffect } from 'react'

/**
 * useTableScroll
 * ──────────────
 * داخل الجدول  → الجدول يتمرر، الصفحة لا تتمرر
 * خارج الجدول → الصفحة تتمرر بشكل طبيعي
 *
 * يستخدم addEventListener مع passive: false
 * لأن React يجعل onWheel passive بشكل افتراضي
 */
export function useTableScroll() {
  const tableRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = tableRef.current
    if (!el) return

    const handler = (e: WheelEvent) => {
      const { scrollTop, scrollHeight, clientHeight } = el
      const atTop    = scrollTop <= 0 && e.deltaY < 0
      const atBottom = scrollTop + clientHeight >= scrollHeight - 1 && e.deltaY > 0

      // عند نهاية الجدول → اترك الصفحة تتمرر
      if (atTop || atBottom) return

      // داخل الجدول → تمرير الجدول ومنع الصفحة
      e.preventDefault()
      el.scrollTop += e.deltaY
    }

    el.addEventListener('wheel', handler, { passive: false })
    return () => el.removeEventListener('wheel', handler)
  }, [])

  // onWheel prop فارغ — المنطق الحقيقي في addEventListener
  const onWheel = () => {}

  return { tableRef, onWheel }
}
