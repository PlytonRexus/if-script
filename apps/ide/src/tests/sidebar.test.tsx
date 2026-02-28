import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { Sidebar } from '../components/Sidebar'

describe('Sidebar', () => {
  it('toggles to sections mode, filters, and opens section target', () => {
    const onOpenSection = vi.fn()
    const onOpenFile = vi.fn()
    const onSetRootFile = vi.fn()

    render(
      <Sidebar
        files={[
          { path: '/workspace/main.if', content: '', dirty: false, version: 1, lastSavedAt: null },
          { path: '/workspace/chapter.if', content: '', dirty: false, version: 1, lastSavedAt: null }
        ]}
        activeFilePath="/workspace/main.if"
        rootFile="/workspace/main.if"
        sectionIndex={[
          { serial: 1, title: 'Prologue', file: '/workspace/main.if', line: 4, col: 1 },
          { serial: 2, title: 'Hallway', file: '/workspace/chapter.if', line: 8, col: 1 }
        ]}
        graph={{
          nodes: [
            { id: 'section:Prologue', label: 'Prologue', nodeType: 'section', ending: false, unreachable: true, hasError: false },
            { id: 'section:Hallway', label: 'Hallway', nodeType: 'section', ending: false, unreachable: false, hasError: false }
          ],
          edges: [],
          startNodeId: null,
          deadEnds: ['section:Hallway']
        }}
        onOpenFile={onOpenFile}
        onOpenSection={onOpenSection}
        onSetRootFile={onSetRootFile}
      />
    )

    fireEvent.click(screen.getByRole('button', { name: 'Sections' }))
    fireEvent.change(screen.getByPlaceholderText('Filter sections...'), { target: { value: 'hall' } })

    expect(screen.queryByText('Prologue')).toBeNull()
    expect(screen.getByText('Hallway')).toBeTruthy()
    expect(screen.getByText('dead-end')).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: /Hallway/i }))
    expect(onOpenSection).toHaveBeenCalledWith({
      serial: 2,
      title: 'Hallway',
      file: '/workspace/chapter.if',
      line: 8,
      col: 1
    })
  })
})
