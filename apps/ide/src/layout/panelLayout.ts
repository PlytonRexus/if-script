import type { Layout, LayoutItem } from 'react-grid-layout/legacy'
import type { PanelId, PanelLayoutItem, PanelLayoutState } from '../types/interfaces'

export const PANEL_LAYOUT_VERSION = 2
export const PANEL_IDS: PanelId[] = [
  'workspace',
  'editor',
  'inspector',
  'preview',
  'graph',
  'diagnostics',
  'runtime',
  'timings'
]
export const GRAPH_MODE_PANEL_IDS: PanelId[] = ['workspace', 'editor', 'preview']

export const DESKTOP_BREAKPOINT_PX = 1180
export const DESKTOP_GRID_COLUMNS = 12
export const DESKTOP_GRID_ROW_HEIGHT = 34
const DESKTOP_GRID_MAX_ROWS = 120
export type PanelVisibilityState = Record<PanelId, boolean>

const DEFAULT_LAYOUT: PanelLayoutState = {
  workspace: { x: 0, y: 0, w: 2, h: 25, minW: 2, minH: 10 },
  editor: { x: 2, y: 0, w: 5, h: 25, minW: 4, minH: 10 },
  inspector: { x: 7, y: 0, w: 2, h: 25, minW: 2, minH: 10 },
  preview: { x: 0, y: 26, w: 12, h: 20, minW: 4, minH: 15 },
  graph: { x: 9, y: 5, w: 3, h: 12, minW: 2, minH: 5 },
  diagnostics: { x: 9, y: 15, w: 3, h: 4, minW: 2, minH: 3 },
  runtime: { x: 9, y: 19, w: 3, h: 6, minW: 2, minH: 3 },
  timings: { x: 9, y: 23, w: 3, h: 3, minW: 2, minH: 3 }
}
const DEFAULT_VISIBILITY: PanelVisibilityState = {
  workspace: true,
  editor: true,
  inspector: true,
  preview: true,
  graph: true,
  diagnostics: true,
  runtime: true,
  timings: true
}

type PartialLayoutState = Partial<Record<PanelId, Partial<PanelLayoutItem>>>
type PartialVisibilityState = Partial<Record<PanelId, boolean>>

function clampInt(value: unknown, fallback: number, min: number, max: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return fallback
  return Math.min(max, Math.max(min, Math.round(value)))
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function normalizeItem(input: Partial<PanelLayoutItem> | undefined, fallback: PanelLayoutItem): PanelLayoutItem {
  const minW = clampInt(input?.minW, fallback.minW, 1, DESKTOP_GRID_COLUMNS)
  const minH = clampInt(input?.minH, fallback.minH, 1, DESKTOP_GRID_MAX_ROWS)
  const w = clampInt(input?.w, fallback.w, minW, DESKTOP_GRID_COLUMNS)
  const h = clampInt(input?.h, fallback.h, minH, DESKTOP_GRID_MAX_ROWS)
  const maxX = Math.max(0, DESKTOP_GRID_COLUMNS - w)
  const x = clampInt(input?.x, fallback.x, 0, maxX)
  const y = clampInt(input?.y, fallback.y, 0, DESKTOP_GRID_MAX_ROWS - h)
  return { x, y, w, h, minW, minH }
}

export function getDefaultDesktopLayout(): PanelLayoutState {
  const out = {} as PanelLayoutState
  PANEL_IDS.forEach((panelId) => {
    out[panelId] = { ...DEFAULT_LAYOUT[panelId] }
  })
  return out
}

export function getGraphModeDesktopLayout(): PanelLayoutState {
  const out = getDefaultDesktopLayout()
  out.workspace = { x: 0, y: 0, w: 2, h: 28, minW: 2, minH: 10 }
  out.editor = { x: 2, y: 0, w: 7, h: 28, minW: 4, minH: 12 }
  out.preview = { x: 9, y: 0, w: 3, h: 28, minW: 3, minH: 12 }
  return out
}

export function normalizeLayout(input: PartialLayoutState | null | undefined): PanelLayoutState {
  const defaults = getDefaultDesktopLayout()
  const out = {} as PanelLayoutState
  PANEL_IDS.forEach((panelId) => {
    out[panelId] = normalizeItem(input?.[panelId], defaults[panelId])
  })
  return out
}

export function getDefaultPanelVisibility(): PanelVisibilityState {
  const out = {} as PanelVisibilityState
  PANEL_IDS.forEach((panelId) => {
    out[panelId] = DEFAULT_VISIBILITY[panelId]
  })
  return out
}

export function normalizePanelVisibility(input: PartialVisibilityState | null | undefined): PanelVisibilityState {
  const defaults = getDefaultPanelVisibility()
  const out = {} as PanelVisibilityState
  PANEL_IDS.forEach((panelId) => {
    const next = input?.[panelId]
    out[panelId] = typeof next === 'boolean' ? next : defaults[panelId]
  })
  return out
}

export function serializeLayout(layout: PanelLayoutState): PanelLayoutState {
  return normalizeLayout(layout)
}

export function deserializeLayout(payload: unknown): PanelLayoutState | null {
  if (!isRecord(payload)) return null
  const input = payload as PartialLayoutState
  return normalizeLayout(input)
}

export function toGridLayout(layout: PanelLayoutState): Layout {
  return PANEL_IDS.map((panelId) => {
    const item = layout[panelId]
    return {
      i: panelId,
      x: item.x,
      y: item.y,
      w: item.w,
      h: item.h,
      minW: item.minW,
      minH: item.minH
    }
  })
}

export function fromGridLayout(layout: Layout): PanelLayoutState {
  const partial: PartialLayoutState = {}
  layout.forEach((item: LayoutItem) => {
    const panelId = item.i as PanelId
    if (!PANEL_IDS.includes(panelId)) return
    partial[panelId] = {
      x: item.x,
      y: item.y,
      w: item.w,
      h: item.h,
      minW: item.minW,
      minH: item.minH
    }
  })
  return normalizeLayout(partial)
}

export function isDesktopViewport(width: number): boolean {
  return width > DESKTOP_BREAKPOINT_PX
}
