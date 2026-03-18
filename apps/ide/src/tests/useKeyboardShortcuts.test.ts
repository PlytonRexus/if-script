import { cleanup, fireEvent } from '@testing-library/react'
import { renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts'

afterEach(() => cleanup())

function makeHandlers() {
  return {
    onCommandPalette: vi.fn(),
    onQuickOpenFiles: vi.fn(),
    onQuickOpenSections: vi.fn(),
    onQuickOpenScenes: vi.fn(),
    onSave: vi.fn(),
    onPlaytest: vi.fn()
  }
}

describe('useKeyboardShortcuts', () => {
  it('Ctrl+K triggers onCommandPalette', () => {
    const handlers = makeHandlers()
    renderHook(() => useKeyboardShortcuts(handlers))
    fireEvent.keyDown(window, { key: 'k', ctrlKey: true })
    expect(handlers.onCommandPalette).toHaveBeenCalledOnce()
  })

  it('Ctrl+P triggers onQuickOpenFiles', () => {
    const handlers = makeHandlers()
    renderHook(() => useKeyboardShortcuts(handlers))
    fireEvent.keyDown(window, { key: 'p', ctrlKey: true })
    expect(handlers.onQuickOpenFiles).toHaveBeenCalledOnce()
  })

  it('Ctrl+Shift+O triggers onQuickOpenSections', () => {
    const handlers = makeHandlers()
    renderHook(() => useKeyboardShortcuts(handlers))
    fireEvent.keyDown(window, { key: 'o', ctrlKey: true, shiftKey: true })
    expect(handlers.onQuickOpenSections).toHaveBeenCalledOnce()
  })

  it('Ctrl+Shift+L triggers onQuickOpenScenes', () => {
    const handlers = makeHandlers()
    renderHook(() => useKeyboardShortcuts(handlers))
    fireEvent.keyDown(window, { key: 'l', ctrlKey: true, shiftKey: true })
    expect(handlers.onQuickOpenScenes).toHaveBeenCalledOnce()
  })

  it('Ctrl+S triggers onSave', () => {
    const handlers = makeHandlers()
    renderHook(() => useKeyboardShortcuts(handlers))
    fireEvent.keyDown(window, { key: 's', ctrlKey: true })
    expect(handlers.onSave).toHaveBeenCalledOnce()
  })

  it('Ctrl+Enter triggers onPlaytest', () => {
    const handlers = makeHandlers()
    renderHook(() => useKeyboardShortcuts(handlers))
    fireEvent.keyDown(window, { key: 'Enter', ctrlKey: true })
    expect(handlers.onPlaytest).toHaveBeenCalledOnce()
  })

  it('does not trigger without modifier key', () => {
    const handlers = makeHandlers()
    renderHook(() => useKeyboardShortcuts(handlers))
    fireEvent.keyDown(window, { key: 'k' })
    fireEvent.keyDown(window, { key: 'p' })
    fireEvent.keyDown(window, { key: 's' })
    expect(handlers.onCommandPalette).not.toHaveBeenCalled()
    expect(handlers.onQuickOpenFiles).not.toHaveBeenCalled()
    expect(handlers.onSave).not.toHaveBeenCalled()
  })

  it('Meta key works as alternative to Ctrl', () => {
    const handlers = makeHandlers()
    renderHook(() => useKeyboardShortcuts(handlers))
    fireEvent.keyDown(window, { key: 'k', metaKey: true })
    expect(handlers.onCommandPalette).toHaveBeenCalledOnce()
  })

  it('preventDefault is called on matched shortcuts', () => {
    const handlers = makeHandlers()
    renderHook(() => useKeyboardShortcuts(handlers))
    const event = new KeyboardEvent('keydown', {
      key: 'k',
      ctrlKey: true,
      bubbles: true,
      cancelable: true
    })
    const spy = vi.spyOn(event, 'preventDefault')
    window.dispatchEvent(event)
    expect(spy).toHaveBeenCalled()
  })
})
