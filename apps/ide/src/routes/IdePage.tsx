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
import { createWorkspaceFromFileMap, useIdeStore } from '../store/workspaceStore'
import type { CommandPaletteItem, IdeDiagnostic, PanelId, PanelLayoutState, ParseWorkerRequest, ParseWorkerResponse, RuntimeEventEntry, WorkspaceBundle, WorkspaceFile, WorkspaceManifest } from '../types/interfaces'

const STORAGE_KEY = 'ifscript.ide.workspace.v1'
const GRID_MARGIN: [number, number] = [12, 12]
const GRID_CONTAINER_PADDING: [number, number] = [0, 0]
const DRAG_CANCEL_SELECTOR = 'input,textarea,select,option,button,label,a,.monaco-editor,.graph-controls,.graph-controls *'
const AutoWidthGridLayout = WidthProvider(GridLayout)

interface PersistedWorkspace {
  manifest: WorkspaceManifest
  files: Record<string, WorkspaceFile>
  activeFilePath: string
  theme: 'day' | 'night'
  layoutVersion?: number
  layout?: PanelLayoutState
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
  const parseStatus = useIdeStore(state => state.parseStatus)
  const parseTimings = useIdeStore(state => state.parseTimings)
  const commandPaletteOpen = useIdeStore(state => state.commandPaletteOpen)
  const theme = useIdeStore(state => state.theme)
  const fsRootHandle = useIdeStore(state => state.fsRootHandle)
  const playtestNonce = useIdeStore(state => state.playtestNonce)
  const runtimeEvents = useIdeStore(state => state.runtimeEvents)

  const setWorkspace = useIdeStore(state => state.setWorkspace)
  const setActiveFile = useIdeStore(state => state.setActiveFile)
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

  const persistWorkspace = useCallback((layout: PanelLayoutState) => {
    return idbSet<PersistedWorkspace>(STORAGE_KEY, {
      manifest,
      files: filesMap,
      activeFilePath,
      theme,
      layoutVersion: PANEL_LAYOUT_VERSION,
      layout: serializeLayout(layout)
    })
  }, [activeFilePath, filesMap, manifest, theme])

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
      setTheme(persisted.theme ?? 'day')
      const canRestoreLayout = persisted.layoutVersion == null || persisted.layoutVersion === PANEL_LAYOUT_VERSION
      const restoredLayout = canRestoreLayout ? deserializeLayout(persisted.layout) : null
      setPanelLayout(restoredLayout ?? getDefaultDesktopLayout())
    })()
  }, [setTheme, setWorkspace])

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

  const jumpToGraphNode = useCallback((nodeId: string) => {
    if (nodeId.startsWith('section:')) {
      const title = nodeId.replace('section:', '')
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
  }, [filesMap, manifest.rootFile, setActiveFile])

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
          onOpenFile={setActiveFile}
          onSetRootFile={setRootFile}
        />
      )
    }

    if (panelId === 'editor') {
      return (
        <EditorPane
          file={activeFile}
          diagnostics={diagnostics}
          cursorTarget={cursorTarget}
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
          playtestNonce={playtestNonce}
          onRuntimeEvent={(entry: RuntimeEventEntry) => addRuntimeEvent(entry)}
        />
      )
    }

    if (panelId === 'graph') {
      return <GraphPane graph={graph} onOpenNode={jumpToGraphNode} />
    }

    if (panelId === 'diagnostics') {
      return <DiagnosticsPanel diagnostics={diagnostics} onJumpToDiagnostic={jumpToDiagnostic} />
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
    diagnostics,
    files,
    graph,
    jumpToDiagnostic,
    jumpToGraphNode,
    manifest,
    parseTimings,
    playtestNonce,
    runtimeEvents,
    setActiveFile,
    setFileContent,
    setRootFile,
    snapshot
  ])

  const commands: CommandPaletteItem[] = useMemo(() => [
    {
      id: 'cmd-check',
      title: 'Run Diagnostics Check',
      category: 'Authoring',
      shortcut: 'Ctrl+Shift+P, type check',
      run: runCheck
    },
    {
      id: 'cmd-playtest',
      title: 'Run Playtest',
      category: 'Playtest',
      shortcut: 'Ctrl+Enter',
      run: triggerPlaytest
    },
    {
      id: 'cmd-new-file',
      title: 'Create File',
      category: 'Workspace',
      shortcut: 'Palette',
      run: handleNewFile
    },
    {
      id: 'cmd-save-local',
      title: 'Save Local Snapshot',
      category: 'Workspace',
      shortcut: 'Ctrl+S',
      run: saveLocal
    },
    {
      id: 'cmd-open-folder',
      title: 'Open Folder Workspace',
      category: 'Workspace',
      shortcut: 'Palette',
      run: () => { void openDirectory() }
    },
    {
      id: 'cmd-export',
      title: 'Export Bundle (.ifproj.json)',
      category: 'Workspace',
      shortcut: 'Palette',
      run: exportBundle
    },
    {
      id: 'cmd-import',
      title: 'Import Bundle (.ifproj.json)',
      category: 'Workspace',
      shortcut: 'Palette',
      run: () => { void importBundle() }
    }
  ], [exportBundle, handleNewFile, importBundle, openDirectory, runCheck, saveLocal, triggerPlaytest])

  useKeyboardShortcuts({
    onCommandPalette: () => setCommandPaletteOpen(!commandPaletteOpen),
    onSave: saveLocal,
    onPlaytest: triggerPlaytest
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
        onPlaytest={triggerPlaytest}
        onSaveLocal={saveLocal}
        onOpenFolder={() => { void openDirectory() }}
        onWriteFolder={() => { void writeDirectory() }}
        onImportBundle={() => { void importBundle() }}
        onExportBundle={exportBundle}
        onResetLayout={resetLayout}
        onToggleTheme={toggleTheme}
        onCommandPalette={() => setCommandPaletteOpen(!commandPaletteOpen)}
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

      <CommandPalette open={commandPaletteOpen} items={commands} onClose={() => setCommandPaletteOpen(false)} />
    </div>
  )
}
