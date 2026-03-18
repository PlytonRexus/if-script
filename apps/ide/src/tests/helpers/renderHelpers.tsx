import { render } from '@testing-library/react'
import { vi } from 'vitest'
import { TopBar } from '../../components/TopBar'
import { DiagnosticsPanel } from '../../components/DiagnosticsPanel'
import { RuntimeEventsPanel } from '../../components/RuntimeEventsPanel'
import { CommandPalette } from '../../components/CommandPalette'
import { StoryboardPane } from '../../components/StoryboardPane'
import { GraphPane } from '../../components/GraphPane'
import { GraphSectionWriterPane } from '../../components/GraphSectionWriterPane'
import { InspectorPane } from '../../components/InspectorPane'
import type {
  AdvancedInspectorSelection,
  AuthorGraphNode,
  AuthoringSchema,
  ChoiceIndexEntry,
  CommandPaletteItem,
  CommandPaletteMode,
  IdeDiagnostic,
  PanelId,
  RuntimeEventEntry,
  SceneIndexEntry,
  SectionContentIndexEntry,
  SectionIndexEntry,
  SectionSettingsIndexEntry,
  SectionWriterInput,
  StoryGraph,
  StorySettingsIndexEntry
} from '../../types/interfaces'

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

interface StoryboardPaneOverrides {
  sectionIndex?: SectionIndexEntry[]
  sceneIndex?: SceneIndexEntry[]
  graph?: StoryGraph
  onOpenSection?: (section: SectionIndexEntry) => void
  onOpenScene?: (scene: SceneIndexEntry) => void
}

export function renderStoryboardPane(overrides: StoryboardPaneOverrides = {}) {
  return render(
    <StoryboardPane
      sectionIndex={overrides.sectionIndex ?? []}
      sceneIndex={overrides.sceneIndex ?? []}
      graph={overrides.graph ?? { nodes: [], edges: [], startNodeId: null, deadEnds: [] }}
      onOpenSection={overrides.onOpenSection ?? vi.fn()}
      onOpenScene={overrides.onOpenScene ?? vi.fn()}
    />
  )
}

interface GraphPaneOverrides {
  graph?: StoryGraph
  focusedNodeId?: string | null
  onOpenNode?: (nodeId: string) => void
}

export function renderGraphPane(overrides: GraphPaneOverrides = {}) {
  return render(
    <GraphPane
      graph={overrides.graph ?? { nodes: [], edges: [], startNodeId: null, deadEnds: [] }}
      focusedNodeId={overrides.focusedNodeId ?? null}
      onOpenNode={overrides.onOpenNode ?? vi.fn()}
    />
  )
}

interface GraphSectionWriterPaneOverrides {
  section?: SectionSettingsIndexEntry | null
  sectionContent?: SectionContentIndexEntry | null
  selectedNode?: AuthorGraphNode | null
  selectedGroupLabel?: string | null
  selectedChoices?: ChoiceIndexEntry[]
  unsupportedReason?: string | null
  onApply?: (input: SectionWriterInput) => void
  onDeleteSection?: () => void
  onOpenSource?: () => void
}

export function renderGraphSectionWriterPane(overrides: GraphSectionWriterPaneOverrides = {}) {
  return render(
    <GraphSectionWriterPane
      section={overrides.section ?? null}
      sectionContent={overrides.sectionContent ?? null}
      selectedNode={overrides.selectedNode ?? null}
      selectedGroupLabel={overrides.selectedGroupLabel ?? null}
      selectedChoices={overrides.selectedChoices ?? []}
      unsupportedReason={overrides.unsupportedReason ?? null}
      onApply={overrides.onApply ?? vi.fn()}
      onDeleteSection={overrides.onDeleteSection ?? vi.fn()}
      onOpenSource={overrides.onOpenSource ?? vi.fn()}
    />
  )
}

interface InspectorPaneOverrides {
  snapshot?: Record<string, string>
  selection?: Partial<AdvancedInspectorSelection>
  storySettingsIndex?: StorySettingsIndexEntry | null
  sceneIndex?: SceneIndexEntry[]
  sectionSettingsIndex?: SectionSettingsIndexEntry[]
  choiceIndex?: ChoiceIndexEntry[]
  authoringSchema?: AuthoringSchema | null
  onSelectionChange?: (next: AdvancedInspectorSelection) => void
  onWriteFile?: (file: string, nextContent: string) => void
}

export function renderInspectorPane(overrides: InspectorPaneOverrides = {}) {
  const selection: AdvancedInspectorSelection = {
    activeTab: 'section',
    sceneSerial: null,
    sectionSerial: 1,
    choiceId: null,
    ...overrides.selection
  }
  return render(
    <InspectorPane
      snapshot={overrides.snapshot ?? { '/workspace/main.if': 'section "Intro"\nend\n' }}
      selection={selection}
      storySettingsIndex={overrides.storySettingsIndex ?? null}
      sceneIndex={overrides.sceneIndex ?? []}
      sectionSettingsIndex={overrides.sectionSettingsIndex ?? []}
      choiceIndex={overrides.choiceIndex ?? []}
      authoringSchema={overrides.authoringSchema ?? null}
      onSelectionChange={overrides.onSelectionChange ?? vi.fn()}
      onWriteFile={overrides.onWriteFile ?? vi.fn()}
    />
  )
}
