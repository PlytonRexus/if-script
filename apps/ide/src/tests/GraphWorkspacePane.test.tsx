import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { GraphWorkspacePane } from '../components/GraphWorkspacePane'

vi.mock('../components/EditorPane', () => ({
  EditorPane: () => <div>Editor</div>
}))

vi.mock('elkjs/lib/elk.bundled.js', () => ({
  default: class {
    layout() {
      return Promise.resolve({
        children: [{ id: 'section:/workspace/main.if:1:1:3:1:1', x: 0, y: 0 }]
      })
    }
  }
}))

vi.mock('@xyflow/react', () => ({
  Background: () => null,
  BackgroundVariant: { Dots: 'dots', Lines: 'lines', Cross: 'cross' },
  ConnectionLineType: { SmoothStep: 'smoothstep', Bezier: 'bezier', Step: 'step', Straight: 'straight' },
  Controls: () => null,
  Handle: () => null,
  MarkerType: { ArrowClosed: 'arrowclosed' },
  Position: { Left: 'left', Right: 'right' },
  ReactFlow: ({ children }: { children: ReactNode }) => <div data-testid="react-flow">{children}</div>
}))

describe('GraphWorkspacePane', () => {
  afterEach(() => cleanup())

  it('shows the writer panel and keeps source hidden until requested', async () => {
    const onLayoutStateChange = vi.fn()
    const onApplySectionWriterEdits = vi.fn()

    render(
      <GraphWorkspacePane
        graph={{
          nodes: [
            {
              id: 'section:/workspace/main.if:1:1:3:1:1',
              kind: 'section',
              label: 'Intro',
              file: '/workspace/main.if',
              sectionSerial: 1,
              sceneSerial: null,
              sourceRange: { file: '/workspace/main.if', startLine: 1, startCol: 1, endLine: 3, endCol: 1 },
              unreachable: false,
              hasError: false,
              affordances: {
                hasTimer: false,
                hasAmbience: false,
                hasBackdrop: false,
                hasSfx: false,
                hasConditionalChoices: false
              }
            }
          ],
          edges: [],
          groups: []
        }}
        selectedNodeId="section:/workspace/main.if:1:1:3:1:1"
        activeFile={{ path: '/workspace/main.if', content: 'section "Intro"\n  "Hello"\nend\n', dirty: false, version: 1, lastSavedAt: null }}
        diagnostics={[]}
        parseStatus="ok"
        authoringSchema={null}
        sectionTitles={['Intro']}
        variableNames={['flag']}
        cursorTarget={null}
        sectionIndex={[{ serial: 1, title: 'Intro', file: '/workspace/main.if', line: 1, col: 1 }]}
        sectionSettingsIndex={[{
          sectionSerial: 1,
          sectionTitle: 'Intro',
          file: '/workspace/main.if',
          line: 1,
          col: 1,
          sourceRange: { file: '/workspace/main.if', startLine: 1, startCol: 1, endLine: 3, endCol: 1 },
          timerSeconds: null,
          timerTarget: null,
          timerOutcome: null,
          ambience: null,
          ambienceVolume: 1,
          ambienceLoop: true,
          sfx: [],
          backdrop: null,
          shot: 'medium',
          textPacing: 'instant'
        }]}
        choiceIndex={[]}
        sectionContentIndex={[{
          sectionSerial: 1,
          file: '/workspace/main.if',
          sourceRange: { file: '/workspace/main.if', startLine: 1, startCol: 1, endLine: 3, endCol: 1 },
          blocks: [{ id: 'text-1', kind: 'text', text: 'Hello' }],
          supported: true,
          unsupportedNodeKinds: []
        }]}
        layoutState={{
          pinnedNodes: {},
          collapsedGroupIds: [],
          groupsVisible: false,
          zoom: 1,
          viewport: { x: 0, y: 0, zoom: 1 },
          dockOpen: false,
          visibleNodeCap: 25,
          legendCollapsed: false
        }}
        onLayoutStateChange={onLayoutStateChange}
        onCursorChange={vi.fn()}
        onChangeSource={vi.fn()}
        onSelectNode={vi.fn()}
        onCreateSection={vi.fn()}
        onDeleteSection={vi.fn()}
        onCreateChoice={vi.fn()}
        onRetargetChoice={vi.fn()}
        onApplySectionWriterEdits={onApplySectionWriterEdits}
      />
    )

    await waitFor(() => expect(screen.getByLabelText('Section title')).toBeTruthy())
    expect(screen.queryByText('Editor')).toBeNull()

    fireEvent.click(screen.getAllByRole('button', { name: 'View source' })[1] as HTMLButtonElement)
    expect(onLayoutStateChange).toHaveBeenCalledWith(expect.objectContaining({ dockOpen: true }))

    fireEvent.click(screen.getByRole('button', { name: 'Save section' }))
    expect(onApplySectionWriterEdits).toHaveBeenCalledWith(1, expect.objectContaining({ title: 'Intro' }))
  })
})
