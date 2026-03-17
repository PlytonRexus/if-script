import { describe, expect, it } from 'vitest'
import { buildAuthorGraph } from '../graph/buildAuthorGraph'

describe('buildAuthorGraph', () => {
  it('builds scene groups and section affordances', () => {
    const graph = buildAuthorGraph({
      graph: { deadEnds: ['section:/workspace/main.if:4:1:8:1:1'] },
      sectionIndex: [
        {
          entityId: 'section:/workspace/main.if:4:1:8:1:1',
          serial: 1,
          title: 'Prologue',
          file: '/workspace/main.if',
          line: 4,
          col: 1,
          sourceRange: { file: '/workspace/main.if', startLine: 4, startCol: 1, endLine: 8, endCol: 1 }
        },
        {
          entityId: 'section:/workspace/main.if:10:1:12:1:2',
          serial: 2,
          title: 'Hallway',
          file: '/workspace/main.if',
          line: 10,
          col: 1,
          sourceRange: { file: '/workspace/main.if', startLine: 10, startCol: 1, endLine: 12, endCol: 1 }
        }
      ],
      sceneIndex: [
        {
          entityId: 'scene:/workspace/main.if:1:1:3:1:1',
          serial: 7,
          name: 'Act One',
          first: 'Prologue',
          sections: ['Prologue', 'Hallway'],
          file: '/workspace/main.if',
          line: 1,
          col: 1,
          sourceRange: { file: '/workspace/main.if', startLine: 1, startCol: 1, endLine: 3, endCol: 1 },
          hasAmbience: true,
          sceneTransition: 'fade',
          firstResolved: true
        }
      ],
      sectionSettingsIndex: [
        {
          entityId: 'section-settings',
          sectionSerial: 1,
          sectionTitle: 'Prologue',
          file: '/workspace/main.if',
          line: 4,
          col: 1,
          sourceRange: { file: '/workspace/main.if', startLine: 4, startCol: 1, endLine: 8, endCol: 1 },
          timerSeconds: 10,
          timerTarget: 'Hallway',
          timerOutcome: null,
          ambience: '/audio/rain.mp3',
          ambienceVolume: 1,
          ambienceLoop: true,
          sfx: ['/audio/chime.mp3'],
          backdrop: '/images/bg.jpg',
          shot: 'medium',
          textPacing: 'instant'
        }
      ],
      choiceIndex: [
        {
          entityId: 'choice-1',
          id: 'choice:1:1',
          ownerSectionSerial: 1,
          ownerSectionTitle: 'Prologue',
          choiceIndex: 1,
          file: '/workspace/main.if',
          line: 5,
          col: 3,
          sourceRange: { file: '/workspace/main.if', startLine: 5, startCol: 3, endLine: 5, endCol: 20 },
          sourceMode: 'writer',
          targetType: 'section',
          target: 'Hallway',
          when: 'flag == true',
          once: false,
          disabledText: null,
          actions: [],
          choiceSfx: null,
          focusSfx: null,
          choiceStyle: 'default',
          textPreview: 'Continue'
        }
      ]
    })

    expect(graph.groups).toHaveLength(1)
    expect(graph.groups[0]?.label).toBe('Act One')
    expect(graph.groups[0]?.colorToken).toBe('graph-group-slate')

    const prologue = graph.nodes.find(node => node.sectionSerial === 1)
    expect(prologue?.hasError).toBe(true)
    expect(prologue?.affordances.hasTimer).toBe(true)
    expect(prologue?.affordances.hasBackdrop).toBe(true)
    expect(prologue?.affordances.hasConditionalChoices).toBe(true)
  })
})
