import { useMemo, useState } from 'react'
import type { SceneIndexEntry, SectionIndexEntry, StoryGraph, WorkspaceFile } from '../types/interfaces'

type SidebarMode = 'files' | 'sections' | 'scenes'

interface SidebarProps {
  files: WorkspaceFile[]
  activeFilePath: string
  rootFile: string
  sectionIndex: SectionIndexEntry[]
  sceneIndex: SceneIndexEntry[]
  graph: StoryGraph
  onOpenFile: (path: string) => void
  onOpenSection: (section: SectionIndexEntry) => void
  onOpenScene: (scene: SceneIndexEntry) => void
  onSetRootFile: (path: string) => void
}

export function Sidebar(props: SidebarProps): JSX.Element {
  const [mode, setMode] = useState<SidebarMode>('files')
  const [sectionQuery, setSectionQuery] = useState('')
  const [sceneQuery, setSceneQuery] = useState('')

  const sectionState = useMemo(() => {
    const graphNodeById = new Map(props.graph.nodes.map(node => [node.id, node]))
    const deadEnds = new Set(props.graph.deadEnds)

    return props.sectionIndex.map(section => {
      const nodeId = `section:${section.title}`
      const node = graphNodeById.get(nodeId)
      return {
        section,
        unreachable: node?.unreachable ?? false,
        deadEnd: deadEnds.has(nodeId)
      }
    })
  }, [props.graph.deadEnds, props.graph.nodes, props.sectionIndex])

  const visibleSections = useMemo(() => {
    const query = sectionQuery.trim().toLowerCase()
    if (!query) return sectionState

    return sectionState.filter(entry => {
      const path = entry.section.file.replace('/workspace/', '').toLowerCase()
      return entry.section.title.toLowerCase().includes(query) || path.includes(query)
    })
  }, [sectionQuery, sectionState])

  const visibleScenes = useMemo(() => {
    const query = sceneQuery.trim().toLowerCase()
    if (!query) return props.sceneIndex

    return props.sceneIndex.filter(scene => {
      const path = scene.file.replace('/workspace/', '').toLowerCase()
      const firstTarget = String(scene.first ?? '').toLowerCase()
      return scene.name.toLowerCase().includes(query) || path.includes(query) || firstTarget.includes(query)
    })
  }, [props.sceneIndex, sceneQuery])

  return (
    <aside className="sidebar panel">
      <div className="panel-header">
        <h2>Workspace</h2>
        <span>
          {mode === 'files' ? `${props.files.length} files` : mode === 'sections' ? `${props.sectionIndex.length} sections` : `${props.sceneIndex.length} scenes`}
        </span>
      </div>

      <div className="sidebar-modes" role="tablist" aria-label="Workspace view mode">
        <button
          type="button"
          className={['mini-btn', mode === 'files' ? 'active' : ''].join(' ').trim()}
          onClick={() => setMode('files')}
        >
          Files
        </button>
        <button
          type="button"
          className={['mini-btn', mode === 'sections' ? 'active' : ''].join(' ').trim()}
          onClick={() => setMode('sections')}
        >
          Sections
        </button>
        <button
          type="button"
          className={['mini-btn', mode === 'scenes' ? 'active' : ''].join(' ').trim()}
          onClick={() => setMode('scenes')}
        >
          Scenes
        </button>
      </div>

      {mode === 'sections' ? (
        <div className="sidebar-section-filter">
          <input
            type="text"
            placeholder="Filter sections..."
            value={sectionQuery}
            onChange={(event) => setSectionQuery(event.currentTarget.value)}
          />
        </div>
      ) : null}
      {mode === 'scenes' ? (
        <div className="sidebar-section-filter">
          <input
            type="text"
            placeholder="Filter scenes..."
            value={sceneQuery}
            onChange={(event) => setSceneQuery(event.currentTarget.value)}
          />
        </div>
      ) : null}

      {mode === 'files' ? (
        <ul className="file-list">
          {props.files.map(file => (
            <li key={file.path}>
              <button
                className={[
                  'file-item',
                  props.activeFilePath === file.path ? 'active' : '',
                  props.rootFile === file.path ? 'root' : ''
                ].join(' ').trim()}
                onClick={() => props.onOpenFile(file.path)}
                title={file.path}
              >
                <span className="path">{file.path.replace('/workspace/', '')}</span>
                {file.dirty ? <span className="dirty-dot" aria-label="dirty">*</span> : null}
                {props.rootFile === file.path ? <span className="root-tag">entry</span> : null}
              </button>
              {props.rootFile !== file.path ? (
                <button className="mini-btn" onClick={() => props.onSetRootFile(file.path)}>Set Entry</button>
              ) : null}
            </li>
          ))}
        </ul>
      ) : mode === 'sections' ? (
        <ul className="section-list">
          {visibleSections.length === 0 ? <li><p className="empty-message">No matching sections.</p></li> : null}
          {visibleSections.map(({ section, unreachable, deadEnd }) => (
            <li key={`${section.file}:${section.line}:${section.serial}`}>
              <button
                type="button"
                className={['section-item', props.activeFilePath === section.file ? 'active' : ''].join(' ').trim()}
                onClick={() => props.onOpenSection(section)}
                title={`${section.file}:${section.line}`}
              >
                <span className="section-title">{section.title}</span>
                <span className="section-path">{section.file.replace('/workspace/', '')}:{section.line}</span>
                <span className="section-badges">
                  {unreachable ? <span className="section-badge warn">unreachable</span> : null}
                  {deadEnd ? <span className="section-badge warn">dead-end</span> : null}
                </span>
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <ul className="section-list">
          {visibleScenes.length === 0 ? <li><p className="empty-message">No matching scenes.</p></li> : null}
          {visibleScenes.map((scene) => (
            <li key={`scene:${scene.serial}:${scene.file}:${scene.line}`}>
              <button
                type="button"
                className={['section-item', props.activeFilePath === scene.file ? 'active' : ''].join(' ').trim()}
                onClick={() => props.onOpenScene(scene)}
                title={`${scene.file}:${scene.line}`}
              >
                <span className="section-title">{scene.name}</span>
                <span className="section-path">{scene.file.replace('/workspace/', '')}:{scene.line}</span>
                <span className="section-badges">
                  <span className="section-badge">{scene.sections.length} sections</span>
                  {scene.hasAmbience ? <span className="section-badge">audio</span> : null}
                  {scene.sceneTransition !== 'cut' ? <span className="section-badge">{scene.sceneTransition}</span> : null}
                  {!scene.firstResolved ? <span className="section-badge warn">first unresolved</span> : null}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </aside>
  )
}
