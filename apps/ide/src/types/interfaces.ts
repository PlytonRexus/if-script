export type StorageMode = 'local-only' | 'fs-access'

export interface WorkspaceManifest {
  id: string
  name: string
  rootFile: string
  files: string[]
  aliases: Record<string, string>
  updatedAt: string
  storageMode: StorageMode
}

export interface WorkspaceFile {
  path: string
  content: string
  dirty: boolean
  version: number
  lastSavedAt: string | null
}

export type IdeDiagnosticSeverity = 'error' | 'warning' | 'info'

export type IdeDiagnosticDataKind =
  | 'missing_section_target'
  | 'missing_scene_target'
  | 'start_at_unresolved'
  | 'scene_first_unresolved'

export interface IdeDiagnosticData {
  kind: IdeDiagnosticDataKind
  target?: string
  sourceSectionSerial?: number
  sourceSceneSerial?: number
}

export interface IdeDiagnostic {
  severity: IdeDiagnosticSeverity
  code: string
  file: string | null
  line: number | null
  col: number | null
  message: string
  hint: string | null
  source: 'parser' | 'analyzer'
  data?: IdeDiagnosticData
}

export interface StoryGraphNode {
  id: string
  label: string
  nodeType: 'section' | 'scene' | 'unresolved'
  ending: boolean
  unreachable: boolean
  hasError: boolean
}

export interface StoryGraphEdge {
  from: string
  to: string
  targetType: 'section' | 'scene'
  conditional: boolean
  unresolved: boolean
}

export interface StoryGraph {
  nodes: StoryGraphNode[]
  edges: StoryGraphEdge[]
  startNodeId: string | null
  deadEnds: string[]
}

export interface AuthorGraphNodeAffordances {
  hasTimer: boolean
  hasAmbience: boolean
  hasBackdrop: boolean
  hasSfx: boolean
  hasConditionalChoices: boolean
}

export interface AuthorGraphNode {
  id: string
  kind: 'section' | 'unresolved'
  label: string
  file: string
  sectionSerial: number | null
  sceneSerial: number | null
  sourceRange: SourceRange | null
  unreachable: boolean
  hasError: boolean
  affordances: AuthorGraphNodeAffordances
}

export interface AuthorGraphEdge {
  id: string
  choiceId: string | null
  fromNodeId: string
  toNodeId: string
  conditional: boolean
  unresolved: boolean
  targetType: 'section' | 'scene'
}

export interface AuthorGraphGroup {
  id: string
  kind: 'scene' | 'file'
  label: string
  file: string
  sceneSerial: number | null
  nodeIds: string[]
  colorToken: string
  iconKey: string | null
}

export interface AuthorGraphModel {
  nodes: AuthorGraphNode[]
  edges: AuthorGraphEdge[]
  groups: AuthorGraphGroup[]
}

export interface SourceRange {
  file: string
  startLine: number | null
  startCol: number | null
  endLine: number | null
  endCol: number | null
}

export interface SectionIndexEntry {
  entityId?: string
  serial: number
  title: string
  file: string
  line: number
  col: number
  sourceRange?: SourceRange | null
}

export interface SceneIndexEntry {
  entityId?: string
  serial: number
  name: string
  first: string | number | null
  sections: Array<string | number>
  file: string
  line: number
  col: number
  sourceRange?: SourceRange | null
  hasAmbience: boolean
  ambienceVolume?: number
  ambienceLoop?: boolean
  ambienceFadeInMs?: number
  ambienceFadeOutMs?: number
  sceneTransition: string
  firstResolved: boolean
}

export interface StorySettingsIndexEntry {
  entityId?: string
  file: string
  line: number
  col: number
  sourceRange?: SourceRange | null
  storyTitle: string | null
  startAt?: string | number | null
  referrable?: boolean
  fullTimerSeconds: number | null
  fullTimerTarget: string | number | null
  fullTimerOutcome: string | null
  storyAmbience: string | null
  storyAmbienceVolume: number
  storyAmbienceLoop: boolean
  storyAmbienceFadeInMs?: number
  storyAmbienceFadeOutMs?: number
  presentationMode: 'literary' | 'cinematic'
  maxIterations?: number | null
  maxCallDepth?: number | null
  theme?: string | null
  allowUndo?: boolean
  showTurn?: boolean
  animations?: boolean
  autoSave?: boolean
}

export interface SectionSettingsIndexEntry {
  entityId?: string
  sectionSerial: number
  sectionTitle: string
  file: string
  line: number
  col: number
  sourceRange?: SourceRange | null
  timerSeconds: number | null
  timerTarget: string | number | null
  timerOutcome: string | null
  ambience: string | null
  ambienceVolume: number
  ambienceLoop: boolean
  ambienceFadeInMs?: number
  ambienceFadeOutMs?: number
  sfx: string[]
  backdrop: string | null
  shot: 'wide' | 'medium' | 'close' | 'extreme_close'
  textPacing: 'instant' | 'typed' | 'cinematic'
}

export interface ChoiceIndexEntry {
  entityId?: string
  id: string
  ownerSectionSerial: number
  ownerSectionTitle: string
  choiceIndex: number
  file: string
  line: number
  col: number
  sourceRange?: SourceRange | null
  sourceMode: 'legacy' | 'writer'
  targetType: 'section' | 'scene'
  target: string | number | null
  input?: string | null
  when?: string | null
  once?: boolean
  disabledText?: string | null
  actions?: string[]
  choiceSfx: string | null
  focusSfx: string | null
  choiceStyle: 'default' | 'primary' | 'subtle' | 'danger'
  textPreview: string
}

export interface SectionContentTextBlock {
  id: string
  kind: 'text'
  text: string
  sourceRange?: SourceRange | null
}

export interface SectionContentChoiceBlock {
  id: string
  kind: 'choice'
  choiceId: string
  sourceRange?: SourceRange | null
}

export interface SectionContentBranch {
  blocks: SectionContentBlock[]
}

export interface SectionContentConditionalBlock {
  id: string
  kind: 'conditional'
  condition: string
  thenBranch: SectionContentBranch
  elseBranch: SectionContentBranch | null
  sourceRange?: SourceRange | null
}

export type SectionContentBlock =
  | SectionContentTextBlock
  | SectionContentChoiceBlock
  | SectionContentConditionalBlock

export interface SectionContentIndexEntry {
  sectionSerial: number
  file: string
  sourceRange?: SourceRange | null
  blocks: SectionContentBlock[]
  supported: boolean
  unsupportedNodeKinds: string[]
}

export interface WriterChoiceInput {
  id: string
  text: string
  targetType: 'section' | 'scene'
  target: string
  when: string
  once: boolean
  disabledText: string
  actionsText: string
  choiceSfx: string
  focusSfx: string
  choiceStyle: 'default' | 'primary' | 'subtle' | 'danger'
}

export interface WriterTextBlockInput {
  id: string
  kind: 'text'
  text: string
}

export interface WriterChoiceBlockInput {
  id: string
  kind: 'choice'
  choiceId: string
}

export interface WriterConditionalBlockInput {
  id: string
  kind: 'conditional'
  condition: string
  thenBlocks: WriterSectionBlockInput[]
  elseBlocks: WriterSectionBlockInput[]
}

export type WriterSectionBlockInput =
  | WriterTextBlockInput
  | WriterChoiceBlockInput
  | WriterConditionalBlockInput

export interface SectionWriterSettingsInput {
  timerSeconds: string
  timerTarget: string
  timerOutcome: string
  ambience: string
  ambienceVolume: string
  ambienceLoop: boolean
  sfxCsv: string
  backdrop: string
  shot: 'wide' | 'medium' | 'close' | 'extreme_close'
  textPacing: 'instant' | 'typed' | 'cinematic'
}

export interface SectionWriterInput {
  title: string
  blocks: WriterSectionBlockInput[]
  choices: WriterChoiceInput[]
  settings: SectionWriterSettingsInput
}

export interface SectionWriterPatchResult {
  content: string
  syntaxPreview?: string
  unsupportedReason?: string | null
}

export interface AuthoringSchemaProperty {
  keyword: string
  field: string
  type: string
  description?: string
  enumValues?: string[]
  repeatable?: boolean
  min?: number
  max?: number
  defaultValue?: unknown
}

export interface AuthoringSchemaContext {
  title: string
  properties: AuthoringSchemaProperty[]
  deprecated?: Array<{ keyword: string, replacement: string }>
}

export interface AuthoringSchema {
  version: number
  contexts: {
    story: AuthoringSchemaContext
    scene: AuthoringSchemaContext
    section: AuthoringSchemaContext
    choice: AuthoringSchemaContext
  }
}

export type InferredVariableType = 'number' | 'string' | 'boolean' | 'array' | 'object' | 'unknown'

export interface VariableCatalogEntry {
  name: string
  inferredType: InferredVariableType
  inferredTypes: InferredVariableType[]
  defaultValue?: unknown
}

export interface VariablePreset {
  id: string
  name: string
  values: Record<string, unknown>
  updatedAt: string
}

export interface ParseWorkerRequest {
  workspaceSnapshot: Record<string, string>
  entryFile: string
  aliases: Record<string, string>
  mode: 'check' | 'playtest'
  requestId: number
}

export interface ParseWorkerResponse {
  ok: boolean
  requestId: number
  story: unknown | null
  diagnostics: IdeDiagnostic[]
  graph: StoryGraph
  authorGraph: AuthorGraphModel
  sectionIndex: SectionIndexEntry[]
  sceneIndex: SceneIndexEntry[]
  storySettingsIndex: StorySettingsIndexEntry | null
  sectionSettingsIndex: SectionSettingsIndexEntry[]
  choiceIndex: ChoiceIndexEntry[]
  sectionContentIndex: SectionContentIndexEntry[]
  authoringSchema: AuthoringSchema | null
  variableCatalog: VariableCatalogEntry[]
  sectionVariableNamesBySerial: Record<number, string[]>
  timings: {
    parseMs: number
    analyzeMs: number
    totalMs: number
  }
}

export interface CommandPaletteItem {
  id: string
  title: string
  shortcut: string
  category: string
  kind?: 'command' | 'file' | 'section' | 'scene'
  keywords?: string[]
  run: () => void
}

export type CommandPaletteMode = 'all' | 'files' | 'sections' | 'scenes'

export interface WorkspaceBundle {
  version: 1
  manifest: WorkspaceManifest
  files: Record<string, string>
  metadata?: {
    storyboardLayout?: StoryboardLayoutState
    graphLayout?: GraphLayoutState
  }
}

export interface AuthoringEntityRef {
  entityId: string
  file: string
  sourceRange: SourceRange | null
}

export interface StoryboardLayoutState {
  nodes: Record<string, { x: number, y: number, collapsed?: boolean }>
  lanes: Record<string, { order: number }>
  zoom: number
}

export interface GraphLayoutState {
  pinnedNodes: Record<string, { x: number, y: number }>
  collapsedGroupIds: string[]
  groupsVisible: boolean
  zoom: number
  viewport: { x: number, y: number, zoom: number }
  dockOpen: boolean
  visibleNodeCap: 25 | 60 | 100 | 150
  legendCollapsed: boolean
}

export type RuntimeDebugCategory =
  | 'engine'
  | 'audio'
  | 'timer'
  | 'scene'
  | 'save'
  | 'error'
  | 'system'

export interface RuntimeEventEntry {
  event: string
  at: string
  category: RuntimeDebugCategory
  summary: string
  payload: unknown
}

export interface RuntimeDebugSnapshot {
  engine: {
    section: { serial: number, title: string | null } | null
    scene: { serial: number, name: string } | null
    timers: {
      active: Array<{
        timerType: 'full' | 'section'
        seconds: number
        durationMs: number
        startedAt: number
        deadlineAt: number
        outcomeText: string | null
      }>
    }
    variables: Record<string, unknown>
  } | null
  audio: {
    ui: {
      enabled: boolean
      paused: boolean
      storyAmbienceLoaded: boolean
      sceneMusicLoaded: boolean
      ambienceLoaded: boolean
      hasLoadedAudio: boolean
      playing: boolean
    } | null
    channels: {
      enabled: boolean
      paused: boolean
      storyAmbienceUrl: string | null
      sceneMusicUrl: string | null
      ambienceUrl: string | null
    } | null
  } | null
  timeline: Array<{ eventName: string, payload: unknown }>
}

export interface RuntimeDebugState {
  snapshot: RuntimeDebugSnapshot | null
  lastUpdatedAt: string | null
}

export type InspectorTab = 'story' | 'scene' | 'section' | 'choice'

export interface AdvancedInspectorSelection {
  activeTab: InspectorTab
  sceneSerial: number | null
  sectionSerial: number | null
  choiceId: string | null
}

export type PanelId =
  | 'workspace'
  | 'editor'
  | 'inspector'
  | 'preview'
  | 'graph'
  | 'diagnostics'
  | 'runtime'
  | 'timings'

export interface PanelLayoutItem {
  x: number
  y: number
  w: number
  h: number
  minW: number
  minH: number
}

export type PanelLayoutState = Record<PanelId, PanelLayoutItem>
