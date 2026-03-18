import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  makeDiagnostic,
  makeRuntimeDebugSnapshot,
  makeStoryGraph,
  makeWorkspaceFile
} from './helpers/factories'
import {
  renderCommandPalette,
  renderDiagnosticsPanel,
  renderGraphPane,
  renderGraphSectionWriterPane,
  renderInspectorPane,
  renderRuntimeEventsPanel,
  renderStoryboardPane,
  renderTopBar
} from './helpers/renderHelpers'
import { Sidebar } from '../components/Sidebar'
import { PlaytestInspectorPanel } from '../components/PlaytestInspectorPanel'

describe('defensiveRendering', () => {
  afterEach(() => cleanup())

  // -- StoryboardPane --

  describe('StoryboardPane with empty data', () => {
    it('renders with empty sectionIndex', () => {
      renderStoryboardPane({ sectionIndex: [] })
      expect(screen.getByText('No sections yet.')).toBeTruthy()
    })

    it('renders with empty sceneIndex', () => {
      renderStoryboardPane({ sceneIndex: [] })
      expect(screen.getByText('0 sections')).toBeTruthy()
    })

    it('renders with empty graph', () => {
      renderStoryboardPane({ graph: makeStoryGraph() })
      expect(screen.getByText('No sections yet.')).toBeTruthy()
    })
  })

  // -- GraphPane --

  describe('GraphPane with empty data', () => {
    it('renders with zero nodes', () => {
      renderGraphPane({ graph: makeStoryGraph({ nodes: [] }) })
      expect(screen.getByText('Graph appears after first successful parse.')).toBeTruthy()
    })

    it('renders with zero edges', () => {
      renderGraphPane({ graph: makeStoryGraph({ nodes: [], edges: [] }) })
      expect(screen.getByText('Graph appears after first successful parse.')).toBeTruthy()
    })
  })

  // -- GraphSectionWriterPane --

  describe('GraphSectionWriterPane with null data', () => {
    it('renders with null section', () => {
      renderGraphSectionWriterPane({ section: null })
      expect(screen.getByText('Select a section to write.')).toBeTruthy()
    })

    it('renders with null sectionContent', () => {
      renderGraphSectionWriterPane({ sectionContent: null })
      expect(screen.getByText('Select a section to write.')).toBeTruthy()
    })

    it('renders with empty selectedChoices', () => {
      renderGraphSectionWriterPane({ selectedChoices: [] })
      expect(screen.getByText('Select a section to write.')).toBeTruthy()
    })
  })

  // -- DiagnosticsPanel --

  describe('DiagnosticsPanel with edge case data', () => {
    it('renders with diagnostic missing file, line, col (all null)', () => {
      renderDiagnosticsPanel({
        diagnostics: [makeDiagnostic({ file: null, line: null, col: null })]
      })
      expect(screen.getByText('Test diagnostic message')).toBeTruthy()
    })
  })

  // -- PlaytestInspectorPanel --

  describe('PlaytestInspectorPanel with null/empty data', () => {
    it('renders with null debugSnapshot', () => {
      render(
        <PlaytestInspectorPanel
          events={[]}
          errors={[]}
          debugState={{ snapshot: null, lastUpdatedAt: null }}
          onClear={vi.fn()}
        />
      )
      // Should not crash
      expect(document.body).toBeTruthy()
    })

    it('renders with empty events and errors', () => {
      render(
        <PlaytestInspectorPanel
          events={[]}
          errors={[]}
          debugState={{ snapshot: makeRuntimeDebugSnapshot(), lastUpdatedAt: null }}
          onClear={vi.fn()}
        />
      )
      expect(document.body).toBeTruthy()
    })
  })

  // -- RuntimeEventsPanel --

  describe('RuntimeEventsPanel with empty events', () => {
    it('renders with empty events list', () => {
      renderRuntimeEventsPanel({ events: [] })
      // Should render without crash
      expect(document.body).toBeTruthy()
    })
  })

  // -- Sidebar --

  describe('Sidebar with empty data', () => {
    it('renders with empty sectionIndex, sceneIndex, and filesMap', () => {
      render(
        <Sidebar
          files={[makeWorkspaceFile()]}
          activeFilePath="/workspace/main.if"
          rootFile="/workspace/main.if"
          sectionIndex={[]}
          sceneIndex={[]}
          graph={makeStoryGraph()}
          onOpenFile={vi.fn()}
          onOpenSection={vi.fn()}
          onOpenScene={vi.fn()}
          onSetRootFile={vi.fn()}
        />
      )
      expect(screen.getByText('1 files')).toBeTruthy()
    })
  })

  // -- CommandPalette --

  describe('CommandPalette with empty items', () => {
    it('renders with empty items list', () => {
      renderCommandPalette({ open: true, items: [] })
      // Should render without crash
      expect(document.body).toBeTruthy()
    })
  })

  // -- TopBar --

  describe('TopBar with empty panelToggleItems', () => {
    it('renders with empty panelToggleItems', () => {
      renderTopBar({ panelToggleItems: [] })
      expect(screen.getByText('Test Project')).toBeTruthy()
    })
  })

  // -- InspectorPane --

  describe('InspectorPane with empty indices', () => {
    it('renders with empty sectionIndex, sceneIndex, choiceIndex', () => {
      renderInspectorPane({
        sectionSettingsIndex: [],
        sceneIndex: [],
        choiceIndex: []
      })
      // Should render without crash
      expect(screen.getByText('Inspector')).toBeTruthy()
    })
  })
})
