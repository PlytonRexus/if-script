import { useMemo, useState } from 'react'
import type { StoryGraph } from '../types/interfaces'

interface GraphPaneProps {
  graph: StoryGraph
  onOpenNode: (nodeId: string) => void
}

export function GraphPane(props: GraphPaneProps): JSX.Element {
  const [zoom, setZoom] = useState(1)
  const [showUnreachable, setShowUnreachable] = useState(true)

  const nodes = useMemo(() => {
    return props.graph.nodes.filter(node => showUnreachable || !node.unreachable)
  }, [props.graph.nodes, showUnreachable])

  const nodePositions = useMemo(() => {
    const radius = 160
    const centerX = 220
    const centerY = 220
    const positions = new Map<string, { x: number, y: number }>()

    nodes.forEach((node, idx) => {
      const angle = (idx / Math.max(nodes.length, 1)) * Math.PI * 2
      positions.set(node.id, {
        x: centerX + Math.cos(angle) * radius,
        y: centerY + Math.sin(angle) * radius
      })
    })

    return positions
  }, [nodes])

  const edges = useMemo(() => {
    const visible = new Set(nodes.map(node => node.id))
    return props.graph.edges.filter(edge => visible.has(edge.from) && visible.has(edge.to))
  }, [nodes, props.graph.edges])

  return (
    <section className="panel graph-panel">
      <div className="panel-header">
        <h2>Story Graph</h2>
        <div className="graph-controls">
          <label>
            Zoom
            <input
              type="range"
              min={0.6}
              max={1.8}
              step={0.1}
              value={zoom}
              onChange={(event) => setZoom(Number(event.currentTarget.value))}
            />
          </label>
          <label>
            <input
              type="checkbox"
              checked={showUnreachable}
              onChange={(event) => setShowUnreachable(event.currentTarget.checked)}
            />
            show unreachable
          </label>
        </div>
      </div>

      <div className="graph-canvas-wrap">
        {nodes.length === 0 ? <p className="empty-message">Graph appears after first successful parse.</p> : null}

        <svg className="graph-canvas" viewBox="0 0 440 440" style={{ transform: `scale(${zoom})` }}>
          {edges.map((edge, idx) => {
            const from = nodePositions.get(edge.from)
            const to = nodePositions.get(edge.to)
            if (!from || !to) return null
            return (
              <line
                key={`${edge.from}-${edge.to}-${idx}`}
                x1={from.x}
                y1={from.y}
                x2={to.x}
                y2={to.y}
                className={`graph-edge ${edge.unresolved ? 'edge-error' : ''}`}
              />
            )
          })}

          {nodes.map(node => {
            const pos = nodePositions.get(node.id)
            if (!pos) return null
            return (
              <g key={node.id} transform={`translate(${pos.x}, ${pos.y})`}>
                <circle
                  r={18}
                  className={[
                    'graph-node',
                    node.nodeType,
                    node.unreachable ? 'unreachable' : '',
                    node.hasError ? 'has-error' : ''
                  ].join(' ').trim()}
                  onClick={() => props.onOpenNode(node.id)}
                />
                <text y={34} textAnchor="middle" className="graph-label">{node.label}</text>
              </g>
            )
          })}
        </svg>
      </div>
    </section>
  )
}
