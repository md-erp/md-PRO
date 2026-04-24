import { useEffect, useRef, useState, useCallback } from 'react'

interface Props {
  open: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
  size?: 'sm' | 'md' | 'lg' | 'xl'
}

const SIZES = {
  sm: 'max-w-md',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl',
}

let modalDepth = 0

export default function Modal({ open, onClose, title, children, size = 'md' }: Props) {
  const overlayRef  = useRef<HTMLDivElement>(null)
  const depthRef    = useRef(0)
  const dialogRef   = useRef<HTMLDivElement>(null)

  // ── Resize state ──────────────────────────────────────────────────────────
  const [dims, setDims]       = useState<{ w: number; h: number } | null>(null)
  const resizing              = useRef(false)
  const resizeStart           = useRef({ x: 0, y: 0, w: 0, h: 0 })

  const onResizeMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    const el = dialogRef.current
    if (!el) return
    resizing.current = true
    resizeStart.current = {
      x: e.clientX,
      y: e.clientY,
      w: el.offsetWidth,
      h: el.offsetHeight,
    }

    const onMove = (ev: MouseEvent) => {
      if (!resizing.current) return
      const dw = ev.clientX - resizeStart.current.x
      const dh = ev.clientY - resizeStart.current.y
      setDims({
        w: Math.max(320, resizeStart.current.w + dw),
        h: Math.max(200, resizeStart.current.h + dh),
      })
    }
    const onUp = () => {
      resizing.current = false
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }, [])

  // Reset dims when modal closes
  useEffect(() => { if (!open) setDims(null) }, [open])

  useEffect(() => {
    if (!open) return
    modalDepth++
    depthRef.current = modalDepth
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => {
      modalDepth--
      window.removeEventListener('keydown', handler)
    }
  }, [open, onClose])

  if (!open) return null

  const zClass = depthRef.current > 1 ? 'z-[60]' : 'z-50'

  const sizeStyle = dims
    ? { width: dims.w, height: dims.h, maxWidth: '95vw', maxHeight: '95vh' }
    : undefined

  return (
    <div
      ref={overlayRef}
      className={`fixed inset-0 ${zClass} flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm`}
    >
      <div
        ref={dialogRef}
        className={`card w-full ${dims ? '' : SIZES[size]} shadow-xl flex flex-col ${dims ? '' : 'max-h-[90vh]'} relative`}
        style={sizeStyle}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-700 shrink-0">
          <h2 className="text-base font-semibold text-gray-800 dark:text-white">{title}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors text-xl leading-none">&#x2715;</button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {children}
        </div>

        {/* Resize handle — bottom-right corner */}
        <div
          onMouseDown={onResizeMouseDown}
          className="absolute bottom-0 right-0 w-4 h-4 cursor-se-resize flex items-end justify-end pb-0.5 pr-0.5 opacity-30 hover:opacity-70 transition-opacity select-none"
          title="Redimensionner"
        >
          <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor" className="text-gray-500">
            <path d="M0 10 L10 0 L10 10 Z" />
          </svg>
        </div>
      </div>
    </div>
  )
}
