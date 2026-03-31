import { useEffect } from 'react'

interface Shortcuts {
  onNew?:   () => void
  onSave?:  () => void
  onPrint?: () => void
}

export function useKeyboardShortcuts(shortcuts: Shortcuts) {
  useEffect(() => {
    function handler(e: KeyboardEvent) {
      const ctrl = e.ctrlKey || e.metaKey

      if (ctrl && e.key === 'n') { e.preventDefault(); shortcuts.onNew?.() }
      if (ctrl && e.key === 's') { e.preventDefault(); shortcuts.onSave?.() }
      if (ctrl && e.key === 'p') { e.preventDefault(); shortcuts.onPrint?.() }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [shortcuts])
}
