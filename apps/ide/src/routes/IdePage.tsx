import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import GridLayout, { WidthProvider, type Layout } from 'react-grid-layout/legacy'
import { CommandPalette } from '../components/CommandPalette'
import { DiagnosticsPanel } from '../components/DiagnosticsPanel'
import { EditorPane } from '../components/EditorPane'
import { GraphPane } from '../components/GraphPane'
import { PreviewPane } from '../components/PreviewPane'
import { RuntimeEventsPanel } from '../components/RuntimeEventsPanel'
import { Sidebar } from '../components/Sidebar'
import { TopBar } from '../components/TopBar'
import { DESKTOP_GRID_COLUMNS, DESKTOP_GRID_ROW_HEIGHT, PANEL_IDS, PANEL_LAYOUT_VERSION, deserializeLayout, fromGridLayout, getDefaultDesktopLayout, isDesktopViewport, serializeLayout, toGridLayout } from '../layout/panelLayout'
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
  IdeDiagnostic,
  PanelId,
  PanelLayoutState,
  ParseWorkerRequest,
  ParseWorkerResponse,
  RuntimeEventEntry,
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

interface PersistedWorkspace {
  manifest: WorkspaceManifest
  files: Record<string, WorkspaceFile>
  activeFilePath: string
  recentFilePaths?: string[]
  theme: 'day' | 'night'
  layoutVersion?: number
  layout?: PanelLayoutState
  sectionPreviewOverrides?: Record<string, string>
  previewMode?: {
    autoFollowCursor: boolean
    pinnedSectionKey: string | null
  }
  previewAutoFollow?: boolean
  sectionVariablePresets?: Record<string, VariablePreset[]>
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
  const sectionIndex = useIdeStore(state => state.sectionIndex)
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
  const [panelLayout, setPanelLayout] = useState<PanelLayoutState>(() => getDefaultDesktopLayout())
  const [desktopMode, setDesktopMode] = useState<boolean>(() => readDesktopMode())
  const workspaceLayoutRef = useRef<HTMLElement | null>(null)
  const workerRef = useRef<Worker | null>(null)
  const requestIdRef = useRef(0)

  const files = useMemo(() => {
    return sortWorkspacePaths(Object.keys(filesMap))
      .map(path => filesMap[path])
      .filter((file): file is WorkspaceFile => Boolean(file))
  }, [filesMap])

  const activeFile = filesMap[activeFilePath] ?? null
  const snapshot = useMemo(() => fileSnapshot(filesMap), [filesMap])
  const desktopGridLayout = useMemo(() => toGridLayout(panelLayout), [panelLayout])
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
  const focusedSectionNodeId = cursorFocusedSection ? `section:${cursorFocusedSection.title}` : null
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

  const persistWorkspace = useCallback((layout: PanelLayoutState) => {
    return idbSet<PersistedWorkspace>(STORAGE_KEY, {
      manifest,
      files: filesMap,
      activeFilePath,
      recentFilePaths,
      theme,
      layoutVersion: PANEL_LAYOUT_VERSION,
      layout: serializeLayout(layout),
      sectionPreviewOverrides,
      previewMode: {
        autoFollowCursor: previewAutoFollow,
        pinnedSectionKey: previewPinnedSectionKey
      },
      sectionVariablePresets
    })
  }, [activeFilePath, filesMap, manifest, previewAutoFollow, previewPinnedSectionKey, recentFilePaths, sectionPreviewOverrides, sectionVariablePresets, theme])

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
        sectionIndex: payload.sectionIndex,
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
      setSectionPreviewOverrides(persisted.sectionPreviewOverrides ?? {})
      const restoredPreviewMode = persisted.previewMode ?? {
        autoFollowCursor: persisted.previewAutoFollow ?? true,
        pinnedSectionKey: null
      }
      setPreviewAutoFollow(restoredPreviewMode.autoFollowCursor)
      setPreviewPinnedSectionKey(restoredPreviewMode.pinnedSectionKey ?? null)
      setSectionVariablePresets(persisted.sectionVariablePresets ?? {})
      setPreviewAnchorSectionKey(null)
    })()
  }, [setRecentFilePaths, setTheme, setWorkspace])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void persistWorkspace(panelLayout)
    }, 300)

    return () => window.clearTimeout(timer)
  }, [panelLayout, persistWorkspace])

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
    void persistWorkspace(next)
  }, [persistWorkspace])

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

  const handleApplyDiagnosticQuickFix = useCallback((diagnostic: IdeDiagnostic) => {
    const quickFix = diagnostic.data
    const target = quickFix?.target?.trim()
    if (!target) return
    if (quickFix?.kind !== 'missing_section_target' && quickFix?.kind !== 'start_at_unresolved') return

    const existingSection = sectionIndex.find(section => section.title === target)
    if (existingSection) {
      handleOpenSection(existingSection)
      return
    }

    const preferredFile = activeFile?.path && filesMap[activeFile.path] ? activeFile.path : manifest.rootFile
    if (!filesMap[preferredFile]) return

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
  }, [activeFile?.path, filesMap, handleOpenSection, manifest.rootFile, sectionIndex, setActiveFile, setFileContent])

  const jumpToGraphNode = useCallback((nodeId: string) => {
    if (nodeId.startsWith('section:')) {
      const title = nodeId.replace('section:', '')
      const indexMatch = sectionIndex.find(entry => entry.title === title && Boolean(filesMap[entry.file]))
      if (indexMatch) {
        setActiveFile(indexMatch.file)
        setCursorTarget({ line: indexMatch.line, col: indexMatch.col, nonce: Date.now() })
        return
      }
      const sectionNeedles = [`section "${title}"`, `@title "${title}"`, `@title '${title}'`]

      const targetFile = Object.values(filesMap).find(file => sectionNeedles.some(needle => file.content.includes(needle)))
      if (targetFile) {
        setActiveFile(targetFile.path)
        const line = pickLineForNeedle(targetFile.content, title)
        setCursorTarget({ line, col: 1, nonce: Date.now() })
        return
      }
    }

    if (filesMap[manifest.rootFile]) {
      setActiveFile(manifest.rootFile)
      setCursorTarget({ line: 1, col: 1, nonce: Date.now() })
    }
  }, [filesMap, manifest.rootFile, sectionIndex, setActiveFile])

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
      saveCheckpoint()
    } catch (err) {
      window.alert(String((err as Error).message ?? err))
    }
  }, [saveCheckpoint, setFsRootHandle, setStorageMode, setWorkspace])

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
      } catch (err) {
        window.alert(String((err as Error).message ?? err))
      }
    }

    input.click()
  }, [setStorageMode, setWorkspace])

  const exportBundle = useCallback(() => {
    const bundle: WorkspaceBundle = {
      version: 1,
      manifest,
      files: snapshot
    }
    downloadBundle(bundle, `${manifest.name.replace(/\s+/g, '-').toLowerCase() || 'if-project'}.ifproj.json`)
  }, [manifest, snapshot])

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
    setPanelLayout(fromGridLayout(nextLayout))
  }, [])

  const renderPanel = useCallback((panelId: PanelId): JSX.Element => {
    if (panelId === 'workspace') {
      return (
        <Sidebar
          files={files}
          activeFilePath={activeFilePath}
          rootFile={manifest.rootFile}
          sectionIndex={sectionIndex}
          graph={graph}
          onOpenFile={setActiveFile}
          onOpenSection={handleOpenSection}
          onSetRootFile={setRootFile}
        />
      )
    }

    if (panelId === 'editor') {
      return (
        <EditorPane
          file={activeFile}
          diagnostics={diagnostics}
          parseStatus={parseStatus}
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
      return <RuntimeEventsPanel events={runtimeEvents} onClear={clearRuntimeEvents} />
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
    clearRuntimeEvents,
    cursorTarget,
    handleApplyDiagnosticQuickFix,
    handleOpenSection,
    handleTogglePreviewPin,
    diagnostics,
    sectionIndex,
    files,
    focusedOverrideText,
    deleteSectionPreset,
    focusedPresets,
    focusedSectionNodeId,
    graph,
    handlePreviewAutoFollowChange,
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
    saveSectionPreset,
    sectionTitlesForCompletion,
    sectionVariableNamesBySerial,
    setActiveFile,
    setCursorPosition,
    setFileContent,
    setRootFile,
    snapshot,
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
      }
    ]

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

    return [...commandItems, ...fileItems, ...sectionItems]
  }, [exportBundle, filesByRecency, handleNewFile, handleOpenSection, handlePlaytest, importBundle, openDirectory, runCheck, saveLocal, sectionIndex, setActiveFile])

  useKeyboardShortcuts({
    onCommandPalette: toggleCommandPalette,
    onQuickOpenFiles: () => openPalette('files'),
    onQuickOpenSections: () => openPalette('sections'),
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
        onCommandPalette={toggleCommandPalette}
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
            isDraggable
            isResizable
            compactType="vertical"
            draggableHandle=".panel-header"
            draggableCancel={DRAG_CANCEL_SELECTOR}
            onLayoutChange={handleDesktopLayoutChange}
          >
            {PANEL_IDS.map(panelId => (
              <div key={panelId} data-panel-id={panelId} className={`workspace-tile tile-${panelId}`}>
                {renderPanel(panelId)}
              </div>
            ))}
          </AutoWidthGridLayout>
        ) : (
          <section className="workspace-stack" data-testid="workspace-stack">
            {PANEL_IDS.map(panelId => (
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
