import { useMemo, useState } from 'react'
import type { RuntimeDebugState, RuntimeEventEntry } from '../types/interfaces'

type DebugTab = 'timeline' | 'audio' | 'timers' | 'scene' | 'issues'

interface PlaytestInspectorPanelProps {
  events: RuntimeEventEntry[]
  debugState: RuntimeDebugState
  onClear: () => void
  onOpenEventSource?: (event: RuntimeEventEntry) => void
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

  const issues = useMemo(() => {
    const out: string[] = []
    const channels = audioState?.channels
    const ui = audioState?.ui
    if (channels && !channels.storyAmbienceUrl && !channels.sceneMusicUrl && !channels.ambienceUrl) {
      out.push('No active audio URLs. Check @storyAmbience/@sceneAmbience/@ambience settings.')
    }
    if (ui && ui.hasLoadedAudio && !ui.playing && ui.enabled && !ui.paused) {
      out.push('Audio loaded but not currently playing. Browser autoplay policy may be blocking playback.')
    }
    if (channels && channels.storyAmbienceUrl && (channels.sceneMusicUrl || channels.ambienceUrl)) {
      out.push('Story ambience is superseded by higher-priority scene/section ambience.')
    }
    if (timers.length === 0) {
      out.push('No active timers. Verify @fullTimer/@timer configuration if expected.')
    }
    if (!scene) {
      out.push('Current section is not mapped to any scene.')
    }
    return out
  }, [audioState?.channels, audioState?.ui, scene, timers.length])

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
        <button type="button" className={['mini-btn', tab === 'issues' ? 'active' : ''].join(' ')} onClick={() => setTab('issues')}>Why Not?</button>
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

        {tab === 'issues' ? (
          <>
            {issues.length === 0 ? <p className="empty-message">No obvious issues detected.</p> : null}
            {issues.map((issue, idx) => (
              <article key={`issue-${idx}`} className="event-item">
                <header><strong>Hint</strong><time>diagnostic</time></header>
                <p className="event-summary">{issue}</p>
              </article>
            ))}
          </>
        ) : null}
      </div>
    </section>
  )
}
