import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { PlaytestInspectorPanel } from '../components/PlaytestInspectorPanel'

afterEach(() => {
  cleanup()
})

describe('PlaytestInspectorPanel', () => {
  it('renders runtime errors in the Errors tab and opens source', () => {
    const onOpenErrorSource = vi.fn()
    render(
      <PlaytestInspectorPanel
        events={[]}
        errors={[{
          id: 'err-1',
          at: new Date().toISOString(),
          message: 'Undefined function: nope',
          code: 'RUNTIME_EXCEPTION',
          phase: 'execution',
          severity: 'error',
          sectionSerial: 5,
          sceneSerial: 2,
          location: { file: '/workspace/main.if', line: 12, col: 4 },
          summary: 'Undefined function: nope',
          details: { code: 'RUNTIME_EXCEPTION' },
          traceId: 't-1'
        }]}
        debugState={{ snapshot: null, lastUpdatedAt: null }}
        onClear={() => {}}
        onOpenErrorSource={onOpenErrorSource}
      />
    )

    fireEvent.click(screen.getByRole('button', { name: 'Errors (1)' }))
    expect(screen.getByText('RUNTIME_EXCEPTION')).toBeTruthy()
    expect(screen.getByText('/workspace/main.if:12:4')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Open source' }))
    expect(onOpenErrorSource).toHaveBeenCalledTimes(1)
  })

  it('shows an empty state when there are no runtime errors', () => {
    render(
      <PlaytestInspectorPanel
        events={[]}
        errors={[]}
        debugState={{ snapshot: null, lastUpdatedAt: null }}
        onClear={() => {}}
      />
    )

    fireEvent.click(screen.getByRole('button', { name: 'Errors' }))
    expect(screen.getByText('No runtime errors.')).toBeTruthy()
  })
})
