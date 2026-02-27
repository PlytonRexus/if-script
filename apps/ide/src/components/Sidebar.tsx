import type { WorkspaceFile } from '../types/interfaces'

interface SidebarProps {
  files: WorkspaceFile[]
  activeFilePath: string
  rootFile: string
  onOpenFile: (path: string) => void
  onSetRootFile: (path: string) => void
}

export function Sidebar(props: SidebarProps): JSX.Element {
  return (
    <aside className="sidebar panel">
      <div className="panel-header">
        <h2>Workspace</h2>
        <span>{props.files.length} files</span>
      </div>
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
    </aside>
  )
}
