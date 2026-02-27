import type { StoryGraphEdge } from '../types/interfaces'

export interface GraphFocusContext {
  incomingEdges: Array<{ edge: StoryGraphEdge, index: number }>
  outgoingEdges: Array<{ edge: StoryGraphEdge, index: number }>
  incomingNodeIds: string[]
  outgoingNodeIds: string[]
  highlightedNodeIds: Set<string>
  highlightedEdgeIds: Set<string>
}

export function graphEdgeId(edge: StoryGraphEdge, index: number): string {
  return `${edge.from}->${edge.to}#${index}`
}

export function buildGraphFocusContext(edges: StoryGraphEdge[], focusedNodeId: string | null): GraphFocusContext | null {
  if (!focusedNodeId) return null

  const incomingEdges: Array<{ edge: StoryGraphEdge, index: number }> = []
  const outgoingEdges: Array<{ edge: StoryGraphEdge, index: number }> = []
  const incomingNodeIds = new Set<string>()
  const outgoingNodeIds = new Set<string>()
  const highlightedNodeIds = new Set<string>([focusedNodeId])
  const highlightedEdgeIds = new Set<string>()

  edges.forEach((edge, index) => {
    if (edge.to === focusedNodeId) {
      incomingEdges.push({ edge, index })
      incomingNodeIds.add(edge.from)
      highlightedNodeIds.add(edge.from)
      highlightedEdgeIds.add(graphEdgeId(edge, index))
    }
    if (edge.from === focusedNodeId) {
      outgoingEdges.push({ edge, index })
      outgoingNodeIds.add(edge.to)
      highlightedNodeIds.add(edge.to)
      highlightedEdgeIds.add(graphEdgeId(edge, index))
    }
  })

  return {
    incomingEdges,
    outgoingEdges,
    incomingNodeIds: Array.from(incomingNodeIds),
    outgoingNodeIds: Array.from(outgoingNodeIds),
    highlightedNodeIds,
    highlightedEdgeIds
  }
}
