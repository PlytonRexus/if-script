import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const runtimeHandlers = new Map<string, (payload: unknown) => void>()
const mockCreateRuntime = vi.fn()
const mockParse = vi.fn()
const mockInit = vi.fn()

vi.mock('if-script-core', () => {
  class MockIFScript {
    async init(): Promise<void> {
      await mockInit()
    }

    async parse(): Promise<Record<string, unknown>> {
      return mockParse()
    }

    async createRuntime(): Promise<{
      on: (eventName: string, handler: (payload: unknown) => void) => void
      mount: () => void
      start: () => void
      destroy: () => void
      getDebugSnapshot: () => null
    }> {
      return mockCreateRuntime()
    }
  }

  return { default: MockIFScript }
})

import { PreviewPane } from '../components/PreviewPane'
import type { RuntimeErrorEntry, VariableCatalogEntry } from '../types/interfaces'

function makeRuntime() {
  runtimeHandlers.clear()
  return {
    on: (eventName: string, handler: (payload: unknown) => void) => {
      runtimeHandlers.set(eventName, handler)
    },
    mount: () => {},
    start: () => {},
    destroy: () => {},
    getDebugSnapshot: () => null
  }
}

async function flushPreviewStartup(): Promise<void> {
  await act(async () => {
    await vi.runAllTimersAsync()
  })
}

afterEach(() => {
  cleanup()
  runtimeHandlers.clear()
  vi.useRealTimers()
})

beforeEach(() => {
  mockInit.mockReset()
  mockInit.mockResolvedValue(undefined)
  mockParse.mockReset()
  mockParse.mockResolvedValue({})
  mockCreateRuntime.mockReset()
  mockCreateRuntime.mockResolvedValue(makeRuntime())
})

function renderPreviewPane(input?: {
  variableCatalog?: VariableCatalogEntry[]
  sectionVariableNamesBySerial?: Record<number, string[]>
  variableOverrideText?: string
  onVariableOverrideTextChange?: (next: string) => void
  onPreviewAutoFollowChange?: (next: boolean) => void
  parseStatus?: 'idle' | 'running' | 'error' | 'ok'
  onRuntimeError?: (entry: RuntimeErrorEntry) => void
}): void {
  const variableCatalog = input?.variableCatalog ?? []
  render(
    <PreviewPane
      manifest={{
        id: 'workspace-default',
        name: 'Test',
        rootFile: '/workspace/main.if',
        files: ['/workspace/main.if'],
        aliases: {},
        updatedAt: new Date().toISOString(),
        storageMode: 'local-only'
      }}
      snapshot={{ '/workspace/main.if': 'section "One"\nend\n' }}
      parseStatus={input?.parseStatus ?? 'error'}
      focusedSection={{ serial: 3, title: 'One', file: '/workspace/main.if', line: 3, col: 1 }}
      variableCatalog={variableCatalog}
      sectionVariableNamesBySerial={input?.sectionVariableNamesBySerial ?? { 3: [] }}
      variableOverrideText={input?.variableOverrideText ?? '{}'}
      onVariableOverrideTextChange={input?.onVariableOverrideTextChange ?? (() => {})}
      variablePresets={[]}
      onSaveVariablePreset={() => {}}
      onLoadVariablePreset={() => {}}
      onDeleteVariablePreset={() => {}}
      previewAutoFollow={false}
      onPreviewAutoFollowChange={input?.onPreviewAutoFollowChange ?? (() => {})}
      previewPinned={false}
      onTogglePreviewPin={() => {}}
      playtestNonce={1}
      onRuntimeEvent={() => {}}
      onRuntimeError={input?.onRuntimeError ?? (() => {})}
      onRuntimeDebugSnapshot={() => {}}
    />
  )
}

describe('PreviewPane', () => {
  it('shows section-relevant variables by default and can reveal all', () => {
    renderPreviewPane({
      variableCatalog: [
        { name: 'hp', inferredType: 'number', inferredTypes: ['number'] },
        { name: 'hidden', inferredType: 'string', inferredTypes: ['string'] },
        { name: 'globalFlag', inferredType: 'boolean', inferredTypes: ['boolean'], defaultValue: true }
      ],
      sectionVariableNamesBySerial: { 3: ['hp'] }
    })

    expect(screen.getByText('hp')).toBeTruthy()
    expect(screen.getByText('globalFlag')).toBeTruthy()
    expect(screen.queryByText('hidden')).toBeNull()

    fireEvent.click(screen.getByLabelText('Show all variables'))
    expect(screen.getByText('hidden')).toBeTruthy()
  })

  it('repairs invalid JSON from form mode', () => {
    const onChange = vi.fn()
    renderPreviewPane({
      variableCatalog: [{ name: 'hp', inferredType: 'number', inferredTypes: ['number'] }],
      sectionVariableNamesBySerial: { 3: ['hp'] },
      variableOverrideText: '{bad}',
      onVariableOverrideTextChange: onChange
    })

    fireEvent.click(screen.getByRole('button', { name: 'Repair JSON' }))
    expect(onChange).toHaveBeenCalledWith('{}')
  })

  it('randomizes only currently visible variables', () => {
    const onChange = vi.fn()
    renderPreviewPane({
      variableCatalog: [
        { name: 'hp', inferredType: 'number', inferredTypes: ['number'] },
        { name: 'hidden', inferredType: 'string', inferredTypes: ['string'] },
        { name: 'globalFlag', inferredType: 'boolean', inferredTypes: ['boolean'], defaultValue: true }
      ],
      sectionVariableNamesBySerial: { 3: ['hp'] },
      onVariableOverrideTextChange: onChange
    })

    fireEvent.click(screen.getByRole('button', { name: 'Randomize All' }))
    expect(onChange).toHaveBeenCalled()
    const payload = onChange.mock.calls[0]?.[0]
    const parsed = JSON.parse(payload) as Record<string, unknown>
    expect(Object.keys(parsed).sort()).toEqual(['globalFlag', 'hp'])
  })

  it('emits auto-follow toggle changes', () => {
    const onToggle = vi.fn()
    renderPreviewPane({
      onPreviewAutoFollowChange: onToggle
    })
    fireEvent.click(screen.getByLabelText('Auto-follow'))
    expect(onToggle).toHaveBeenCalledWith(true)
  })

  it('renders mixed-type variables as JSON with multiple type badges', () => {
    renderPreviewPane({
      variableCatalog: [
        { name: 'morph', inferredType: 'string', inferredTypes: ['string', 'number'] }
      ],
      sectionVariableNamesBySerial: { 3: ['morph'] }
    })

    expect(screen.getByText('string')).toBeTruthy()
    expect(screen.getByText('number')).toBeTruthy()
    expect(screen.queryByRole('spinbutton')).toBeNull()
    expect(screen.getByDisplayValue('""')).toBeTruthy()
  })

  it('forwards structured exception runtime errors', async () => {
    vi.useFakeTimers()
    const onRuntimeError = vi.fn()
    renderPreviewPane({
      parseStatus: 'ok',
      onRuntimeError
    })

    await flushPreviewStartup()

    const handler = runtimeHandlers.get('error_raised')
    expect(handler).toBeTypeOf('function')
    act(() => {
      handler?.({
        kind: 'exception',
        severity: 'error',
        code: 'RUNTIME_EXCEPTION',
        message: 'Undefined function: boom',
        phase: 'execution',
        sectionSerial: 3,
        location: { file: '/workspace/main.if', line: 7, col: 3 }
      })
    })

    expect(onRuntimeError).toHaveBeenCalledWith(expect.objectContaining({
      code: 'RUNTIME_EXCEPTION',
      message: 'Undefined function: boom',
      phase: 'execution',
      sectionSerial: 3
    }))
  })

  it('ignores validation runtime errors for the error feed', async () => {
    vi.useFakeTimers()
    const onRuntimeError = vi.fn()
    renderPreviewPane({
      parseStatus: 'ok',
      onRuntimeError
    })

    await flushPreviewStartup()

    act(() => {
      runtimeHandlers.get('error_raised')?.({
        kind: 'validation',
        severity: 'error',
        code: 'INPUT_REQUIRED',
        message: 'Input choice requires a non-empty value.',
        phase: 'interaction'
      })
    })

    expect(onRuntimeError).not.toHaveBeenCalled()
  })

  it('captures startup failures as runtime errors', async () => {
    vi.useFakeTimers()
    mockCreateRuntime.mockRejectedValueOnce(new Error('boot failed'))
    const onRuntimeError = vi.fn()
    renderPreviewPane({
      parseStatus: 'ok',
      onRuntimeError
    })

    await flushPreviewStartup()

    expect(onRuntimeError).toHaveBeenCalledWith(expect.objectContaining({
      code: 'RUNTIME_START_FAILED',
      message: 'boot failed',
      phase: 'startup',
      sectionSerial: 3
    }))
  })
})
