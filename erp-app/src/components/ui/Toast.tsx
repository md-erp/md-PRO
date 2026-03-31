import { useEffect, useState } from 'react'

export type ToastType = 'success' | 'error' | 'warning'

interface Toast {
  id: number
  message: string
  type: ToastType
}

let addToastFn: ((msg: string, type: ToastType) => void) | null = null

export function toast(message: string, type: ToastType = 'success') {
  addToastFn?.(message, type)
}

const ICONS = { success: '✅', error: '❌', warning: '⚠️' }
const COLORS = {
  success: 'bg-green-50 border-green-200 text-green-800',
  error:   'bg-red-50 border-red-200 text-red-800',
  warning: 'bg-orange-50 border-orange-200 text-orange-800',
}

export default function ToastContainer() {
  const [toasts, setToasts] = useState<Toast[]>([])

  useEffect(() => {
    addToastFn = (message, type) => {
      const id = Date.now()
      setToasts(prev => [...prev, { id, message, type }])
      setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3500)
    }
    return () => { addToastFn = null }
  }, [])

  return (
    <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none">
      {toasts.map(t => (
        <div key={t.id}
          className={`flex items-center gap-2 px-4 py-3 rounded-lg border shadow-lg text-sm font-medium
            pointer-events-auto animate-in slide-in-from-right-4 ${COLORS[t.type]}`}>
          <span>{ICONS[t.type]}</span>
          {t.message}
        </div>
      ))}
    </div>
  )
}
