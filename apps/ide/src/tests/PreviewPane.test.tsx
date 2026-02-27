import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('if-script-core', () => {
  class MockIFScript {
    async init(): Promise<void> {}
    async parse(): Promise<Record<string, unknown>> {
      return {}
    }
    async createRuntime(): Promise<{
      on: () => void
      mount: () => void
      start: () => void
      destroy: () => void
    }> {
      return {
        on: () => {},
        mount: () => {},
        start: () => {},
        destroy: () => {}
      }
    }
  }
  return { default: MockIFScript }
})

import { PreviewPane } from '../components/PreviewPane'
import type { VariableCatalogEntry } from '../types/interfaces'

afterEach(() => {
  cleanup()
})

function renderPreviewPane(input?: {
  variableCatalog?: VariableCatalogEntry[]
  sectionVariableNamesBySerial?: Record<number, string[]>
  variableOverrideText?: string
  onVariableOverrideTextChange?: (next: string) => void
  onPreviewAutoFollowChange?: (next: boolean) => void
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
      parseStatus="error"
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
      playtestNonce={0}
      onRuntimeEvent={() => {}}
    />
  )
}

describe('PreviewPane', () => {
  it('shows section-relevant variables by default and can reveal all', () => {
    renderPreviewPane({
      variableCatalog: [
        { name: 'hp', inferredType: 'number' },
        { name: 'hidden', inferredType: 'string' },
        { name: 'globalFlag', inferredType: 'boolean', defaultValue: true }
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
      variableCatalog: [{ name: 'hp', inferredType: 'number' }],
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
        { name: 'hp', inferredType: 'number' },
        { name: 'hidden', inferredType: 'string' },
        { name: 'globalFlag', inferredType: 'boolean', defaultValue: true }
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
})
