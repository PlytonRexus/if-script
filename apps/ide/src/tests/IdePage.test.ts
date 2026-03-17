import { describe, expect, it } from 'vitest'
import { DEFAULT_GRAPH_LAYOUT } from '../layout/graphLayout'

describe('IdePage graph defaults', () => {
  it('keeps the graph source dock closed by default', () => {
    expect(DEFAULT_GRAPH_LAYOUT.dockOpen).toBe(false)
  })
})
