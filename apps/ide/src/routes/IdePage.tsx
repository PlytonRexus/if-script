import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import GridLayout, { WidthProvider, type Layout } from 'react-grid-layout/legacy'
import { CommandPalette } from '../components/CommandPalette'
import { DiagnosticsPanel } from '../components/DiagnosticsPanel'
import { EditorPane } from '../components/EditorPane'
import { GraphPane } from '../components/GraphPane'
import { GraphWorkspacePane } from '../components/GraphWorkspacePane'
import { InspectorPane } from '../components/InspectorPane'
import { PlaytestInspectorPanel } from '../components/PlaytestInspectorPanel'
import { PreviewPane } from '../components/PreviewPane'
import { Sidebar } from '../components/Sidebar'
import { TopBar } from '../components/TopBar'
import { appendChoiceToSection, appendSectionScaffold, applyChoiceInspectorPatch, applySectionWriterPatch, deleteSectionBySourceRange } from '../authoring/sourceTransforms'
import { DEFAULT_GRAPH_LAYOUT, normalizeGraphLayout } from '../layout/graphLayout'
import { DESKTOP_GRID_COLUMNS, DESKTOP_GRID_ROW_HEIGHT, GRAPH_MODE_PANEL_IDS, PANEL_IDS, PANEL_LAYOUT_VERSION, deserializeLayout, fromGridLayout, getDefaultDesktopLayout, getDefaultPanelVisibility, getGraphModeDesktopLayout, isDesktopViewport, normalizePanelVisibility, serializeLayout, toGridLayout, type PanelVisibilityState } from '../layout/panelLayout'
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts'
import { idbGet, idbSet } from '../lib/indexedDb'
import { openWorkspaceFromDirectory, verifyDirectoryPermission, writeWorkspaceToDirectory } from '../lib/fsAccess'
import { downloadBundle, readBundleFromFile } from '../lib/projectBundle'
import { basename, sortWorkspacePaths, toWorkspacePath } from '../lib/path'
import { buildSectionPreviewKey, resolveSectionAtCursor } from '../preview/sectionPreview'
import { createWorkspaceFromFileMap, useIdeStore } from '../store/workspaceStore'
import type {
  CommandPaletteMode,
  CommandPaletteItem,
  AdvancedInspectorSelection,
  GraphLayoutState,
  RuntimeDebugState,
  IdeDiagnostic,
  PanelId,
  PanelLayoutState,
  ParseWorkerRequest,
  ParseWorkerResponse,
  RuntimeEventEntry,
  SectionWriterInput,
  VariablePreset,
  WorkspaceBundle,
  WorkspaceFile,
  WorkspaceManifest
} from '../types/interfaces'

const STORAGE_KEY = 'ifscript.ide.workspace.v1'
const GRID_MARGIN: [number, number] = [12, 12]
const GRID_CONTAINER_PADDING: [number, number] = [0, 0]
const DRAG_CANCEL_SELECTOR = 'input,textarea,select,option,button,label,a,.monaco-editor,.graph-controls,.graph-controls *'
const AutoWidthGridLayout = WidthProvider(GridLayout)
const TOGGLABLE_PANEL_IDS: PanelId[] = ['inspector', 'preview', 'graph', 'diagnostics', 'runtime', 'timings']
const PANEL_TOGGLE_LABELS: Record<PanelId, string> = {
  workspace: 'Workspace',
  editor: 'Editor',
  inspector: 'Inspector',
  preview: 'Preview',
  graph: 'Graph',
  diagnostics: 'Diagnostics',
  runtime: 'Runtime',
  timings: 'Timings'
}
const PANEL_TOGGLE_SHORT_LABELS: Record<PanelId, string> = {
  workspace: 'Work',
  editor: 'Edit',
  inspector: 'Inspect',
  preview: 'Preview',
  graph: 'Graph',
  diagnostics: 'Diag',
  runtime: 'Runtime',
  timings: 'Timing'
}
const AUTHOR_MODE_V1_ENABLED = true
type AuthorMode = 'graph' | 'source'

function toGraphLayout(
  legacy?: {
    nodes: Record<string, { x: number, y: number, collapsed?: boolean }>
    lanes: Record<string, { order: number }>
    zoom: number
  } | null,
  next?: GraphLayoutState | null
): GraphLayoutState {
  if (next) return normalizeGraphLayout(next)
  if (!legacy) return { ...DEFAULT_GRAPH_LAYOUT }
  const pinnedNodes: GraphLayoutState['pinnedNodes'] = {}
  Object.entries(legacy.nodes ?? {}).forEach(([id, position]) => {
    pinnedNodes[id] = { x: position.x, y: position.y }
  })
  return normalizeGraphLayout({
    ...DEFAULT_GRAPH_LAYOUT,
    pinnedNodes,
    zoom: legacy.zoom ?? 1,
    viewport: { x: 0, y: 0, zoom: legacy.zoom ?? 1 }
  })
}

function normalizeAuthorMode(mode: PersistedWorkspace['authorMode'] | 'storyboard' | undefined): AuthorMode {
  if (mode === 'source') return 'source'
  return 'graph'
}

interface PersistedWorkspace {
  manifest: WorkspaceManifest
  files: Record<string, WorkspaceFile>
  activeFilePath: string
  recentFilePaths?: string[]
  theme: 'day' | 'night'
  layoutVersion?: number
  layout?: PanelLayoutState
  panelVisibility?: Partial<Record<PanelId, boolean>>
  sectionPreviewOverrides?: Record<string, string>
  previewMode?: {
    autoFollowCursor: boolean
    pinnedSectionKey: string | null
  }
  previewAutoFollow?: boolean
  sectionVariablePresets?: Record<string, VariablePreset[]>
  inspectorSelection?: AdvancedInspectorSelection
  authorMode?: AuthorMode | 'storyboard'
  graphLayout?: GraphLayoutState
  storyboardLayout?: {
    nodes: Record<string, { x: number, y: number, collapsed?: boolean }>
    lanes: Record<string, { order: number }>
    zoom: number
  }
}

function fileSnapshot(files: Record<string, WorkspaceFile>): Record<string, string> {
  const out: Record<string, string> = {}
  Object.values(files).forEach(file => {
    out[file.path] = file.content
  })
  return out
}

function pickLineForNeedle(content: string, needle: string): number {
  const lines = content.split(/\r?\n/)
  const idx = lines.findIndex(line => line.includes(needle))
  return idx === -1 ? 1 : idx + 1
}

function nextSectionTitle(existingTitles: string[], base = 'New Section'): string {
  const existing = new Set(existingTitles)
  if (!existing.has(base)) return base
  let idx = 2
  while (existing.has(`${base} ${idx}`)) idx += 1
  return `${base} ${idx}`
}

function readDesktopMode(): boolean {
  if (typeof window === 'undefined') return true
  return isDesktopViewport(window.innerWidth)
}

export function IdePage(): JSX.Element {
  const manifest = useIdeStore(state => state.manifest)
  const filesMap = useIdeStore(state => state.files)
  const activeFilePath = useIdeStore(state => state.activeFilePath)
  const diagnostics = useIdeStore(state => state.diagnostics)
  const graph = useIdeStore(state => state.graph)
  const authorGraph = useIdeStore(state => state.authorGraph)
  const sectionIndex = useIdeStore(state => state.sectionIndex)
  const sceneIndex = useIdeStore(state => state.sceneIndex)
  const storySettingsIndex = useIdeStore(state => state.storySettingsIndex)
  const sectionSettingsIndex = useIdeStore(state => state.sectionSettingsIndex)
  const choiceIndex = useIdeStore(state => state.choiceIndex)
  const sectionContentIndex = useIdeStore(state => state.sectionContentIndex)
  const authoringSchema = useIdeStore(state => state.authoringSchema)
  const variableCatalog = useIdeStore(state => state.variableCatalog)
  const sectionVariableNamesBySerial = useIdeStore(state => state.sectionVariableNamesBySerial)
  const parseStatus = useIdeStore(state => state.parseStatus)
  const parseTimings = useIdeStore(state => state.parseTimings)
  const recentFilePaths = useIdeStore(state => state.recentFilePaths)
  const commandPaletteOpen = useIdeStore(state => state.commandPaletteOpen)
  const theme = useIdeStore(state => state.theme)
  const fsRootHandle = useIdeStore(state => state.fsRootHandle)
  const playtestNonce = useIdeStore(state => state.playtestNonce)
  const runtimeEvents = useIdeStore(state => state.runtimeEvents)

  const setWorkspace = useIdeStore(state => state.setWorkspace)
  const setActiveFile = useIdeStore(state => state.setActiveFile)
  const setRecentFilePaths = useIdeStore(state => state.setRecentFilePaths)
  const setRootFile = useIdeStore(state => state.setRootFile)
  const setFileContent = useIdeStore(state => state.setFileContent)
  const createFile = useIdeStore(state => state.createFile)
  const renameFile = useIdeStore(state => state.renameFile)
  const deleteFile = useIdeStore(state => state.deleteFile)
  const setParseRunning = useIdeStore(state => state.setParseRunning)
  const setDiagnosticsGraph = useIdeStore(state => state.setDiagnosticsGraph)
  const setCommandPaletteOpen = useIdeStore(state => state.setCommandPaletteOpen)
  const toggleTheme = useIdeStore(state => state.toggleTheme)
  const setTheme = useIdeStore(state => state.setTheme)
  const addRuntimeEvent = useIdeStore(state => state.addRuntimeEvent)
  const clearRuntimeEvents = useIdeStore(state => state.clearRuntimeEvents)
  const setFsRootHandle = useIdeStore(state => state.setFsRootHandle)
  const saveCheckpoint = useIdeStore(state => state.saveCheckpoint)
  const triggerPlaytest = useIdeStore(state => state.triggerPlaytest)
  const setStorageMode = useIdeStore(state => state.setStorageMode)

  const [cursorTarget, setCursorTarget] = useState<{ line: number, col: number, nonce: number } | null>(null)
  const [cursorPosition, setCursorPosition] = useState<{ line: number, col: number } | null>(null)
  const [sectionPreviewOverrides, setSectionPreviewOverrides] = useState<Record<string, string>>({})
  const [sectionVariablePresets, setSectionVariablePresets] = useState<Record<string, VariablePreset[]>>({})
  const [previewAutoFollow, setPreviewAutoFollow] = useState(true)
  const [previewPinnedSectionKey, setPreviewPinnedSectionKey] = useState<string | null>(null)
  const [previewAnchorSectionKey, setPreviewAnchorSectionKey] = useState<string | null>(null)
  const [commandPaletteMode, setCommandPaletteMode] = useState<CommandPaletteMode>('all')
  const [inspectorSelection, setInspectorSelection] = useState<AdvancedInspectorSelection>({
    activeTab: 'story',
    sceneSerial: null,
    sectionSerial: null,
    choiceId: null
  })
  const [runtimeDebugState, setRuntimeDebugState] = useState<RuntimeDebugState>({
    snapshot: null,
    lastUpdatedAt: null
  })
  const [panelLayout, setPanelLayout] = useState<PanelLayoutState>(() => getDefaultDesktopLayout())
  const [panelVisibility, setPanelVisibility] = useState<PanelVisibilityState>(() => getDefaultPanelVisibility())
  const [authorMode, setAuthorMode] = useState<AuthorMode>(() => AUTHOR_MODE_V1_ENABLED ? 'graph' : 'source')
  const [graphLayout, setGraphLayout] = useState<GraphLayoutState>(() => ({ ...DEFAULT_GRAPH_LAYOUT }))
  const [desktopMode, setDesktopMode] = useState<boolean>(() => readDesktopMode())
  const workspaceLayoutRef = useRef<HTMLElement | null>(null)
  const workerRef = useRef<Worker | null>(null)
  const requestIdRef = useRef(0)

  const files = useMemo(() => {
    return sortWorkspacePaths(Object.keys(filesMap))
      .map(path => filesMap[path])
      .filter((file): file is WorkspaceFile => Boolean(file))
  }, [filesMap])

  const graphModeDesktopLayout = useMemo(() => getGraphModeDesktopLayout(), [])
  const activeFile = filesMap[activeFilePath] ?? null
  const snapshot = useMemo(() => fileSnapshot(filesMap), [filesMap])
  const visiblePanelIds = useMemo(() => {
    if (authorMode === 'graph') return GRAPH_MODE_PANEL_IDS
    return PANEL_IDS.filter(panelId => panelVisibility[panelId])
  }, [authorMode, panelVisibility])
  const desktopGridLayout = useMemo(() => {
    if (authorMode === 'graph') {
      return toGridLayout(graphModeDesktopLayout).filter(item => GRAPH_MODE_PANEL_IDS.includes(item.i as PanelId))
    }
    return toGridLayout(panelLayout).filter(item => panelVisibility[item.i as PanelId])
  }, [authorMode, graphModeDesktopLayout, panelLayout, panelVisibility])
  const cursorFocusedSection = useMemo(() => {
    return resolveSectionAtCursor(sectionIndex, activeFilePath, cursorPosition?.line ?? null)
  }, [activeFilePath, cursorPosition?.line, sectionIndex])
  const sectionByKey = useMemo(() => {
    const out = new Map<string, typeof sectionIndex[number]>()
    sectionIndex.forEach(section => {
      out.set(buildSectionPreviewKey(section), section)
    })
    return out
  }, [sectionIndex])
  const previewSection = useMemo(() => {
    if (previewPinnedSectionKey && sectionByKey.has(previewPinnedSectionKey)) {
      return sectionByKey.get(previewPinnedSectionKey) ?? null
    }
    if (previewAutoFollow) return cursorFocusedSection
    if (previewAnchorSectionKey && sectionByKey.has(previewAnchorSectionKey)) {
      return sectionByKey.get(previewAnchorSectionKey) ?? null
    }
    return cursorFocusedSection
  }, [cursorFocusedSection, previewAnchorSectionKey, previewAutoFollow, previewPinnedSectionKey, sectionByKey])
  const focusedSectionNodeId = cursorFocusedSection ? (cursorFocusedSection.entityId ?? `section:${cursorFocusedSection.title}`) : null
  const previewSectionKey = previewSection ? buildSectionPreviewKey(previewSection) : null
  const focusedOverrideText = previewSectionKey ? (sectionPreviewOverrides[previewSectionKey] ?? '{}') : '{}'
  const sectionTitlesForCompletion = useMemo(() => {
    return sectionIndex.map(section => section.title)
  }, [sectionIndex])
  const variableNamesForCompletion = useMemo(() => {
    return variableCatalog.map(variable => variable.name)
  }, [variableCatalog])
  const filesByRecency = useMemo(() => {
    const seen = new Set<string>()
    const ordered: WorkspaceFile[] = []
    recentFilePaths.forEach(path => {
      if (seen.has(path)) return
      const file = filesMap[path]
      if (!file) return
      seen.add(path)
      ordered.push(file)
    })
    const remaining = files.filter(file => !seen.has(file.path))
    return [...ordered, ...remaining]
  }, [files, filesMap, recentFilePaths])
  const focusedPresets = useMemo(() => {
    return previewSectionKey ? (sectionVariablePresets[previewSectionKey] ?? []) : []
  }, [previewSectionKey, sectionVariablePresets])

  const persistWorkspace = useCallback((layout: PanelLayoutState, visibility: PanelVisibilityState) => {
    return idbSet<PersistedWorkspace>(STORAGE_KEY, {
      manifest,
      files: filesMap,
      activeFilePath,
      recentFilePaths,
      theme,
      layoutVersion: PANEL_LAYOUT_VERSION,
      layout: serializeLayout(layout),
      panelVisibility: normalizePanelVisibility(visibility),
      sectionPreviewOverrides,
      previewMode: {
        autoFollowCursor: previewAutoFollow,
        pinnedSectionKey: previewPinnedSectionKey
      },
      sectionVariablePresets,
      inspectorSelection,
      authorMode,
      graphLayout
    })
  }, [activeFilePath, authorMode, filesMap, graphLayout, inspectorSelection, manifest, previewAutoFollow, previewPinnedSectionKey, recentFilePaths, sectionPreviewOverrides, sectionVariablePresets, theme])

  const runCheck = useCallback(() => {
    const worker = workerRef.current
    if (!worker) return

    const requestId = ++requestIdRef.current
    const payload: ParseWorkerRequest = {
      workspaceSnapshot: snapshot,
      entryFile: manifest.rootFile,
      aliases: manifest.aliases,
      mode: 'check',
      requestId
    }

    setParseRunning(requestId)
    worker.postMessage(payload)
  }, [manifest.aliases, manifest.rootFile, setParseRunning, snapshot])

  useEffect(() => {
    const worker = new Worker(new URL('../worker/parse.worker.ts', import.meta.url), { type: 'module' })
    workerRef.current = worker

    worker.onmessage = (event: MessageEvent<ParseWorkerResponse>) => {
      const payload = event.data
      const hasErrors = payload.diagnostics.some(d => d.severity === 'error')
      setDiagnosticsGraph({
        diagnostics: payload.diagnostics,
        graph: payload.graph,
        authorGraph: payload.authorGraph,
        sectionIndex: payload.sectionIndex,
        sceneIndex: payload.sceneIndex,
        storySettingsIndex: payload.storySettingsIndex,
        sectionSettingsIndex: payload.sectionSettingsIndex,
        choiceIndex: payload.choiceIndex,
        sectionContentIndex: payload.sectionContentIndex,
        authoringSchema: payload.authoringSchema,
        variableCatalog: payload.variableCatalog,
        sectionVariableNamesBySerial: payload.sectionVariableNamesBySerial,
        parseStatus: payload.ok ? (hasErrors ? 'error' : 'ok') : 'error',
        parseRequestId: payload.requestId,
        timings: payload.timings
      })
    }

    return () => {
      worker.terminate()
      workerRef.current = null
    }
  }, [setDiagnosticsGraph])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      runCheck()
    }, 450)

    return () => window.clearTimeout(timer)
  }, [runCheck])

  useEffect(() => {
    void (async () => {
      const persisted = await idbGet<PersistedWorkspace>(STORAGE_KEY)
      if (!persisted?.manifest || !persisted?.files) return
      setWorkspace({
        manifest: persisted.manifest,
        files: persisted.files,
        activeFilePath: persisted.activeFilePath
      })
      setRecentFilePaths(persisted.recentFilePaths ?? [persisted.activeFilePath])
      setTheme(persisted.theme ?? 'day')
      const canRestoreLayout = persisted.layoutVersion == null || persisted.layoutVersion === PANEL_LAYOUT_VERSION
      const restoredLayout = canRestoreLayout ? deserializeLayout(persisted.layout) : null
      setPanelLayout(restoredLayout ?? getDefaultDesktopLayout())
      setPanelVisibility(normalizePanelVisibility(persisted.panelVisibility))
      setSectionPreviewOverrides(persisted.sectionPreviewOverrides ?? {})
      const restoredPreviewMode = persisted.previewMode ?? {
        autoFollowCursor: persisted.previewAutoFollow ?? true,
        pinnedSectionKey: null
      }
      setPreviewAutoFollow(restoredPreviewMode.autoFollowCursor)
      setPreviewPinnedSectionKey(restoredPreviewMode.pinnedSectionKey ?? null)
      setSectionVariablePresets(persisted.sectionVariablePresets ?? {})
      setPreviewAnchorSectionKey(null)
      setInspectorSelection(persisted.inspectorSelection ?? {
        activeTab: 'story',
        sceneSerial: null,
        sectionSerial: null,
        choiceId: null
      })
      setAuthorMode(normalizeAuthorMode(persisted.authorMode))
      setGraphLayout(toGraphLayout(persisted.storyboardLayout, persisted.graphLayout ?? null))
    })()
  }, [setRecentFilePaths, setTheme, setWorkspace])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void persistWorkspace(panelLayout, panelVisibility)
    }, 300)

    return () => window.clearTimeout(timer)
  }, [panelLayout, panelVisibility, persistWorkspace])

  useEffect(() => {
    document.body.dataset.theme = theme
  }, [theme])

  useEffect(() => {
    const onResize = () => {
      setDesktopMode(readDesktopMode())
    }
    onResize()
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  useEffect(() => {
    if (previewAutoFollow) return
    if (previewPinnedSectionKey) return
    if (previewAnchorSectionKey) return
    if (!cursorFocusedSection) return
    setPreviewAnchorSectionKey(buildSectionPreviewKey(cursorFocusedSection))
  }, [cursorFocusedSection, previewAnchorSectionKey, previewAutoFollow, previewPinnedSectionKey])

  useEffect(() => {
    if (!cursorFocusedSection) return
    setInspectorSelection(state => ({
      ...state,
      activeTab: 'section',
      sectionSerial: cursorFocusedSection.serial
    }))
  }, [cursorFocusedSection?.serial])

  useEffect(() => {
    if (!previewPinnedSectionKey) return
    if (sectionByKey.has(previewPinnedSectionKey)) return
    setPreviewPinnedSectionKey(null)
  }, [previewPinnedSectionKey, sectionByKey])

  useEffect(() => {
    if (playtestNonce === 0) return
    const frame = window.requestAnimationFrame(() => {
      const previewTile = workspaceLayoutRef.current?.querySelector<HTMLElement>('[data-panel-id="preview"]')
      previewTile?.scrollIntoView({ behavior: 'smooth', block: 'start', inline: 'nearest' })
    })
    return () => window.cancelAnimationFrame(frame)
  }, [playtestNonce])

  const saveLocal = useCallback(() => {
    saveCheckpoint()
  }, [saveCheckpoint])

  const resetLayout = useCallback(() => {
    const next = getDefaultDesktopLayout()
    setPanelLayout(next)
    void persistWorkspace(next, panelVisibility)
  }, [panelVisibility, persistWorkspace])

  const togglePanelVisibility = useCallback((panelId: PanelId) => {
    if (authorMode === 'graph') return
    if (!TOGGLABLE_PANEL_IDS.includes(panelId)) return
    setPanelVisibility(state => ({
      ...state,
      [panelId]: !state[panelId]
    }))
  }, [authorMode])

  const showAllPanels = useCallback(() => {
    if (authorMode === 'graph') return
    setPanelVisibility(state => {
      const next = { ...state }
      TOGGLABLE_PANEL_IDS.forEach(panelId => {
        next[panelId] = true
      })
      return next
    })
  }, [authorMode])

  const updateFocusedSectionOverrides = useCallback((next: string) => {
    if (!previewSectionKey) return
    setSectionPreviewOverrides(state => ({
      ...state,
      [previewSectionKey]: next
    }))
  }, [previewSectionKey])

  const saveSectionPreset = useCallback((name: string, values: Record<string, unknown>) => {
    if (!previewSectionKey) return
    const preset: VariablePreset = {
      id: `preset-${Math.random().toString(36).slice(2, 10)}`,
      name,
      values,
      updatedAt: new Date().toISOString()
    }
    setSectionVariablePresets(state => ({
      ...state,
      [previewSectionKey]: [preset, ...(state[previewSectionKey] ?? [])]
    }))
  }, [previewSectionKey])

  const loadSectionPreset = useCallback((presetId: string) => {
    if (!previewSectionKey) return
    const preset = (sectionVariablePresets[previewSectionKey] ?? []).find(entry => entry.id === presetId)
    if (!preset) return
    updateFocusedSectionOverrides(JSON.stringify(preset.values, null, 2))
  }, [previewSectionKey, sectionVariablePresets, updateFocusedSectionOverrides])

  const deleteSectionPreset = useCallback((presetId: string) => {
    if (!previewSectionKey) return
    setSectionVariablePresets(state => ({
      ...state,
      [previewSectionKey]: (state[previewSectionKey] ?? []).filter(preset => preset.id !== presetId)
    }))
  }, [previewSectionKey])

  const handlePreviewAutoFollowChange = useCallback((next: boolean) => {
    if (!next) {
      const anchorSection = cursorFocusedSection ?? previewSection
      setPreviewAnchorSectionKey(anchorSection ? buildSectionPreviewKey(anchorSection) : null)
      setPreviewAutoFollow(false)
      return
    }

    setPreviewAutoFollow(true)
    setPreviewPinnedSectionKey(null)
    setPreviewAnchorSectionKey(null)
  }, [cursorFocusedSection, previewSection])

  const handleTogglePreviewPin = useCallback(() => {
    if (previewPinnedSectionKey) {
      setPreviewPinnedSectionKey(null)
      return
    }

    if (!previewSectionKey) return
    setPreviewPinnedSectionKey(previewSectionKey)
  }, [previewPinnedSectionKey, previewSectionKey])

  const handlePlaytest = useCallback(() => {
    triggerPlaytest()
  }, [triggerPlaytest])

  const switchToGraphMode = useCallback(() => {
    setAuthorMode('graph')
  }, [])

  const switchToSourceMode = useCallback(() => {
    setAuthorMode('source')
  }, [])

  const toggleAuthorMode = useCallback(() => {
    setAuthorMode(mode => mode === 'graph' ? 'source' : 'graph')
  }, [])

  const jumpToDiagnostic = useCallback((diagnostic: IdeDiagnostic) => {
    const targetFile = diagnostic.file
    if (targetFile && filesMap[targetFile]) {
      setActiveFile(targetFile)
    }

    setCursorTarget({
      line: diagnostic.line ?? 1,
      col: diagnostic.col ?? 1,
      nonce: Date.now()
    })
  }, [filesMap, setActiveFile])

  const handleOpenSection = useCallback((section: { file: string, line: number, col: number }) => {
    if (filesMap[section.file]) {
      setActiveFile(section.file)
    }
    setCursorTarget({
      line: section.line,
      col: section.col,
      nonce: Date.now()
    })
  }, [filesMap, setActiveFile])

  const handleOpenScene = useCallback((scene: { serial: number, file: string, line: number, col: number }) => {
    if (filesMap[scene.file]) {
      setActiveFile(scene.file)
    }
    setCursorTarget({
      line: scene.line,
      col: scene.col,
      nonce: Date.now()
    })
    setInspectorSelection(state => ({
      ...state,
      activeTab: 'scene',
      sceneSerial: scene.serial
    }))
  }, [filesMap, setActiveFile])

  const handleOpenRuntimeEventSource = useCallback((event: RuntimeEventEntry) => {
    const payload = typeof event.payload === 'object' && event.payload !== null
      ? event.payload as Record<string, unknown>
      : null
    if (!payload) return

    const openSceneBySerial = (serial: number): boolean => {
      const scene = sceneIndex.find(entry => entry.serial === serial)
      if (!scene) return false
      handleOpenScene(scene)
      return true
    }
    const openSectionBySerial = (serial: number): boolean => {
      const section = sectionIndex.find(entry => entry.serial === serial)
      if (!section) return false
      handleOpenSection(section)
      setInspectorSelection(state => ({ ...state, activeTab: 'section', sectionSerial: section.serial }))
      return true
    }

    const scenePayload = payload.scene
    if (typeof payload.sceneSerial === 'number' && openSceneBySerial(payload.sceneSerial)) return
    if (typeof scenePayload === 'object' && scenePayload !== null) {
      const serial = (scenePayload as Record<string, unknown>).serial
      if (typeof serial === 'number' && openSceneBySerial(serial)) return
    }

    const sectionPayload = payload.section
    if (typeof payload.sectionSerial === 'number' && openSectionBySerial(payload.sectionSerial)) return
    if (typeof sectionPayload === 'object' && sectionPayload !== null) {
      const serial = (sectionPayload as Record<string, unknown>).serial
      if (typeof serial === 'number' && openSectionBySerial(serial)) return
    }

    const target = payload.target
    if (typeof target === 'number' && openSectionBySerial(target)) return
    if (typeof target === 'string') {
      const sectionByTitle = sectionIndex.find(entry => entry.title === target)
      if (sectionByTitle) {
        handleOpenSection(sectionByTitle)
        setInspectorSelection(state => ({ ...state, activeTab: 'section', sectionSerial: sectionByTitle.serial }))
        return
      }
      const sceneByName = sceneIndex.find(entry => entry.name === target)
      if (sceneByName) {
        handleOpenScene(sceneByName)
      }
    }
  }, [handleOpenScene, handleOpenSection, sceneIndex, sectionIndex])

  const handleApplyDiagnosticQuickFix = useCallback((diagnostic: IdeDiagnostic) => {
    const quickFix = diagnostic.data
    const target = (quickFix?.target?.trim() || diagnostic.message.match(/"([^"]+)"/)?.[1]?.trim()) ?? ''
    if (!target) return
    const kind = quickFix?.kind
    const supportsKind = kind === 'missing_section_target' ||
      kind === 'start_at_unresolved' ||
      kind === 'missing_scene_target' ||
      kind === 'scene_first_unresolved'
    const supportsCode = diagnostic.code === 'FULL_TIMER_TARGET_UNRESOLVED' ||
      diagnostic.code === 'SECTION_TIMER_TARGET_UNRESOLVED'
    if (!supportsKind && !supportsCode) return

    const preferredFile = activeFile?.path && filesMap[activeFile.path] ? activeFile.path : manifest.rootFile
    if (!filesMap[preferredFile]) return

    if (kind === 'missing_scene_target' || kind === 'scene_first_unresolved') {
      const existingScene = sceneIndex.find(scene => scene.name === target)
      if (existingScene) {
        handleOpenScene(existingScene)
        return
      }

      const accepted = window.confirm(`Create missing scene "${target}" in ${preferredFile}?`)
      if (!accepted) return

      const currentContent = filesMap[preferredFile].content
      const fallbackSection = sectionIndex[0]?.title ?? 'Prologue'
      const separator = currentContent.trimEnd().length === 0 ? '' : '\n\n'
      const scaffold = `scene__\n  @name "${target}"\n  @first "${fallbackSection}"\n  @sections "${fallbackSection}"\n__scene\n`
      const nextContent = `${currentContent.replace(/\s*$/, '')}${separator}${scaffold}`
      const line = currentContent.split(/\r?\n/).length + (separator ? 2 : 0)
      setFileContent(preferredFile, nextContent)
      setActiveFile(preferredFile)
      setCursorTarget({ line: Math.max(1, line), col: 1, nonce: Date.now() })
      setInspectorSelection(state => ({ ...state, activeTab: 'scene' }))
      return
    }

    const existingSection = sectionIndex.find(section => section.title === target)
    if (existingSection) {
      handleOpenSection(existingSection)
      return
    }

    const accepted = window.confirm(`Create missing section "${target}" in ${preferredFile}?`)
    if (!accepted) return

    const currentContent = filesMap[preferredFile].content
    const separator = currentContent.trimEnd().length === 0 ? '' : '\n\n'
    const scaffold = `section "${target}"\n  "${target}."\nend\n`
    const nextContent = `${currentContent.replace(/\s*$/, '')}${separator}${scaffold}`
    const line = currentContent.split(/\r?\n/).length + (separator ? 2 : 0)

    setFileContent(preferredFile, nextContent)
    setActiveFile(preferredFile)
    setCursorTarget({
      line: Math.max(1, line),
      col: 1,
      nonce: Date.now()
    })
  }, [activeFile?.path, filesMap, handleOpenScene, handleOpenSection, manifest.rootFile, sceneIndex, sectionIndex, setActiveFile, setFileContent])

  const jumpToGraphNode = useCallback((nodeId: string) => {
    if (nodeId.startsWith('section:')) {
      const indexMatch = sectionIndex.find(entry => (entry.entityId ?? `section:${entry.title}`) === nodeId && Boolean(filesMap[entry.file]))
      if (indexMatch) {
        setActiveFile(indexMatch.file)
        setCursorTarget({ line: indexMatch.line, col: indexMatch.col, nonce: Date.now() })
        return
      }
      const title = nodeId.split(':').slice(-1)[0] ?? ''
      const sectionNeedles = [`section "${title}"`, `@title "${title}"`, `@title '${title}'`]

      const targetFile = Object.values(filesMap).find(file => sectionNeedles.some(needle => file.content.includes(needle)))
      if (targetFile) {
        setActiveFile(targetFile.path)
        const line = pickLineForNeedle(targetFile.content, title)
        setCursorTarget({ line, col: 1, nonce: Date.now() })
        return
      }
    }

    if (nodeId.startsWith('scene:')) {
      const sceneMatch = sceneIndex.find(scene => (scene.entityId ?? `scene:${scene.name}`) === nodeId && Boolean(filesMap[scene.file]))
      if (sceneMatch) {
        handleOpenScene(sceneMatch)
        return
      }
      const sceneName = nodeId.split(':').slice(-1)[0] ?? ''
      const byName = sceneIndex.find(scene => scene.name === sceneName && Boolean(filesMap[scene.file]))
      if (byName) {
        handleOpenScene(byName)
        return
      }
      const sceneBySerial = sceneIndex.find(scene => String(scene.serial) === sceneName && Boolean(filesMap[scene.file]))
      if (sceneBySerial) {
        handleOpenScene(sceneBySerial)
        return
      }
    }

    if (filesMap[manifest.rootFile]) {
      setActiveFile(manifest.rootFile)
      setCursorTarget({ line: 1, col: 1, nonce: Date.now() })
    }
  }, [filesMap, handleOpenScene, manifest.rootFile, sceneIndex, sectionIndex, setActiveFile])

  const handleCreateGraphSection = useCallback((groupId: string) => {
    const group = authorGraph.groups.find(entry => entry.id === groupId)
    const targetFile = group?.file ?? activeFile?.path ?? manifest.rootFile
    const file = filesMap[targetFile]
    if (!file) return
    const suggestedTitle = nextSectionTitle(sectionIndex.map(section => section.title))
    const requestedTitle = window.prompt('Section title:', suggestedTitle)?.trim()
    if (!requestedTitle) return
    const result = appendSectionScaffold(file.content, { title: requestedTitle })
    setFileContent(targetFile, result.content)
    setActiveFile(targetFile)
    setCursorTarget({ line: result.line, col: 1, nonce: Date.now() })
  }, [activeFile?.path, authorGraph.groups, filesMap, manifest.rootFile, sectionIndex, setActiveFile, setFileContent])

  const handleDeleteGraphSection = useCallback((nodeId: string) => {
    const node = authorGraph.nodes.find(entry => entry.id === nodeId && entry.kind === 'section')
    if (!node?.sectionSerial) return
    const section = sectionIndex.find(entry => entry.serial === node.sectionSerial)
    if (!section) return
    const file = filesMap[section.file]
    if (!file) return
    const inbound = authorGraph.edges
      .filter(edge => edge.toNodeId === nodeId)
      .map(edge => authorGraph.nodes.find(candidate => candidate.id === edge.fromNodeId)?.label ?? edge.fromNodeId)
    const inboundLabel = inbound.length > 0 ? `\nIncoming links: ${inbound.slice(0, 6).join(', ')}` : ''
    const accepted = window.confirm(`Delete section "${section.title}"?${inboundLabel}`)
    if (!accepted) return
    const nextContent = deleteSectionBySourceRange(file.content, section.sourceRange)
    setFileContent(section.file, nextContent)
    setActiveFile(section.file)
    setCursorTarget({ line: Math.max(1, section.line - 1), col: 1, nonce: Date.now() })
  }, [authorGraph.edges, authorGraph.nodes, filesMap, sectionIndex, setActiveFile, setFileContent])

  const handleCreateGraphChoice = useCallback((nodeId: string) => {
    const node = authorGraph.nodes.find(entry => entry.id === nodeId && entry.kind === 'section')
    if (!node?.sectionSerial) return
    const section = sectionIndex.find(entry => entry.serial === node.sectionSerial)
    if (!section) return
    const file = filesMap[section.file]
    if (!file) return
    const targetSection = sectionIndex.find(entry => entry.serial !== section.serial) ?? section
    const choiceText = window.prompt('Choice text:', 'Continue')?.trim()
    if (!choiceText) return
    const result = appendChoiceToSection(file.content, section, {
      text: choiceText,
      target: targetSection.serial,
      targetType: 'section'
    })
    setFileContent(section.file, result.content)
    setActiveFile(section.file)
    setCursorTarget({ line: result.line, col: 1, nonce: Date.now() })
  }, [authorGraph.nodes, filesMap, sectionIndex, setActiveFile, setFileContent])

  const handleRetargetGraphChoice = useCallback((choiceId: string, targetNodeId: string) => {
    const choice = choiceIndex.find(entry => entry.id === choiceId)
    const targetNode = authorGraph.nodes.find(entry => entry.id === targetNodeId && entry.kind === 'section')
    if (!choice || !targetNode?.sectionSerial) return
    const file = filesMap[choice.file]
    if (!file) return
    const result = applyChoiceInspectorPatch(file.content, choice, {
      targetType: 'section',
      target: targetNode.sectionSerial,
      input: choice.input,
      when: choice.when,
      once: choice.once,
      disabledText: choice.disabledText,
      actions: choice.actions,
      choiceSfx: choice.choiceSfx,
      focusSfx: choice.focusSfx,
      choiceStyle: choice.choiceStyle
    })
    setFileContent(choice.file, result.content)
    setActiveFile(choice.file)
  }, [authorGraph.nodes, choiceIndex, filesMap, setActiveFile, setFileContent])

  const handleApplySectionWriterEdits = useCallback((sectionSerial: number, input: SectionWriterInput): string | null => {
    const section = sectionSettingsIndex.find(entry => entry.sectionSerial === sectionSerial)
    if (!section) return 'Section metadata not found.'
    const sectionContent = sectionContentIndex.find(entry => entry.sectionSerial === sectionSerial) ?? null
    const file = filesMap[section.file]
    if (!file) return `Section file not found: ${section.file}`

    const result = applySectionWriterPatch(file.content, section, sectionContent, input)
    if (result.unsupportedReason) return result.unsupportedReason

    setFileContent(section.file, result.content)
    setActiveFile(section.file)
    setCursorTarget({ line: section.line, col: section.col, nonce: Date.now() })
    return null
  }, [filesMap, sectionContentIndex, sectionSettingsIndex, setActiveFile, setFileContent])

  const openDirectory = useCallback(async () => {
    try {
      const opened = await openWorkspaceFromDirectory()
      const created = createWorkspaceFromFileMap({
        name: 'Folder Workspace',
        files: opened.files,
        rootFile: opened.rootFile,
        storageMode: 'fs-access'
      })
      setWorkspace({ manifest: created.manifest, files: created.files, activeFilePath: created.manifest.rootFile })
      setFsRootHandle(opened.rootHandle)
      setStorageMode('fs-access')
      setSectionPreviewOverrides({})
      setSectionVariablePresets({})
      setPreviewAutoFollow(true)
      setPreviewPinnedSectionKey(null)
      setPreviewAnchorSectionKey(null)
      setInspectorSelection({
        activeTab: 'story',
        sceneSerial: null,
        sectionSerial: null,
        choiceId: null
      })
      setAuthorMode(AUTHOR_MODE_V1_ENABLED ? 'graph' : 'source')
      setGraphLayout({ ...DEFAULT_GRAPH_LAYOUT })
      setRuntimeDebugState({ snapshot: null, lastUpdatedAt: null })
      saveCheckpoint()
    } catch (err) {
      window.alert(String((err as Error).message ?? err))
    }
  }, [saveCheckpoint, setFsRootHandle, setInspectorSelection, setRuntimeDebugState, setStorageMode, setWorkspace])

  const writeDirectory = useCallback(async () => {
    try {
      let handle = fsRootHandle
      if (!handle) {
        if (!('showDirectoryPicker' in window)) {
          throw new Error('File System Access API not available in this browser.')
        }
        handle = await (window as any).showDirectoryPicker({ mode: 'readwrite' })
        setFsRootHandle(handle)
      }

      const granted = await verifyDirectoryPermission(handle)
      if (!granted) {
        throw new Error('Read/write permission denied for selected directory.')
      }

      await writeWorkspaceToDirectory(handle, snapshot)
      saveCheckpoint()
      setStorageMode('fs-access')
    } catch (err) {
      window.alert(String((err as Error).message ?? err))
    }
  }, [fsRootHandle, saveCheckpoint, setFsRootHandle, setStorageMode, snapshot])

  const importBundle = useCallback(async () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.json,.ifproj.json'

    input.onchange = async () => {
      const file = input.files?.[0]
      if (!file) return

      try {
        const bundle = await readBundleFromFile(file)
        const created = createWorkspaceFromFileMap({
          name: bundle.manifest.name,
          files: bundle.files,
          rootFile: bundle.manifest.rootFile,
          aliases: bundle.manifest.aliases,
          storageMode: 'local-only'
        })
        setWorkspace({ manifest: created.manifest, files: created.files, activeFilePath: created.manifest.rootFile })
        setStorageMode('local-only')
        setSectionPreviewOverrides({})
        setSectionVariablePresets({})
        setPreviewAutoFollow(true)
        setPreviewPinnedSectionKey(null)
        setPreviewAnchorSectionKey(null)
        setInspectorSelection({
          activeTab: 'story',
          sceneSerial: null,
          sectionSerial: null,
          choiceId: null
        })
        setAuthorMode(AUTHOR_MODE_V1_ENABLED ? 'graph' : 'source')
        setGraphLayout(toGraphLayout(bundle.metadata?.storyboardLayout, bundle.metadata?.graphLayout ?? null))
        setRuntimeDebugState({ snapshot: null, lastUpdatedAt: null })
      } catch (err) {
        window.alert(String((err as Error).message ?? err))
      }
    }

    input.click()
  }, [setInspectorSelection, setRuntimeDebugState, setStorageMode, setWorkspace])

  const exportBundle = useCallback(() => {
    const bundle: WorkspaceBundle = {
      version: 1,
      manifest,
      files: snapshot,
      metadata: {
        graphLayout
      }
    }
    downloadBundle(bundle, `${manifest.name.replace(/\s+/g, '-').toLowerCase() || 'if-project'}.ifproj.json`)
  }, [graphLayout, manifest, snapshot])

  const handleNewFile = useCallback(() => {
    const requested = window.prompt('New file path (relative or /workspace/...):', '/workspace/chapter-1.partial.if')
    if (!requested) return
    createFile(toWorkspacePath(requested))
  }, [createFile])

  const handleRenameFile = useCallback(() => {
    if (!activeFile) return
    const nextPath = window.prompt('Rename file to:', activeFile.path)
    if (!nextPath) return
    renameFile(activeFile.path, nextPath)
  }, [activeFile, renameFile])

  const handleDeleteFile = useCallback(() => {
    if (!activeFile) return
    const accepted = window.confirm(`Delete ${activeFile.path}?`)
    if (!accepted) return
    deleteFile(activeFile.path)
  }, [activeFile, deleteFile])

  const handleDesktopLayoutChange = useCallback((nextLayout: Layout) => {
    if (authorMode === 'graph') return
    const parsed = fromGridLayout(nextLayout)
    setPanelLayout(current => {
      const next = { ...current }
      PANEL_IDS.forEach((panelId) => {
        if (!panelVisibility[panelId]) return
        next[panelId] = parsed[panelId]
      })
      return next
    })
  }, [authorMode, panelVisibility])

  const renderPanel = useCallback((panelId: PanelId): JSX.Element => {
    if (panelId === 'workspace') {
      return (
        <Sidebar
          files={files}
          activeFilePath={activeFilePath}
          rootFile={manifest.rootFile}
          sectionIndex={sectionIndex}
          sceneIndex={sceneIndex}
          graph={graph}
          onOpenFile={setActiveFile}
          onOpenSection={handleOpenSection}
          onOpenScene={handleOpenScene}
          onSetRootFile={setRootFile}
        />
      )
    }

    if (panelId === 'editor') {
      if (authorMode === 'graph') {
        return (
          <GraphWorkspacePane
            graph={authorGraph}
            selectedNodeId={focusedSectionNodeId}
            activeFile={activeFile}
            diagnostics={diagnostics}
            parseStatus={parseStatus}
            authoringSchema={authoringSchema}
            sectionTitles={sectionTitlesForCompletion}
            variableNames={variableNamesForCompletion}
            cursorTarget={cursorTarget}
            sectionIndex={sectionIndex}
            sectionSettingsIndex={sectionSettingsIndex}
            choiceIndex={choiceIndex}
            sectionContentIndex={sectionContentIndex}
            layoutState={graphLayout}
            onLayoutStateChange={setGraphLayout}
            onCursorChange={setCursorPosition}
            onChangeSource={(next) => {
              if (!activeFile) return
              setFileContent(activeFile.path, next)
            }}
            onSelectNode={jumpToGraphNode}
            onCreateSection={handleCreateGraphSection}
            onDeleteSection={handleDeleteGraphSection}
            onCreateChoice={handleCreateGraphChoice}
            onRetargetChoice={handleRetargetGraphChoice}
            onApplySectionWriterEdits={handleApplySectionWriterEdits}
          />
        )
      }
      return (
        <EditorPane
          file={activeFile}
          diagnostics={diagnostics}
          parseStatus={parseStatus}
          authoringSchema={authoringSchema}
          sectionTitles={sectionTitlesForCompletion}
          variableNames={variableNamesForCompletion}
          cursorTarget={cursorTarget}
          onCursorChange={setCursorPosition}
          onChange={(next) => {
            if (!activeFile) return
            setFileContent(activeFile.path, next)
          }}
        />
      )
    }

    if (panelId === 'inspector') {
      return (
        <InspectorPane
          snapshot={snapshot}
          selection={inspectorSelection}
          storySettingsIndex={storySettingsIndex}
          sceneIndex={sceneIndex}
          sectionSettingsIndex={sectionSettingsIndex}
          choiceIndex={choiceIndex}
          authoringSchema={authoringSchema}
          onSelectionChange={setInspectorSelection}
          onWriteFile={(file, nextContent) => {
            if (!filesMap[file]) return
            setFileContent(file, nextContent)
            setActiveFile(file)
          }}
        />
      )
    }

    if (panelId === 'preview') {
      return (
        <PreviewPane
          manifest={manifest}
          snapshot={snapshot}
          parseStatus={parseStatus}
          focusedSection={previewSection}
          variableCatalog={variableCatalog}
          sectionVariableNamesBySerial={sectionVariableNamesBySerial}
          variableOverrideText={focusedOverrideText}
          onVariableOverrideTextChange={updateFocusedSectionOverrides}
          variablePresets={focusedPresets}
          onSaveVariablePreset={saveSectionPreset}
          onLoadVariablePreset={loadSectionPreset}
          onDeleteVariablePreset={deleteSectionPreset}
          previewAutoFollow={previewAutoFollow}
          onPreviewAutoFollowChange={handlePreviewAutoFollowChange}
          previewPinned={Boolean(previewPinnedSectionKey)}
          onTogglePreviewPin={handleTogglePreviewPin}
          playtestNonce={playtestNonce}
          onRuntimeEvent={(entry: RuntimeEventEntry) => addRuntimeEvent(entry)}
          onRuntimeDebugSnapshot={(snapshotPayload) => setRuntimeDebugState({
            snapshot: (snapshotPayload as RuntimeDebugState['snapshot']) ?? null,
            lastUpdatedAt: new Date().toISOString()
          })}
        />
      )
    }

    if (panelId === 'graph') {
      return <GraphPane graph={graph} focusedNodeId={focusedSectionNodeId} onOpenNode={jumpToGraphNode} />
    }

    if (panelId === 'diagnostics') {
      return <DiagnosticsPanel diagnostics={diagnostics} onJumpToDiagnostic={jumpToDiagnostic} onApplyQuickFix={handleApplyDiagnosticQuickFix} />
    }

    if (panelId === 'runtime') {
      return (
        <PlaytestInspectorPanel
          events={runtimeEvents}
          debugState={runtimeDebugState}
          onClear={clearRuntimeEvents}
          onOpenEventSource={handleOpenRuntimeEventSource}
        />
      )
    }

    return (
      <section className="panel timings-panel">
        <div className="panel-header">
          <h2>Worker Timings</h2>
        </div>
        <div className="timings-body">
          <p>Parse: {parseTimings.parseMs.toFixed(1)}ms</p>
          <p>Analyze: {parseTimings.analyzeMs.toFixed(1)}ms</p>
          <p>Total: {parseTimings.totalMs.toFixed(1)}ms</p>
          <p>Entry: {basename(manifest.rootFile)}</p>
        </div>
      </section>
    )
  }, [
    activeFile,
    activeFilePath,
    addRuntimeEvent,
    authorGraph,
    authorMode,
    authoringSchema,
    choiceIndex,
    clearRuntimeEvents,
    cursorTarget,
    filesMap,
    handleApplyDiagnosticQuickFix,
    handleOpenScene,
    handleOpenRuntimeEventSource,
    handleOpenSection,
    handleTogglePreviewPin,
    inspectorSelection,
    diagnostics,
    sectionIndex,
    sectionContentIndex,
    sectionSettingsIndex,
    sceneIndex,
    files,
    focusedOverrideText,
    deleteSectionPreset,
    focusedPresets,
    focusedSectionNodeId,
    graph,
    graphLayout,
    handleApplySectionWriterEdits,
    handleCreateGraphChoice,
    handleCreateGraphSection,
    handleDeleteGraphSection,
    handlePreviewAutoFollowChange,
    handleRetargetGraphChoice,
    jumpToDiagnostic,
    jumpToGraphNode,
    loadSectionPreset,
    manifest,
    parseStatus,
    parseTimings,
    playtestNonce,
    previewAutoFollow,
    previewPinnedSectionKey,
    previewSection,
    runtimeEvents,
    runtimeDebugState,
    saveSectionPreset,
    setInspectorSelection,
    sectionTitlesForCompletion,
    sectionVariableNamesBySerial,
    setActiveFile,
    setCursorPosition,
    setFileContent,
    setRuntimeDebugState,
    setRootFile,
    snapshot,
    storySettingsIndex,
    updateFocusedSectionOverrides,
    variableCatalog,
    variableNamesForCompletion
  ])

  const openPalette = useCallback((mode: CommandPaletteMode) => {
    setCommandPaletteMode(mode)
    setCommandPaletteOpen(true)
  }, [setCommandPaletteOpen])

  const toggleCommandPalette = useCallback(() => {
    if (commandPaletteOpen && commandPaletteMode === 'all') {
      setCommandPaletteOpen(false)
      return
    }
    openPalette('all')
  }, [commandPaletteMode, commandPaletteOpen, openPalette, setCommandPaletteOpen])

  const commands: CommandPaletteItem[] = useMemo(() => {
    const commandItems: CommandPaletteItem[] = [
      {
        id: 'cmd-check',
        title: 'Run Diagnostics Check',
        category: 'Authoring',
        shortcut: 'Ctrl+Shift+P, type check',
        kind: 'command',
        keywords: ['check', 'diagnostics', 'parse'],
        run: runCheck
      },
      {
        id: 'cmd-playtest',
        title: 'Run Playtest',
        category: 'Playtest',
        shortcut: 'Ctrl+Enter',
        kind: 'command',
        keywords: ['preview', 'runtime'],
        run: handlePlaytest
      },
      {
        id: 'cmd-open-scenes',
        title: 'Quick Open Scenes',
        category: 'Navigation',
        shortcut: 'Ctrl+Shift+L',
        kind: 'command',
        keywords: ['scene', 'open'],
        run: () => openPalette('scenes')
      },
      {
        id: 'cmd-new-file',
        title: 'Create File',
        category: 'Workspace',
        shortcut: 'Palette',
        kind: 'command',
        keywords: ['new', 'file'],
        run: handleNewFile
      },
      {
        id: 'cmd-save-local',
        title: 'Save Local Snapshot',
        category: 'Workspace',
        shortcut: 'Ctrl+S',
        kind: 'command',
        keywords: ['save', 'snapshot'],
        run: saveLocal
      },
      {
        id: 'cmd-open-folder',
        title: 'Open Folder Workspace',
        category: 'Workspace',
        shortcut: 'Palette',
        kind: 'command',
        keywords: ['folder', 'open'],
        run: () => { void openDirectory() }
      },
      {
        id: 'cmd-export',
        title: 'Export Bundle (.ifproj.json)',
        category: 'Workspace',
        shortcut: 'Palette',
        kind: 'command',
        keywords: ['export', 'bundle'],
        run: exportBundle
      },
      {
        id: 'cmd-import',
        title: 'Import Bundle (.ifproj.json)',
        category: 'Workspace',
        shortcut: 'Palette',
        kind: 'command',
        keywords: ['import', 'bundle'],
        run: () => { void importBundle() }
      },
      {
        id: 'cmd-mode-graph',
        title: 'Switch to Graph Mode',
        category: 'Authoring',
        shortcut: 'Palette',
        kind: 'command',
        keywords: ['author', 'graph', 'visual'],
        run: switchToGraphMode
      },
      {
        id: 'cmd-mode-source',
        title: 'Switch to Source Mode',
        category: 'Authoring',
        shortcut: 'Palette',
        kind: 'command',
        keywords: ['author', 'source', 'editor'],
        run: switchToSourceMode
      }
    ]
    if (authorMode === 'source') {
      commandItems.splice(8, 0, {
        id: 'cmd-show-all-panels',
        title: 'Show All Panels',
        category: 'Layout',
        shortcut: 'Palette',
        kind: 'command',
        keywords: ['panel', 'layout', 'show'],
        run: showAllPanels
      })
    }
    const panelCommandItems: CommandPaletteItem[] = authorMode === 'source' ? TOGGLABLE_PANEL_IDS.map((panelId) => {
      const visible = panelVisibility[panelId]
      return {
        id: `cmd-toggle-panel-${panelId}`,
        title: `${visible ? 'Hide' : 'Show'} ${PANEL_TOGGLE_LABELS[panelId]} Panel`,
        category: 'Layout',
        shortcut: 'Palette',
        kind: 'command',
        keywords: ['panel', 'layout', panelId, visible ? 'hide' : 'show'],
        run: () => togglePanelVisibility(panelId)
      }
    }) : []

    const fileItems: CommandPaletteItem[] = filesByRecency.map((file) => {
      const relative = file.path.replace('/workspace/', '')
      return {
        id: `file:${file.path}`,
        title: relative,
        category: 'File',
        shortcut: 'Ctrl+P',
        kind: 'file',
        keywords: [file.path, basename(file.path)],
        run: () => setActiveFile(file.path)
      }
    })

    const sectionItems: CommandPaletteItem[] = sectionIndex.map((section) => {
      const relative = section.file.replace('/workspace/', '')
      return {
        id: `section:${section.file}:${section.line}:${section.serial}`,
        title: section.title,
        category: `Section (${relative}:${section.line})`,
        shortcut: 'Ctrl+Shift+O',
        kind: 'section',
        keywords: [relative, section.title],
        run: () => handleOpenSection(section)
      }
    })

    const sceneItems: CommandPaletteItem[] = sceneIndex.map((scene) => {
      const relative = scene.file.replace('/workspace/', '')
      return {
        id: `scene:${scene.file}:${scene.line}:${scene.serial}`,
        title: scene.name,
        category: `Scene (${relative}:${scene.line})`,
        shortcut: 'Ctrl+Shift+L',
        kind: 'scene',
        keywords: [relative, scene.name, String(scene.first ?? '')],
        run: () => handleOpenScene(scene)
      }
    })

    return [...commandItems, ...panelCommandItems, ...fileItems, ...sectionItems, ...sceneItems]
  }, [authorMode, exportBundle, filesByRecency, handleNewFile, handleOpenScene, handleOpenSection, handlePlaytest, importBundle, openDirectory, openPalette, panelVisibility, runCheck, saveLocal, sceneIndex, sectionIndex, setActiveFile, showAllPanels, switchToGraphMode, switchToSourceMode, togglePanelVisibility])

  const panelToggleItems = useMemo(() => {
    if (authorMode === 'graph') return []
    return TOGGLABLE_PANEL_IDS.map(panelId => ({
      id: panelId,
      label: PANEL_TOGGLE_SHORT_LABELS[panelId],
      visible: panelVisibility[panelId]
    }))
  }, [authorMode, panelVisibility])

  useKeyboardShortcuts({
    onCommandPalette: toggleCommandPalette,
    onQuickOpenFiles: () => openPalette('files'),
    onQuickOpenSections: () => openPalette('sections'),
    onQuickOpenScenes: () => openPalette('scenes'),
    onSave: saveLocal,
    onPlaytest: handlePlaytest
  })

  return (
    <div className="ide-page">
      <TopBar
        projectName={`${manifest.name} (${manifest.storageMode})`}
        parseStatus={parseStatus}
        diagnosticsCount={diagnostics.length}
        onNewFile={handleNewFile}
        onRenameFile={handleRenameFile}
        onDeleteFile={handleDeleteFile}
        onRunCheck={runCheck}
        onPlaytest={handlePlaytest}
        onSaveLocal={saveLocal}
        onOpenFolder={() => { void openDirectory() }}
        onWriteFolder={() => { void writeDirectory() }}
        onImportBundle={() => { void importBundle() }}
        onExportBundle={exportBundle}
        onResetLayout={resetLayout}
        onToggleTheme={toggleTheme}
        authorMode={authorMode}
        onToggleAuthorMode={toggleAuthorMode}
        onCommandPalette={toggleCommandPalette}
        panelToggleItems={panelToggleItems}
        onTogglePanel={togglePanelVisibility}
        onShowAllPanels={showAllPanels}
      />

      <main className="workspace-layout" ref={workspaceLayoutRef}>
        {desktopMode ? (
          <AutoWidthGridLayout
            className="workspace-grid"
            layout={desktopGridLayout}
            cols={DESKTOP_GRID_COLUMNS}
            rowHeight={DESKTOP_GRID_ROW_HEIGHT}
            margin={GRID_MARGIN}
            containerPadding={GRID_CONTAINER_PADDING}
            isDraggable={authorMode !== 'graph'}
            isResizable={authorMode !== 'graph'}
            compactType="vertical"
            draggableHandle=".panel-header"
            draggableCancel={DRAG_CANCEL_SELECTOR}
            onLayoutChange={handleDesktopLayoutChange}
          >
            {visiblePanelIds.map(panelId => (
              <div key={panelId} data-panel-id={panelId} className={`workspace-tile tile-${panelId}`}>
                {renderPanel(panelId)}
              </div>
            ))}
          </AutoWidthGridLayout>
        ) : (
          <section className="workspace-stack" data-testid="workspace-stack">
            {visiblePanelIds.map(panelId => (
              <div key={panelId} data-panel-id={panelId} className={`workspace-stack-item stack-${panelId}`}>
                {renderPanel(panelId)}
              </div>
            ))}
          </section>
        )}
      </main>

      <CommandPalette mode={commandPaletteMode} open={commandPaletteOpen} items={commands} onClose={() => setCommandPaletteOpen(false)} />
    </div>
  )
}
