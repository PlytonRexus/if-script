import type { RuntimeEventEntry } from '../types/interfaces'

interface RuntimeEventsPanelProps {
  events: RuntimeEventEntry[]
  onClear: () => void
}

export function RuntimeEventsPanel(props: RuntimeEventsPanelProps): JSX.Element {
  return (
    <section className="panel runtime-events">
      <div className="panel-header">
        <h2>Runtime Events</h2>
        <button className="mini-btn" onClick={props.onClear}>Clear</button>
      </div>

      <div className="event-list">
        {props.events.length === 0 ? <p className="empty-message">No events yet.</p> : null}
        {props.events.map((event, idx) => (
          <article key={`${event.event}-${event.at}-${idx}`} className="event-item">
            <header>
              <strong>{event.event}</strong>
              <time>{new Date(event.at).toLocaleTimeString()}</time>
            </header>
            <pre>{JSON.stringify(event.payload, null, 2)}</pre>
          </article>
        ))}
      </div>
    </section>
  )
}
