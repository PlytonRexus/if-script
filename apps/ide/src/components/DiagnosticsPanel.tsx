import type { IdeDiagnostic } from '../types/interfaces'

interface DiagnosticsPanelProps {
  diagnostics: IdeDiagnostic[]
  onJumpToDiagnostic: (diagnostic: IdeDiagnostic) => void
  onApplyQuickFix: (diagnostic: IdeDiagnostic) => void
}

function diagnosticTarget(diagnostic: IdeDiagnostic): string | null {
  if (diagnostic.data?.target && diagnostic.data.target.trim() !== '') return diagnostic.data.target.trim()
  const quoted = diagnostic.message.match(/"([^"]+)"/)
  if (!quoted?.[1]) return null
  return quoted[1].trim() || null
}

function supportsCreateSectionQuickFix(diagnostic: IdeDiagnostic): boolean {
  if (!diagnosticTarget(diagnostic)) return false
  return diagnostic.data?.kind === 'missing_section_target' ||
    diagnostic.data?.kind === 'start_at_unresolved' ||
    diagnostic.data?.kind === 'missing_scene_target' ||
    diagnostic.data?.kind === 'scene_first_unresolved' ||
    diagnostic.code === 'FULL_TIMER_TARGET_UNRESOLVED' ||
    diagnostic.code === 'SECTION_TIMER_TARGET_UNRESOLVED'
}

function quickFixLabel(diagnostic: IdeDiagnostic): string {
  const target = diagnosticTarget(diagnostic)
  if (!target) return 'Create missing target'
  if (diagnostic.data?.kind === 'missing_scene_target' || diagnostic.data?.kind === 'scene_first_unresolved') {
    return `Create missing scene "${target}"`
  }
  return `Create missing section "${target}"`
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
          <article
            key={`${d.code}-${d.file}-${d.line}-${idx}`}
            className={`diagnostic-item severity-${d.severity}`}
          >
            <button
              type="button"
              className="diagnostic-main"
              onClick={() => props.onJumpToDiagnostic(d)}
            >
              <strong>{d.severity.toUpperCase()}</strong>
              <span className="diag-code">{d.code}</span>
              <span className="diag-location">{d.file ?? '<story>'}:{d.line ?? 0}:{d.col ?? 0}</span>
              <p>{d.message}</p>
              {d.hint ? <small>{d.hint}</small> : null}
            </button>

            {supportsCreateSectionQuickFix(d) ? (
              <button
                type="button"
                className="mini-btn diagnostic-fix-btn"
                onClick={(event) => {
                  event.stopPropagation()
                  props.onApplyQuickFix(d)
                }}
              >
                {quickFixLabel(d)}
              </button>
            ) : null}
          </article>
        ))}
      </div>
    </section>
  )
}
