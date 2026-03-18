import '@xyflow/react/dist/style.css'
import { useCallback, useDeferredValue, useEffect, useMemo, useState } from 'react'
import ELK from 'elkjs/lib/elk.bundled.js'
import {
  Background,
  Controls,
  Handle,
  MarkerType,
  Position,
  ReactFlow,
  type Edge,
  type Node,
  type NodeProps,
  type OnConnect,
  type OnNodeDrag,
  type Viewport
} from '@xyflow/react'
import { EditorPane } from './EditorPane'
import { GraphSectionWriterPane } from './GraphSectionWriterPane'
import type {
  AuthorGraphEdge,
  AuthorGraphGroup,
  AuthorGraphModel,
  AuthorGraphNode,
  AuthoringSchema,
  ChoiceIndexEntry,
  GraphLayoutState,
  IdeDiagnostic,
  SectionContentIndexEntry,
  SectionWriterInput,
  SectionIndexEntry,
  SectionSettingsIndexEntry,
  WorkspaceFile
} from '../types/interfaces'

const GRAPH_MAX_RENDER_NODES = 200
const GROUP_PADDING_X = 28
const GROUP_PADDING_TOP = 52
const GROUP_PADDING_BOTTOM = 20
const GROUP_GAP_X = 60
const SECTION_NODE_WIDTH = 220
const SECTION_NODE_HEIGHT = 116
const GROUP_NODE_WIDTH = 300
const MIN_GROUP_HEIGHT = 220

type SectionNodeData = {
  label: string
  colorToken: string
  badges: Array<{ key: string, icon: string, label: string }>
  outgoingChoices: Array<{ choiceId: string, label: string }>
  selected: boolean
  dimmed: boolean
  unresolved: boolean
}

type GroupNodeData = {
  label: string
  colorToken: string
  icon: string
  count: number
  onCreateSection: (groupId: string) => void
}

interface CursorTarget {
  line: number
  col: number
  nonce: number
}

interface GraphWorkspacePaneProps {
  graph: AuthorGraphModel
  selectedNodeId: string | null
  activeFile: WorkspaceFile | null
  diagnostics: IdeDiagnostic[]
  parseStatus: 'idle' | 'running' | 'error' | 'ok'
  authoringSchema: AuthoringSchema | null
  sectionTitles: string[]
  variableNames: string[]
  cursorTarget: CursorTarget | null
  sectionIndex: SectionIndexEntry[]
  sectionSettingsIndex: SectionSettingsIndexEntry[]
  choiceIndex: ChoiceIndexEntry[]
  sectionContentIndex: SectionContentIndexEntry[]
  layoutState: GraphLayoutState
  onLayoutStateChange: (next: GraphLayoutState) => void
  onCursorChange: (position: { line: number, col: number }) => void
  onChangeSource: (next: string) => void
  onSelectNode: (nodeId: string) => void
  onCreateSection: (groupId: string) => void
  onDeleteSection: (nodeId: string) => void
  onCreateChoice: (nodeId: string) => void
  onRetargetChoice: (choiceId: string, targetNodeId: string) => void
  onApplySectionWriterEdits: (sectionSerial: number, input: SectionWriterInput) => string | null
}

function iconForGroup(group: AuthorGraphGroup): string {
  if (group.iconKey === 'scene-audio') return '♪'
  if (group.kind === 'scene') return '◌'
  return '▣'
}

function SectionGraphNode(props: NodeProps<Node<SectionNodeData>>): JSX.Element {
  const data = props.data
  return (
    <article
      className={[
        'author-graph-node',
        data.colorToken,
        data.selected ? 'is-selected' : '',
        data.dimmed ? 'is-dimmed' : '',
        data.unresolved ? 'is-unresolved' : ''
      ].join(' ').trim()}
      title={data.label}
    >
      <Handle type="target" position={Position.Left} className="author-graph-handle target" aria-label={`Open ${data.label}`} />
      <header className="author-graph-node-header">
        <strong>{data.label}</strong>
      </header>
      <div className="author-graph-badges">
        {data.badges.map(badge => (
          <span key={badge.key} className="author-graph-badge" title={badge.label} aria-label={badge.label}>
            {badge.icon}
          </span>
        ))}
      </div>
      <div className="author-graph-choice-rail" aria-label="Outgoing choices">
        {data.outgoingChoices.length === 0 ? <span className="author-graph-choice-empty">No choices</span> : null}
        {data.outgoingChoices.map((choice, idx) => (
          <div key={choice.choiceId} className="author-graph-choice-chip">
            <span>{choice.label}</span>
            <Handle
              type="source"
              position={Position.Right}
              id={choice.choiceId}
              className="author-graph-handle source"
              style={{ top: 44 + idx * 18 }}
              aria-label={`Drag to retarget ${choice.label}`}
            />
          </div>
        ))}
      </div>
    </article>
  )
}

function GroupGraphNode(props: NodeProps<Node<GroupNodeData>>): JSX.Element {
  const { data, id } = props
  return (
    <section className={['author-graph-group', data.colorToken].join(' ').trim()}>
      <header className="author-graph-group-header">
        <div className="author-graph-group-title">
          <span className="author-graph-group-icon" aria-hidden="true">{data.icon}</span>
          <strong>{data.label}</strong>
          <span>{data.count}</span>
        </div>
        <div className="author-graph-group-actions">
          <button type="button" className="mini-btn" onClick={() => data.onCreateSection(id)}>New section</button>
        </div>
      </header>
    </section>
  )
}

const nodeTypes = {
  sectionNode: SectionGraphNode,
  groupNode: GroupGraphNode
}

function createBadges(node: AuthorGraphNode): Array<{ key: string, icon: string, label: string }> {
  const badges: Array<{ key: string, icon: string, label: string }> = []
  if (node.affordances.hasTimer) badges.push({ key: 'timer', icon: '◷', label: 'Timer configured' })
  if (node.affordances.hasAmbience) badges.push({ key: 'ambience', icon: '♪', label: 'Ambience configured' })
  if (node.affordances.hasBackdrop) badges.push({ key: 'backdrop', icon: '▣', label: 'Backdrop configured' })
  if (node.affordances.hasSfx) badges.push({ key: 'sfx', icon: '≈', label: 'SFX configured' })
  if (node.affordances.hasConditionalChoices) badges.push({ key: 'conditional', icon: '⎇', label: 'Conditional choices present' })
  if (node.hasError) badges.push({ key: 'warning', icon: '!', label: 'Warnings or unresolved paths' })
  return badges
}

function edgeIdsForSelected(edges: AuthorGraphEdge[], selectedNodeId: string | null): Set<string> {
  if (!selectedNodeId) return new Set<string>()
  return new Set(
    edges
      .filter(edge => edge.fromNodeId === selectedNodeId || edge.toNodeId === selectedNodeId)
      .map(edge => edge.id)
  )
}

function neighborIdsForSelected(edges: AuthorGraphEdge[], selectedNodeId: string | null): Set<string> {
  const ids = new Set<string>()
  if (!selectedNodeId) return ids
  ids.add(selectedNodeId)
  edges.forEach(edge => {
    if (edge.fromNodeId === selectedNodeId || edge.toNodeId === selectedNodeId) {
      ids.add(edge.fromNodeId)
      ids.add(edge.toNodeId)
    }
  })
  return ids
}

function collectNeighborIds(edges: AuthorGraphEdge[], seedIds: Set<string>, mode: 'incoming' | 'outgoing' | 'both'): Set<string> {
  const out = new Set<string>()
  edges.forEach(edge => {
    if ((mode === 'outgoing' || mode === 'both') && seedIds.has(edge.fromNodeId)) out.add(edge.toNodeId)
    if ((mode === 'incoming' || mode === 'both') && seedIds.has(edge.toNodeId)) out.add(edge.fromNodeId)
  })
  return out
}

function applyNodeCap(
  nodes: AuthorGraphNode[],
  preferredIds: string[],
  visibleCap: number
): { ids: Set<string>, trimmed: number } {
  const cap = Math.min(visibleCap, GRAPH_MAX_RENDER_NODES)
  const ordered = preferredIds.filter((id, idx) => preferredIds.indexOf(id) === idx)
  const ids = new Set<string>()
  ordered.forEach(id => {
    if (ids.size >= cap) return
    ids.add(id)
  })
  if (ids.size < cap) {
    nodes.forEach(node => {
      if (ids.size >= cap) return
      ids.add(node.id)
    })
  }
  return { ids, trimmed: Math.max(0, preferredIds.filter((id, idx) => preferredIds.indexOf(id) === idx).length - cap) }
}

async function buildLayout(input: {
  groups: AuthorGraphGroup[]
  nodes: AuthorGraphNode[]
  edges: AuthorGraphEdge[]
  pinnedNodes: GraphLayoutState['pinnedNodes']
}): Promise<{ groupFrames: Node<GroupNodeData>[], sectionNodes: Node<SectionNodeData>[] }> {
  const elk = new ELK()
  const layout = await elk.layout({
    id: 'root',
    layoutOptions: {
      'elk.algorithm': 'layered',
      'elk.direction': 'RIGHT',
      'elk.layered.spacing.nodeNodeBetweenLayers': '80',
      'elk.spacing.nodeNode': '50'
    },
    children: input.nodes.map(node => ({
      id: node.id,
      width: SECTION_NODE_WIDTH,
      height: SECTION_NODE_HEIGHT
    })),
    edges: input.edges.map(edge => ({
      id: edge.id,
      sources: [edge.fromNodeId],
      targets: [edge.toNodeId]
    }))
  })

  const positions = new Map<string, { x: number, y: number }>()
  ;(layout.children ?? []).forEach(child => {
    positions.set(child.id, {
      x: input.pinnedNodes[child.id]?.x ?? child.x ?? 0,
      y: input.pinnedNodes[child.id]?.y ?? child.y ?? 0
    })
  })

  const groupBounds = new Map<string, { minX: number, minY: number, maxX: number, maxY: number }>()
  input.groups.forEach(group => {
    group.nodeIds.forEach(nodeId => {
      const position = positions.get(nodeId)
      if (!position) return
      const current = groupBounds.get(group.id) ?? {
        minX: position.x,
        minY: position.y,
        maxX: position.x + SECTION_NODE_WIDTH,
        maxY: position.y + SECTION_NODE_HEIGHT
      }
      current.minX = Math.min(current.minX, position.x)
      current.minY = Math.min(current.minY, position.y)
      current.maxX = Math.max(current.maxX, position.x + SECTION_NODE_WIDTH)
      current.maxY = Math.max(current.maxY, position.y + SECTION_NODE_HEIGHT)
      groupBounds.set(group.id, current)
    })
  })

  const groupFrames = input.groups.map((group, idx) => {
    const bounds = groupBounds.get(group.id)
    const x = bounds ? bounds.minX - GROUP_PADDING_X : idx * (GROUP_NODE_WIDTH + GROUP_GAP_X)
    const y = bounds ? bounds.minY - GROUP_PADDING_TOP : 0
    const width = bounds ? Math.max(GROUP_NODE_WIDTH, bounds.maxX - bounds.minX + GROUP_PADDING_X * 2) : GROUP_NODE_WIDTH
    const height = bounds ? Math.max(MIN_GROUP_HEIGHT, bounds.maxY - bounds.minY + GROUP_PADDING_TOP + GROUP_PADDING_BOTTOM) : MIN_GROUP_HEIGHT
    return {
      id: group.id,
      type: 'groupNode',
      position: { x, y },
      data: {
        label: group.label,
        colorToken: group.colorToken,
        icon: iconForGroup(group),
        count: group.nodeIds.length,
        onCreateSection: () => {}
      },
      draggable: false,
      selectable: false,
      style: { width, height, zIndex: 0 }
    } satisfies Node<GroupNodeData>
  })

  const framesById = new Map(groupFrames.map(frame => [frame.id, frame]))
  const sectionNodes = input.nodes.map(node => {
    const group = input.groups.find(entry => entry.nodeIds.includes(node.id))
    const frame = group ? framesById.get(group.id) : null
    const absolute = positions.get(node.id) ?? { x: 0, y: 0 }
    const relative = frame
      ? {
          x: absolute.x - frame.position.x,
          y: absolute.y - frame.position.y
        }
      : absolute

    return {
      id: node.id,
      type: 'sectionNode',
      parentId: frame?.id,
      extent: frame ? 'parent' : undefined,
      position: relative,
      draggable: true,
      data: {
        label: node.label,
        colorToken: group?.colorToken ?? 'graph-group-slate',
        badges: [],
        outgoingChoices: [],
        selected: false,
        dimmed: false,
        unresolved: node.kind === 'unresolved'
      },
      style: { width: SECTION_NODE_WIDTH, height: SECTION_NODE_HEIGHT, zIndex: 2 }
    } satisfies Node<SectionNodeData>
  })

  return { groupFrames, sectionNodes }
}

export function GraphWorkspacePane(props: GraphWorkspacePaneProps): JSX.Element {
  const [search, setSearch] = useState('')
  const [manualVisibleIds, setManualVisibleIds] = useState<string[]>([])
  const [nodes, setNodes] = useState<Array<Node<SectionNodeData | GroupNodeData>>>([])
  const [edges, setEdges] = useState<Edge[]>([])
  const deferredSearch = useDeferredValue(search)

  const graphNodeById = useMemo(() => new Map(props.graph.nodes.map(node => [node.id, node])), [props.graph.nodes])
  const groupById = useMemo(() => new Map(props.graph.groups.map(group => [group.id, group])), [props.graph.groups])
  const selectedNodeId = props.selectedNodeId ?? props.graph.nodes.find(node => node.kind === 'section')?.id ?? null
  const selectedNode = selectedNodeId ? graphNodeById.get(selectedNodeId) ?? null : null
  const selectedGroup = useMemo(() => {
    if (!selectedNodeId) return null
    return props.graph.groups.find(group => group.nodeIds.includes(selectedNodeId)) ?? null
  }, [props.graph.groups, selectedNodeId])
  const selectedOutgoingChoices = useMemo(() => {
    if (!selectedNode?.sectionSerial) return []
    return props.choiceIndex.filter(choice => choice.ownerSectionSerial === selectedNode.sectionSerial)
  }, [props.choiceIndex, selectedNode?.sectionSerial])
  const selectedSectionSettings = useMemo(() => {
    if (!selectedNode?.sectionSerial) return null
    return props.sectionSettingsIndex.find(section => section.sectionSerial === selectedNode.sectionSerial) ?? null
  }, [props.sectionSettingsIndex, selectedNode?.sectionSerial])
  const selectedSectionContent = useMemo(() => {
    if (!selectedNode?.sectionSerial) return null
    return props.sectionContentIndex.find(section => section.sectionSerial === selectedNode.sectionSerial) ?? null
  }, [props.sectionContentIndex, selectedNode?.sectionSerial])
  const selectedIncomingCount = useMemo(() => {
    if (!selectedNodeId) return 0
    return props.graph.edges.filter(edge => edge.toNodeId === selectedNodeId).length
  }, [props.graph.edges, selectedNodeId])

  useEffect(() => {
    setManualVisibleIds([])
  }, [selectedNodeId])

  const visibleSelection = useMemo(() => {
    const selectedIds = new Set<string>()
    if (selectedNodeId) selectedIds.add(selectedNodeId)
    const directNeighbors = collectNeighborIds(props.graph.edges, selectedIds, 'both')
    const desired = [
      ...selectedIds,
      ...directNeighbors,
      ...manualVisibleIds
    ]
    if (selectedGroup) desired.push(...selectedGroup.nodeIds)
    const capped = applyNodeCap(props.graph.nodes, desired, props.layoutState.visibleNodeCap)
    return capped
  }, [manualVisibleIds, props.graph.edges, props.graph.nodes, props.layoutState.visibleNodeCap, selectedGroup, selectedNodeId])

  const hiddenMatches = useMemo(() => {
    const query = deferredSearch.trim().toLowerCase()
    if (!query) return []
    return props.graph.nodes.filter(node => {
      const group = props.graph.groups.find(entry => entry.nodeIds.includes(node.id))
      const haystack = [node.label, node.file, group?.label ?? ''].join(' ').toLowerCase()
      return haystack.includes(query)
    }).slice(0, 8)
  }, [deferredSearch, props.graph.groups, props.graph.nodes])

  const visibleNodes = useMemo(() => {
    return props.graph.nodes.filter(node => visibleSelection.ids.has(node.id))
  }, [props.graph.nodes, visibleSelection.ids])

  const visibleEdges = useMemo(() => {
    const visibleIds = new Set(visibleNodes.map(node => node.id))
    return props.graph.edges.filter(edge => visibleIds.has(edge.fromNodeId) && visibleIds.has(edge.toNodeId))
  }, [props.graph.edges, visibleNodes])

  const visibleGroups = useMemo(() => {
    if (!props.layoutState.groupsVisible) return []
    const visibleIds = new Set(visibleNodes.map(node => node.id))
    return props.graph.groups.filter(group => group.nodeIds.some(nodeId => visibleIds.has(nodeId)))
  }, [props.graph.groups, props.layoutState.groupsVisible, visibleNodes])

  const highlightedEdgeIds = useMemo(() => edgeIdsForSelected(visibleEdges, selectedNodeId), [selectedNodeId, visibleEdges])
  const highlightedNodeIds = useMemo(() => neighborIdsForSelected(visibleEdges, selectedNodeId), [selectedNodeId, visibleEdges])

  useEffect(() => {
    let cancelled = false
    void buildLayout({
      groups: visibleGroups,
      nodes: visibleNodes,
      edges: visibleEdges,
      pinnedNodes: props.layoutState.pinnedNodes
    }).then(layout => {
      if (cancelled) return

      const groupNodes = layout.groupFrames.map(node => {
        const group = groupById.get(node.id)
        return {
          ...node,
          data: {
            ...node.data,
            colorToken: group?.colorToken ?? 'graph-group-slate',
            onCreateSection: props.onCreateSection
          }
        } satisfies Node<GroupNodeData>
      })

      const sectionNodes = layout.sectionNodes.map(node => {
        const graphNode = graphNodeById.get(node.id)
        const outgoingChoices = graphNode?.sectionSerial
          ? props.choiceIndex
              .filter(choice => choice.ownerSectionSerial === graphNode.sectionSerial)
              .map(choice => ({
                choiceId: choice.id,
                label: choice.textPreview || `Choice ${choice.choiceIndex}`
              }))
          : []
        const group = visibleGroups.find(entry => entry.nodeIds.includes(node.id))
        return {
          ...node,
          data: {
            label: graphNode?.label ?? node.id,
            colorToken: group?.colorToken ?? 'graph-group-slate',
            badges: graphNode ? createBadges(graphNode) : [],
            outgoingChoices,
            selected: node.id === selectedNodeId,
            dimmed: Boolean(selectedNodeId) && !highlightedNodeIds.has(node.id),
            unresolved: graphNode?.kind === 'unresolved'
          },
          selected: node.id === selectedNodeId
        } satisfies Node<SectionNodeData>
      })

      setNodes([...groupNodes, ...sectionNodes])
      setEdges(visibleEdges.map(edge => ({
        id: edge.id,
        source: edge.fromNodeId,
        sourceHandle: edge.choiceId ?? undefined,
        target: edge.toNodeId,
        markerEnd: { type: MarkerType.ArrowClosed },
        className: [
          'author-graph-edge',
          edge.conditional ? 'is-conditional' : '',
          edge.unresolved ? 'is-unresolved' : '',
          highlightedEdgeIds.has(edge.id) ? 'is-highlighted' : ''
        ].join(' ').trim()
      })))
    })

    return () => {
      cancelled = true
    }
  }, [
    graphNodeById,
    groupById,
    highlightedEdgeIds,
    highlightedNodeIds,
    props.choiceIndex,
    props.layoutState,
    props.onCreateSection,
    props.onLayoutStateChange,
    selectedNodeId,
    visibleEdges,
    visibleGroups,
    visibleNodes
  ])

  const onConnect = useCallback<OnConnect>((connection) => {
    const targetNodeId = connection.target
    const choiceId = connection.sourceHandle
    if (!targetNodeId || !choiceId) return
    props.onRetargetChoice(choiceId, targetNodeId)
  }, [props])

  const onNodeClick = useCallback((_event: unknown, node: Node) => {
    if (node.type === 'groupNode') return
    props.onSelectNode(node.id)
  }, [props])

  const onNodeDoubleClick = useCallback((_event: unknown, node: Node) => {
    if (node.type === 'groupNode') return
    props.onSelectNode(node.id)
    props.onLayoutStateChange({
      ...props.layoutState,
      dockOpen: true
    })
  }, [props])

  const onNodeDragStop = useMemo<OnNodeDrag>(() => {
    return (_event, node) => {
      if (node.type === 'groupNode') return
      const parent = nodes.find(entry => entry.id === node.parentId)
      const absolute = {
        x: node.position.x + (parent?.position.x ?? 0),
        y: node.position.y + (parent?.position.y ?? 0)
      }
      props.onLayoutStateChange({
        ...props.layoutState,
        pinnedNodes: {
          ...props.layoutState.pinnedNodes,
          [node.id]: absolute
        }
      })
    }
  }, [nodes, props])

  const selectedIsPinned = selectedNodeId ? Boolean(props.layoutState.pinnedNodes[selectedNodeId]) : false
  const selectedFlowNode = selectedNodeId ? nodes.find(node => node.id === selectedNodeId) : null

  return (
    <section className="panel graph-workspace-panel">
      <div className="panel-header">
        <h2>Graph</h2>
        <span>{visibleNodes.length} visible of {props.graph.nodes.length}</span>
      </div>

      <div className="graph-workspace-toolbar">
        <div className="graph-workspace-controls">
          <input
            type="search"
            placeholder="Search sections, files, scenes..."
            value={search}
            onChange={(event) => setSearch(event.currentTarget.value)}
          />
          <label>
            Nodes
            <select
              value={props.layoutState.visibleNodeCap}
              onChange={(event) => props.onLayoutStateChange({
                ...props.layoutState,
                visibleNodeCap: Number(event.currentTarget.value) as GraphLayoutState['visibleNodeCap']
              })}
            >
              <option value={25}>25</option>
              <option value={60}>60</option>
              <option value={100}>100</option>
              <option value={150}>150</option>
            </select>
          </label>
          <button
            type="button"
            className="mini-btn"
            onClick={() => props.onLayoutStateChange({
              ...props.layoutState,
              groupsVisible: !props.layoutState.groupsVisible
            })}
          >
            {props.layoutState.groupsVisible ? 'Hide scene groups' : 'Show scene groups'}
          </button>
          <button
            type="button"
            className="mini-btn"
            onClick={() => {
              const seed = new Set<string>(selectedNodeId ? [selectedNodeId] : [])
              const next = Array.from(collectNeighborIds(props.graph.edges, seed, 'outgoing'))
              setManualVisibleIds(state => [...state, ...next])
            }}
          >
            Expand outgoing
          </button>
          <button
            type="button"
            className="mini-btn"
            onClick={() => {
              const seed = new Set<string>(selectedNodeId ? [selectedNodeId] : [])
              const next = Array.from(collectNeighborIds(props.graph.edges, seed, 'incoming'))
              setManualVisibleIds(state => [...state, ...next])
            }}
          >
            Expand incoming
          </button>
          <button
            type="button"
            className="mini-btn"
            onClick={() => {
              const visible = new Set<string>([...visibleSelection.ids])
              const next = Array.from(collectNeighborIds(props.graph.edges, visible, 'both'))
              setManualVisibleIds(state => [...state, ...next])
            }}
          >
            Expand 2 hops
          </button>
          <button
            type="button"
            className="mini-btn"
            onClick={() => {
              if (!selectedGroup) return
              setManualVisibleIds(state => [...state, ...selectedGroup.nodeIds])
            }}
          >
            Show scene
          </button>
          <button type="button" className="mini-btn" onClick={() => setManualVisibleIds([])}>Reset focus</button>
        </div>
        <div className="graph-workspace-legend">
          <button
            type="button"
            className="mini-btn"
            onClick={() => props.onLayoutStateChange({
              ...props.layoutState,
              legendCollapsed: !props.layoutState.legendCollapsed
            })}
          >
            {props.layoutState.legendCollapsed ? 'Show legend' : 'Hide legend'}
          </button>
          {!props.layoutState.legendCollapsed ? (
            <div className="graph-legend-content">
              <span><strong>◷</strong> timer</span>
              <span><strong>♪</strong> ambience</span>
              <span><strong>▣</strong> backdrop</span>
              <span><strong>≈</strong> sfx</span>
              <span><strong>⎇</strong> conditional</span>
              <span><strong>!</strong> warning</span>
            </div>
          ) : null}
        </div>
      </div>

      {hiddenMatches.length > 0 && deferredSearch.trim() !== '' ? (
        <div className="graph-search-results">
          {hiddenMatches.map(node => (
            <button key={node.id} type="button" className="mini-btn" onClick={() => props.onSelectNode(node.id)}>
              {node.label}
            </button>
          ))}
        </div>
      ) : null}

      <div className="graph-workspace-body">
        <div className="graph-canvas-shell">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            nodeTypes={nodeTypes}
            fitView={false}
            minZoom={0.3}
            maxZoom={1.8}
            defaultViewport={props.layoutState.viewport}
            onMoveEnd={(_, viewport: Viewport) => props.onLayoutStateChange({
              ...props.layoutState,
              viewport,
              zoom: viewport.zoom
            })}
            onConnect={onConnect}
            onNodeClick={onNodeClick}
            onNodeDoubleClick={onNodeDoubleClick}
            onNodeDragStop={onNodeDragStop}
            nodesDraggable
            elementsSelectable
            proOptions={{ hideAttribution: true }}
          >
            <Background gap={22} size={1} color="var(--border)" />
            <Controls showInteractive={false} />
          </ReactFlow>
          {visibleSelection.trimmed > 0 || props.graph.nodes.length > GRAPH_MAX_RENDER_NODES ? (
            <p className="graph-scale-note">
              Focused view active. {visibleSelection.trimmed > 0 ? `${visibleSelection.trimmed} nodes omitted by cap.` : null}
              {props.graph.nodes.length > GRAPH_MAX_RENDER_NODES ? ` Hard ceiling: ${GRAPH_MAX_RENDER_NODES} nodes.` : null}
            </p>
          ) : null}
        </div>

        <aside className="graph-selection-panel">
          {selectedNode ? (
            <>
              <header className={['graph-selection-header', selectedGroup?.colorToken ?? 'graph-group-slate'].join(' ').trim()}>
                <div>
                  <strong>{selectedNode.label}</strong>
                  <p>{selectedGroup?.label ?? selectedNode.file.replace('/workspace/', '')}</p>
                </div>
                <div className="graph-selection-actions">
                  {selectedNode.kind === 'section' ? (
                    <button type="button" className="mini-btn" onClick={() => props.onDeleteSection(selectedNode.id)}>Delete</button>
                  ) : null}
                </div>
              </header>
              <div className="graph-selection-content">
                <p>{selectedOutgoingChoices.length} outgoing, {selectedIncomingCount} incoming</p>
                <div className="graph-selection-badges">
                  {createBadges(selectedNode).map(badge => (
                    <span key={badge.key} className="author-graph-badge" title={badge.label}>{badge.icon}</span>
                  ))}
                </div>
                <div className="graph-selection-actions">
                  <button
                    type="button"
                    className="mini-btn"
                    onClick={() => {
                      if (!selectedNodeId) return
                      const nextPinned = { ...props.layoutState.pinnedNodes }
                      if (selectedIsPinned) {
                        delete nextPinned[selectedNodeId]
                      } else if (selectedFlowNode) {
                        const parent = nodes.find(entry => entry.id === selectedFlowNode.parentId)
                        nextPinned[selectedNodeId] = {
                          x: selectedFlowNode.position.x + (parent?.position.x ?? 0),
                          y: selectedFlowNode.position.y + (parent?.position.y ?? 0)
                        }
                      }
                      props.onLayoutStateChange({
                        ...props.layoutState,
                        pinnedNodes: nextPinned
                      })
                    }}
                  >
                    {selectedIsPinned ? 'Unpin' : 'Pin'}
                  </button>
                  <button
                    type="button"
                    className="mini-btn"
                    onClick={() => props.onLayoutStateChange({
                      ...props.layoutState,
                      dockOpen: !props.layoutState.dockOpen
                    })}
                  >
                    {props.layoutState.dockOpen ? 'Hide source' : 'View source'}
                  </button>
                </div>
                <GraphSectionWriterPane
                  section={selectedSectionSettings}
                  sectionContent={selectedSectionContent}
                  selectedNode={selectedNode}
                  selectedGroupLabel={selectedGroup?.label ?? null}
                  selectedChoices={selectedOutgoingChoices}
                  unsupportedReason={null}
                  onDeleteSection={() => props.onDeleteSection(selectedNode.id)}
                  onOpenSource={() => props.onLayoutStateChange({
                    ...props.layoutState,
                    dockOpen: true
                  })}
                  onApply={(input) => {
                    if (!selectedNode.sectionSerial) return
                    props.onApplySectionWriterEdits(selectedNode.sectionSerial, input)
                  }}
                />
              </div>
            </>
          ) : (
            <p className="empty-message">Select a section node to edit it.</p>
          )}
        </aside>
      </div>

      {props.layoutState.dockOpen ? (
        <div className="graph-source-dock">
          <EditorPane
            file={props.activeFile}
            diagnostics={props.diagnostics}
            parseStatus={props.parseStatus}
            authoringSchema={props.authoringSchema}
            sectionTitles={props.sectionTitles}
            variableNames={props.variableNames}
            cursorTarget={props.cursorTarget}
            onCursorChange={props.onCursorChange}
            onChange={props.onChangeSource}
          />
        </div>
      ) : null}
    </section>
  )
}
