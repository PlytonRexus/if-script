import { cleanup, fireEvent, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { renderDiagnosticsPanel } from './helpers/renderHelpers'
import { makeDiagnostic } from './helpers/factories'

afterEach(() => cleanup())

describe('DiagnosticsPanel', () => {
  it('shows empty state when no diagnostics', () => {
    renderDiagnosticsPanel({ diagnostics: [] })
    expect(screen.getByText('No diagnostics.')).toBeTruthy()
  })

  it('shows count in header', () => {
    renderDiagnosticsPanel({
      diagnostics: [makeDiagnostic(), makeDiagnostic({ code: 'OTHER' })]
    })
    expect(screen.getByText('2')).toBeTruthy()
  })

  it('renders severity, code, location, and message', () => {
    renderDiagnosticsPanel({
      diagnostics: [makeDiagnostic({
        severity: 'warning',
        code: 'WARN_CODE',
        file: '/workspace/story.if',
        line: 10,
        col: 5,
        message: 'Something is off'
      })]
    })
    expect(screen.getByText('WARNING')).toBeTruthy()
    expect(screen.getByText('WARN_CODE')).toBeTruthy()
    expect(screen.getByText('/workspace/story.if:10:5')).toBeTruthy()
    expect(screen.getByText('Something is off')).toBeTruthy()
  })

  it('renders hint when provided', () => {
    renderDiagnosticsPanel({
      diagnostics: [makeDiagnostic({ hint: 'Try fixing the target' })]
    })
    expect(screen.getByText('Try fixing the target')).toBeTruthy()
  })

  it('click calls onJumpToDiagnostic with the diagnostic', () => {
    const onJump = vi.fn()
    const diag = makeDiagnostic({ code: 'JUMP_TEST' })
    renderDiagnosticsPanel({ diagnostics: [diag], onJumpToDiagnostic: onJump })
    fireEvent.click(screen.getByText('JUMP_TEST').closest('button')!)
    expect(onJump).toHaveBeenCalledWith(diag)
  })

  it('shows quick fix for missing_section_target', () => {
    renderDiagnosticsPanel({
      diagnostics: [makeDiagnostic({
        code: 'MISSING_TARGET',
        message: 'Section "Hallway" not found',
        data: { kind: 'missing_section_target', target: 'Hallway' }
      })]
    })
    expect(screen.getByText('Create missing section "Hallway"')).toBeTruthy()
  })

  it('shows quick fix for start_at_unresolved', () => {
    renderDiagnosticsPanel({
      diagnostics: [makeDiagnostic({
        code: 'START_UNRESOLVED',
        message: 'Start target "Begin" not found',
        data: { kind: 'start_at_unresolved', target: 'Begin' }
      })]
    })
    expect(screen.getByText('Create missing section "Begin"')).toBeTruthy()
  })

  it('shows quick fix for missing_scene_target with scene label', () => {
    renderDiagnosticsPanel({
      diagnostics: [makeDiagnostic({
        code: 'MISSING_SCENE',
        message: 'Scene "Act Two" not found',
        data: { kind: 'missing_scene_target', target: 'Act Two' }
      })]
    })
    expect(screen.getByText('Create missing scene "Act Two"')).toBeTruthy()
  })

  it('shows quick fix for scene_first_unresolved', () => {
    renderDiagnosticsPanel({
      diagnostics: [makeDiagnostic({
        code: 'FIRST_UNRESOLVED',
        message: 'First target "Opening" not found',
        data: { kind: 'scene_first_unresolved', target: 'Opening' }
      })]
    })
    expect(screen.getByText('Create missing scene "Opening"')).toBeTruthy()
  })

  it('shows quick fix for FULL_TIMER_TARGET_UNRESOLVED', () => {
    renderDiagnosticsPanel({
      diagnostics: [makeDiagnostic({
        code: 'FULL_TIMER_TARGET_UNRESOLVED',
        message: 'Timer target "TimeOut" not found'
      })]
    })
    expect(screen.getByText('Create missing section "TimeOut"')).toBeTruthy()
  })

  it('quick fix click calls onApplyQuickFix', () => {
    const onFix = vi.fn()
    const diag = makeDiagnostic({
      code: 'FIX_TEST',
      message: 'Missing "FixMe"',
      data: { kind: 'missing_section_target', target: 'FixMe' }
    })
    renderDiagnosticsPanel({ diagnostics: [diag], onApplyQuickFix: onFix })
    fireEvent.click(screen.getByText('Create missing section "FixMe"'))
    expect(onFix).toHaveBeenCalledWith(diag)
  })

  it('does not show quick fix when target cannot be extracted', () => {
    renderDiagnosticsPanel({
      diagnostics: [makeDiagnostic({
        code: 'NO_TARGET',
        message: 'Something wrong with no quoted target',
        data: { kind: 'missing_section_target' }
      })]
    })
    const buttons = screen.queryAllByRole('button')
    const fixButtons = buttons.filter(btn => btn.textContent?.startsWith('Create missing'))
    expect(fixButtons.length).toBe(0)
  })

  it('handles null file and line gracefully', () => {
    renderDiagnosticsPanel({
      diagnostics: [makeDiagnostic({ file: null, line: null, col: null })]
    })
    expect(screen.getByText('<story>:0:0')).toBeTruthy()
  })
})
