import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { PlaytestInspectorPanel } from '../components/PlaytestInspectorPanel'
import { makeRuntimeError, makeRuntimeEvent, makeRuntimeDebugSnapshot } from './helpers/factories'
import type { RuntimeDebugState } from '../types/interfaces'

afterEach(() => {
  cleanup()
})

function renderPanel(overrides: {
  events?: ReturnType<typeof makeRuntimeEvent>[]
  errors?: ReturnType<typeof makeRuntimeError>[]
  debugState?: RuntimeDebugState
  onClear?: () => void
  onOpenEventSource?: (event: ReturnType<typeof makeRuntimeEvent>) => void
  onOpenErrorSource?: (error: ReturnType<typeof makeRuntimeError>) => void
} = {}) {
  return render(
    <PlaytestInspectorPanel
      events={overrides.events ?? []}
      errors={overrides.errors ?? []}
      debugState={overrides.debugState ?? { snapshot: null, lastUpdatedAt: null }}
      onClear={overrides.onClear ?? vi.fn()}
      onOpenEventSource={overrides.onOpenEventSource}
      onOpenErrorSource={overrides.onOpenErrorSource}
    />
  )
}

describe('PlaytestInspectorPanel', () => {
  it('renders runtime errors in the Errors tab and opens source', () => {
    const onOpenErrorSource = vi.fn()
    renderPanel({
      errors: [makeRuntimeError({
        id: 'err-1',
        message: 'Undefined function: nope',
        code: 'RUNTIME_EXCEPTION',
        phase: 'execution',
        sectionSerial: 5,
        sceneSerial: 2,
        location: { file: '/workspace/main.if', line: 12, col: 4 },
        summary: 'Undefined function: nope',
        details: { code: 'RUNTIME_EXCEPTION' },
        traceId: 't-1'
      })],
      onOpenErrorSource
    })

    fireEvent.click(screen.getByRole('button', { name: 'Errors (1)' }))
    expect(screen.getByText('RUNTIME_EXCEPTION')).toBeTruthy()
    expect(screen.getByText('/workspace/main.if:12:4')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Open source' }))
    expect(onOpenErrorSource).toHaveBeenCalledTimes(1)
  })

  it('shows an empty state when there are no runtime errors', () => {
    renderPanel()
    fireEvent.click(screen.getByRole('button', { name: 'Errors' }))
    expect(screen.getByText('No runtime errors.')).toBeTruthy()
  })

  it('Timeline tab shows events with summaries', () => {
    renderPanel({
      events: [
        makeRuntimeEvent({ event: 'section_enter', summary: 'Entered Prologue' }),
        makeRuntimeEvent({ event: 'scene_change', summary: 'Changed to Act 2' })
      ]
    })
    expect(screen.getByText('section_enter')).toBeTruthy()
    expect(screen.getByText('Entered Prologue')).toBeTruthy()
    expect(screen.getByText('scene_change')).toBeTruthy()
  })

  it('Timeline tab shows empty state', () => {
    renderPanel({ events: [] })
    expect(screen.getByText('No runtime events yet.')).toBeTruthy()
  })

  it('Timeline tab shows Open source button for scene events', () => {
    const onOpenEventSource = vi.fn()
    renderPanel({
      events: [makeRuntimeEvent({ event: 'scene_change', category: 'scene', summary: 'Changed scene' })],
      onOpenEventSource
    })
    fireEvent.click(screen.getByRole('button', { name: 'Open source' }))
    expect(onOpenEventSource).toHaveBeenCalledOnce()
  })

  it('Audio tab shows empty state when no snapshot', () => {
    renderPanel()
    fireEvent.click(screen.getByRole('button', { name: 'Audio' }))
    expect(screen.getByText('No audio debug snapshot yet.')).toBeTruthy()
  })

  it('Audio tab shows snapshot data when available', () => {
    const snapshot = makeRuntimeDebugSnapshot({
      audio: {
        ui: {
          enabled: true,
          paused: false,
          storyAmbienceLoaded: true,
          sceneMusicLoaded: false,
          ambienceLoaded: false,
          hasLoadedAudio: true,
          playing: true
        },
        channels: null
      }
    })
    renderPanel({ debugState: { snapshot, lastUpdatedAt: new Date().toISOString() } })
    fireEvent.click(screen.getByRole('button', { name: 'Audio' }))
    expect(screen.queryByText('No audio debug snapshot yet.')).toBeNull()
  })

  it('Timers tab shows empty state', () => {
    renderPanel()
    fireEvent.click(screen.getByRole('button', { name: 'Timers' }))
    expect(screen.getByText('No active timers.')).toBeTruthy()
  })

  it('Timers tab shows active timers with type labels', () => {
    const now = Date.now()
    const snapshot = makeRuntimeDebugSnapshot({
      engine: {
        section: { serial: 1, title: 'Intro' },
        scene: null,
        timers: {
          active: [{
            timerType: 'full',
            seconds: 60,
            durationMs: 60000,
            startedAt: now - 10000,
            deadlineAt: now + 50000,
            outcomeText: 'Game Over'
          }, {
            timerType: 'section',
            seconds: 10,
            durationMs: 10000,
            startedAt: now - 3000,
            deadlineAt: now + 7000,
            outcomeText: null
          }]
        },
        variables: {}
      }
    })
    renderPanel({ debugState: { snapshot, lastUpdatedAt: new Date().toISOString() } })
    fireEvent.click(screen.getByRole('button', { name: 'Timers' }))
    expect(screen.getByText('Story Timer')).toBeTruthy()
    expect(screen.getByText('Section Timer')).toBeTruthy()
    expect(screen.getByText('Outcome: Game Over')).toBeTruthy()
  })

  it('Scene Flow tab shows current scene and section', () => {
    const snapshot = makeRuntimeDebugSnapshot({
      engine: {
        section: { serial: 3, title: 'Hallway' },
        scene: { serial: 1, name: 'Act One' },
        timers: { active: [] },
        variables: {}
      }
    })
    renderPanel({ debugState: { snapshot, lastUpdatedAt: new Date().toISOString() } })
    fireEvent.click(screen.getByRole('button', { name: 'Scene Flow' }))
    expect(screen.getByText('Scene: Act One (#1)')).toBeTruthy()
    expect(screen.getByText('Section: Hallway (#3)')).toBeTruthy()
  })

  it('Scene Flow tab shows none when no engine state', () => {
    renderPanel()
    fireEvent.click(screen.getByRole('button', { name: 'Scene Flow' }))
    expect(screen.getByText('Scene: none')).toBeTruthy()
    expect(screen.getByText('Section: none')).toBeTruthy()
  })

  it('error count shows in tab label', () => {
    renderPanel({
      errors: [makeRuntimeError(), makeRuntimeError({ id: 'err-2' }), makeRuntimeError({ id: 'err-3' })]
    })
    expect(screen.getByRole('button', { name: 'Errors (3)' })).toBeTruthy()
  })

  it('Clear button fires onClear', () => {
    const onClear = vi.fn()
    renderPanel({ onClear })
    fireEvent.click(screen.getByText('Clear'))
    expect(onClear).toHaveBeenCalledOnce()
  })

  it('error context shows scene and section serials', () => {
    renderPanel({
      errors: [makeRuntimeError({
        sectionSerial: 5,
        sceneSerial: 2,
        code: 'CTX_TEST',
        summary: 'context test'
      })],
    })
    fireEvent.click(screen.getByRole('button', { name: 'Errors (1)' }))
    const contextText = screen.getByText((content) =>
      content.includes('Scene #2') && content.includes('Section #5')
    )
    expect(contextText).toBeTruthy()
  })
})
