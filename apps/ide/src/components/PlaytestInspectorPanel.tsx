import { useMemo, useState } from 'react'
import type { RuntimeDebugState, RuntimeErrorEntry, RuntimeEventEntry } from '../types/interfaces'

type DebugTab = 'timeline' | 'audio' | 'timers' | 'scene' | 'errors'

interface PlaytestInspectorPanelProps {
  events: RuntimeEventEntry[]
  errors: RuntimeErrorEntry[]
  debugState: RuntimeDebugState
  onClear: () => void
  onOpenEventSource?: (event: RuntimeEventEntry) => void
  onOpenErrorSource?: (error: RuntimeErrorEntry) => void
}

function formatTime(iso: string): string {
  const parsed = new Date(iso)
  if (Number.isNaN(parsed.getTime())) return iso
  return parsed.toLocaleTimeString()
}

function formatMsRemaining(deadlineAt: number): string {
  const remaining = Math.max(0, deadlineAt - Date.now())
  return `${Math.ceil(remaining / 1000)}s`
}

export function PlaytestInspectorPanel(props: PlaytestInspectorPanelProps): JSX.Element {
  const [tab, setTab] = useState<DebugTab>('timeline')

  const audioState = props.debugState.snapshot?.audio ?? null
  const timers = props.debugState.snapshot?.engine?.timers?.active ?? []
  const scene = props.debugState.snapshot?.engine?.scene ?? null
  const section = props.debugState.snapshot?.engine?.section ?? null

  function hasSourceHint(event: RuntimeEventEntry): boolean {
    if (event.category === 'scene' || event.category === 'timer') return true
    const payload = typeof event.payload === 'object' && event.payload !== null
      ? event.payload as Record<string, unknown>
      : null
    if (!payload) return false
    const scene = payload.scene
    const section = payload.section
    if (typeof payload.sceneSerial === 'number' || typeof payload.sectionSerial === 'number') return true
    if (typeof payload.target === 'number' || typeof payload.target === 'string') return true
    if (typeof scene === 'object' && scene !== null && typeof (scene as Record<string, unknown>).serial === 'number') return true
    if (typeof section === 'object' && section !== null && typeof (section as Record<string, unknown>).serial === 'number') return true
    return false
  }

  const errorCountLabel = useMemo(() => {
    return props.errors.length > 0 ? `Errors (${props.errors.length})` : 'Errors'
  }, [props.errors.length])

  function formatLocation(error: RuntimeErrorEntry): string | null {
    if (!error.location) return null
    const line = error.location.line ?? error.location.startLine ?? 0
    const col = error.location.col ?? error.location.startCol ?? 0
    const file = error.location.file ?? '<unknown>'
    return `${file}:${line}:${col}`
  }

  function formatContext(error: RuntimeErrorEntry): string | null {
    const parts: string[] = []
    if (typeof error.sceneSerial === 'number') parts.push(`Scene #${error.sceneSerial}`)
    if (typeof error.sectionSerial === 'number') parts.push(`Section #${error.sectionSerial}`)
    return parts.length > 0 ? parts.join(' • ') : null
  }

  function hasErrorSource(error: RuntimeErrorEntry): boolean {
    return Boolean(error.location?.file) || typeof error.sceneSerial === 'number' || typeof error.sectionSerial === 'number'
  }

  return (
    <section className="panel runtime-events">
      <div className="panel-header">
        <h2>Playtest Inspector</h2>
        <button className="mini-btn" onClick={props.onClear}>Clear</button>
      </div>

      <div className="inspector-tabs" role="tablist" aria-label="Playtest inspector tabs">
        <button type="button" className={['mini-btn', tab === 'timeline' ? 'active' : ''].join(' ')} onClick={() => setTab('timeline')}>Timeline</button>
        <button type="button" className={['mini-btn', tab === 'audio' ? 'active' : ''].join(' ')} onClick={() => setTab('audio')}>Audio</button>
        <button type="button" className={['mini-btn', tab === 'timers' ? 'active' : ''].join(' ')} onClick={() => setTab('timers')}>Timers</button>
        <button type="button" className={['mini-btn', tab === 'scene' ? 'active' : ''].join(' ')} onClick={() => setTab('scene')}>Scene Flow</button>
        <button type="button" className={['mini-btn', tab === 'errors' ? 'active' : ''].join(' ')} onClick={() => setTab('errors')}>{errorCountLabel}</button>
      </div>

      <div className="event-list">
        {tab === 'timeline' ? (
          <>
            {props.events.length === 0 ? <p className="empty-message">No runtime events yet.</p> : null}
            {props.events.map((event, idx) => (
              <article key={`${event.event}-${event.at}-${idx}`} className="event-item">
                <header>
                  <strong>{event.event}</strong>
                  <time>{formatTime(event.at)}</time>
                </header>
                <p className="event-summary">{event.summary}</p>
                {props.onOpenEventSource && hasSourceHint(event) ? (
                  <p className="event-summary">
                    <button type="button" className="mini-btn" onClick={() => props.onOpenEventSource?.(event)}>
                      Open source
                    </button>
                  </p>
                ) : null}
                <pre>{JSON.stringify(event.payload, null, 2)}</pre>
              </article>
            ))}
          </>
        ) : null}

        {tab === 'audio' ? (
          <article className="event-item">
            <header><strong>Audio State</strong><time>{props.debugState.lastUpdatedAt ? formatTime(props.debugState.lastUpdatedAt) : '-'}</time></header>
            {audioState ? (
              <pre>{JSON.stringify(audioState, null, 2)}</pre>
            ) : (
              <p className="empty-message">No audio debug snapshot yet.</p>
            )}
          </article>
        ) : null}

        {tab === 'timers' ? (
          <>
            {timers.length === 0 ? <p className="empty-message">No active timers.</p> : null}
            {timers.map((timer, idx) => (
              <article key={`${timer.timerType}-${timer.deadlineAt}-${idx}`} className="event-item">
                <header>
                  <strong>{timer.timerType === 'full' ? 'Story Timer' : 'Section Timer'}</strong>
                  <time>{formatMsRemaining(timer.deadlineAt)}</time>
                </header>
                <p className="event-summary">Duration: {Math.round(timer.durationMs / 1000)}s</p>
                {timer.outcomeText ? <p className="event-summary">Outcome: {timer.outcomeText}</p> : null}
              </article>
            ))}
          </>
        ) : null}

        {tab === 'scene' ? (
          <article className="event-item">
            <header>
              <strong>Current Flow</strong>
              <time>{props.debugState.lastUpdatedAt ? formatTime(props.debugState.lastUpdatedAt) : '-'}</time>
            </header>
            <p className="event-summary">Scene: {scene ? `${scene.name} (#${scene.serial})` : 'none'}</p>
            <p className="event-summary">Section: {section ? `${section.title ?? 'Untitled'} (#${section.serial})` : 'none'}</p>
            <pre>{JSON.stringify({ scene, section }, null, 2)}</pre>
          </article>
        ) : null}

        {tab === 'errors' ? (
          <>
            {props.errors.length === 0 ? <p className="empty-message">No runtime errors.</p> : null}
            {props.errors.map((error) => (
              <article key={error.id} className="event-item">
                <header>
                  <strong>{error.code}</strong>
                  <time>{formatTime(error.at)}</time>
                </header>
                <p className="event-summary">{error.summary}</p>
                {error.message !== error.summary ? <p className="event-summary">{error.message}</p> : null}
                {formatContext(error) ? <p className="event-summary">{formatContext(error)}</p> : null}
                {formatLocation(error) ? <p className="event-summary">{formatLocation(error)}</p> : null}
                {props.onOpenErrorSource && hasErrorSource(error) ? (
                  <p className="event-summary">
                    <button type="button" className="mini-btn" onClick={() => props.onOpenErrorSource?.(error)}>
                      Open source
                    </button>
                  </p>
                ) : null}
                <pre>{JSON.stringify(error.details, null, 2)}</pre>
              </article>
            ))}
          </>
        ) : null}
      </div>
    </section>
  )
}
