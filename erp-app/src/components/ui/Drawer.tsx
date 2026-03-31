import { useEffect } from 'react'

interface Props {
  open: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
  width?: string
}

export default function Drawer({ open, onClose, title, children, width = 'w-[600px]' }: Props) {
  useEffect(() => {
    if (!open) return
    // Escape مُعطَّل للـ Drawer أيضاً — لمنع فقدان البيانات
  }, [open, onClose])

  return (
    <>
      {/* Overlay — لا يُغلق عند الضغط عليه */}
      {open && (
        <div className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm" />
      )}

      {/* Drawer */}
      <div className={`fixed top-0 right-0 h-full z-50 bg-white dark:bg-gray-800 shadow-2xl
        flex flex-col transition-transform duration-300 ${width}
        ${open ? 'translate-x-0' : 'translate-x-full'}`}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-700 shrink-0">
          <h2 className="text-base font-semibold text-gray-800 dark:text-white">{title}</h2>
          <button
            onClick={onClose}
            className="text-sm text-gray-500 hover:text-gray-800 dark:hover:text-white font-medium transition-colors">
            ← Fermer
          </button>
        </div>
        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {children}
        </div>
      </div>
    </>
  )
}
