import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { CommandPalette } from '../components/CommandPalette'
import { renderCommandPalette } from './helpers/renderHelpers'
import { makeCommandPaletteItem } from './helpers/factories'

afterEach(() => cleanup())

describe('CommandPalette', () => {
  it('returns null when open is false', () => {
    const { container } = render(
      <CommandPalette open={false} mode="all" items={[]} onClose={vi.fn()} />
    )
    expect(container.innerHTML).toBe('')
  })

  it('renders items when open is true', () => {
    renderCommandPalette({
      items: [
        makeCommandPaletteItem({ id: 'a', title: 'Command A' }),
        makeCommandPaletteItem({ id: 'b', title: 'Command B' })
      ]
    })
    expect(screen.getByText('Command A')).toBeTruthy()
    expect(screen.getByText('Command B')).toBeTruthy()
  })

  it('shows correct placeholder for all mode', () => {
    renderCommandPalette({ mode: 'all' })
    expect(screen.getByPlaceholderText('Type a command')).toBeTruthy()
  })

  it('shows correct placeholder for files mode', () => {
    renderCommandPalette({ mode: 'files' })
    expect(screen.getByPlaceholderText('Quick open files...')).toBeTruthy()
  })

  it('shows correct placeholder for sections mode', () => {
    renderCommandPalette({ mode: 'sections' })
    expect(screen.getByPlaceholderText('Quick open sections...')).toBeTruthy()
  })

  it('shows correct placeholder for scenes mode', () => {
    renderCommandPalette({ mode: 'scenes' })
    expect(screen.getByPlaceholderText('Quick open scenes...')).toBeTruthy()
  })

  it('filters items by kind in files mode', () => {
    renderCommandPalette({
      mode: 'files',
      items: [
        makeCommandPaletteItem({ id: 'f1', title: 'main.if', kind: 'file' }),
        makeCommandPaletteItem({ id: 'c1', title: 'Check', kind: 'command' })
      ]
    })
    expect(screen.getByText('main.if')).toBeTruthy()
    expect(screen.queryByText('Check')).toBeNull()
  })

  it('shows empty state when no items match query', () => {
    renderCommandPalette({
      items: [makeCommandPaletteItem({ id: 'a', title: 'Alpha' })]
    })
    fireEvent.change(screen.getByPlaceholderText('Type a command'), { target: { value: 'zzz' } })
    expect(screen.getByText('No matching command.')).toBeTruthy()
  })

  it('fuzzy filters by query text', () => {
    renderCommandPalette({
      items: [
        makeCommandPaletteItem({ id: 'a', title: 'New File' }),
        makeCommandPaletteItem({ id: 'b', title: 'Delete File' }),
        makeCommandPaletteItem({ id: 'c', title: 'Theme Toggle' })
      ]
    })
    fireEvent.change(screen.getByPlaceholderText('Type a command'), { target: { value: 'file' } })
    expect(screen.getByText('New File')).toBeTruthy()
    expect(screen.getByText('Delete File')).toBeTruthy()
    expect(screen.queryByText('Theme Toggle')).toBeNull()
  })

  it('ranks title prefix matches above substring matches', () => {
    renderCommandPalette({
      items: [
        makeCommandPaletteItem({ id: 'a', title: 'Export Bundle', category: 'File' }),
        makeCommandPaletteItem({ id: 'b', title: 'File Export', category: 'File' })
      ]
    })
    fireEvent.change(screen.getByPlaceholderText('Type a command'), { target: { value: 'file' } })
    const buttons = screen.getAllByRole('button').filter(btn => btn.classList.contains('command-item'))
    expect(buttons[0]!.textContent).toContain('File Export')
  })

  it('ranks keyword prefix matches as top rank', () => {
    renderCommandPalette({
      items: [
        makeCommandPaletteItem({ id: 'a', title: 'Something Else', keywords: ['zap'] }),
        makeCommandPaletteItem({ id: 'b', title: 'Another Thing', keywords: ['zoom'] })
      ]
    })
    fireEvent.change(screen.getByPlaceholderText('Type a command'), { target: { value: 'zoo' } })
    const buttons = screen.getAllByRole('button').filter(btn => btn.classList.contains('command-item'))
    expect(buttons.length).toBe(1)
    expect(buttons[0]!.textContent).toContain('Another Thing')
  })

  it('click on item calls run and onClose', () => {
    const run = vi.fn()
    const onClose = vi.fn()
    renderCommandPalette({
      items: [makeCommandPaletteItem({ id: 'a', title: 'Do Thing', run })],
      onClose
    })
    fireEvent.click(screen.getByText('Do Thing').closest('button')!)
    expect(run).toHaveBeenCalledOnce()
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('ArrowDown selects next item', () => {
    renderCommandPalette({
      items: [
        makeCommandPaletteItem({ id: 'a', title: 'First' }),
        makeCommandPaletteItem({ id: 'b', title: 'Second' })
      ]
    })
    fireEvent.keyDown(window, { key: 'ArrowDown' })
    const secondBtn = screen.getByText('Second').closest('button')!
    expect(secondBtn.className).toContain('selected')
  })

  it('ArrowUp selects previous item', () => {
    renderCommandPalette({
      items: [
        makeCommandPaletteItem({ id: 'a', title: 'First' }),
        makeCommandPaletteItem({ id: 'b', title: 'Second' })
      ]
    })
    fireEvent.keyDown(window, { key: 'ArrowDown' })
    fireEvent.keyDown(window, { key: 'ArrowUp' })
    const firstBtn = screen.getByText('First').closest('button')!
    expect(firstBtn.className).toContain('selected')
  })

  it('ArrowDown does not exceed list bounds', () => {
    renderCommandPalette({
      items: [makeCommandPaletteItem({ id: 'a', title: 'Only' })]
    })
    fireEvent.keyDown(window, { key: 'ArrowDown' })
    fireEvent.keyDown(window, { key: 'ArrowDown' })
    const btn = screen.getByText('Only').closest('button')!
    expect(btn.className).toContain('selected')
  })

  it('ArrowUp does not go below 0', () => {
    renderCommandPalette({
      items: [makeCommandPaletteItem({ id: 'a', title: 'Only' })]
    })
    fireEvent.keyDown(window, { key: 'ArrowUp' })
    const btn = screen.getByText('Only').closest('button')!
    expect(btn.className).toContain('selected')
  })

  it('Enter selects current item and closes', () => {
    const run = vi.fn()
    const onClose = vi.fn()
    renderCommandPalette({
      items: [makeCommandPaletteItem({ id: 'a', title: 'RunMe', run })],
      onClose
    })
    fireEvent.keyDown(window, { key: 'Enter' })
    expect(run).toHaveBeenCalledOnce()
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('Escape closes the palette', () => {
    const onClose = vi.fn()
    renderCommandPalette({ onClose })
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('backdrop click closes the palette', () => {
    const onClose = vi.fn()
    renderCommandPalette({ onClose })
    const backdrop = document.querySelector('.command-palette-backdrop')!
    fireEvent.click(backdrop)
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('palette body click does not close', () => {
    const onClose = vi.fn()
    renderCommandPalette({ onClose })
    const body = document.querySelector('.command-palette')!
    fireEvent.click(body)
    expect(onClose).not.toHaveBeenCalled()
  })

  it('query resets on close and reopen', () => {
    const { rerender } = render(
      <CommandPalette
        open={true}
        mode="all"
        items={[makeCommandPaletteItem({ id: 'a', title: 'Alpha' })]}
        onClose={vi.fn()}
      />
    )
    fireEvent.change(screen.getByPlaceholderText('Type a command'), { target: { value: 'test' } })
    expect(screen.getByDisplayValue('test')).toBeTruthy()

    rerender(
      <CommandPalette open={false} mode="all" items={[]} onClose={vi.fn()} />
    )
    rerender(
      <CommandPalette
        open={true}
        mode="all"
        items={[makeCommandPaletteItem({ id: 'a', title: 'Alpha' })]}
        onClose={vi.fn()}
      />
    )
    expect(screen.getByDisplayValue('')).toBeTruthy()
  })
})
