import type { SectionIndexEntry, VariableCatalogEntry, VariablePreset } from '../types/interfaces'

function normalizePath(path: string): string {
  return path.replace(/\\/g, '/')
}

export function buildSectionPreviewKey(section: SectionIndexEntry): string {
  return `${normalizePath(section.file)}:${section.line}:${section.serial}`
}

export function resolveSectionAtCursor(
  sectionIndex: SectionIndexEntry[],
  activeFilePath: string | null,
  cursorLine: number | null
): SectionIndexEntry | null {
  if (!activeFilePath || typeof cursorLine !== 'number' || cursorLine < 1) return null
  const normalizedPath = normalizePath(activeFilePath)
  const entries = sectionIndex
    .filter(entry => normalizePath(entry.file) === normalizedPath)
    .sort((a, b) => {
      if (a.line !== b.line) return a.line - b.line
      if (a.col !== b.col) return a.col - b.col
      return a.serial - b.serial
    })

  if (entries.length === 0) return null

  let current: SectionIndexEntry | null = null
  entries.forEach(entry => {
    if (entry.line <= cursorLine) current = entry
  })
  return current
}

export function parseVariableOverridesJson(rawText: string): { value: Record<string, unknown> | null, error: string | null } {
  const source = rawText.trim() === '' ? '{}' : rawText
  try {
    const parsed = JSON.parse(source)
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return { value: null, error: 'Overrides must be a JSON object (for example: {"gold": 10}).' }
    }
    return { value: parsed as Record<string, unknown>, error: null }
  } catch (err) {
    return { value: null, error: String((err as Error).message ?? err) }
  }
}

export function serializeVariableOverridesJson(value: Record<string, unknown>): string {
  return JSON.stringify(value, null, 2)
}

function cloneJsonValue<T>(value: T): T {
  if (typeof structuredClone === 'function') return structuredClone(value)
  return JSON.parse(JSON.stringify(value)) as T
}

export function defaultValueForType(inferredType: VariableCatalogEntry['inferredType']): unknown {
  if (inferredType === 'number') return 0
  if (inferredType === 'string') return ''
  if (inferredType === 'boolean') return false
  if (inferredType === 'array') return []
  if (inferredType === 'object') return {}
  return null
}

function hasOwnValue(input: Record<string, unknown>, name: string): boolean {
  return Object.prototype.hasOwnProperty.call(input, name)
}

function buildVariableDefault(variable: VariableCatalogEntry): unknown {
  if (variable.defaultValue !== undefined) return cloneJsonValue(variable.defaultValue)
  return defaultValueForType(variable.inferredType)
}

export function buildVariableOverridesTemplate(variableCatalog: VariableCatalogEntry[]): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  variableCatalog.forEach(variable => {
    out[variable.name] = buildVariableDefault(variable)
  })
  return out
}

export function buildPreviewInitialVariables(
  variableCatalog: VariableCatalogEntry[],
  overrides: Record<string, unknown>
): Record<string, unknown> {
  return {
    ...buildVariableOverridesTemplate(variableCatalog),
    ...overrides
  }
}

function buildSectionRelevantVariableNames(
  variableCatalog: VariableCatalogEntry[],
  sectionVariableNames: string[]
): Set<string> {
  const out = new Set(sectionVariableNames)
  variableCatalog.forEach(variable => {
    if (variable.defaultValue !== undefined) out.add(variable.name)
  })
  return out
}

export function buildVisibleVariableCatalog(
  variableCatalog: VariableCatalogEntry[],
  sectionVariableNames: string[],
  showAllVariables: boolean
): VariableCatalogEntry[] {
  if (showAllVariables) return variableCatalog
  const names = buildSectionRelevantVariableNames(variableCatalog, sectionVariableNames)
  return variableCatalog.filter(variable => names.has(variable.name))
}

export function replaceOverrideValue(
  base: Record<string, unknown>,
  variableName: string,
  value: unknown
): Record<string, unknown> {
  return {
    ...base,
    [variableName]: value
  }
}

export function removeOverrideVariables(
  base: Record<string, unknown>,
  variableNames: string[]
): Record<string, unknown> {
  const toRemove = new Set(variableNames)
  const out: Record<string, unknown> = {}
  Object.entries(base).forEach(([key, value]) => {
    if (!toRemove.has(key)) out[key] = value
  })
  return out
}

export function applyDefaultsToVariables(
  base: Record<string, unknown>,
  variables: VariableCatalogEntry[]
): Record<string, unknown> {
  const out = { ...base }
  variables.forEach(variable => {
    out[variable.name] = buildVariableDefault(variable)
  })
  return out
}

function randomInt(max: number): number {
  return Math.floor(Math.random() * (max + 1))
}

function randomToken(): string {
  const left = ['amber', 'autumn', 'brisk', 'cinder', 'lumen', 'oak', 'rain', 'river', 'silver', 'starlit']
  const right = ['bridge', 'crow', 'door', 'echo', 'garden', 'harbor', 'lantern', 'paper', 'trail', 'whisper']
  return `${left[randomInt(left.length - 1)]}-${right[randomInt(right.length - 1)]}-${randomInt(99)}`
}

export function randomValueForVariable(variable: VariableCatalogEntry): unknown {
  if (variable.inferredType === 'number') return randomInt(100)
  if (variable.inferredType === 'string') return randomToken()
  if (variable.inferredType === 'boolean') return Math.random() >= 0.5
  if (variable.inferredType === 'array') {
    return variable.defaultValue !== undefined ? cloneJsonValue(variable.defaultValue) : []
  }
  if (variable.inferredType === 'object') {
    return variable.defaultValue !== undefined ? cloneJsonValue(variable.defaultValue) : {}
  }
  return variable.defaultValue !== undefined ? cloneJsonValue(variable.defaultValue) : null
}

export function randomizeVariables(
  base: Record<string, unknown>,
  variables: VariableCatalogEntry[]
): Record<string, unknown> {
  const out = { ...base }
  variables.forEach(variable => {
    out[variable.name] = randomValueForVariable(variable)
  })
  return out
}

export function resolveVariableValue(
  overrides: Record<string, unknown>,
  variable: VariableCatalogEntry
): unknown {
  if (hasOwnValue(overrides, variable.name)) return overrides[variable.name]
  return buildVariableDefault(variable)
}

export function buildVariablePreset(name: string, values: Record<string, unknown>): VariablePreset {
  return {
    id: `preset-${Math.random().toString(36).slice(2, 10)}`,
    name,
    values: cloneJsonValue(values),
    updatedAt: new Date().toISOString()
  }
}

export function upsertVariablePreset(presets: VariablePreset[], preset: VariablePreset): VariablePreset[] {
  const next = presets.filter(entry => entry.id !== preset.id)
  next.unshift(preset)
  return next
}

export function removeVariablePreset(presets: VariablePreset[], presetId: string): VariablePreset[] {
  return presets.filter(preset => preset.id !== presetId)
}

export function buildSectionPreviewStartOptions(
  focusedSection: SectionIndexEntry | null,
  initialVariables: Record<string, unknown>
): Record<string, unknown> | null {
  if (!focusedSection) return null
  return {
    startAt: focusedSection.serial,
    resume: false,
    resumePrompt: false,
    theme: 'literary-default',
    initialVariables
  }
}
