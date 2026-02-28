import { describe, expect, it } from 'vitest'
import { deserializeLayout, getDefaultDesktopLayout, getDefaultPanelVisibility, normalizeLayout, normalizePanelVisibility, serializeLayout } from '../layout/panelLayout'

describe('panelLayout', () => {
  it('fills missing items when normalizing partial layout state', () => {
    const normalized = normalizeLayout({
      graph: { x: 6, y: 2, w: 4, h: 8 }
    })
    const defaults = getDefaultDesktopLayout()

    expect(normalized.graph.x).toBe(6)
    expect(normalized.graph.w).toBe(4)
    expect(normalized.editor).toEqual(defaults.editor)
    expect(normalized.workspace).toEqual(defaults.workspace)
  })

  it('clamps invalid persisted values to safe bounds', () => {
    const normalized = normalizeLayout({
      graph: {
        x: -20,
        y: -3,
        w: 999,
        h: 0,
        minW: 0,
        minH: -4
      }
    })

    expect(normalized.graph.minW).toBeGreaterThanOrEqual(1)
    expect(normalized.graph.minH).toBeGreaterThanOrEqual(1)
    expect(normalized.graph.x).toBeGreaterThanOrEqual(0)
    expect(normalized.graph.y).toBeGreaterThanOrEqual(0)
    expect(normalized.graph.w).toBeLessThanOrEqual(12)
    expect(normalized.graph.h).toBeGreaterThanOrEqual(normalized.graph.minH)
  })

  it('defaults preview to full width at the bottom with a larger height', () => {
    const defaults = getDefaultDesktopLayout()

    expect(defaults.preview.x).toBe(0)
    expect(defaults.preview.w).toBe(12)
    expect(defaults.preview.h).toBeGreaterThanOrEqual(6)

    const topPanelsBottomEdge = Math.max(
      defaults.workspace.y + defaults.workspace.h,
      defaults.editor.y + defaults.editor.h,
      defaults.inspector.y + defaults.inspector.h,
      defaults.graph.y + defaults.graph.h,
      defaults.diagnostics.y + defaults.diagnostics.h,
      defaults.runtime.y + defaults.runtime.h,
      defaults.timings.y + defaults.timings.h
    )
    expect(defaults.preview.y).toBeGreaterThanOrEqual(topPanelsBottomEdge)
  })

  it('serializes and deserializes normalized layout payloads', () => {
    const serialized = serializeLayout(getDefaultDesktopLayout())
    const restored = deserializeLayout(serialized)
    expect(restored).toEqual(serialized)
    expect(deserializeLayout(null)).toBeNull()
    expect(deserializeLayout('bad-payload')).toBeNull()
  })

  it('normalizes panel visibility with safe defaults', () => {
    const defaults = getDefaultPanelVisibility()
    const normalized = normalizePanelVisibility({
      graph: false,
      diagnostics: true
    })

    expect(normalized.graph).toBe(false)
    expect(normalized.diagnostics).toBe(true)
    expect(normalized.workspace).toBe(defaults.workspace)
    expect(normalized.editor).toBe(defaults.editor)
  })
})
