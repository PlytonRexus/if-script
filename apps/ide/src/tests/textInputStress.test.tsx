import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  makeAuthorGraphNode,
  makeChoiceIndex,
  makeCommandPaletteItem,
  makeSceneIndex,
  makeSectionContentIndex,
  makeSectionIndex,
  makeSectionSettings,
  makeStoryGraph,
  makeStoryGraphNode,
  makeStorySettings,
  makeWorkspaceFile
} from './helpers/factories'
import {
  renderCommandPalette,
  renderGraphPane,
  renderGraphSectionWriterPane,
  renderInspectorPane
} from './helpers/renderHelpers'
import { Sidebar } from '../components/Sidebar'

function rapidType(element: Element, count: number) {
  for (let i = 1; i <= count; i++) {
    fireEvent.change(element, { target: { value: 'x'.repeat(i) } })
  }
}

describe('textInputStress', () => {
  afterEach(() => cleanup())

  // -- InspectorPane inputs --

  describe('InspectorPane inputs', () => {
    it('rapid typing in timer seconds does not crash', () => {
      renderInspectorPane({
        selection: { activeTab: 'section', sectionSerial: 1 },
        sectionSettingsIndex: [makeSectionSettings({ sectionSerial: 1, timerSeconds: 10 })]
      })
      const input = screen.getByDisplayValue('10')
      rapidType(input, 30)
      expect(screen.getByDisplayValue('x'.repeat(30))).toBeTruthy()
    })

    it('rapid typing in ambience URL does not crash', () => {
      renderInspectorPane({
        selection: { activeTab: 'section', sectionSerial: 1 },
        sectionSettingsIndex: [makeSectionSettings({ sectionSerial: 1, ambience: 'rain.mp3' })]
      })
      const input = screen.getByDisplayValue('rain.mp3')
      rapidType(input, 30)
      expect(screen.getByDisplayValue('x'.repeat(30))).toBeTruthy()
    })

    it('rapid typing in story ambience URL does not crash', () => {
      renderInspectorPane({
        selection: { activeTab: 'story' },
        storySettingsIndex: makeStorySettings({ storyAmbience: 'wind.mp3' })
      })
      const input = screen.getByDisplayValue('wind.mp3')
      rapidType(input, 30)
      expect(screen.getByDisplayValue('x'.repeat(30))).toBeTruthy()
    })

    it('pasting very long strings into text fields does not crash', () => {
      renderInspectorPane({
        selection: { activeTab: 'section', sectionSerial: 1 },
        sectionSettingsIndex: [makeSectionSettings({ sectionSerial: 1 })]
      })
      const inputs = document.querySelectorAll('.inspector-form input[type="text"], .inspector-form input:not([type])')
      if (inputs.length > 0) {
        const longText = 'A'.repeat(3000)
        fireEvent.change(inputs[0]!, { target: { value: longText } })
        expect((inputs[0]! as HTMLInputElement).value).toBe(longText)
      }
    })

    it('special characters in text inputs do not crash', () => {
      renderInspectorPane({
        selection: { activeTab: 'section', sectionSerial: 1 },
        sectionSettingsIndex: [makeSectionSettings({ sectionSerial: 1 })]
      })
      const inputs = document.querySelectorAll('.inspector-form input[type="text"], .inspector-form input:not([type])')
      if (inputs.length > 0) {
        const special = '<script>"alert(1)"</script>\\n\\t'
        fireEvent.change(inputs[0]!, { target: { value: special } })
        expect((inputs[0]! as HTMLInputElement).value).toBe(special)
      }
    })

    it('number fields accept non-numeric input without crash', () => {
      renderInspectorPane({
        selection: { activeTab: 'section', sectionSerial: 1 },
        sectionSettingsIndex: [makeSectionSettings({ sectionSerial: 1, timerSeconds: 10 })]
      })
      const input = screen.getByDisplayValue('10')
      fireEvent.change(input, { target: { value: 'not-a-number' } })
      expect(screen.getByDisplayValue('not-a-number')).toBeTruthy()
    })
  })

  // -- Sidebar filter inputs --

  describe('Sidebar filter inputs', () => {
    function renderSidebar() {
      return render(
        <Sidebar
          files={[makeWorkspaceFile()]}
          activeFilePath="/workspace/main.if"
          rootFile="/workspace/main.if"
          sectionIndex={[
            makeSectionIndex({ serial: 1, title: 'Alpha' }),
            makeSectionIndex({ serial: 2, title: 'Beta' }),
            makeSectionIndex({ serial: 3, title: 'Gamma' })
          ]}
          sceneIndex={[
            makeSceneIndex({ serial: 1, name: 'Scene A' }),
            makeSceneIndex({ serial: 2, name: 'Scene B' })
          ]}
          graph={makeStoryGraph()}
          onOpenFile={vi.fn()}
          onOpenSection={vi.fn()}
          onOpenScene={vi.fn()}
          onSetRootFile={vi.fn()}
        />
      )
    }

    it('rapid typing in section filter does not crash and filters correctly', () => {
      renderSidebar()
      fireEvent.click(screen.getByRole('button', { name: 'Sections' }))
      const filter = screen.getByPlaceholderText('Filter sections...')
      rapidType(filter, 20)
      // After rapid typing "xxxxxxxxxxxxxxxxxxxx", no sections should match
      expect(screen.getByText('No matching sections.')).toBeTruthy()
    })

    it('rapid typing in scene filter does not crash and filters correctly', () => {
      renderSidebar()
      fireEvent.click(screen.getByRole('button', { name: 'Scenes' }))
      const filter = screen.getByPlaceholderText('Filter scenes...')
      rapidType(filter, 20)
      expect(screen.getByText('No matching scenes.')).toBeTruthy()
    })

    it('special regex characters in filter do not crash', () => {
      renderSidebar()
      fireEvent.click(screen.getByRole('button', { name: 'Sections' }))
      const filter = screen.getByPlaceholderText('Filter sections...')
      fireEvent.change(filter, { target: { value: '[(*+?' } })
      // Should not crash, just show no results
      expect(screen.getByText('No matching sections.')).toBeTruthy()
    })

    it('clearing filter restores full list', () => {
      renderSidebar()
      fireEvent.click(screen.getByRole('button', { name: 'Sections' }))
      const filter = screen.getByPlaceholderText('Filter sections...')
      fireEvent.change(filter, { target: { value: 'zzz' } })
      expect(screen.getByText('No matching sections.')).toBeTruthy()
      fireEvent.change(filter, { target: { value: '' } })
      expect(screen.getByText('Alpha')).toBeTruthy()
      expect(screen.getByText('Beta')).toBeTruthy()
      expect(screen.getByText('Gamma')).toBeTruthy()
    })
  })

  // -- CommandPalette search --

  describe('CommandPalette search', () => {
    it('rapid typing updates filtered list without crash', () => {
      renderCommandPalette({
        items: [
          makeCommandPaletteItem({ title: 'Open File' }),
          makeCommandPaletteItem({ title: 'Save File' }),
          makeCommandPaletteItem({ title: 'Close Tab' })
        ]
      })
      const input = screen.getByPlaceholderText('Type a command')
      rapidType(input, 20)
      // Should not crash
      expect(input).toBeTruthy()
    })

    it('empty query shows all items', () => {
      renderCommandPalette({
        items: [
          makeCommandPaletteItem({ title: 'Open File' }),
          makeCommandPaletteItem({ title: 'Save File' })
        ]
      })
      expect(screen.getByText('Open File')).toBeTruthy()
      expect(screen.getByText('Save File')).toBeTruthy()
    })

    it('query that matches nothing shows empty list without crash', () => {
      renderCommandPalette({
        items: [makeCommandPaletteItem({ title: 'Open File' })]
      })
      const input = screen.getByPlaceholderText('Type a command')
      fireEvent.change(input, { target: { value: 'zzzzzz' } })
      expect(screen.queryByText('Open File')).toBeNull()
    })
  })

  // -- GraphSectionWriterPane stress --

  describe('GraphSectionWriterPane stress', () => {
    const defaultSection = makeSectionSettings({ sectionSerial: 1, sectionTitle: 'Test' })
    const defaultNode = makeAuthorGraphNode({ id: 's1', label: 'Test', sectionSerial: 1 })
    const defaultContent = makeSectionContentIndex({ sectionSerial: 1 })

    it('rapid typing in title input', () => {
      renderGraphSectionWriterPane({
        section: defaultSection,
        selectedNode: defaultNode,
        sectionContent: defaultContent
      })
      const titleInput = screen.getByLabelText('Section title')
      rapidType(titleInput, 50)
      expect((titleInput as HTMLInputElement).value).toBe('x'.repeat(50))
    })

    it('rapid typing in text block textarea', () => {
      renderGraphSectionWriterPane({
        section: defaultSection,
        selectedNode: defaultNode,
        sectionContent: defaultContent
      })
      fireEvent.click(screen.getByText('Add text'))
      const textarea = document.querySelector('textarea')!
      rapidType(textarea, 50)
      expect(textarea.value).toBe('x'.repeat(50))
    })

    it('rapid typing in choice text input', () => {
      const choice = makeChoiceIndex({ id: 'c1', textPreview: 'Go' })
      renderGraphSectionWriterPane({
        section: defaultSection,
        selectedNode: defaultNode,
        sectionContent: makeSectionContentIndex({
          sectionSerial: 1,
          blocks: [{ id: 'cb1', kind: 'choice', choiceId: 'c1' }]
        }),
        selectedChoices: [choice]
      })
      // The choice text renders as "Go" in the choice card input
      const choiceTextInputs = document.querySelectorAll('.writer-choice-card input')
      const textInput = choiceTextInputs[0]!
      expect(textInput).toBeTruthy()
      rapidType(textInput, 30)
      expect((textInput as HTMLInputElement).value).toBe('x'.repeat(30))
    })

    it('rapid typing in condition input', () => {
      renderGraphSectionWriterPane({
        section: defaultSection,
        selectedNode: defaultNode,
        sectionContent: defaultContent
      })
      fireEvent.click(screen.getByText('Add conditional'))
      const condInput = screen.getByDisplayValue('true')
      rapidType(condInput, 30)
      expect((condInput as HTMLInputElement).value).toBe('x'.repeat(30))
    })

    it('rapid typing in settings fields', () => {
      renderGraphSectionWriterPane({
        section: makeSectionSettings({ sectionSerial: 1, sectionTitle: 'Test', timerSeconds: 5 }),
        selectedNode: defaultNode,
        sectionContent: defaultContent
      })
      fireEvent.click(screen.getByText('Show'))
      const timerInput = screen.getByDisplayValue('5')
      rapidType(timerInput, 30)
      expect((timerInput as HTMLInputElement).value).toBe('x'.repeat(30))
    })

    it('adding and immediately editing blocks does not crash', () => {
      renderGraphSectionWriterPane({
        section: defaultSection,
        selectedNode: defaultNode,
        sectionContent: defaultContent
      })
      for (let i = 0; i < 5; i++) {
        fireEvent.click(screen.getByText('Add text'))
      }
      const textareas = document.querySelectorAll('textarea')
      textareas.forEach((textarea, idx) => {
        fireEvent.change(textarea, { target: { value: `Block ${idx}` } })
      })
      expect(textareas.length).toBe(5)
    })
  })

  // -- GraphPane zoom --

  describe('GraphPane zoom', () => {
    it('rapid zoom slider changes', () => {
      const n1 = makeStoryGraphNode({ id: 'n1', label: 'A' })
      renderGraphPane({ graph: makeStoryGraph({ nodes: [n1] }) })
      const slider = screen.getByRole('slider')
      for (let i = 6; i <= 18; i++) {
        fireEvent.change(slider, { target: { value: String(i / 10) } })
      }
      const svg = document.querySelector('svg.graph-canvas') as SVGElement
      expect(svg.style.transform).toContain('scale(1.8)')
    })

    it('zoom at min/max bounds', () => {
      const n1 = makeStoryGraphNode({ id: 'n1', label: 'A' })
      renderGraphPane({ graph: makeStoryGraph({ nodes: [n1] }) })
      const slider = screen.getByRole('slider')
      fireEvent.change(slider, { target: { value: '0.6' } })
      expect(document.querySelector('svg.graph-canvas')?.getAttribute('style')).toContain('scale(0.6)')
      fireEvent.change(slider, { target: { value: '1.8' } })
      expect(document.querySelector('svg.graph-canvas')?.getAttribute('style')).toContain('scale(1.8)')
    })

    it('show unreachable checkbox rapid toggle', () => {
      const n1 = makeStoryGraphNode({ id: 'n1', label: 'A', unreachable: true })
      renderGraphPane({ graph: makeStoryGraph({ nodes: [n1] }) })
      const checkbox = screen.getByRole('checkbox')
      for (let i = 0; i < 20; i++) {
        fireEvent.click(checkbox)
      }
      // After 20 toggles (even number), should be back to initial state (checked)
      expect((checkbox as HTMLInputElement).checked).toBe(true)
    })
  })
})
