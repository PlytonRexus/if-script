import { describe, expect, it } from 'vitest'
import { buildVariableCatalogAndWarnings } from '../worker/variableInference'

function tokenVariable(symbol: string): any {
  return { _class: 'Token', type: 'VARIABLE', symbol }
}

function tokenNumber(symbol: number): any {
  return { _class: 'Token', type: 'NUMBER', symbol }
}

function tokenString(symbol: string): any {
  return { _class: 'Token', type: 'STRING', symbol }
}

function tokenBoolean(symbol: boolean): any {
  return { _class: 'Token', type: 'BOOLEAN', symbol }
}

function assign(name: string, right: any): any {
  return {
    _class: 'Action',
    type: 'assign',
    operator: '=',
    left: tokenVariable(name),
    right
  }
}

function binary(operator: string, left: any, right: any): any {
  return {
    _class: 'Action',
    type: 'binary',
    operator,
    left,
    right
  }
}

function call(name: string, args: any[]): any {
  return {
    _class: 'FunctionCall',
    name: tokenVariable(name),
    args
  }
}

describe('variable inference', () => {
  it('infers expression, member/array access, builtins, and mixed warnings', () => {
    const story = {
      persistent: {
        hp: 2,
        turn: 1,
        functions: {}
      },
      stats: {
        reputation: { showInStatusBar: true }
      },
      sections: [
        {
          serial: 0,
          text: [
            assign('hp', binary('+', tokenVariable('hp'), tokenNumber(1))),
            assign('hp', tokenString('high')),
            assign('name', call('upper', [tokenString('mina')])),
            assign('ready', binary('>', tokenVariable('hp'), tokenNumber(0))),
            assign('items', {
              _class: 'ArrayLiteral',
              elements: [tokenNumber(7), tokenString('badge')]
            }),
            {
              _class: 'MemberAccess',
              object: tokenVariable('items'),
              member: 'push',
              args: [tokenBoolean(true)]
            },
            assign('first', {
              _class: 'ArrayAccess',
              array: tokenVariable('items'),
              index: tokenNumber(0)
            }),
            {
              _class: 'Choice',
              input: tokenVariable('alias'),
              variables: [tokenVariable('nickname')],
              when: null,
              text: [],
              actions: []
            }
          ]
        }
      ],
      functions: []
    }

    const result = buildVariableCatalogAndWarnings(story)
    const byName = new Map(result.variableCatalog.map(entry => [entry.name, entry]))

    expect(byName.has('turn')).toBeFalsy()
    expect(byName.has('functions')).toBeFalsy()
    expect(byName.get('name')?.inferredTypes).toEqual(['string'])
    expect(byName.get('ready')?.inferredTypes).toEqual(['boolean'])
    expect(byName.get('items')?.inferredTypes).toEqual(['array'])
    expect(byName.get('alias')?.inferredTypes).toEqual(['string'])
    expect(byName.get('nickname')?.inferredTypes).toEqual(['string'])
    expect(byName.get('reputation')?.inferredType).toBe('unknown')

    expect(byName.get('hp')?.inferredType).toBe('number')
    expect(byName.get('hp')?.inferredTypes).toEqual(['number', 'string'])
    expect(byName.get('first')?.inferredTypes).toEqual(['number', 'string', 'boolean'])

    expect(result.warnings).toEqual([
      { name: 'first', inferredTypes: ['number', 'string', 'boolean'] },
      { name: 'hp', inferredTypes: ['number', 'string'] }
    ])
  })

  it('propagates user function parameter/return types', () => {
    const addOneFunction = {
      _class: 'FunctionDef',
      name: 'addOne',
      params: ['x'],
      body: [
        {
          _class: 'Action',
          type: 'return',
          operator: null,
          left: binary('+', tokenVariable('x'), tokenNumber(1)),
          right: null
        }
      ]
    }

    const story = {
      persistent: {
        functions: {
          addOne: addOneFunction
        }
      },
      stats: {},
      sections: [
        {
          serial: 0,
          text: [
            assign('seed', tokenNumber(2)),
            assign('score', call('addOne', [tokenVariable('seed')])),
            assign('seed', tokenString('two')),
            assign('score', call('addOne', [tokenVariable('seed')]))
          ]
        }
      ],
      functions: [addOneFunction]
    }

    const result = buildVariableCatalogAndWarnings(story)
    const score = result.variableCatalog.find(entry => entry.name === 'score')
    const seed = result.variableCatalog.find(entry => entry.name === 'seed')

    expect(seed?.inferredTypes).toEqual(['number', 'string'])
    expect(score?.inferredTypes?.slice().sort()).toEqual(['number', 'string'])
    expect(result.warnings.find(entry => entry.name === 'score')).toBeTruthy()
  })
})
