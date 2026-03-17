import type { PanelId } from '../types/interfaces'

interface TopBarProps {
  projectName: string
  parseStatus: 'idle' | 'running' | 'error' | 'ok'
  diagnosticsCount: number
  onNewFile: () => void
  onRenameFile: () => void
  onDeleteFile: () => void
  onRunCheck: () => void
  onPlaytest: () => void
  onSaveLocal: () => void
  onOpenFolder: () => void
  onWriteFolder: () => void
  onImportBundle: () => void
  onExportBundle: () => void
  onToggleTheme: () => void
  authorMode: 'graph' | 'source'
  onToggleAuthorMode: () => void
  onCommandPalette: () => void
  onResetLayout: () => void
  panelToggleItems: Array<{ id: PanelId, label: string, visible: boolean }>
  onTogglePanel: (panelId: PanelId) => void
  onShowAllPanels: () => void
}

export function TopBar(props: TopBarProps): JSX.Element {
  const showPanelToggles = props.panelToggleItems.length > 0

  return (
    <header className="top-bar">
      <div className="title-wrap">
        <h1>IF-Script</h1>
        <p>{props.projectName}</p>
      </div>

      <div className="status-wrap">
        <span className={`status-pill status-${props.parseStatus}`}>Parse: {props.parseStatus}</span>
        <span className="status-pill">Diagnostics: {props.diagnosticsCount}</span>
      </div>

      <div className="toolbar-actions">
        <button onClick={props.onNewFile}>New</button>
        <button onClick={props.onRenameFile}>Rename</button>
        <button onClick={props.onDeleteFile}>Delete</button>
        <button onClick={props.onRunCheck}>Check</button>
        <button onClick={props.onPlaytest}>Playtest</button>
        <button onClick={props.onSaveLocal}>Save</button>
        <button onClick={props.onOpenFolder}>Open Folder</button>
        <button onClick={props.onWriteFolder}>Write Folder</button>
        <button onClick={props.onImportBundle}>Import</button>
        <button onClick={props.onExportBundle}>Export</button>
        <button onClick={props.onResetLayout}>Reset Layout</button>
        <button onClick={props.onToggleTheme}>Theme</button>
        <button onClick={props.onToggleAuthorMode}>{props.authorMode === 'graph' ? 'Source Mode' : 'Graph Mode'}</button>
        <button onClick={props.onCommandPalette}>Palette</button>
        {showPanelToggles ? (
          <div className="panel-toggle-group" aria-label="Panel visibility controls">
            <span>Panels</span>
            {props.panelToggleItems.map((item) => (
              <button
                key={item.id}
                className={`mini-btn${item.visible ? ' active' : ''}`}
                onClick={() => props.onTogglePanel(item.id)}
              >
                {item.label}
              </button>
            ))}
            <button className="mini-btn" onClick={props.onShowAllPanels}>Show all</button>
          </div>
        ) : null}
      </div>
    </header>
  )
}
