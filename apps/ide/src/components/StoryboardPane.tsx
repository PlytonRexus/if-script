import { useMemo } from 'react'
import type { SceneIndexEntry, SectionIndexEntry, StoryGraph } from '../types/interfaces'

interface StoryboardPaneProps {
  sectionIndex: SectionIndexEntry[]
  sceneIndex: SceneIndexEntry[]
  graph: StoryGraph
  onOpenSection: (section: SectionIndexEntry) => void
  onOpenScene: (scene: SceneIndexEntry) => void
}

export function StoryboardPane(props: StoryboardPaneProps): JSX.Element {
  const sectionNodeById = useMemo(() => {
    const map = new Map<string, StoryGraph['nodes'][number]>()
    props.graph.nodes.forEach(node => {
      map.set(node.id, node)
    })
    return map
  }, [props.graph.nodes])

  const lanes = useMemo(() => {
    const groups = new Map<string, SectionIndexEntry[]>()
    props.sectionIndex.forEach(section => {
      const key = section.file
      if (!groups.has(key)) groups.set(key, [])
      groups.get(key)?.push(section)
    })
    return Array.from(groups.entries()).sort((a, b) => a[0].localeCompare(b[0]))
  }, [props.sectionIndex])

  const scenesByFile = useMemo(() => {
    const groups = new Map<string, SceneIndexEntry[]>()
    props.sceneIndex.forEach(scene => {
      const key = scene.file
      if (!groups.has(key)) groups.set(key, [])
      groups.get(key)?.push(scene)
    })
    return groups
  }, [props.sceneIndex])

  return (
    <section className="panel storyboard-panel">
      <div className="panel-header">
        <h2>Storyboard</h2>
        <span>{props.sectionIndex.length} sections</span>
      </div>

      <div className="storyboard-scroll">
        {lanes.length === 0 ? <p className="empty-message">No sections yet.</p> : null}
        {lanes.map(([file, sections]) => (
          <article key={file} className="storyboard-lane">
            <header>
              <strong>{file.replace('/workspace/', '')}</strong>
              <span>{sections.length} sections</span>
            </header>
            <div className="storyboard-cards">
              {sections.map(section => {
                const nodeId = section.entityId ?? `section:${section.title}`
                const graphNode = sectionNodeById.get(nodeId)
                const outgoing = props.graph.edges.filter(edge => edge.from === nodeId)
                return (
                  <button key={nodeId} type="button" className="storyboard-card" onClick={() => props.onOpenSection(section)}>
                    <strong>{section.title}</strong>
                    <span>#{section.serial} line {section.line}</span>
                    <span>{outgoing.length} links</span>
                    <span className="section-badges">
                      {graphNode?.unreachable ? <span className="section-badge warn">unreachable</span> : null}
                      {graphNode?.hasError ? <span className="section-badge warn">attention</span> : null}
                    </span>
                  </button>
                )
              })}
            </div>

            {(scenesByFile.get(file) ?? []).length > 0 ? (
              <div className="storyboard-scenes">
                <h3>Scenes</h3>
                <ul className="storyboard-scene-list">
                  {(scenesByFile.get(file) ?? []).map(scene => (
                    <li key={scene.entityId ?? `scene:${scene.serial}:${scene.file}:${scene.line}`}>
                      <button type="button" className="mini-btn" onClick={() => props.onOpenScene(scene)}>
                        {scene.name}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </article>
        ))}
      </div>
    </section>
  )
}

