import { useEffect, useMemo, useState } from 'react'
import type { CommandPaletteItem, CommandPaletteMode } from '../types/interfaces'

interface CommandPaletteProps {
  open: boolean
  mode: CommandPaletteMode
  items: CommandPaletteItem[]
  onClose: () => void
}

function modeToKind(mode: CommandPaletteMode): CommandPaletteItem['kind'] | null {
  if (mode === 'files') return 'file'
  if (mode === 'sections') return 'section'
  return null
}

function itemSearchText(item: CommandPaletteItem): string {
  return [
    item.title,
    item.category,
    item.shortcut,
    ...(item.keywords ?? [])
  ].join(' ').toLowerCase()
}

export function CommandPalette(props: CommandPaletteProps): JSX.Element | null {
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState(0)

  useEffect(() => {
    if (!props.open) {
      setQuery('')
      setSelected(0)
    }
  }, [props.open])

  const filtered = useMemo(() => {
    const modeKind = modeToKind(props.mode)
    const base = modeKind ? props.items.filter(item => item.kind === modeKind) : props.items
    const q = query.trim().toLowerCase()
    if (q === '') return base

    return base
      .map((item, index) => {
        const text = itemSearchText(item)
        const title = item.title.toLowerCase()
        const keywordPrefix = (item.keywords ?? []).some(keyword => keyword.toLowerCase().startsWith(q))

        let rank = 99
        if (title.startsWith(q) || keywordPrefix) rank = 0
        else if (text.includes(q)) rank = 1

        return { item, rank, index }
      })
      .filter(entry => entry.rank < 99)
      .sort((a, b) => {
        if (a.rank !== b.rank) return a.rank - b.rank
        return a.index - b.index
      })
      .map(entry => entry.item)
  }, [props.items, props.mode, query])

  useEffect(() => {
    setQuery('')
    setSelected(0)
  }, [props.mode])

  useEffect(() => {
    if (!props.open) return

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        props.onClose()
        return
      }

      if (event.key === 'ArrowDown') {
        event.preventDefault()
        setSelected(value => Math.min(value + 1, Math.max(filtered.length - 1, 0)))
      }

      if (event.key === 'ArrowUp') {
        event.preventDefault()
        setSelected(value => Math.max(value - 1, 0))
      }

      if (event.key === 'Enter') {
        event.preventDefault()
        const item = filtered[selected]
        if (!item) return
        item.run()
        props.onClose()
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [filtered, props, selected])

  if (!props.open) return null

  return (
    <div className="command-palette-backdrop" onClick={props.onClose}>
      <div className="command-palette" onClick={(event) => event.stopPropagation()}>
        <input
          autoFocus
          className="command-input"
          placeholder={props.mode === 'files' ? 'Quick open files...' : props.mode === 'sections' ? 'Quick open sections...' : 'Type a command'}
          value={query}
          onChange={(event) => {
            setQuery(event.currentTarget.value)
            setSelected(0)
          }}
        />

        <ul className="command-list" role="listbox" aria-label="Command list">
          {filtered.length === 0 ? <li className="command-empty">No matching command.</li> : null}
          {filtered.map((item, index) => (
            <li key={item.id}>
              <button
                className={['command-item', selected === index ? 'selected' : ''].join(' ').trim()}
                onClick={() => {
                  item.run()
                  props.onClose()
                }}
              >
                <span>{item.title}</span>
                <small>{item.category} - {item.shortcut}</small>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
