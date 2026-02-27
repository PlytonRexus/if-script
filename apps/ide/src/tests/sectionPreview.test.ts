import { describe, expect, it } from 'vitest'
import {
  buildSectionPreviewStartOptions,
  buildVariableOverridesTemplate,
  parseVariableOverridesJson,
  resolveSectionAtCursor
} from '../preview/sectionPreview'

describe('section preview utilities', () => {
  it('resolves focused section from cursor line in active file', () => {
    const sectionIndex = [
      { serial: 0, title: 'Intro', file: '/workspace/main.if', line: 3, col: 1 },
      { serial: 1, title: 'Hallway', file: '/workspace/main.if', line: 12, col: 1 },
      { serial: 2, title: 'Elsewhere', file: '/workspace/other.if', line: 2, col: 1 }
    ]

    expect(resolveSectionAtCursor(sectionIndex, '/workspace/main.if', 12)?.title).toBe('Hallway')
    expect(resolveSectionAtCursor(sectionIndex, '/workspace/main.if', 8)?.title).toBe('Intro')
    expect(resolveSectionAtCursor(sectionIndex, '/workspace/main.if', 1)).toBeNull()
    expect(resolveSectionAtCursor(sectionIndex, '/workspace/missing.if', 10)).toBeNull()
  })

  it('normalizes windows file separators for section matching', () => {
    const sectionIndex = [
      { serial: 0, title: 'Intro', file: '/workspace/main.if', line: 2, col: 1 }
    ]
    expect(resolveSectionAtCursor(sectionIndex, '\\workspace\\main.if', 4)?.title).toBe('Intro')
  })

  it('parses JSON overrides and rejects non-object payloads', () => {
    const parsed = parseVariableOverridesJson('{"gold": 10, "name": "Mina"}')
    expect(parsed.error).toBeNull()
    expect(parsed.value).toEqual({ gold: 10, name: 'Mina' })

    const bad = parseVariableOverridesJson('["nope"]')
    expect(bad.error).toContain('JSON object')
    expect(bad.value).toBeNull()
  })

  it('builds section preview start options with serial and initial variables', () => {
    const section = { serial: 8, title: 'Dock', file: '/workspace/main.if', line: 42, col: 1 }
    const options = buildSectionPreviewStartOptions(section, { clue: true, reporter: 'Ana' })
    expect(options).toEqual({
      startAt: 8,
      resume: false,
      resumePrompt: false,
      theme: 'literary-default',
      initialVariables: { clue: true, reporter: 'Ana' }
    })
  })

  it('builds variable template with inferred fallbacks', () => {
    const template = buildVariableOverridesTemplate([
      { name: 'hp', inferredType: 'number' },
      { name: 'name', inferredType: 'string' },
      { name: 'flags', inferredType: 'array' },
      { name: 'profile', inferredType: 'object' },
      { name: 'known', inferredType: 'boolean', defaultValue: true }
    ])
    expect(template).toEqual({
      hp: 0,
      name: '',
      flags: [],
      profile: {},
      known: true
    })
  })
})
