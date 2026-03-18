import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { InspectorPane } from '../components/InspectorPane'

describe('InspectorPane', () => {
  afterEach(() => cleanup())

  it('updates section form fields without reading a released synthetic event', () => {
    render(
      <InspectorPane
        snapshot={{ '/workspace/main.if': 'section "Intro"\nend\n' }}
        selection={{ activeTab: 'section', sceneSerial: null, sectionSerial: 1, choiceId: null }}
        storySettingsIndex={null}
        sceneIndex={[]}
        sectionSettingsIndex={[
          {
            sectionSerial: 1,
            sectionTitle: 'Intro',
            file: '/workspace/main.if',
            line: 1,
            col: 1,
            timerSeconds: 10,
            timerTarget: 'next',
            timerOutcome: 'timeout',
            ambience: null,
            ambienceVolume: 1,
            ambienceLoop: true,
            sfx: [],
            backdrop: null,
            shot: 'medium',
            textPacing: 'instant'
          }
        ]}
        choiceIndex={[]}
        authoringSchema={null}
        onSelectionChange={vi.fn()}
        onWriteFile={vi.fn()}
      />
    )

    const timerSecondsInput = screen.getByDisplayValue('10')
    fireEvent.change(timerSecondsInput, { target: { value: '42' } })

    expect(screen.getByDisplayValue('42')).toBeTruthy()
  })
})
