import { describe, expect, it } from 'vitest'
import { buildGraphFocusContext } from '../graph/focusGraph'

describe('graph focus context', () => {
  it('collects inbound/outbound links for focused node', () => {
    const edges = [
      { from: 'section:A', to: 'section:B', targetType: 'section' as const, conditional: false, unresolved: false },
      { from: 'section:C', to: 'section:B', targetType: 'section' as const, conditional: true, unresolved: false },
      { from: 'section:B', to: 'section:D', targetType: 'section' as const, conditional: false, unresolved: false },
      { from: 'section:X', to: 'section:Y', targetType: 'section' as const, conditional: false, unresolved: false }
    ]

    const context = buildGraphFocusContext(edges, 'section:B')
    expect(context).not.toBeNull()
    expect(context?.incomingNodeIds).toEqual(['section:A', 'section:C'])
    expect(context?.outgoingNodeIds).toEqual(['section:D'])
    expect(context?.highlightedNodeIds.has('section:B')).toBe(true)
    expect(context?.highlightedNodeIds.has('section:A')).toBe(true)
    expect(context?.highlightedNodeIds.has('section:C')).toBe(true)
    expect(context?.highlightedNodeIds.has('section:D')).toBe(true)
    expect(context?.highlightedNodeIds.has('section:X')).toBe(false)
  })

  it('returns null when no focus node is selected', () => {
    const context = buildGraphFocusContext([], null)
    expect(context).toBeNull()
  })
})
