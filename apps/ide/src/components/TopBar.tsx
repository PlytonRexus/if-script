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
  onCommandPalette: () => void
}

export function TopBar(props: TopBarProps): JSX.Element {
  return (
    <header className="top-bar">
      <div className="title-wrap">
        <h1>IF-Script IDE</h1>
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
        <button onClick={props.onToggleTheme}>Theme</button>
        <button onClick={props.onCommandPalette}>Palette</button>
      </div>
    </header>
  )
}
