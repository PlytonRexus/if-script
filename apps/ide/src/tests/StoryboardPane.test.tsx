import { cleanup, fireEvent, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  makeSceneIndex,
  makeSectionIndex,
  makeStoryGraph,
  makeStoryGraphEdge,
  makeStoryGraphNode
} from './helpers/factories'
import { renderStoryboardPane } from './helpers/renderHelpers'

describe('StoryboardPane', () => {
  afterEach(() => cleanup())

  it('shows empty state when sectionIndex is empty', () => {
    renderStoryboardPane()
    expect(screen.getByText('No sections yet.')).toBeTruthy()
  })

  it('displays total section count in header', () => {
    renderStoryboardPane({
      sectionIndex: [
        makeSectionIndex({ serial: 1, title: 'A', file: '/workspace/a.if' }),
        makeSectionIndex({ serial: 2, title: 'B', file: '/workspace/b.if' })
      ]
    })
    expect(screen.getByText('2 sections')).toBeTruthy()
  })

  it('groups sections by file into lanes sorted by file path', () => {
    renderStoryboardPane({
      sectionIndex: [
        makeSectionIndex({ serial: 1, title: 'Alpha', file: '/workspace/b.if' }),
        makeSectionIndex({ serial: 2, title: 'Beta', file: '/workspace/a.if' })
      ]
    })
    const lanes = document.querySelectorAll('.storyboard-lane')
    expect(lanes.length).toBe(2)
    // a.if should come first alphabetically
    expect(lanes[0]?.querySelector('strong')?.textContent).toBe('a.if')
    expect(lanes[1]?.querySelector('strong')?.textContent).toBe('b.if')
  })

  it('lane header shows file name without /workspace/ prefix and section count', () => {
    renderStoryboardPane({
      sectionIndex: [
        makeSectionIndex({ serial: 1, title: 'Intro', file: '/workspace/story/main.if' }),
        makeSectionIndex({ serial: 2, title: 'Outro', file: '/workspace/story/main.if' })
      ]
    })
    expect(screen.getByText('story/main.if')).toBeTruthy()
    // The lane header should show "2 sections" for that file
    const laneHeader = document.querySelector('.storyboard-lane header')
    expect(laneHeader?.textContent).toContain('2 sections')
  })

  it('section card shows title, serial, line number, and outgoing link count', () => {
    const node = makeStoryGraphNode({ id: 'section:Intro', label: 'Intro' })
    const edge = makeStoryGraphEdge({ from: 'section:Intro', to: 'section:End' })
    renderStoryboardPane({
      sectionIndex: [makeSectionIndex({ serial: 3, title: 'Intro', line: 10, entityId: 'section:Intro' })],
      graph: makeStoryGraph({ nodes: [node], edges: [edge] })
    })
    expect(screen.getByText('Intro')).toBeTruthy()
    expect(screen.getByText('#3 line 10')).toBeTruthy()
    expect(screen.getByText('1 links')).toBeTruthy()
  })

  it('click section card calls onOpenSection with correct entry', () => {
    const onOpenSection = vi.fn()
    const section = makeSectionIndex({ serial: 1, title: 'Intro' })
    renderStoryboardPane({
      sectionIndex: [section],
      onOpenSection
    })
    fireEvent.click(screen.getByText('Intro'))
    expect(onOpenSection).toHaveBeenCalledWith(expect.objectContaining({ serial: 1, title: 'Intro' }))
  })

  it('shows "unreachable" badge when graph node is unreachable', () => {
    const node = makeStoryGraphNode({ id: 'section:Lost', label: 'Lost', unreachable: true })
    renderStoryboardPane({
      sectionIndex: [makeSectionIndex({ serial: 1, title: 'Lost', entityId: 'section:Lost' })],
      graph: makeStoryGraph({ nodes: [node] })
    })
    expect(screen.getByText('unreachable')).toBeTruthy()
  })

  it('shows "attention" badge when graph node has error', () => {
    const node = makeStoryGraphNode({ id: 'section:Broken', label: 'Broken', hasError: true })
    renderStoryboardPane({
      sectionIndex: [makeSectionIndex({ serial: 1, title: 'Broken', entityId: 'section:Broken' })],
      graph: makeStoryGraph({ nodes: [node] })
    })
    expect(screen.getByText('attention')).toBeTruthy()
  })

  it('no badge when graph node not found (graceful)', () => {
    renderStoryboardPane({
      sectionIndex: [makeSectionIndex({ serial: 1, title: 'Orphan' })],
      graph: makeStoryGraph({ nodes: [] })
    })
    expect(screen.queryByText('unreachable')).toBeNull()
    expect(screen.queryByText('attention')).toBeNull()
  })

  it('renders scene list under file lane when scenes exist', () => {
    renderStoryboardPane({
      sectionIndex: [makeSectionIndex({ serial: 1, title: 'Intro', file: '/workspace/main.if' })],
      sceneIndex: [makeSceneIndex({ serial: 1, name: 'Act One', file: '/workspace/main.if' })]
    })
    expect(screen.getByText('Scenes')).toBeTruthy()
    expect(screen.getByText('Act One')).toBeTruthy()
  })

  it('click scene button calls onOpenScene', () => {
    const onOpenScene = vi.fn()
    const scene = makeSceneIndex({ serial: 1, name: 'Act One', file: '/workspace/main.if' })
    renderStoryboardPane({
      sectionIndex: [makeSectionIndex({ file: '/workspace/main.if' })],
      sceneIndex: [scene],
      onOpenScene
    })
    fireEvent.click(screen.getByText('Act One'))
    expect(onOpenScene).toHaveBeenCalledWith(expect.objectContaining({ serial: 1, name: 'Act One' }))
  })

  it('no scene section rendered when file has no scenes', () => {
    renderStoryboardPane({
      sectionIndex: [makeSectionIndex({ file: '/workspace/main.if' })],
      sceneIndex: [makeSceneIndex({ file: '/workspace/other.if' })]
    })
    // The lane for main.if should not have a Scenes heading
    const lane = document.querySelector('.storyboard-lane')
    expect(lane?.querySelector('.storyboard-scenes')).toBeNull()
  })
})
