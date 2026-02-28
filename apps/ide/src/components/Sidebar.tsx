import { useMemo, useState } from 'react'
import type { SectionIndexEntry, StoryGraph, WorkspaceFile } from '../types/interfaces'

type SidebarMode = 'files' | 'sections'

interface SidebarProps {
  files: WorkspaceFile[]
  activeFilePath: string
  rootFile: string
  sectionIndex: SectionIndexEntry[]
  graph: StoryGraph
  onOpenFile: (path: string) => void
  onOpenSection: (section: SectionIndexEntry) => void
  onSetRootFile: (path: string) => void
}

export function Sidebar(props: SidebarProps): JSX.Element {
  const [mode, setMode] = useState<SidebarMode>('files')
  const [sectionQuery, setSectionQuery] = useState('')

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

  return (
    <aside className="sidebar panel">
      <div className="panel-header">
        <h2>Workspace</h2>
        <span>{mode === 'files' ? `${props.files.length} files` : `${props.sectionIndex.length} sections`}</span>
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
      ) : (
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
      )}
    </aside>
  )
}
