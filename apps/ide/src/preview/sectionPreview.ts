import type { SectionIndexEntry, VariableCatalogEntry } from '../types/interfaces'

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

function defaultValueForType(inferredType: VariableCatalogEntry['inferredType']): unknown {
  if (inferredType === 'number') return 0
  if (inferredType === 'string') return ''
  if (inferredType === 'boolean') return false
  if (inferredType === 'array') return []
  if (inferredType === 'object') return {}
  return null
}

export function buildVariableOverridesTemplate(variableCatalog: VariableCatalogEntry[]): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  variableCatalog.forEach(variable => {
    out[variable.name] = variable.defaultValue !== undefined
      ? variable.defaultValue
      : defaultValueForType(variable.inferredType)
  })
  return out
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
