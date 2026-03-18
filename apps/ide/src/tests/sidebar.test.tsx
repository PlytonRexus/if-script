import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { Sidebar } from '../components/Sidebar'
import { makeWorkspaceFile, makeSectionIndex, makeSceneIndex } from './helpers/factories'
import type { SectionIndexEntry, SceneIndexEntry, StoryGraph, WorkspaceFile } from '../types/interfaces'

function renderSidebar(overrides: {
  files?: WorkspaceFile[]
  activeFilePath?: string
  rootFile?: string
  sectionIndex?: SectionIndexEntry[]
  sceneIndex?: SceneIndexEntry[]
  graph?: StoryGraph
  onOpenFile?: ReturnType<typeof vi.fn>
  onOpenSection?: ReturnType<typeof vi.fn>
  onOpenScene?: ReturnType<typeof vi.fn>
  onSetRootFile?: ReturnType<typeof vi.fn>
} = {}) {
  return render(
    <Sidebar
      files={overrides.files ?? [makeWorkspaceFile()]}
      activeFilePath={overrides.activeFilePath ?? '/workspace/main.if'}
      rootFile={overrides.rootFile ?? '/workspace/main.if'}
      sectionIndex={overrides.sectionIndex ?? []}
      sceneIndex={overrides.sceneIndex ?? []}
      graph={overrides.graph ?? { nodes: [], edges: [], startNodeId: null, deadEnds: [] }}
      onOpenFile={overrides.onOpenFile ?? vi.fn()}
      onOpenSection={overrides.onOpenSection ?? vi.fn()}
      onOpenScene={overrides.onOpenScene ?? vi.fn()}
      onSetRootFile={overrides.onSetRootFile ?? vi.fn()}
    />
  )
}

describe('Sidebar', () => {
  afterEach(() => cleanup())

  it('toggles to sections mode, filters, and opens section target', () => {
    const onOpenSection = vi.fn()
    renderSidebar({
      files: [
        makeWorkspaceFile({ path: '/workspace/main.if' }),
        makeWorkspaceFile({ path: '/workspace/chapter.if' })
      ],
      sectionIndex: [
        makeSectionIndex({ serial: 1, title: 'Prologue', file: '/workspace/main.if', line: 4 }),
        makeSectionIndex({ serial: 2, title: 'Hallway', file: '/workspace/chapter.if', line: 8 })
      ],
      graph: {
        nodes: [
          { id: 'section:Prologue', label: 'Prologue', nodeType: 'section', ending: false, unreachable: true, hasError: false },
          { id: 'section:Hallway', label: 'Hallway', nodeType: 'section', ending: false, unreachable: false, hasError: false }
        ],
        edges: [],
        startNodeId: null,
        deadEnds: ['section:Hallway']
      },
      onOpenSection
    })

    fireEvent.click(screen.getByRole('button', { name: 'Sections' }))
    fireEvent.change(screen.getByPlaceholderText('Filter sections...'), { target: { value: 'hall' } })

    expect(screen.queryByText('Prologue')).toBeNull()
    expect(screen.getByText('Hallway')).toBeTruthy()
    expect(screen.getByText('dead-end')).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: /Hallway/i }))
    expect(onOpenSection).toHaveBeenCalledWith(expect.objectContaining({
      serial: 2,
      title: 'Hallway'
    }))
  })

  it('shows scenes as first-class entities and opens selected scene', () => {
    const onOpenScene = vi.fn()
    renderSidebar({
      sceneIndex: [makeSceneIndex({
        serial: 3,
        name: 'Act One',
        first: 'Prologue',
        sections: ['Prologue', 'Hallway'],
        hasAmbience: true,
        sceneTransition: 'fade',
        firstResolved: true
      })],
      onOpenScene
    })

    fireEvent.click(screen.getByRole('button', { name: 'Scenes' }))
    expect(screen.getByText('Act One')).toBeTruthy()
    expect(screen.getByText('audio')).toBeTruthy()
    expect(screen.getByText('fade')).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: /Act One/i }))
    expect(onOpenScene).toHaveBeenCalledWith(expect.objectContaining({
      serial: 3,
      name: 'Act One'
    }))
  })

  it('renders file list in files mode', () => {
    renderSidebar({
      files: [
        makeWorkspaceFile({ path: '/workspace/main.if' }),
        makeWorkspaceFile({ path: '/workspace/chapter.if' })
      ]
    })
    expect(screen.getByText('main.if')).toBeTruthy()
    expect(screen.getByText('chapter.if')).toBeTruthy()
  })

  it('highlights active file', () => {
    renderSidebar({
      files: [
        makeWorkspaceFile({ path: '/workspace/main.if' }),
        makeWorkspaceFile({ path: '/workspace/other.if' })
      ],
      activeFilePath: '/workspace/main.if'
    })
    const mainBtn = screen.getByText('main.if').closest('button')!
    expect(mainBtn.className).toContain('active')
    const otherBtn = screen.getByText('other.if').closest('button')!
    expect(otherBtn.className).not.toContain('active')
  })

  it('shows entry tag on root file', () => {
    renderSidebar({ rootFile: '/workspace/main.if' })
    expect(screen.getByText('entry')).toBeTruthy()
  })

  it('click on file calls onOpenFile', () => {
    const onOpenFile = vi.fn()
    renderSidebar({
      files: [makeWorkspaceFile({ path: '/workspace/main.if' })],
      onOpenFile
    })
    fireEvent.click(screen.getByText('main.if'))
    expect(onOpenFile).toHaveBeenCalledWith('/workspace/main.if')
  })

  it('shows dirty indicator on modified files', () => {
    renderSidebar({
      files: [makeWorkspaceFile({ path: '/workspace/main.if', dirty: true })]
    })
    expect(screen.getByLabelText('dirty')).toBeTruthy()
  })

  it('shows Set Entry button for non-root files', () => {
    const onSetRootFile = vi.fn()
    renderSidebar({
      files: [
        makeWorkspaceFile({ path: '/workspace/main.if' }),
        makeWorkspaceFile({ path: '/workspace/other.if' })
      ],
      rootFile: '/workspace/main.if',
      onSetRootFile
    })
    const setEntryButtons = screen.getAllByText('Set Entry')
    expect(setEntryButtons.length).toBe(1)
    fireEvent.click(setEntryButtons[0]!)
    expect(onSetRootFile).toHaveBeenCalledWith('/workspace/other.if')
  })

  it('does not show Set Entry for root file', () => {
    renderSidebar({
      files: [makeWorkspaceFile({ path: '/workspace/main.if' })],
      rootFile: '/workspace/main.if'
    })
    expect(screen.queryByText('Set Entry')).toBeNull()
  })

  it('tab switching between files, sections, scenes', () => {
    renderSidebar({
      sectionIndex: [makeSectionIndex({ title: 'Prologue' })],
      sceneIndex: [makeSceneIndex({ name: 'Act One' })]
    })

    expect(screen.getByText('1 files')).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: 'Sections' }))
    expect(screen.getByText('1 sections')).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: 'Scenes' }))
    expect(screen.getByText('1 scenes')).toBeTruthy()
  })

  it('scenes mode shows sections count badge', () => {
    renderSidebar({
      sceneIndex: [makeSceneIndex({
        name: 'Act One',
        sections: ['A', 'B', 'C']
      })]
    })
    fireEvent.click(screen.getByRole('button', { name: 'Scenes' }))
    expect(screen.getByText('3 sections')).toBeTruthy()
  })

  it('scenes mode shows first unresolved badge', () => {
    renderSidebar({
      sceneIndex: [makeSceneIndex({ name: 'Broken', firstResolved: false })]
    })
    fireEvent.click(screen.getByRole('button', { name: 'Scenes' }))
    expect(screen.getByText('first unresolved')).toBeTruthy()
  })

  it('scenes mode filters by name', () => {
    renderSidebar({
      sceneIndex: [
        makeSceneIndex({ serial: 1, name: 'Act One' }),
        makeSceneIndex({ serial: 2, name: 'Act Two' })
      ]
    })
    fireEvent.click(screen.getByRole('button', { name: 'Scenes' }))
    fireEvent.change(screen.getByPlaceholderText('Filter scenes...'), { target: { value: 'two' } })
    expect(screen.queryByText('Act One')).toBeNull()
    expect(screen.getByText('Act Two')).toBeTruthy()
  })

  it('sections mode shows unreachable badge', () => {
    renderSidebar({
      sectionIndex: [makeSectionIndex({ serial: 1, title: 'Ghost' })],
      graph: {
        nodes: [{ id: 'section:Ghost', label: 'Ghost', nodeType: 'section', ending: false, unreachable: true, hasError: false }],
        edges: [],
        startNodeId: null,
        deadEnds: []
      }
    })
    fireEvent.click(screen.getByRole('button', { name: 'Sections' }))
    expect(screen.getByText('unreachable')).toBeTruthy()
  })

  it('sections mode shows empty state when filter matches nothing', () => {
    renderSidebar({
      sectionIndex: [makeSectionIndex({ title: 'Prologue' })]
    })
    fireEvent.click(screen.getByRole('button', { name: 'Sections' }))
    fireEvent.change(screen.getByPlaceholderText('Filter sections...'), { target: { value: 'zzz' } })
    expect(screen.getByText('No matching sections.')).toBeTruthy()
  })

  it('scenes mode shows empty state when filter matches nothing', () => {
    renderSidebar({
      sceneIndex: [makeSceneIndex({ name: 'Act One' })]
    })
    fireEvent.click(screen.getByRole('button', { name: 'Scenes' }))
    fireEvent.change(screen.getByPlaceholderText('Filter scenes...'), { target: { value: 'zzz' } })
    expect(screen.getByText('No matching scenes.')).toBeTruthy()
  })

  it('active tab button has active class', () => {
    renderSidebar()
    const filesBtn = screen.getByRole('button', { name: 'Files' })
    expect(filesBtn.className).toContain('active')
    const sectionsBtn = screen.getByRole('button', { name: 'Sections' })
    expect(sectionsBtn.className).not.toContain('active')
  })
})
