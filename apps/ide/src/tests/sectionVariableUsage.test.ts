import { describe, expect, it } from 'vitest'
import { buildSectionVariableNamesBySerial } from '../worker/variableUsage'

describe('section variable usage', () => {
  it('collects unique variable names by section serial', () => {
    const story = {
      sections: [
        {
          serial: 0,
          text: [
            {
              _class: 'Action',
              type: 'assign',
              left: { symbol: 'hp' },
              right: { symbol: 'damage' }
            },
            {
              _class: 'Choice',
              input: { symbol: 'answer' },
              variables: [{ symbol: 'clue' }, { symbol: 'hp' }],
              when: { symbol: 'gate' }
            }
          ]
        },
        {
          serial: 1,
          text: [
            {
              _class: 'Action',
              type: 'assign',
              left: { symbol: 'name' },
              right: { name: 'alias' }
            }
          ]
        }
      ]
    }

    const out = buildSectionVariableNamesBySerial(story)
    expect(out).toEqual({
      0: ['answer', 'clue', 'damage', 'gate', 'hp'],
      1: ['alias', 'name']
    })
  })

  it('returns empty map for malformed story data', () => {
    expect(buildSectionVariableNamesBySerial(null)).toEqual({})
    expect(buildSectionVariableNamesBySerial({ sections: [] })).toEqual({})
  })

  it('collects nested variables from member access, array access, and function call args', () => {
    const story = {
      sections: [
        {
          serial: 7,
          text: [
            {
              _class: 'Action',
              type: 'assign',
              left: { _class: 'Token', type: 'VARIABLE', symbol: 'score' },
              right: {
                _class: 'FunctionCall',
                name: { _class: 'Token', type: 'VARIABLE', symbol: 'boost' },
                args: [
                  {
                    _class: 'ArrayAccess',
                    array: { _class: 'Token', type: 'VARIABLE', symbol: 'values' },
                    index: { _class: 'Token', type: 'VARIABLE', symbol: 'idx' }
                  },
                  {
                    _class: 'MemberAccess',
                    object: { _class: 'Token', type: 'VARIABLE', symbol: 'player' },
                    member: 'power',
                    args: null
                  }
                ]
              }
            }
          ]
        }
      ]
    }

    expect(buildSectionVariableNamesBySerial(story)).toEqual({
      7: ['idx', 'player', 'score', 'values']
    })
  })
})
