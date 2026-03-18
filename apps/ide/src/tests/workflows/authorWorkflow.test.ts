import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { useIdeStore } from '../../store/workspaceStore'
import { makeRuntimeEvent } from '../helpers/factories'

function resetStore() {
  useIdeStore.setState(useIdeStore.getInitialState())
}

beforeEach(() => resetStore())
afterEach(() => resetStore())

describe('authorWorkflow', () => {
  // -- File management workflow --

  describe('file management workflow', () => {
    it('create file, set content, verify in files map and manifest', () => {
      useIdeStore.getState().createFile('chapter.if')
      useIdeStore.getState().setFileContent('/workspace/chapter.if', 'section "Start"\nend\n')

      const state = useIdeStore.getState()
      expect(state.files['/workspace/chapter.if']!.content).toBe('section "Start"\nend\n')
      expect(state.manifest.files).toContain('/workspace/chapter.if')
    })

    it('rename file, verify old path removed, new path present, manifest updated', () => {
      useIdeStore.getState().createFile('old.if')
      useIdeStore.getState().setFileContent('/workspace/old.if', 'content here')
      useIdeStore.getState().renameFile('/workspace/old.if', '/workspace/new.if')

      const state = useIdeStore.getState()
      expect(state.files['/workspace/old.if']).toBeUndefined()
      expect(state.files['/workspace/new.if']!.content).toBe('content here')
      expect(state.manifest.files).toContain('/workspace/new.if')
      expect(state.manifest.files).not.toContain('/workspace/old.if')
    })

    it('delete file, verify removed from files map and manifest', () => {
      useIdeStore.getState().createFile('temp.if')
      expect(useIdeStore.getState().files['/workspace/temp.if']).toBeDefined()

      useIdeStore.getState().deleteFile('/workspace/temp.if')
      const state = useIdeStore.getState()
      expect(state.files['/workspace/temp.if']).toBeUndefined()
      expect(state.manifest.files).not.toContain('/workspace/temp.if')
    })

    it('delete last file falls back to default workspace', () => {
      useIdeStore.getState().deleteFile('/workspace/main.if')
      const state = useIdeStore.getState()
      expect(state.manifest.name).toBe('Untitled Project')
      expect(state.files['/workspace/main.if']).toBeDefined()
      expect(state.manifest.rootFile).toBe('/workspace/main.if')
    })
  })

  // -- Multi-file editing workflow --

  describe('multi-file editing workflow', () => {
    it('create second file, switch active file, verify content isolation', () => {
      useIdeStore.getState().setFileContent('/workspace/main.if', 'main content')
      useIdeStore.getState().createFile('second.if')
      useIdeStore.getState().setFileContent('/workspace/second.if', 'second content')

      useIdeStore.getState().setActiveFile('/workspace/main.if')
      expect(useIdeStore.getState().activeFilePath).toBe('/workspace/main.if')
      expect(useIdeStore.getState().files['/workspace/main.if']!.content).toBe('main content')
      expect(useIdeStore.getState().files['/workspace/second.if']!.content).toBe('second content')
    })

    it('set new file as root, verify manifest.rootFile updated', () => {
      useIdeStore.getState().createFile('entry.if')
      useIdeStore.getState().setRootFile('/workspace/entry.if')
      expect(useIdeStore.getState().manifest.rootFile).toBe('/workspace/entry.if')
    })

    it('edit file content, verify dirty flag, then saveCheckpoint clears it', () => {
      useIdeStore.getState().setFileContent('/workspace/main.if', 'edited')
      expect(useIdeStore.getState().files['/workspace/main.if']!.dirty).toBe(true)

      useIdeStore.getState().saveCheckpoint()
      expect(useIdeStore.getState().files['/workspace/main.if']!.dirty).toBe(false)
      expect(useIdeStore.getState().files['/workspace/main.if']!.lastSavedAt).toBeTruthy()
    })
  })

  // -- Parse result workflow --

  describe('parse result workflow', () => {
    it('setParseRunning sets parseStatus to running', () => {
      useIdeStore.getState().setParseRunning(1)
      expect(useIdeStore.getState().parseStatus).toBe('running')
    })

    it('setDiagnosticsGraph updates all indices atomically', () => {
      useIdeStore.getState().setParseRunning(1)
      useIdeStore.getState().setDiagnosticsGraph({
        diagnostics: [{ severity: 'warning', code: 'W1', file: '/workspace/main.if', line: 1, col: 1, message: 'warn', hint: null, source: 'analyzer' }],
        graph: { nodes: [{ id: 's1', label: 'A', nodeType: 'section', ending: false, unreachable: false, hasError: false }], edges: [], startNodeId: 's1', deadEnds: [] },
        authorGraph: { nodes: [], edges: [], groups: [] },
        sectionIndex: [{ serial: 1, title: 'A', file: '/workspace/main.if', line: 1, col: 1 }],
        sceneIndex: [{ serial: 1, name: 'S1', first: 'A', sections: ['A'], file: '/workspace/main.if', line: 1, col: 1, hasAmbience: false, sceneTransition: 'cut', firstResolved: true }],
        storySettingsIndex: null,
        sectionSettingsIndex: [],
        choiceIndex: [],
        sectionContentIndex: [],
        authoringSchema: null,
        variableCatalog: [],
        sectionVariableNamesBySerial: {},
        parseStatus: 'ok',
        parseRequestId: 1,
        timings: { parseMs: 5, analyzeMs: 3, totalMs: 8 }
      })

      const state = useIdeStore.getState()
      expect(state.parseStatus).toBe('ok')
      expect(state.diagnostics.length).toBe(1)
      expect(state.sectionIndex.length).toBe(1)
      expect(state.sceneIndex.length).toBe(1)
      expect(state.graph.nodes.length).toBe(1)
    })

    it('stale parse results (old requestId) are rejected', () => {
      useIdeStore.getState().setParseRunning(10)
      useIdeStore.getState().setDiagnosticsGraph({
        diagnostics: [],
        graph: { nodes: [], edges: [], startNodeId: null, deadEnds: [] },
        authorGraph: { nodes: [], edges: [], groups: [] },
        sectionIndex: [{ serial: 99, title: 'Stale', file: '/workspace/main.if', line: 1, col: 1 }],
        sceneIndex: [],
        storySettingsIndex: null,
        sectionSettingsIndex: [],
        choiceIndex: [],
        sectionContentIndex: [],
        authoringSchema: null,
        variableCatalog: [],
        sectionVariableNamesBySerial: {},
        parseStatus: 'ok',
        parseRequestId: 5, // older than current requestId of 10
        timings: { parseMs: 0, analyzeMs: 0, totalMs: 0 }
      })
      // Should still be running, stale result rejected
      expect(useIdeStore.getState().parseStatus).toBe('running')
      expect(useIdeStore.getState().sectionIndex.length).toBe(0)
    })
  })

  // -- Runtime events workflow --

  describe('runtime events workflow', () => {
    it('addRuntimeEvent accumulates events, clearRuntimeEvents empties list', () => {
      useIdeStore.getState().addRuntimeEvent(makeRuntimeEvent({ event: 'a' }))
      useIdeStore.getState().addRuntimeEvent(makeRuntimeEvent({ event: 'b' }))
      expect(useIdeStore.getState().runtimeEvents.length).toBe(2)

      useIdeStore.getState().clearRuntimeEvents()
      expect(useIdeStore.getState().runtimeEvents).toEqual([])
    })

    it('events capped at 150 entries', () => {
      for (let i = 0; i < 160; i++) {
        useIdeStore.getState().addRuntimeEvent(makeRuntimeEvent({ event: `e${i}` }))
      }
      expect(useIdeStore.getState().runtimeEvents.length).toBe(150)
      // Most recent event should be first
      expect(useIdeStore.getState().runtimeEvents[0]!.event).toBe('e159')
    })
  })
})
