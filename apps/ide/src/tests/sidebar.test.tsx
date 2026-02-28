import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { Sidebar } from '../components/Sidebar'

describe('Sidebar', () => {
  afterEach(() => cleanup())

  it('toggles to sections mode, filters, and opens section target', () => {
    const onOpenSection = vi.fn()
    const onOpenScene = vi.fn()
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
        sceneIndex={[]}
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
        onOpenScene={onOpenScene}
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

  it('shows scenes as first-class entities and opens selected scene', () => {
    const onOpenSection = vi.fn()
    const onOpenScene = vi.fn()
    const onOpenFile = vi.fn()
    const onSetRootFile = vi.fn()

    render(
      <Sidebar
        files={[
          { path: '/workspace/main.if', content: '', dirty: false, version: 1, lastSavedAt: null }
        ]}
        activeFilePath="/workspace/main.if"
        rootFile="/workspace/main.if"
        sectionIndex={[]}
        sceneIndex={[
          {
            serial: 3,
            name: 'Act One',
            first: 'Prologue',
            sections: ['Prologue', 'Hallway'],
            file: '/workspace/main.if',
            line: 2,
            col: 1,
            hasAmbience: true,
            sceneTransition: 'fade',
            firstResolved: true
          }
        ]}
        graph={{ nodes: [], edges: [], startNodeId: null, deadEnds: [] }}
        onOpenFile={onOpenFile}
        onOpenSection={onOpenSection}
        onOpenScene={onOpenScene}
        onSetRootFile={onSetRootFile}
      />
    )

    fireEvent.click(screen.getByRole('button', { name: 'Scenes' }))
    expect(screen.getByText('Act One')).toBeTruthy()
    expect(screen.getByText('audio')).toBeTruthy()
    expect(screen.getByText('fade')).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: /Act One/i }))
    expect(onOpenScene).toHaveBeenCalledWith({
      serial: 3,
      name: 'Act One',
      first: 'Prologue',
      sections: ['Prologue', 'Hallway'],
      file: '/workspace/main.if',
      line: 2,
      col: 1,
      hasAmbience: true,
      sceneTransition: 'fade',
      firstResolved: true
    })
  })
})
