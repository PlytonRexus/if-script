import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { useIdeStore, createWorkspaceFromFileMap } from '../store/workspaceStore'
import { makeRuntimeEvent, makeRuntimeError, makeManifest, makeWorkspaceFile } from './helpers/factories'

function resetStore() {
  useIdeStore.setState(useIdeStore.getInitialState())
}

beforeEach(() => resetStore())
afterEach(() => resetStore())

describe('workspaceStore', () => {
  describe('initial state', () => {
    it('has default workspace with main.if', () => {
      const state = useIdeStore.getState()
      expect(state.manifest.name).toBe('Untitled Project')
      expect(state.manifest.rootFile).toBe('/workspace/main.if')
      expect(state.manifest.files).toContain('/workspace/main.if')
      expect(state.activeFilePath).toBe('/workspace/main.if')
      expect(state.parseStatus).toBe('idle')
    })

    it('has empty diagnostics and indices', () => {
      const state = useIdeStore.getState()
      expect(state.diagnostics).toEqual([])
      expect(state.sectionIndex).toEqual([])
      expect(state.sceneIndex).toEqual([])
      expect(state.runtimeEvents).toEqual([])
      expect(state.runtimeErrors).toEqual([])
    })
  })

  describe('setWorkspace', () => {
    it('replaces manifest and files', () => {
      const manifest = makeManifest({ name: 'New Story' })
      const files = {
        '/workspace/main.if': makeWorkspaceFile({ path: '/workspace/main.if', content: 'hello' })
      }
      useIdeStore.getState().setWorkspace({ manifest, files })
      const state = useIdeStore.getState()
      expect(state.manifest.name).toBe('New Story')
      expect(state.files['/workspace/main.if']!.content).toBe('hello')
    })

    it('resets diagnostics, graph, and events', () => {
      useIdeStore.getState().addRuntimeEvent(makeRuntimeEvent())
      useIdeStore.getState().setWorkspace({
        manifest: makeManifest(),
        files: { '/workspace/main.if': makeWorkspaceFile() }
      })
      const state = useIdeStore.getState()
      expect(state.diagnostics).toEqual([])
      expect(state.runtimeEvents).toEqual([])
      expect(state.parseStatus).toBe('idle')
    })
  })

  describe('setActiveFile', () => {
    it('updates activeFilePath', () => {
      useIdeStore.getState().createFile('other.if')
      useIdeStore.getState().setActiveFile('/workspace/main.if')
      expect(useIdeStore.getState().activeFilePath).toBe('/workspace/main.if')
    })

    it('pushes to recentFilePaths', () => {
      useIdeStore.getState().createFile('other.if')
      useIdeStore.getState().setActiveFile('/workspace/main.if')
      expect(useIdeStore.getState().recentFilePaths[0]).toBe('/workspace/main.if')
    })

    it('ignores nonexistent file', () => {
      useIdeStore.getState().setActiveFile('/workspace/nonexistent.if')
      expect(useIdeStore.getState().activeFilePath).toBe('/workspace/main.if')
    })
  })

  describe('setRootFile', () => {
    it('updates manifest rootFile', () => {
      useIdeStore.getState().createFile('other.if')
      useIdeStore.getState().setRootFile('/workspace/other.if')
      expect(useIdeStore.getState().manifest.rootFile).toBe('/workspace/other.if')
    })

    it('ignores nonexistent file', () => {
      useIdeStore.getState().setRootFile('/workspace/nonexistent.if')
      expect(useIdeStore.getState().manifest.rootFile).toBe('/workspace/main.if')
    })
  })

  describe('setFileContent', () => {
    it('updates content and marks dirty', () => {
      useIdeStore.getState().setFileContent('/workspace/main.if', 'new content')
      const file = useIdeStore.getState().files['/workspace/main.if']!
      expect(file.content).toBe('new content')
      expect(file.dirty).toBe(true)
    })

    it('increments version', () => {
      const before = useIdeStore.getState().files['/workspace/main.if']!.version
      useIdeStore.getState().setFileContent('/workspace/main.if', 'change')
      expect(useIdeStore.getState().files['/workspace/main.if']!.version).toBe(before + 1)
    })

    it('ignores nonexistent file', () => {
      useIdeStore.getState().setFileContent('/workspace/nope.if', 'content')
      expect(useIdeStore.getState().files['/workspace/nope.if']).toBeUndefined()
    })
  })

  describe('createFile', () => {
    it('adds file and sets it as active', () => {
      useIdeStore.getState().createFile('chapter.if')
      const state = useIdeStore.getState()
      expect(state.files['/workspace/chapter.if']).toBeDefined()
      expect(state.activeFilePath).toBe('/workspace/chapter.if')
      expect(state.manifest.files).toContain('/workspace/chapter.if')
    })

    it('new file is dirty with empty content', () => {
      useIdeStore.getState().createFile('new.if')
      const file = useIdeStore.getState().files['/workspace/new.if']!
      expect(file.dirty).toBe(true)
      expect(file.content).toBe('')
    })

    it('ignores duplicate file path', () => {
      const before = Object.keys(useIdeStore.getState().files).length
      useIdeStore.getState().createFile('main.if')
      expect(Object.keys(useIdeStore.getState().files).length).toBe(before)
    })
  })

  describe('renameFile', () => {
    it('renames file preserving content', () => {
      useIdeStore.getState().setFileContent('/workspace/main.if', 'my content')
      useIdeStore.getState().renameFile('/workspace/main.if', '/workspace/renamed.if')
      const state = useIdeStore.getState()
      expect(state.files['/workspace/main.if']).toBeUndefined()
      expect(state.files['/workspace/renamed.if']!.content).toBe('my content')
    })

    it('updates rootFile if renamed file was root', () => {
      useIdeStore.getState().renameFile('/workspace/main.if', '/workspace/renamed.if')
      expect(useIdeStore.getState().manifest.rootFile).toBe('/workspace/renamed.if')
    })

    it('updates activeFilePath if renamed file was active', () => {
      useIdeStore.getState().renameFile('/workspace/main.if', '/workspace/renamed.if')
      expect(useIdeStore.getState().activeFilePath).toBe('/workspace/renamed.if')
    })

    it('updates recentFilePaths', () => {
      useIdeStore.getState().renameFile('/workspace/main.if', '/workspace/renamed.if')
      expect(useIdeStore.getState().recentFilePaths).toContain('/workspace/renamed.if')
      expect(useIdeStore.getState().recentFilePaths).not.toContain('/workspace/main.if')
    })

    it('ignores rename to duplicate target', () => {
      useIdeStore.getState().createFile('other.if')
      useIdeStore.getState().renameFile('/workspace/main.if', '/workspace/other.if')
      expect(useIdeStore.getState().files['/workspace/main.if']).toBeDefined()
    })
  })

  describe('deleteFile', () => {
    it('removes file and switches active', () => {
      useIdeStore.getState().createFile('other.if')
      useIdeStore.getState().setActiveFile('/workspace/other.if')
      useIdeStore.getState().deleteFile('/workspace/other.if')
      const state = useIdeStore.getState()
      expect(state.files['/workspace/other.if']).toBeUndefined()
      expect(state.activeFilePath).toBe('/workspace/main.if')
    })

    it('updates rootFile when root is deleted', () => {
      useIdeStore.getState().createFile('other.if')
      useIdeStore.getState().deleteFile('/workspace/main.if')
      expect(useIdeStore.getState().manifest.rootFile).toBe('/workspace/other.if')
    })

    it('resets to default workspace when last file is deleted', () => {
      useIdeStore.getState().deleteFile('/workspace/main.if')
      const state = useIdeStore.getState()
      expect(state.manifest.name).toBe('Untitled Project')
      expect(state.files['/workspace/main.if']).toBeDefined()
    })
  })

  describe('setDiagnosticsGraph', () => {
    it('updates all analysis fields', () => {
      useIdeStore.getState().setDiagnosticsGraph({
        diagnostics: [{ severity: 'error', code: 'X', file: null, line: null, col: null, message: 'err', hint: null, source: 'parser' }],
        graph: { nodes: [], edges: [], startNodeId: null, deadEnds: [] },
        authorGraph: { nodes: [], edges: [], groups: [] },
        sectionIndex: [{ serial: 1, title: 'A', file: '/workspace/main.if', line: 1, col: 1 }],
        sceneIndex: [],
        storySettingsIndex: null,
        sectionSettingsIndex: [],
        choiceIndex: [],
        sectionContentIndex: [],
        authoringSchema: null,
        variableCatalog: [],
        sectionVariableNamesBySerial: {},
        parseStatus: 'ok',
        parseRequestId: 1,
        timings: { parseMs: 10, analyzeMs: 5, totalMs: 15 }
      })
      const state = useIdeStore.getState()
      expect(state.diagnostics.length).toBe(1)
      expect(state.parseStatus).toBe('ok')
      expect(state.sectionIndex.length).toBe(1)
    })

    it('ignores stale updates with lower requestId', () => {
      useIdeStore.getState().setParseRunning(5)
      useIdeStore.getState().setDiagnosticsGraph({
        diagnostics: [],
        graph: { nodes: [], edges: [], startNodeId: null, deadEnds: [] },
        authorGraph: { nodes: [], edges: [], groups: [] },
        sectionIndex: [],
        sceneIndex: [],
        storySettingsIndex: null,
        sectionSettingsIndex: [],
        choiceIndex: [],
        sectionContentIndex: [],
        authoringSchema: null,
        variableCatalog: [],
        sectionVariableNamesBySerial: {},
        parseStatus: 'ok',
        parseRequestId: 3,
        timings: { parseMs: 0, analyzeMs: 0, totalMs: 0 }
      })
      expect(useIdeStore.getState().parseStatus).toBe('running')
    })
  })

  describe('toggleTheme', () => {
    it('flips day to night', () => {
      expect(useIdeStore.getState().theme).toBe('day')
      useIdeStore.getState().toggleTheme()
      expect(useIdeStore.getState().theme).toBe('night')
    })

    it('flips night to day', () => {
      useIdeStore.getState().toggleTheme()
      useIdeStore.getState().toggleTheme()
      expect(useIdeStore.getState().theme).toBe('day')
    })
  })

  describe('addRuntimeEvent', () => {
    it('prepends event', () => {
      const event1 = makeRuntimeEvent({ event: 'first' })
      const event2 = makeRuntimeEvent({ event: 'second' })
      useIdeStore.getState().addRuntimeEvent(event1)
      useIdeStore.getState().addRuntimeEvent(event2)
      expect(useIdeStore.getState().runtimeEvents[0]!.event).toBe('second')
      expect(useIdeStore.getState().runtimeEvents[1]!.event).toBe('first')
    })

    it('caps at 150 events', () => {
      for (let i = 0; i < 160; i++) {
        useIdeStore.getState().addRuntimeEvent(makeRuntimeEvent({ event: `e${i}` }))
      }
      expect(useIdeStore.getState().runtimeEvents.length).toBe(150)
    })
  })

  describe('clearRuntimeEvents and clearRuntimeErrors', () => {
    it('clearRuntimeEvents empties the array', () => {
      useIdeStore.getState().addRuntimeEvent(makeRuntimeEvent())
      useIdeStore.getState().clearRuntimeEvents()
      expect(useIdeStore.getState().runtimeEvents).toEqual([])
    })

    it('clearRuntimeErrors empties the array', () => {
      useIdeStore.getState().addRuntimeError(makeRuntimeError())
      useIdeStore.getState().clearRuntimeErrors()
      expect(useIdeStore.getState().runtimeErrors).toEqual([])
    })
  })

  describe('saveCheckpoint', () => {
    it('sets all files to not dirty and updates lastSavedAt', () => {
      useIdeStore.getState().setFileContent('/workspace/main.if', 'changed')
      expect(useIdeStore.getState().files['/workspace/main.if']!.dirty).toBe(true)
      useIdeStore.getState().saveCheckpoint()
      const file = useIdeStore.getState().files['/workspace/main.if']!
      expect(file.dirty).toBe(false)
      expect(file.lastSavedAt).toBeTruthy()
    })
  })

  describe('triggerPlaytest', () => {
    it('increments playtestNonce', () => {
      const before = useIdeStore.getState().playtestNonce
      useIdeStore.getState().triggerPlaytest()
      expect(useIdeStore.getState().playtestNonce).toBe(before + 1)
    })
  })

  describe('createWorkspaceFromFileMap', () => {
    it('creates manifest and files from input map', () => {
      const result = createWorkspaceFromFileMap({
        name: 'Test',
        rootFile: 'main.if',
        files: { 'main.if': 'section "A"\nend\n', 'other.if': '' }
      })
      expect(result.manifest.name).toBe('Test')
      expect(result.manifest.rootFile).toBe('/workspace/main.if')
      expect(result.manifest.files).toContain('/workspace/main.if')
      expect(result.manifest.files).toContain('/workspace/other.if')
      expect(result.files['/workspace/main.if']!.content).toBe('section "A"\nend\n')
    })

    it('creates root file if missing from input', () => {
      const result = createWorkspaceFromFileMap({
        name: 'Test',
        rootFile: 'missing.if',
        files: { 'main.if': 'content' }
      })
      expect(result.files['/workspace/missing.if']).toBeDefined()
      expect(result.files['/workspace/missing.if']!.content).toBe('')
    })

    it('uses default storageMode and aliases', () => {
      const result = createWorkspaceFromFileMap({
        name: 'Test',
        rootFile: 'main.if',
        files: { 'main.if': '' }
      })
      expect(result.manifest.storageMode).toBe('local-only')
      expect(result.manifest.aliases).toEqual({})
    })
  })
})
