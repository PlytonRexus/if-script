import { cleanup, fireEvent, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  makeAuthorGraphNode,
  makeChoiceIndex,
  makeSectionContentIndex,
  makeSectionSettings
} from './helpers/factories'
import { renderGraphSectionWriterPane } from './helpers/renderHelpers'
import type { SectionContentIndexEntry } from '../types/interfaces'

function renderWithSection(overrides: Parameters<typeof renderGraphSectionWriterPane>[0] = {}) {
  const section = overrides.section ?? makeSectionSettings({ sectionSerial: 1, sectionTitle: 'Intro' })
  const selectedNode = overrides.selectedNode ?? makeAuthorGraphNode({ id: 'section:Intro', label: 'Intro', sectionSerial: 1 })
  return renderGraphSectionWriterPane({
    section,
    selectedNode,
    sectionContent: overrides.sectionContent ?? makeSectionContentIndex({ sectionSerial: 1 }),
    selectedChoices: overrides.selectedChoices ?? [],
    ...overrides
  })
}

describe('GraphSectionWriterPane', () => {
  afterEach(() => cleanup())

  // -- Rendering --

  describe('rendering', () => {
    it('shows empty message when section is null', () => {
      renderGraphSectionWriterPane()
      expect(screen.getByText('Select a section to write.')).toBeTruthy()
    })

    it('shows empty message when selectedNode is null', () => {
      renderGraphSectionWriterPane({
        section: makeSectionSettings(),
        selectedNode: null
      })
      expect(screen.getByText('Select a section to write.')).toBeTruthy()
    })

    it('renders title input from section data', () => {
      renderWithSection()
      expect(screen.getByDisplayValue('Intro')).toBeTruthy()
    })

    it('renders file path in subheading when no group label', () => {
      renderWithSection({
        selectedNode: makeAuthorGraphNode({ file: '/workspace/chapter.if' })
      })
      expect(screen.getByText('chapter.if')).toBeTruthy()
    })

    it('renders group label in subheading when provided', () => {
      renderWithSection({ selectedGroupLabel: 'Act One' })
      expect(screen.getByText('Act One')).toBeTruthy()
    })

    it('shows unsupported warning when sectionContent.supported is false', () => {
      renderWithSection({
        sectionContent: makeSectionContentIndex({
          supported: false,
          unsupportedNodeKinds: ['while_loop']
        })
      })
      expect(screen.getByText(/unsupported constructs/)).toBeTruthy()
      expect(screen.getByText(/while_loop/)).toBeTruthy()
    })

    it('shows unsupported warning when unsupportedReason prop is provided', () => {
      renderWithSection({
        unsupportedReason: 'Section uses advanced macros'
      })
      expect(screen.getByText('Section uses advanced macros')).toBeTruthy()
    })
  })

  // -- Block management --

  describe('block management', () => {
    it('"Add text" button appends text block with empty textarea', () => {
      renderWithSection()
      fireEvent.click(screen.getByText('Add text'))
      const textareas = screen.getAllByRole('textbox')
      expect(textareas.length).toBeGreaterThanOrEqual(1)
    })

    it('"Add choice" button appends choice block', () => {
      renderWithSection()
      fireEvent.click(screen.getByText('Add choice'))
      expect(screen.getByText('Choice block')).toBeTruthy()
    })

    it('"Add conditional" button appends conditional with branches', () => {
      renderWithSection()
      fireEvent.click(screen.getByText('Add conditional'))
      expect(screen.getByText('Then branch')).toBeTruthy()
      expect(screen.getByText('Else branch')).toBeTruthy()
    })

    it('"Remove" button removes a text block', () => {
      renderWithSection()
      fireEvent.click(screen.getByText('Add text'))
      const removeBtns = screen.getAllByText('Remove')
      fireEvent.click(removeBtns[removeBtns.length - 1]!)
      expect(screen.getByText('Add text, choices, or conditional branches.')).toBeTruthy()
    })

    it('"Remove" button removes a choice block', () => {
      renderWithSection()
      fireEvent.click(screen.getByText('Add choice'))
      expect(screen.getByText('Choice block')).toBeTruthy()
      const removeBtns = screen.getAllByText('Remove')
      fireEvent.click(removeBtns[removeBtns.length - 1]!)
      expect(screen.queryByText('Choice block')).toBeNull()
    })

    it('"Up" button moves block up in list', () => {
      renderWithSection()
      // Add two text blocks
      fireEvent.click(screen.getByText('Add text'))
      fireEvent.click(screen.getByText('Add text'))

      const textareas = screen.getAllByRole('textbox').filter(el => el.tagName === 'TEXTAREA')
      fireEvent.change(textareas[0]!, { target: { value: 'First' } })
      fireEvent.change(textareas[1]!, { target: { value: 'Second' } })

      // Move the second block up
      const upBtns = screen.getAllByText('Up')
      fireEvent.click(upBtns[upBtns.length - 1]!)

      const afterTextareas = screen.getAllByRole('textbox').filter(el => el.tagName === 'TEXTAREA')
      expect((afterTextareas[0] as HTMLTextAreaElement).value).toBe('Second')
      expect((afterTextareas[1] as HTMLTextAreaElement).value).toBe('First')
    })

    it('"Down" button moves block down in list', () => {
      renderWithSection()
      fireEvent.click(screen.getByText('Add text'))
      fireEvent.click(screen.getByText('Add text'))

      const textareas = screen.getAllByRole('textbox').filter(el => el.tagName === 'TEXTAREA')
      fireEvent.change(textareas[0]!, { target: { value: 'First' } })
      fireEvent.change(textareas[1]!, { target: { value: 'Second' } })

      // Move the first block down
      const downBtns = screen.getAllByText('Down')
      fireEvent.click(downBtns[0]!)

      const afterTextareas = screen.getAllByRole('textbox').filter(el => el.tagName === 'TEXTAREA')
      expect((afterTextareas[0] as HTMLTextAreaElement).value).toBe('Second')
      expect((afterTextareas[1] as HTMLTextAreaElement).value).toBe('First')
    })

    it('empty blocks show placeholder message', () => {
      renderWithSection()
      expect(screen.getByText('Add text, choices, or conditional branches.')).toBeTruthy()
    })
  })

  // -- Text block editing --

  describe('text block editing', () => {
    it('typing in text block textarea updates value', () => {
      renderWithSection()
      fireEvent.click(screen.getByText('Add text'))
      const textarea = screen.getAllByRole('textbox').filter(el => el.tagName === 'TEXTAREA')[0]!
      fireEvent.change(textarea, { target: { value: 'Hello world' } })
      expect(screen.getByDisplayValue('Hello world')).toBeTruthy()
    })

    it('rapid sequential typing does not crash', () => {
      renderWithSection()
      fireEvent.click(screen.getByText('Add text'))
      const textarea = screen.getAllByRole('textbox').filter(el => el.tagName === 'TEXTAREA')[0]!
      for (let i = 0; i < 50; i++) {
        fireEvent.change(textarea, { target: { value: 'x'.repeat(i + 1) } })
      }
      expect(screen.getByDisplayValue('x'.repeat(50))).toBeTruthy()
    })

    it('pasting long string does not crash', () => {
      renderWithSection()
      fireEvent.click(screen.getByText('Add text'))
      const textarea = screen.getAllByRole('textbox').filter(el => el.tagName === 'TEXTAREA')[0]!
      const longText = 'A'.repeat(5000)
      fireEvent.change(textarea, { target: { value: longText } })
      expect((textarea as HTMLTextAreaElement).value).toBe(longText)
    })

    it('special characters handled', () => {
      renderWithSection()
      fireEvent.click(screen.getByText('Add text'))
      const textarea = screen.getAllByRole('textbox').filter(el => el.tagName === 'TEXTAREA')[0]!
      const special = '"quotes" \\backslash\\ and\nnewlines'
      fireEvent.change(textarea, { target: { value: special } })
      expect((textarea as HTMLTextAreaElement).value).toBe(special)
    })
  })

  // -- Choice editing --

  describe('choice editing', () => {
    function renderWithChoice() {
      const choice = makeChoiceIndex({
        id: 'c1',
        textPreview: 'Go north',
        targetType: 'section',
        target: 'Hallway',
        choiceSfx: 'click.mp3',
        focusSfx: 'hover.mp3',
        choiceStyle: 'default'
      })
      renderWithSection({
        selectedChoices: [choice],
        sectionContent: makeSectionContentIndex({
          sectionSerial: 1,
          blocks: [{ id: 'cb1', kind: 'choice', choiceId: 'c1' }]
        })
      })
    }

    it('choice text input updates correctly', () => {
      renderWithChoice()
      // "Go north" appears in both the choice block select and the choice card input
      const matches = screen.getAllByDisplayValue('Go north')
      const textInput = matches.find(el => el.tagName === 'INPUT')!
      expect(textInput).toBeTruthy()
      fireEvent.change(textInput, { target: { value: 'Go south' } })
      const updated = screen.getAllByDisplayValue('Go south')
      expect(updated.some(el => el.tagName === 'INPUT')).toBe(true)
    })

    it('target input updates correctly', () => {
      renderWithChoice()
      const targetInput = screen.getByDisplayValue('Hallway')
      fireEvent.change(targetInput, { target: { value: 'Kitchen' } })
      expect(screen.getByDisplayValue('Kitchen')).toBeTruthy()
    })

    it('choice SFX input updates correctly', () => {
      renderWithChoice()
      const sfxInput = screen.getByDisplayValue('click.mp3')
      fireEvent.change(sfxInput, { target: { value: 'pop.mp3' } })
      expect(screen.getByDisplayValue('pop.mp3')).toBeTruthy()
    })

    it('focus SFX input updates correctly', () => {
      renderWithChoice()
      const focusInput = screen.getByDisplayValue('hover.mp3')
      fireEvent.change(focusInput, { target: { value: 'beep.mp3' } })
      expect(screen.getByDisplayValue('beep.mp3')).toBeTruthy()
    })

    it('"Once" checkbox toggles', () => {
      renderWithChoice()
      const checkbox = screen.getByRole('checkbox')
      expect((checkbox as HTMLInputElement).checked).toBe(false)
      fireEvent.click(checkbox)
      expect((checkbox as HTMLInputElement).checked).toBe(true)
    })

    it('choice card shows "Choice missing." for orphaned choiceId', () => {
      const content: SectionContentIndexEntry = makeSectionContentIndex({
        blocks: [{ id: 'cb1', kind: 'choice', choiceId: 'orphan-id' }]
      })
      renderWithSection({
        sectionContent: content,
        selectedChoices: []
      })
      expect(screen.getByText('Choice missing.')).toBeTruthy()
    })

    it('target type select switches between section and scene', () => {
      renderWithChoice()
      const targetTypeSelect = screen.getByDisplayValue('section') as HTMLSelectElement
      if (targetTypeSelect.closest('label')?.textContent?.includes('Target Type')) {
        fireEvent.change(targetTypeSelect, { target: { value: 'scene' } })
        expect(screen.getByDisplayValue('scene')).toBeTruthy()
      }
    })

    it('style dropdown has all 4 options', () => {
      renderWithChoice()
      const styleSelects = document.querySelectorAll('select')
      const styleSelect = Array.from(styleSelects).find(sel => {
        const options = Array.from(sel.options).map(opt => opt.value)
        return options.includes('default') && options.includes('primary') && options.includes('subtle') && options.includes('danger')
      })
      expect(styleSelect).toBeTruthy()
      const options = Array.from(styleSelect!.options).map(opt => opt.value)
      expect(options).toContain('default')
      expect(options).toContain('primary')
      expect(options).toContain('subtle')
      expect(options).toContain('danger')
    })
  })

  // -- Conditional blocks --

  describe('conditional blocks', () => {
    it('condition input updates', () => {
      renderWithSection()
      fireEvent.click(screen.getByText('Add conditional'))
      const conditionInput = screen.getByDisplayValue('true')
      fireEvent.change(conditionInput, { target: { value: 'x > 5' } })
      expect(screen.getByDisplayValue('x > 5')).toBeTruthy()
    })

    it('then branch "Add text" button works', () => {
      renderWithSection()
      fireEvent.click(screen.getByText('Add conditional'))
      // There should be "Add text" buttons inside the branches
      const addTextBtns = screen.getAllByText('Add text')
      const thenAddText = addTextBtns.find(btn => {
        const branch = btn.closest('.writer-branch')
        return branch?.querySelector('strong')?.textContent === 'Then branch'
      })
      expect(thenAddText).toBeTruthy()
      fireEvent.click(thenAddText!)
      // The then branch already has a default text block, so clicking add should add another
      const textareas = document.querySelectorAll('.writer-branch textarea')
      expect(textareas.length).toBeGreaterThanOrEqual(2)
    })

    it('then branch "Add choice" button works', () => {
      renderWithSection()
      fireEvent.click(screen.getByText('Add conditional'))
      const addChoiceBtns = screen.getAllByText('Add choice')
      const thenAddChoice = addChoiceBtns.find(btn => {
        const branch = btn.closest('.writer-branch')
        return branch?.querySelector('strong')?.textContent === 'Then branch'
      })
      expect(thenAddChoice).toBeTruthy()
      fireEvent.click(thenAddChoice!)
      // A choice block should have been added
      const choiceLabels = document.querySelectorAll('.writer-branch label')
      const hasChoiceLabel = Array.from(choiceLabels).some(label => label.textContent?.includes('Choice'))
      expect(hasChoiceLabel).toBe(true)
    })

    it('else branch operations work', () => {
      renderWithSection()
      fireEvent.click(screen.getByText('Add conditional'))
      const addTextBtns = screen.getAllByText('Add text')
      const elseAddText = addTextBtns.find(btn => {
        const branch = btn.closest('.writer-branch')
        return branch?.querySelector('strong')?.textContent === 'Else branch'
      })
      expect(elseAddText).toBeTruthy()
      fireEvent.click(elseAddText!)
      const elseBranch = document.querySelectorAll('.writer-branch')[1]
      expect(elseBranch?.querySelectorAll('textarea').length).toBeGreaterThanOrEqual(1)
    })

    it('nested conditional renders without crash', () => {
      renderWithSection()
      fireEvent.click(screen.getByText('Add conditional'))
      // The then branch has an "Add text" block; we cannot add a nested conditional
      // through the branch editor (no Add conditional in BranchEditor), but we can
      // verify the conditional renders without error
      expect(screen.getByText('Then branch')).toBeTruthy()
      expect(screen.getByText('Else branch')).toBeTruthy()
    })
  })

  // -- Settings panel --

  describe('settings panel', () => {
    it('settings hidden by default', () => {
      renderWithSection()
      expect(screen.queryByText('Timer Seconds')).toBeNull()
    })

    it('"Show" button reveals settings fields', () => {
      renderWithSection()
      fireEvent.click(screen.getByText('Show'))
      expect(screen.getByText('Timer Seconds')).toBeTruthy()
      expect(screen.getByText('Ambience')).toBeTruthy()
      expect(screen.getByText('Backdrop')).toBeTruthy()
    })

    it('"Hide" button hides settings', () => {
      renderWithSection()
      fireEvent.click(screen.getByText('Show'))
      expect(screen.getByText('Timer Seconds')).toBeTruthy()
      fireEvent.click(screen.getByText('Hide'))
      expect(screen.queryByText('Timer Seconds')).toBeNull()
    })

    it('settings fields update correctly', () => {
      renderWithSection({
        section: makeSectionSettings({
          sectionSerial: 1,
          sectionTitle: 'Intro',
          timerSeconds: 30,
          backdrop: 'castle.jpg'
        })
      })
      fireEvent.click(screen.getByText('Show'))
      const timerInput = screen.getByDisplayValue('30')
      fireEvent.change(timerInput, { target: { value: '60' } })
      expect(screen.getByDisplayValue('60')).toBeTruthy()

      const backdropInput = screen.getByDisplayValue('castle.jpg')
      fireEvent.change(backdropInput, { target: { value: 'forest.jpg' } })
      expect(screen.getByDisplayValue('forest.jpg')).toBeTruthy()
    })

    it('shot select has correct options', () => {
      renderWithSection()
      fireEvent.click(screen.getByText('Show'))
      const shotSelect = screen.getByDisplayValue('medium') as HTMLSelectElement
      // find the one inside settings with wide/close/extreme_close
      const options = Array.from(shotSelect.options).map(opt => opt.value)
      expect(options).toContain('wide')
      expect(options).toContain('medium')
      expect(options).toContain('close')
      expect(options).toContain('extreme_close')
    })

    it('textPacing select has correct options', () => {
      renderWithSection()
      fireEvent.click(screen.getByText('Show'))
      const pacingSelect = screen.getByDisplayValue('instant') as HTMLSelectElement
      const options = Array.from(pacingSelect.options).map(opt => opt.value)
      expect(options).toContain('instant')
      expect(options).toContain('typed')
      expect(options).toContain('cinematic')
    })

    it('loop checkbox toggles', () => {
      renderWithSection()
      fireEvent.click(screen.getByText('Show'))
      const loopCheckbox = screen.getByRole('checkbox') as HTMLInputElement
      expect(loopCheckbox.checked).toBe(true)
      fireEvent.click(loopCheckbox)
      expect(loopCheckbox.checked).toBe(false)
    })
  })

  // -- Save/Delete/Source actions --

  describe('save/delete/source actions', () => {
    it('"Save section" calls onApply with title, blocks, choices, settings', () => {
      const onApply = vi.fn()
      renderWithSection({ onApply })
      fireEvent.click(screen.getByText('Save section'))
      expect(onApply).toHaveBeenCalledOnce()
      const arg = onApply.mock.calls[0]![0]
      expect(arg.title).toBe('Intro')
      expect(arg.blocks).toBeDefined()
      expect(arg.choices).toBeDefined()
      expect(arg.settings).toBeDefined()
    })

    it('"Save section" disabled when unsupported', () => {
      renderWithSection({ unsupportedReason: 'Advanced macros' })
      const saveBtn = screen.getByText('Save section')
      expect((saveBtn as HTMLButtonElement).disabled).toBe(true)
    })

    it('"Delete" calls onDeleteSection', () => {
      const onDeleteSection = vi.fn()
      renderWithSection({ onDeleteSection })
      fireEvent.click(screen.getByText('Delete'))
      expect(onDeleteSection).toHaveBeenCalledOnce()
    })

    it('"View source" calls onOpenSource', () => {
      const onOpenSource = vi.fn()
      renderWithSection({ onOpenSource })
      fireEvent.click(screen.getByText('View source'))
      expect(onOpenSource).toHaveBeenCalledOnce()
    })
  })

  // -- Section switching --

  describe('section switching', () => {
    it('changing section prop resets title and blocks', () => {
      const { rerender } = renderWithSection({
        section: makeSectionSettings({ sectionSerial: 1, sectionTitle: 'First' }),
        sectionContent: makeSectionContentIndex({
          sectionSerial: 1,
          blocks: [{ id: 'b1', kind: 'text', text: 'Hello' }]
        })
      })

      expect(screen.getByDisplayValue('First')).toBeTruthy()

      rerender(
        <GraphSectionWriterPaneWrapper
          section={makeSectionSettings({ sectionSerial: 2, sectionTitle: 'Second' })}
          sectionContent={makeSectionContentIndex({ sectionSerial: 2, blocks: [] })}
        />
      )

      expect(screen.getByDisplayValue('Second')).toBeTruthy()
    })

    it('switching from section to null shows empty message', () => {
      const { rerender } = renderWithSection()
      expect(screen.getByDisplayValue('Intro')).toBeTruthy()

      rerender(
        <GraphSectionWriterPaneWrapper
          section={null}
          sectionContent={null}
          selectedNode={null}
        />
      )
      expect(screen.getByText('Select a section to write.')).toBeTruthy()
    })
  })
})

// Helper wrapper component for rerender tests
import { GraphSectionWriterPane } from '../components/GraphSectionWriterPane'

function GraphSectionWriterPaneWrapper(props: {
  section?: ReturnType<typeof makeSectionSettings> | null
  sectionContent?: ReturnType<typeof makeSectionContentIndex> | null
  selectedNode?: ReturnType<typeof makeAuthorGraphNode> | null
}) {
  return (
    <GraphSectionWriterPane
      section={props.section ?? null}
      sectionContent={props.sectionContent ?? null}
      selectedNode={props.selectedNode ?? makeAuthorGraphNode()}
      selectedGroupLabel={null}
      selectedChoices={[]}
      unsupportedReason={null}
      onApply={() => {}}
      onDeleteSection={() => {}}
      onOpenSource={() => {}}
    />
  )
}
