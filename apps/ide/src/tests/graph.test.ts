import { describe, expect, it } from 'vitest'
import { buildStoryGraph } from '../graph/buildStoryGraph'

describe('buildStoryGraph', () => {
  it('marks unresolved targets and dead ends', () => {
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
              target: 'Missing',
              text: [],
              actions: []
            }
          ]
        },
        {
          serial: 2,
          settings: { title: 'Alone' },
          text: []
        }
      ],
      scenes: []
    }

    const graph = buildStoryGraph(story)
    const unresolvedNode = graph.nodes.find(node => node.nodeType === 'unresolved')
    const aloneNode = graph.nodes.find(node => node.nodeType === 'section' && node.label === 'Alone')
    const deadEnd = aloneNode ? graph.deadEnds.includes(aloneNode.id) : false

    expect(unresolvedNode).toBeTruthy()
    expect(deadEnd).toBe(true)
  })
})
