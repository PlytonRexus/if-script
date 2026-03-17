import { describe, expect, it } from 'vitest'
import { buildSectionContentIndex } from '../worker/authoringIndex'

describe('authoringIndex section content', () => {
  it('builds content blocks for text, choices, and conditionals', () => {
    const story = {
      sections: [
        {
          serial: 1,
          source: { file: '/workspace/main.if', line: 1, col: 1 },
          sourceRange: { file: '/workspace/main.if', startLine: 1, startCol: 1, endLine: 8, endCol: 1 },
          text: [
            { _class: 'Token', type: 'STRING', symbol: 'Hello there.', line: 2, col: 3 },
            {
              _class: 'Choice',
              choiceI: 1,
              source: { file: '/workspace/main.if', line: 3, col: 3 }
            },
            {
              _class: 'ConditionalBlock',
              cond: { _class: 'Action', type: 'binary', operator: '==', left: { _class: 'Token', symbol: 'flag' }, right: { _class: 'Token', symbol: true } },
              ifBlock: [{ _class: 'Token', type: 'STRING', symbol: 'Unlocked.', line: 4, col: 5 }],
              elseBlock: [{ _class: 'Token', type: 'STRING', symbol: 'Locked.', line: 6, col: 5 }]
            }
          ]
        }
      ]
    }

    const index = buildSectionContentIndex(story, '/workspace/main.if')

    expect(index).toHaveLength(1)
    expect(index[0]?.supported).toBe(true)
    expect(index[0]?.blocks[0]).toMatchObject({ kind: 'text', text: 'Hello there.' })
    expect(index[0]?.blocks[1]).toMatchObject({ kind: 'choice', choiceId: 'choice:1:1' })
    expect(index[0]?.blocks[2]).toMatchObject({ kind: 'conditional', condition: 'flag == true' })
    const conditional = index[0]?.blocks[2]
    expect(conditional && conditional.kind === 'conditional' ? conditional.thenBranch.blocks[0] : null).toMatchObject({ kind: 'text', text: 'Unlocked.' })
    expect(conditional && conditional.kind === 'conditional' ? conditional.elseBranch?.blocks[0] : null).toMatchObject({ kind: 'text', text: 'Locked.' })
  })

  it('marks unsupported nodes without crashing', () => {
    const story = {
      sections: [
        {
          serial: 2,
          source: { file: '/workspace/main.if', line: 10, col: 1 },
          text: [{ _class: 'Loop' }]
        }
      ]
    }

    const index = buildSectionContentIndex(story, '/workspace/main.if')

    expect(index[0]?.supported).toBe(false)
    expect(index[0]?.unsupportedNodeKinds).toContain('Loop')
  })
})
