import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { InspectorPane } from '../components/InspectorPane'
import { makeChoiceIndex, makeSceneIndex, makeSectionSettings, makeStorySettings } from './helpers/factories'
import type { AdvancedInspectorSelection } from '../types/interfaces'

function renderInspector(overrides: {
  selection?: Partial<AdvancedInspectorSelection>
  storySettingsIndex?: ReturnType<typeof makeStorySettings> | null
  sceneIndex?: ReturnType<typeof makeSceneIndex>[]
  sectionSettingsIndex?: ReturnType<typeof makeSectionSettings>[]
  choiceIndex?: ReturnType<typeof makeChoiceIndex>[]
  onSelectionChange?: ReturnType<typeof vi.fn>
  onWriteFile?: ReturnType<typeof vi.fn>
  snapshot?: Record<string, string>
} = {}) {
  const selection: AdvancedInspectorSelection = {
    activeTab: 'section',
    sceneSerial: null,
    sectionSerial: 1,
    choiceId: null,
    ...overrides.selection
  }
  return render(
    <InspectorPane
      snapshot={overrides.snapshot ?? { '/workspace/main.if': 'section "Intro"\nend\n' }}
      selection={selection}
      storySettingsIndex={overrides.storySettingsIndex ?? null}
      sceneIndex={overrides.sceneIndex ?? []}
      sectionSettingsIndex={overrides.sectionSettingsIndex ?? [makeSectionSettings()]}
      choiceIndex={overrides.choiceIndex ?? []}
      authoringSchema={null}
      onSelectionChange={overrides.onSelectionChange ?? vi.fn()}
      onWriteFile={overrides.onWriteFile ?? vi.fn()}
    />
  )
}

describe('InspectorPane', () => {
  afterEach(() => cleanup())

  it('updates section form fields without reading a released synthetic event', () => {
    renderInspector({
      sectionSettingsIndex: [makeSectionSettings({
        sectionSerial: 1,
        timerSeconds: 10,
        timerTarget: 'next',
        timerOutcome: 'timeout'
      })]
    })

    const timerSecondsInput = screen.getByDisplayValue('10')
    fireEvent.change(timerSecondsInput, { target: { value: '42' } })

    expect(screen.getByDisplayValue('42')).toBeTruthy()
  })

  it('renders story tab with story settings fields', () => {
    renderInspector({
      selection: { activeTab: 'story' },
      storySettingsIndex: makeStorySettings({
        fullTimerSeconds: 120,
        presentationMode: 'cinematic'
      })
    })

    expect(screen.getByDisplayValue('120')).toBeTruthy()
    expect(screen.getByText('Apply Story Settings')).toBeTruthy()
  })

  it('renders scene tab with scene settings fields', () => {
    renderInspector({
      selection: { activeTab: 'scene', sceneSerial: 1 },
      sceneIndex: [makeSceneIndex({
        serial: 1,
        name: 'Act One',
        first: 'Opening',
        sections: ['Opening', 'Hallway'],
        sceneTransition: 'fade'
      })]
    })

    const nameInputs = screen.getAllByDisplayValue('Act One')
    expect(nameInputs.length).toBeGreaterThanOrEqual(1)
    expect(screen.getByDisplayValue('Opening')).toBeTruthy()
    expect(screen.getByText('Apply Scene Settings')).toBeTruthy()
  })

  it('renders section tab with all section fields', () => {
    renderInspector({
      selection: { activeTab: 'section', sectionSerial: 1 },
      sectionSettingsIndex: [makeSectionSettings({
        sectionSerial: 1,
        timerSeconds: 30,
        timerTarget: 'Timeout',
        backdrop: 'castle.jpg',
        shot: 'close',
        textPacing: 'typed'
      })]
    })

    expect(screen.getByDisplayValue('30')).toBeTruthy()
    expect(screen.getByDisplayValue('Timeout')).toBeTruthy()
    expect(screen.getByDisplayValue('castle.jpg')).toBeTruthy()
  })

  it('renders choice tab with choice settings fields', () => {
    renderInspector({
      selection: { activeTab: 'choice', choiceId: 'c1' },
      choiceIndex: [makeChoiceIndex({
        id: 'c1',
        targetType: 'section',
        target: 'Hallway',
        choiceSfx: 'click.mp3',
        textPreview: 'Go to hallway'
      })]
    })

    expect(screen.getByDisplayValue('Hallway')).toBeTruthy()
    expect(screen.getByDisplayValue('click.mp3')).toBeTruthy()
  })

  it('tab switching calls onSelectionChange', () => {
    const onSelectionChange = vi.fn()
    renderInspector({
      selection: { activeTab: 'section' },
      onSelectionChange
    })

    fireEvent.click(screen.getByText('Story'))
    expect(onSelectionChange).toHaveBeenCalledWith(expect.objectContaining({ activeTab: 'story' }))
  })

  it('all four tab buttons are present', () => {
    renderInspector()
    const tablist = screen.getByRole('tablist', { name: 'Inspector tabs' })
    expect(tablist.querySelector('button:nth-child(1)')?.textContent).toBe('Story')
    expect(tablist.querySelector('button:nth-child(2)')?.textContent).toBe('Scene')
    expect(tablist.querySelector('button:nth-child(3)')?.textContent).toBe('Section')
    expect(tablist.querySelector('button:nth-child(4)')?.textContent).toBe('Choice')
  })

  it('active tab has active class', () => {
    renderInspector({ selection: { activeTab: 'section' } })
    const tablist = screen.getByRole('tablist', { name: 'Inspector tabs' })
    const sectionBtn = tablist.querySelector('button:nth-child(3)')!
    expect(sectionBtn.className).toContain('active')
    const storyBtn = tablist.querySelector('button:nth-child(1)')!
    expect(storyBtn.className).not.toContain('active')
  })

  it('presentation mode select has literary and cinematic options', () => {
    renderInspector({
      selection: { activeTab: 'story' },
      storySettingsIndex: makeStorySettings()
    })
    const select = screen.getByDisplayValue('literary')
    expect(select).toBeTruthy()
    fireEvent.change(select, { target: { value: 'cinematic' } })
    expect(screen.getByDisplayValue('cinematic')).toBeTruthy()
  })

  it('shot select has all options', () => {
    renderInspector({
      selection: { activeTab: 'section', sectionSerial: 1 },
      sectionSettingsIndex: [makeSectionSettings({ sectionSerial: 1 })]
    })
    const shotSelect = screen.getByDisplayValue('medium')
    fireEvent.change(shotSelect, { target: { value: 'close' } })
    expect(screen.getByDisplayValue('close')).toBeTruthy()
  })

  it('text pacing select has all options', () => {
    renderInspector({
      selection: { activeTab: 'section', sectionSerial: 1 },
      sectionSettingsIndex: [makeSectionSettings({ sectionSerial: 1 })]
    })
    const pacingSelect = screen.getByDisplayValue('instant')
    fireEvent.change(pacingSelect, { target: { value: 'typed' } })
    expect(screen.getByDisplayValue('typed')).toBeTruthy()
  })

  it('scene transition select has all options', () => {
    renderInspector({
      selection: { activeTab: 'scene', sceneSerial: 1 },
      sceneIndex: [makeSceneIndex({ serial: 1 })]
    })
    const transitionSelect = screen.getByDisplayValue('cut')
    fireEvent.change(transitionSelect, { target: { value: 'fade' } })
    expect(screen.getByDisplayValue('fade')).toBeTruthy()
  })

  it('choice target type select has section and scene options', () => {
    renderInspector({
      selection: { activeTab: 'choice', choiceId: 'c1' },
      choiceIndex: [makeChoiceIndex({ id: 'c1' })]
    })
    const select = screen.getByDisplayValue('section')
    fireEvent.change(select, { target: { value: 'scene' } })
    expect(screen.getByDisplayValue('scene')).toBeTruthy()
  })

  it('section selector dropdown lists all sections', () => {
    renderInspector({
      selection: { activeTab: 'section', sectionSerial: 1 },
      sectionSettingsIndex: [
        makeSectionSettings({ sectionSerial: 1, sectionTitle: 'Alpha' }),
        makeSectionSettings({ sectionSerial: 2, sectionTitle: 'Beta' })
      ]
    })
    expect(screen.getByText('Alpha')).toBeTruthy()
    expect(screen.getByText('Beta')).toBeTruthy()
  })

  it('scene selector dropdown lists all scenes', () => {
    renderInspector({
      selection: { activeTab: 'scene', sceneSerial: 1 },
      sceneIndex: [
        makeSceneIndex({ serial: 1, name: 'Scene A' }),
        makeSceneIndex({ serial: 2, name: 'Scene B' })
      ]
    })
    expect(screen.getByText('Scene A')).toBeTruthy()
    expect(screen.getByText('Scene B')).toBeTruthy()
  })

  it('choice selector dropdown lists all choices', () => {
    renderInspector({
      selection: { activeTab: 'choice', choiceId: 'c1' },
      choiceIndex: [
        makeChoiceIndex({ id: 'c1', ownerSectionTitle: 'Intro', choiceIndex: 0, textPreview: 'Go left' }),
        makeChoiceIndex({ id: 'c2', ownerSectionTitle: 'Intro', choiceIndex: 1, textPreview: 'Go right' })
      ]
    })
    expect(screen.getByText('Intro #0 - Go left')).toBeTruthy()
    expect(screen.getByText('Intro #1 - Go right')).toBeTruthy()
  })

  it('shows empty message when no syntax preview', () => {
    renderInspector()
    expect(screen.getByText('Apply changes to preview generated syntax.')).toBeTruthy()
  })

  it('section selector change calls onSelectionChange with new serial', () => {
    const onSelectionChange = vi.fn()
    renderInspector({
      selection: { activeTab: 'section', sectionSerial: 1 },
      sectionSettingsIndex: [
        makeSectionSettings({ sectionSerial: 1, sectionTitle: 'Alpha' }),
        makeSectionSettings({ sectionSerial: 2, sectionTitle: 'Beta' })
      ],
      onSelectionChange
    })
    const select = screen.getByDisplayValue('Alpha')
    fireEvent.change(select, { target: { value: '2' } })
    expect(onSelectionChange).toHaveBeenCalledWith(expect.objectContaining({ sectionSerial: 2 }))
  })
})
