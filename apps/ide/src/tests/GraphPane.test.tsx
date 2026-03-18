import { cleanup, fireEvent, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  makeStoryGraph,
  makeStoryGraphEdge,
  makeStoryGraphNode
} from './helpers/factories'
import { renderGraphPane } from './helpers/renderHelpers'

function twoNodeGraph() {
  const n1 = makeStoryGraphNode({ id: 'n1', label: 'Intro' })
  const n2 = makeStoryGraphNode({ id: 'n2', label: 'Hallway' })
  const edge = makeStoryGraphEdge({ from: 'n1', to: 'n2' })
  return makeStoryGraph({ nodes: [n1, n2], edges: [edge] })
}

describe('GraphPane', () => {
  afterEach(() => cleanup())

  it('shows empty state when no nodes', () => {
    renderGraphPane()
    expect(screen.getByText('Graph appears after first successful parse.')).toBeTruthy()
  })

  it('renders SVG circle for each node', () => {
    renderGraphPane({ graph: twoNodeGraph() })
    const circles = document.querySelectorAll('circle.graph-node')
    expect(circles.length).toBe(2)
  })

  it('renders SVG line for each edge', () => {
    renderGraphPane({ graph: twoNodeGraph() })
    const lines = document.querySelectorAll('line.graph-edge')
    expect(lines.length).toBe(1)
  })

  it('click circle calls onOpenNode with node id', () => {
    const onOpenNode = vi.fn()
    renderGraphPane({ graph: twoNodeGraph(), onOpenNode })
    const circles = document.querySelectorAll('circle.graph-node')
    fireEvent.click(circles[0]!)
    expect(onOpenNode).toHaveBeenCalledWith('n1')
  })

  it('zoom range input changes SVG scale transform', () => {
    renderGraphPane({ graph: twoNodeGraph() })
    const slider = screen.getByRole('slider')
    fireEvent.change(slider, { target: { value: '1.5' } })
    const svg = document.querySelector('svg.graph-canvas') as SVGElement
    expect(svg.style.transform).toContain('scale(1.5)')
  })

  it('"show unreachable" checkbox hides unreachable nodes when unchecked', () => {
    const n1 = makeStoryGraphNode({ id: 'n1', label: 'Reachable', unreachable: false })
    const n2 = makeStoryGraphNode({ id: 'n2', label: 'Unreachable', unreachable: true })
    const graph = makeStoryGraph({ nodes: [n1, n2] })
    renderGraphPane({ graph })

    expect(document.querySelectorAll('circle.graph-node').length).toBe(2)

    const checkbox = screen.getByRole('checkbox')
    fireEvent.click(checkbox)
    expect(document.querySelectorAll('circle.graph-node').length).toBe(1)
  })

  it('edges with hidden endpoints are also hidden', () => {
    const n1 = makeStoryGraphNode({ id: 'n1', label: 'A', unreachable: false })
    const n2 = makeStoryGraphNode({ id: 'n2', label: 'B', unreachable: true })
    const edge = makeStoryGraphEdge({ from: 'n1', to: 'n2' })
    const graph = makeStoryGraph({ nodes: [n1, n2], edges: [edge] })
    renderGraphPane({ graph })

    expect(document.querySelectorAll('line.graph-edge').length).toBe(1)
    fireEvent.click(screen.getByRole('checkbox'))
    expect(document.querySelectorAll('line.graph-edge').length).toBe(0)
  })

  it('focused node gets "is-focused" class', () => {
    renderGraphPane({ graph: twoNodeGraph(), focusedNodeId: 'n1' })
    const circles = document.querySelectorAll('circle.graph-node')
    const n1Circle = Array.from(circles).find(c => c.classList.contains('is-focused'))
    expect(n1Circle).toBeTruthy()
  })

  it('neighbor nodes get "is-neighbor" class', () => {
    renderGraphPane({ graph: twoNodeGraph(), focusedNodeId: 'n1' })
    const circles = document.querySelectorAll('circle.graph-node')
    const n2Circle = Array.from(circles).find(c => c.classList.contains('is-neighbor'))
    expect(n2Circle).toBeTruthy()
  })

  it('non-related nodes get "is-dimmed" class when focus is active', () => {
    const n1 = makeStoryGraphNode({ id: 'n1', label: 'A' })
    const n2 = makeStoryGraphNode({ id: 'n2', label: 'B' })
    const n3 = makeStoryGraphNode({ id: 'n3', label: 'C' })
    const edge = makeStoryGraphEdge({ from: 'n1', to: 'n2' })
    const graph = makeStoryGraph({ nodes: [n1, n2, n3], edges: [edge] })

    renderGraphPane({ graph, focusedNodeId: 'n1' })
    const circles = document.querySelectorAll('circle.graph-node')
    const n3Circle = Array.from(circles).find(c => c.classList.contains('is-dimmed'))
    expect(n3Circle).toBeTruthy()
  })

  it('unresolved edges get "edge-error" class', () => {
    const n1 = makeStoryGraphNode({ id: 'n1', label: 'A' })
    const n2 = makeStoryGraphNode({ id: 'n2', label: 'B' })
    const edge = makeStoryGraphEdge({ from: 'n1', to: 'n2', unresolved: true })
    renderGraphPane({ graph: makeStoryGraph({ nodes: [n1, n2], edges: [edge] }) })
    const lines = document.querySelectorAll('line.edge-error')
    expect(lines.length).toBe(1)
  })

  it('"No incoming links." message when focused node has none', () => {
    const n1 = makeStoryGraphNode({ id: 'n1', label: 'Start' })
    renderGraphPane({ graph: makeStoryGraph({ nodes: [n1] }), focusedNodeId: 'n1' })
    expect(screen.getByText('No incoming links.')).toBeTruthy()
  })

  it('incoming link buttons navigate to source node', () => {
    const onOpenNode = vi.fn()
    renderGraphPane({ graph: twoNodeGraph(), focusedNodeId: 'n2', onOpenNode })
    // n1 -> n2, so n1 is incoming for n2
    const incomingBtn = screen.getByRole('button', { name: 'Intro' })
    fireEvent.click(incomingBtn)
    expect(onOpenNode).toHaveBeenCalledWith('n1')
  })

  it('outgoing link buttons navigate to target node', () => {
    const onOpenNode = vi.fn()
    renderGraphPane({ graph: twoNodeGraph(), focusedNodeId: 'n1', onOpenNode })
    // n1 -> n2, so n2 is outgoing for n1
    const outgoingBtn = screen.getByRole('button', { name: 'Hallway' })
    fireEvent.click(outgoingBtn)
    expect(onOpenNode).toHaveBeenCalledWith('n2')
  })

  it('"Place cursor inside a section..." message when no focus', () => {
    renderGraphPane({ graph: twoNodeGraph(), focusedNodeId: null })
    const messages = screen.getAllByText('Place cursor inside a section to focus links.')
    expect(messages.length).toBe(2) // one for incoming, one for outgoing
  })
})
