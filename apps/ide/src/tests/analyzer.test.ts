import { describe, expect, it } from 'vitest'
import { analyzeStory } from '../analyzer/check'

describe('analyzeStory', () => {
  it('reports unresolved startAt and duplicate titles', () => {
    const story = {
      settings: { startAt: 'Missing' },
      sections: [
        { serial: 1, settings: { title: 'Intro' }, text: [] },
        { serial: 2, settings: { title: 'Intro' }, text: [] }
      ],
      scenes: [],
      functions: []
    }

    const diagnostics = analyzeStory(story, '/workspace/main.if')
    const codes = diagnostics.map(item => item.code)
    const startAt = diagnostics.find(item => item.code === 'START_AT_UNRESOLVED')

    expect(codes).toContain('START_AT_UNRESOLVED')
    expect(codes).toContain('DUPLICATE_SECTION_TITLE')
    expect(startAt?.data).toEqual({
      kind: 'start_at_unresolved',
      target: 'Missing'
    })
  })

  it('adds quick-fix metadata for unresolved section choice targets', () => {
    const story = {
      settings: { startAt: 'Intro' },
      sections: [
        {
          serial: 1,
          settings: { title: 'Intro' },
          text: [
            {
              _class: 'Choice',
              targetType: 'section',
              target: 'MissingSection',
              text: [],
              actions: []
            }
          ]
        }
      ],
      scenes: [],
      functions: []
    }

    const diagnostics = analyzeStory(story, '/workspace/main.if')
    const unresolved = diagnostics.find(item => item.code === 'CHOICE_TARGET_UNRESOLVED')

    expect(unresolved?.data).toEqual({
      kind: 'missing_section_target',
      target: 'MissingSection',
      sourceSectionSerial: 1
    })
  })

  it('adds quick-fix metadata for unresolved scene first target', () => {
    const story = {
      settings: { startAt: 'Intro' },
      sections: [
        {
          serial: 1,
          settings: { title: 'Intro' },
          text: []
        }
      ],
      scenes: [
        {
          serial: 7,
          name: 'Act I',
          first: 'MissingSection'
        }
      ],
      functions: []
    }

    const diagnostics = analyzeStory(story, '/workspace/main.if')
    const unresolved = diagnostics.find(item => item.code === 'SCENE_FIRST_UNRESOLVED')

    expect(unresolved?.data).toEqual({
      kind: 'scene_first_unresolved',
      target: 'MissingSection',
      sourceSceneSerial: 7
    })
  })
})
