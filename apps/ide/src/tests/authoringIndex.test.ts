import { describe, expect, it } from 'vitest'
import { buildChoiceIndex, buildSceneIndex, buildSectionSettingsIndex, buildStorySettingsIndex } from '../worker/authoringIndex'

describe('authoringIndex builders', () => {
  const story = {
    settings: {
      name: 'Test Story',
      fullTimer: { timer: 45, target: 'Timeout' },
      storyAmbience: '/assets/audio/story.mp3',
      storyAmbienceVolume: 0.3,
      storyAmbienceLoop: true,
      presentationMode: 'cinematic'
    },
    scenes: [
      {
        serial: 1,
        name: 'Opening',
        first: 'Prologue',
        sections: ['Prologue'],
        music: '/assets/audio/opening.mp3',
        sceneTransition: 'fade',
        source: { file: '/workspace/main.if', line: 2, col: 1 }
      }
    ],
    sections: [
      {
        serial: 1,
        source: { file: '/workspace/main.if', line: 8, col: 1 },
        settings: {
          title: 'Prologue',
          timer: { timer: 20, target: 'Timeout' },
          timerOutcome: 'Too late.',
          ambience: '/assets/audio/rain.mp3',
          ambienceVolume: 0.5,
          ambienceLoop: true,
          sfx: ['/assets/audio/chime.mp3'],
          backdrop: '/assets/img/bg.jpg',
          shot: 'wide',
          textPacing: 'cinematic'
        },
        choices: [
          {
            choiceI: 1,
            targetType: 'scene',
            target: 'Opening',
            choiceSfx: '/assets/audio/click.mp3',
            focusSfx: '/assets/audio/focus.mp3',
            choiceStyle: 'primary',
            text: [{ symbol: 'Continue' }],
            source: { file: '/workspace/main.if', line: 13, col: 3, mode: 'legacy' }
          }
        ]
      }
    ]
  }

  it('builds scene index with resolution flags', () => {
    const sceneIndex = buildSceneIndex(story, '/workspace/main.if')
    expect(sceneIndex).toHaveLength(1)
    const first = sceneIndex[0]
    expect(first).toBeDefined()
    if (!first) return
    expect(first.name).toBe('Opening')
    expect(first.firstResolved).toBe(true)
    expect(first.hasAmbience).toBe(true)
  })

  it('builds story/section settings indices', () => {
    const storySettings = buildStorySettingsIndex(story, '/workspace/main.if')
    expect(storySettings?.fullTimerSeconds).toBe(45)
    expect(storySettings?.presentationMode).toBe('cinematic')

    const sections = buildSectionSettingsIndex(story, '/workspace/main.if')
    expect(sections).toHaveLength(1)
    const firstSection = sections[0]
    expect(firstSection).toBeDefined()
    if (!firstSection) return
    expect(firstSection.sectionTitle).toBe('Prologue')
    expect(firstSection.shot).toBe('wide')
  })

  it('builds choice index with source metadata', () => {
    const choices = buildChoiceIndex(story, '/workspace/main.if')
    expect(choices).toHaveLength(1)
    const firstChoice = choices[0]
    expect(firstChoice).toBeDefined()
    if (!firstChoice) return
    expect(firstChoice.targetType).toBe('scene')
    expect(firstChoice.choiceSfx).toContain('click')
    expect(firstChoice.file).toBe('/workspace/main.if')
  })
})
