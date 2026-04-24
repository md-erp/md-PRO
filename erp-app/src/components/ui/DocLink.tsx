import { useState } from 'react'
import Drawer from './Drawer'
import DocumentDetail from '../DocumentDetail'

interface Props {
  docId?: number | null
  docNumber?: string | null
  /** نص بديل إذا لم يكن هناك رقم */
  fallback?: string
  className?: string
}

/**
 * DocLink
 * ───────
 * يعرض رقم وثيقة كرابط قابل للضغط.
 * عند الضغط يفتح Drawer بتفاصيل الوثيقة.
 *
 * الاستخدام:
 *   <DocLink docId={p.document_id} docNumber={p.document_number} />
 */
export default function DocLink({ docId, docNumber, fallback = '—', className }: Props) {
  const [open, setOpen] = useState(false)

  if (!docId && !docNumber) {
    return <span className="text-gray-400">{fallback}</span>
  }

  if (!docId) {
    // رقم بدون ID — عرض فقط بدون رابط
    return (
      <span className={`font-mono text-xs font-semibold text-primary ${className ?? ''}`}>
        {docNumber}
      </span>
    )
  }

  return (
    <>
      <button
        type="button"
        onClick={e => { e.stopPropagation(); setOpen(true) }}
        className={`font-mono text-xs font-semibold text-primary hover:underline hover:text-primary/80 transition-colors cursor-pointer ${className ?? ''}`}
        title={`Voir ${docNumber ?? `#${docId}`}`}
      >
        {docNumber ?? `#${docId}`}
      </button>

      <Drawer
        open={open}
        onClose={() => setOpen(false)}
        title={`Document ${docNumber ?? `#${docId}`}`}
      >
        <DocumentDetail
          docId={docId}
          onClose={() => setOpen(false)}
          onUpdated={() => {}}
        />
      </Drawer>
    </>
  )
}
