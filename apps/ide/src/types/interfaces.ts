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

export interface IdeDiagnostic {
  severity: IdeDiagnosticSeverity
  code: string
  file: string | null
  line: number | null
  col: number | null
  message: string
  hint: string | null
  source: 'parser' | 'analyzer'
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
  run: () => void
}

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
