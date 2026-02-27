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

    expect(codes).toContain('START_AT_UNRESOLVED')
    expect(codes).toContain('DUPLICATE_SECTION_TITLE')
  })
})
