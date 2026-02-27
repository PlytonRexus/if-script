import type { IdeDiagnostic } from '../types/interfaces'

interface DiagnosticsPanelProps {
  diagnostics: IdeDiagnostic[]
  onJumpToDiagnostic: (diagnostic: IdeDiagnostic) => void
}

export function DiagnosticsPanel(props: DiagnosticsPanelProps): JSX.Element {
  return (
    <section className="panel diagnostics-panel">
      <div className="panel-header">
        <h2>Diagnostics</h2>
        <span>{props.diagnostics.length}</span>
      </div>

      <div className="diagnostic-list">
        {props.diagnostics.length === 0 ? <p className="empty-message">No diagnostics.</p> : null}

        {props.diagnostics.map((d, idx) => (
          <button
            key={`${d.code}-${d.file}-${d.line}-${idx}`}
            className={`diagnostic-item severity-${d.severity}`}
            onClick={() => props.onJumpToDiagnostic(d)}
          >
            <strong>{d.severity.toUpperCase()}</strong>
            <span className="diag-code">{d.code}</span>
            <span className="diag-location">{d.file ?? '<story>'}:{d.line ?? 0}:{d.col ?? 0}</span>
            <p>{d.message}</p>
            {d.hint ? <small>{d.hint}</small> : null}
          </button>
        ))}
      </div>
    </section>
  )
}
