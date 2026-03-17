import type { GraphLayoutState } from '../types/interfaces'

export const DEFAULT_GRAPH_LAYOUT: GraphLayoutState = {
  pinnedNodes: {},
  collapsedGroupIds: [],
  groupsVisible: false,
  zoom: 1,
  viewport: { x: 0, y: 0, zoom: 1 },
  dockOpen: false,
  visibleNodeCap: 60,
  legendCollapsed: false
}

export function normalizeGraphLayout(next?: GraphLayoutState | null): GraphLayoutState {
  if (!next) return { ...DEFAULT_GRAPH_LAYOUT }
  return {
    ...DEFAULT_GRAPH_LAYOUT,
    ...next,
    pinnedNodes: next.pinnedNodes ?? {},
    collapsedGroupIds: Array.isArray(next.collapsedGroupIds) ? next.collapsedGroupIds : [],
    groupsVisible: next.groupsVisible === true,
    viewport: next.viewport ?? DEFAULT_GRAPH_LAYOUT.viewport
  }
}
