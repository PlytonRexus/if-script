import { describe, expect, it } from 'vitest'
import {
  applyDefaultsToVariables,
  buildSectionPreviewStartOptions,
  buildVariableOverridesTemplate,
  buildVisibleVariableCatalog,
  buildVariablePreset,
  parseVariableOverridesJson,
  randomizeVariables,
  removeOverrideVariables,
  removeVariablePreset,
  replaceOverrideValue,
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
      { name: 'hp', inferredType: 'number', inferredTypes: ['number'] },
      { name: 'name', inferredType: 'string', inferredTypes: ['string'] },
      { name: 'flags', inferredType: 'array', inferredTypes: ['array'] },
      { name: 'profile', inferredType: 'object', inferredTypes: ['object'] },
      { name: 'known', inferredType: 'boolean', inferredTypes: ['boolean'], defaultValue: true }
    ])
    expect(template).toEqual({
      hp: 0,
      name: '',
      flags: [],
      profile: {},
      known: true
    })
  })

  it('filters visible catalog to section-relevant names + defaults', () => {
    const visible = buildVisibleVariableCatalog([
      { name: 'hp', inferredType: 'number', inferredTypes: ['number'] },
      { name: 'name', inferredType: 'string', inferredTypes: ['string'] },
      { name: 'gold', inferredType: 'number', inferredTypes: ['number'], defaultValue: 5 }
    ], ['hp'], false)

    expect(visible.map(entry => entry.name)).toEqual(['hp', 'gold'])
  })

  it('updates visible variable values through helper operations', () => {
    const base = { hp: 3, name: 'Mina', hidden: true }
    const replaced = replaceOverrideValue(base, 'hp', 10)
    expect(replaced).toEqual({ hp: 10, name: 'Mina', hidden: true })

    const reset = applyDefaultsToVariables(replaced, [
      { name: 'hp', inferredType: 'number', inferredTypes: ['number'] },
      { name: 'name', inferredType: 'string', inferredTypes: ['string'], defaultValue: 'Default' }
    ])
    expect(reset).toEqual({ hp: 0, name: 'Default', hidden: true })

    const cleared = removeOverrideVariables(reset, ['hp', 'name'])
    expect(cleared).toEqual({ hidden: true })
  })

  it('randomizes visible variables while preserving unaffected keys', () => {
    const result = randomizeVariables({ fixed: 'x' }, [
      { name: 'hp', inferredType: 'number', inferredTypes: ['number'] },
      { name: 'name', inferredType: 'string', inferredTypes: ['string'] },
      { name: 'known', inferredType: 'boolean', inferredTypes: ['boolean'] },
      { name: 'flags', inferredType: 'array', inferredTypes: ['array'] },
      { name: 'profile', inferredType: 'object', inferredTypes: ['object'] }
    ])

    expect(result.fixed).toBe('x')
    expect(typeof result.hp).toBe('number')
    expect(typeof result.name).toBe('string')
    expect(typeof result.known).toBe('boolean')
    expect(Array.isArray(result.flags)).toBeTruthy()
    expect(result.profile).toEqual({})
  })

  it('builds and removes named presets', () => {
    const preset = buildVariablePreset('Combat', { hp: 10 })
    expect(preset.name).toBe('Combat')
    expect(preset.values).toEqual({ hp: 10 })

    const removed = removeVariablePreset([preset], preset.id)
    expect(removed).toEqual([])
  })
})
