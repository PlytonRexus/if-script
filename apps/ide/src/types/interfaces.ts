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

export interface IdeDiagnosticData {
  kind: IdeDiagnosticDataKind
  target?: string
  sourceSectionSerial?: number
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

export interface SectionIndexEntry {
  serial: number
  title: string
  file: string
  line: number
  col: number
}

export type InferredVariableType = 'number' | 'string' | 'boolean' | 'array' | 'object' | 'unknown'

export interface VariableCatalogEntry {
  name: string
  inferredType: InferredVariableType
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
  sectionIndex: SectionIndexEntry[]
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
  kind?: 'command' | 'file' | 'section'
  keywords?: string[]
  run: () => void
}

export type CommandPaletteMode = 'all' | 'files' | 'sections'

export interface WorkspaceBundle {
  version: 1
  manifest: WorkspaceManifest
  files: Record<string, string>
}

export interface RuntimeEventEntry {
  event: string
  at: string
  payload: unknown
}

export type PanelId =
  | 'workspace'
  | 'editor'
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
