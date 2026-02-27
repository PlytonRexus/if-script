import { create } from 'zustand'
import type {
  IdeDiagnostic,
  RuntimeEventEntry,
  SectionIndexEntry,
  StoryGraph,
  VariableCatalogEntry,
  WorkspaceFile,
  WorkspaceManifest
} from '../types/interfaces'
import { sortWorkspacePaths, toWorkspacePath } from '../lib/path'

const DEFAULT_STORY = `settings__
  @storyTitle "New IF Story"
  @startAt "Prologue"
  @theme "literary-default"
__settings

section "Prologue"
  "You wake to the hush of rain against the old windows."
  -> "Open the oak door" => "Hallway"
end

section "Hallway"
  "Portraits watch as you step into a corridor lit by brass lamps."
  -> "Return to your room" => "Prologue"
end
`

function nowIso(): string {
  return new Date().toISOString()
}

function defaultWorkspace(): { manifest: WorkspaceManifest, files: Record<string, WorkspaceFile>, activeFilePath: string } {
  const path = '/workspace/main.if'
  const manifest: WorkspaceManifest = {
    id: 'workspace-default',
    name: 'Untitled Project',
    rootFile: path,
    files: [path],
    aliases: {},
    updatedAt: nowIso(),
    storageMode: 'local-only'
  }

  const files: Record<string, WorkspaceFile> = {
    [path]: {
      path,
      content: DEFAULT_STORY,
      dirty: false,
      version: 1,
      lastSavedAt: nowIso()
    }
  }

  return { manifest, files, activeFilePath: path }
}

interface IdeState {
  manifest: WorkspaceManifest
  files: Record<string, WorkspaceFile>
  activeFilePath: string
  diagnostics: IdeDiagnostic[]
  graph: StoryGraph
  sectionIndex: SectionIndexEntry[]
  variableCatalog: VariableCatalogEntry[]
  sectionVariableNamesBySerial: Record<number, string[]>
  parseStatus: 'idle' | 'running' | 'error' | 'ok'
  parseRequestId: number
  parseTimings: { parseMs: number, analyzeMs: number, totalMs: number }
  commandPaletteOpen: boolean
  theme: 'day' | 'night'
  runtimeEvents: RuntimeEventEntry[]
  fsRootHandle: any | null
  playtestNonce: number
  setWorkspace: (payload: { manifest: WorkspaceManifest, files: Record<string, WorkspaceFile>, activeFilePath?: string }) => void
  setActiveFile: (path: string) => void
  setRootFile: (path: string) => void
  setFileContent: (path: string, content: string) => void
  createFile: (requestedPath: string) => void
  renameFile: (oldPath: string, nextPath: string) => void
  deleteFile: (path: string) => void
  setDiagnosticsGraph: (input: {
    diagnostics: IdeDiagnostic[]
    graph: StoryGraph
    sectionIndex: SectionIndexEntry[]
    variableCatalog: VariableCatalogEntry[]
    sectionVariableNamesBySerial: Record<number, string[]>
    parseStatus: IdeState['parseStatus']
    parseRequestId: number
    timings: IdeState['parseTimings']
  }) => void
  setParseRunning: (requestId: number) => void
  setCommandPaletteOpen: (value: boolean) => void
  setTheme: (value: 'day' | 'night') => void
  toggleTheme: () => void
  addRuntimeEvent: (entry: RuntimeEventEntry) => void
  clearRuntimeEvents: () => void
  setFsRootHandle: (handle: any | null) => void
  saveCheckpoint: () => void
  triggerPlaytest: () => void
  setAliases: (aliases: Record<string, string>) => void
  setStorageMode: (storageMode: WorkspaceManifest['storageMode']) => void
}

const initial = defaultWorkspace()

export const useIdeStore = create<IdeState>((set, get) => ({
  manifest: initial.manifest,
  files: initial.files,
  activeFilePath: initial.activeFilePath,
  diagnostics: [],
  graph: { nodes: [], edges: [], startNodeId: null, deadEnds: [] },
  sectionIndex: [],
  variableCatalog: [],
  sectionVariableNamesBySerial: {},
  parseStatus: 'idle',
  parseRequestId: 0,
  parseTimings: { parseMs: 0, analyzeMs: 0, totalMs: 0 },
  commandPaletteOpen: false,
  theme: 'day',
  runtimeEvents: [],
  fsRootHandle: null,
  playtestNonce: 0,

  setWorkspace: ({ manifest, files, activeFilePath }) => {
    set({
      manifest: {
        ...manifest,
        files: sortWorkspacePaths(Object.keys(files)),
        updatedAt: nowIso()
      },
      files,
      activeFilePath: activeFilePath ?? manifest.rootFile,
      diagnostics: [],
      graph: { nodes: [], edges: [], startNodeId: null, deadEnds: [] },
      sectionIndex: [],
      variableCatalog: [],
      sectionVariableNamesBySerial: {},
      parseStatus: 'idle',
      runtimeEvents: []
    })
  },

  setActiveFile: (path) => {
    if (!get().files[path]) return
    set({ activeFilePath: path })
  },

  setRootFile: (path) => {
    if (!get().files[path]) return
    set(state => ({
      manifest: {
        ...state.manifest,
        rootFile: path,
        updatedAt: nowIso()
      }
    }))
  },

  setFileContent: (path, content) => {
    const target = get().files[path]
    if (!target) return

    set(state => ({
      files: {
        ...state.files,
        [path]: {
          ...target,
          content,
          dirty: true,
          version: target.version + 1
        }
      },
      manifest: {
        ...state.manifest,
        updatedAt: nowIso()
      }
    }))
  },

  createFile: (requestedPath) => {
    const path = toWorkspacePath(requestedPath)
    if (get().files[path]) return

    const file: WorkspaceFile = {
      path,
      content: '',
      dirty: true,
      version: 1,
      lastSavedAt: null
    }

    set(state => ({
      files: { ...state.files, [path]: file },
      activeFilePath: path,
      manifest: {
        ...state.manifest,
        files: sortWorkspacePaths([...state.manifest.files, path]),
        updatedAt: nowIso()
      }
    }))
  },

  renameFile: (oldPath, nextPath) => {
    const normalizedNext = toWorkspacePath(nextPath)
    if (!get().files[oldPath] || get().files[normalizedNext]) return

    const nextFiles = { ...get().files }
    const source = nextFiles[oldPath]
    if (!source) return
    delete nextFiles[oldPath]
    nextFiles[normalizedNext] = { ...source, path: normalizedNext, dirty: true, version: source.version + 1 }

    set(state => ({
      files: nextFiles,
      activeFilePath: state.activeFilePath === oldPath ? normalizedNext : state.activeFilePath,
      manifest: {
        ...state.manifest,
        rootFile: state.manifest.rootFile === oldPath ? normalizedNext : state.manifest.rootFile,
        files: sortWorkspacePaths(Object.keys(nextFiles)),
        updatedAt: nowIso()
      }
    }))
  },

  deleteFile: (path) => {
    const nextFiles = { ...get().files }
    if (!nextFiles[path]) return
    delete nextFiles[path]

    const filePaths = sortWorkspacePaths(Object.keys(nextFiles))
    const nextActive = filePaths[0] ?? '/workspace/main.if'

    if (filePaths.length === 0) {
      const fallback = defaultWorkspace()
      set({
        manifest: fallback.manifest,
        files: fallback.files,
        activeFilePath: fallback.activeFilePath
      })
      return
    }

    set(state => ({
      files: nextFiles,
      activeFilePath: state.activeFilePath === path ? nextActive : state.activeFilePath,
      manifest: {
        ...state.manifest,
        rootFile: state.manifest.rootFile === path ? nextActive : state.manifest.rootFile,
        files: filePaths,
        updatedAt: nowIso()
      }
    }))
  },

  setDiagnosticsGraph: ({ diagnostics, graph, sectionIndex, variableCatalog, sectionVariableNamesBySerial, parseStatus, parseRequestId, timings }) => {
    if (parseRequestId < get().parseRequestId) return
    set({
      diagnostics,
      graph,
      sectionIndex,
      variableCatalog,
      sectionVariableNamesBySerial,
      parseStatus,
      parseRequestId,
      parseTimings: timings
    })
  },

  setParseRunning: (requestId) => {
    set({ parseStatus: 'running', parseRequestId: requestId })
  },

  setCommandPaletteOpen: (value) => {
    set({ commandPaletteOpen: value })
  },

  setTheme: (value) => {
    set({ theme: value })
  },

  toggleTheme: () => {
    set(state => ({ theme: state.theme === 'day' ? 'night' : 'day' }))
  },

  addRuntimeEvent: (entry) => {
    set(state => ({ runtimeEvents: [entry, ...state.runtimeEvents].slice(0, 150) }))
  },

  clearRuntimeEvents: () => {
    set({ runtimeEvents: [] })
  },

  setFsRootHandle: (handle) => {
    set({ fsRootHandle: handle })
  },

  saveCheckpoint: () => {
    set(state => {
      const savedAt = nowIso()
      const nextFiles: Record<string, WorkspaceFile> = {}
      Object.entries(state.files).forEach(([path, file]) => {
        nextFiles[path] = { ...file, dirty: false, lastSavedAt: savedAt }
      })

      return {
        files: nextFiles,
        manifest: {
          ...state.manifest,
          files: sortWorkspacePaths(Object.keys(nextFiles)),
          updatedAt: savedAt
        }
      }
    })
  },

  triggerPlaytest: () => {
    set(state => ({ playtestNonce: state.playtestNonce + 1 }))
  },

  setAliases: (aliases) => {
    set(state => ({
      manifest: {
        ...state.manifest,
        aliases,
        updatedAt: nowIso()
      }
    }))
  },

  setStorageMode: (storageMode) => {
    set(state => ({
      manifest: {
        ...state.manifest,
        storageMode,
        updatedAt: nowIso()
      }
    }))
  }
}))

export function getWorkspaceSnapshot(): Record<string, string> {
  const files = useIdeStore.getState().files
  const out: Record<string, string> = {}
  Object.values(files).forEach(file => {
    out[file.path] = file.content
  })
  return out
}

export function createWorkspaceFromFileMap(input: {
  name: string
  rootFile: string
  files: Record<string, string>
  aliases?: Record<string, string>
  storageMode?: WorkspaceManifest['storageMode']
}): { manifest: WorkspaceManifest, files: Record<string, WorkspaceFile> } {
  const files: Record<string, WorkspaceFile> = {}
  Object.entries(input.files).forEach(([path, content]) => {
    const normalized = toWorkspacePath(path)
    files[normalized] = {
      path: normalized,
      content,
      dirty: false,
      version: 1,
      lastSavedAt: nowIso()
    }
  })

  const rootFile = toWorkspacePath(input.rootFile)
  const manifest: WorkspaceManifest = {
    id: `workspace-${Math.random().toString(36).slice(2, 10)}`,
    name: input.name,
    rootFile,
    files: sortWorkspacePaths(Object.keys(files)),
    aliases: input.aliases ?? {},
    updatedAt: nowIso(),
    storageMode: input.storageMode ?? 'local-only'
  }

  if (!files[rootFile]) {
    files[rootFile] = {
      path: rootFile,
      content: '',
      dirty: false,
      version: 1,
      lastSavedAt: nowIso()
    }
    manifest.files = sortWorkspacePaths(Object.keys(files))
  }

  return { manifest, files }
}
