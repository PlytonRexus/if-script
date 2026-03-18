import { render } from '@testing-library/react'
import { vi } from 'vitest'
import { TopBar } from '../../components/TopBar'
import { DiagnosticsPanel } from '../../components/DiagnosticsPanel'
import { RuntimeEventsPanel } from '../../components/RuntimeEventsPanel'
import { CommandPalette } from '../../components/CommandPalette'
import type { PanelId, CommandPaletteMode, CommandPaletteItem, IdeDiagnostic, RuntimeEventEntry } from '../../types/interfaces'

interface TopBarOverrides {
  projectName?: string
  parseStatus?: 'idle' | 'running' | 'error' | 'ok'
  diagnosticsCount?: number
  onNewFile?: () => void
  onRenameFile?: () => void
  onDeleteFile?: () => void
  onRunCheck?: () => void
  onPlaytest?: () => void
  onSaveLocal?: () => void
  onOpenFolder?: () => void
  onWriteFolder?: () => void
  onImportBundle?: () => void
  onExportBundle?: () => void
  onToggleTheme?: () => void
  authorMode?: 'graph' | 'source'
  onToggleAuthorMode?: () => void
  onCommandPalette?: () => void
  onResetLayout?: () => void
  panelToggleItems?: Array<{ id: PanelId, label: string, visible: boolean }>
  onTogglePanel?: (panelId: PanelId) => void
  onShowAllPanels?: () => void
}

export function renderTopBar(overrides: TopBarOverrides = {}) {
  return render(
    <TopBar
      projectName={overrides.projectName ?? 'Test Project'}
      parseStatus={overrides.parseStatus ?? 'ok'}
      diagnosticsCount={overrides.diagnosticsCount ?? 0}
      onNewFile={overrides.onNewFile ?? vi.fn()}
      onRenameFile={overrides.onRenameFile ?? vi.fn()}
      onDeleteFile={overrides.onDeleteFile ?? vi.fn()}
      onRunCheck={overrides.onRunCheck ?? vi.fn()}
      onPlaytest={overrides.onPlaytest ?? vi.fn()}
      onSaveLocal={overrides.onSaveLocal ?? vi.fn()}
      onOpenFolder={overrides.onOpenFolder ?? vi.fn()}
      onWriteFolder={overrides.onWriteFolder ?? vi.fn()}
      onImportBundle={overrides.onImportBundle ?? vi.fn()}
      onExportBundle={overrides.onExportBundle ?? vi.fn()}
      onToggleTheme={overrides.onToggleTheme ?? vi.fn()}
      authorMode={overrides.authorMode ?? 'source'}
      onToggleAuthorMode={overrides.onToggleAuthorMode ?? vi.fn()}
      onCommandPalette={overrides.onCommandPalette ?? vi.fn()}
      onResetLayout={overrides.onResetLayout ?? vi.fn()}
      panelToggleItems={overrides.panelToggleItems ?? []}
      onTogglePanel={overrides.onTogglePanel ?? vi.fn()}
      onShowAllPanels={overrides.onShowAllPanels ?? vi.fn()}
    />
  )
}

interface DiagnosticsPanelOverrides {
  diagnostics?: IdeDiagnostic[]
  onJumpToDiagnostic?: (d: IdeDiagnostic) => void
  onApplyQuickFix?: (d: IdeDiagnostic) => void
}

export function renderDiagnosticsPanel(overrides: DiagnosticsPanelOverrides = {}) {
  return render(
    <DiagnosticsPanel
      diagnostics={overrides.diagnostics ?? []}
      onJumpToDiagnostic={overrides.onJumpToDiagnostic ?? vi.fn()}
      onApplyQuickFix={overrides.onApplyQuickFix ?? vi.fn()}
    />
  )
}

interface RuntimeEventsPanelOverrides {
  events?: RuntimeEventEntry[]
  onClear?: () => void
}

export function renderRuntimeEventsPanel(overrides: RuntimeEventsPanelOverrides = {}) {
  return render(
    <RuntimeEventsPanel
      events={overrides.events ?? []}
      onClear={overrides.onClear ?? vi.fn()}
    />
  )
}

interface CommandPaletteOverrides {
  open?: boolean
  mode?: CommandPaletteMode
  items?: CommandPaletteItem[]
  onClose?: () => void
}

export function renderCommandPalette(overrides: CommandPaletteOverrides = {}) {
  return render(
    <CommandPalette
      open={overrides.open ?? true}
      mode={overrides.mode ?? 'all'}
      items={overrides.items ?? []}
      onClose={overrides.onClose ?? vi.fn()}
    />
  )
}
