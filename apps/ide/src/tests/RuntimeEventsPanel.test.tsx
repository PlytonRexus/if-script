import { cleanup, fireEvent, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { renderRuntimeEventsPanel } from './helpers/renderHelpers'
import { makeRuntimeEvent } from './helpers/factories'

afterEach(() => cleanup())

describe('RuntimeEventsPanel', () => {
  it('shows empty state when no events', () => {
    renderRuntimeEventsPanel({ events: [] })
    expect(screen.getByText('No events yet.')).toBeTruthy()
  })

  it('renders event name and JSON payload', () => {
    renderRuntimeEventsPanel({
      events: [makeRuntimeEvent({
        event: 'section_enter',
        payload: { serial: 1, title: 'Intro' }
      })]
    })
    expect(screen.getByText('section_enter')).toBeTruthy()
    const pre = document.querySelector('.event-item pre')
    expect(pre?.textContent).toContain('"serial": 1')
    expect(pre?.textContent).toContain('"title": "Intro"')
  })

  it('renders multiple events in order', () => {
    renderRuntimeEventsPanel({
      events: [
        makeRuntimeEvent({ event: 'first_event' }),
        makeRuntimeEvent({ event: 'second_event' }),
        makeRuntimeEvent({ event: 'third_event' })
      ]
    })
    expect(screen.getByText('first_event')).toBeTruthy()
    expect(screen.getByText('second_event')).toBeTruthy()
    expect(screen.getByText('third_event')).toBeTruthy()
  })

  it('Clear button fires onClear', () => {
    const onClear = vi.fn()
    renderRuntimeEventsPanel({ onClear })
    fireEvent.click(screen.getByText('Clear'))
    expect(onClear).toHaveBeenCalledOnce()
  })
})
