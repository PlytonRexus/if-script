import { useEffect } from 'react'

interface ShortcutHandlers {
  onCommandPalette: () => void
  onQuickOpenFiles: () => void
  onQuickOpenSections: () => void
  onSave: () => void
  onPlaytest: () => void
}

export function useKeyboardShortcuts(handlers: ShortcutHandlers): void {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase()
      const hasPrimaryMod = event.metaKey || event.ctrlKey

      if (hasPrimaryMod && key === 'k') {
        event.preventDefault()
        handlers.onCommandPalette()
      }

      if (hasPrimaryMod && key === 'p') {
        event.preventDefault()
        handlers.onQuickOpenFiles()
      }

      if (hasPrimaryMod && event.shiftKey && key === 'o') {
        event.preventDefault()
        handlers.onQuickOpenSections()
      }

      if (hasPrimaryMod && key === 's') {
        event.preventDefault()
        handlers.onSave()
      }

      if (hasPrimaryMod && key === 'enter') {
        event.preventDefault()
        handlers.onPlaytest()
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [handlers])
}
