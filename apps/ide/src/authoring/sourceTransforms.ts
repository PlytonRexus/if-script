import type { ChoiceIndexEntry, SceneIndexEntry, SectionSettingsIndexEntry, StorySettingsIndexEntry } from '../types/interfaces'

interface RewriteEntry {
  keyword: string
  lines: string[]
}

function quoteIfNeeded(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return '""'
  if (typeof value === 'number') return String(value)
  const trimmed = value.trim()
  if (/^-?\d+(\.\d+)?$/.test(trimmed)) return trimmed
  return `"${trimmed.replace(/"/g, '\\"')}"`
}

function splitLines(content: string): string[] {
  return content.replace(/\r\n/g, '\n').split('\n')
}

function joinLines(lines: string[]): string {
  return `${lines.join('\n').replace(/\s+$/, '')}\n`
}

function isPropertyLine(line: string): boolean {
  return /^\s*@[A-Za-z_][\w]*/.test(line)
}

function lineKeyword(line: string): string | null {
  const match = line.match(/^\s*(@[A-Za-z_][\w]*)/)
  return match?.[1] ?? null
}

function detectIndent(lines: string[], start: number, end: number, fallback = '  '): string {
  for (let i = start; i < end; i += 1) {
    const currentLine = lines[i]
    if (!currentLine || !isPropertyLine(currentLine)) continue
    const match = currentLine.match(/^(\s*)@/)
    if (match?.[1] !== undefined) return match[1]
  }
  return fallback
}

function findHeaderInsertion(body: string[]): number {
  let idx = 0
  while (idx < body.length && (body[idx]?.trim() ?? '') === '') idx += 1
  return idx
}

function rewriteBlockProperties(lines: string[], start: number, end: number, entries: RewriteEntry[], defaultIndent = '  '): void {
  const body = lines.slice(start + 1, end)
  const indent = detectIndent(lines, start + 1, end, defaultIndent)
  const keys = new Set(entries.map(entry => entry.keyword))
  const filtered = body.filter(line => {
    const key = lineKeyword(line)
    return !key || !keys.has(key)
  })

  const insertion = findHeaderInsertion(filtered)
  const nextPropertyLines: string[] = []
  entries.forEach(entry => {
    entry.lines.forEach(line => nextPropertyLines.push(`${indent}${line}`))
  })

  const merged = [
    ...filtered.slice(0, insertion),
    ...nextPropertyLines,
    ...filtered.slice(insertion)
  ]

  lines.splice(start + 1, end - start - 1, ...merged)
}

function findSimpleBlock(lines: string[], startLine: number, startPattern: RegExp, endPattern: RegExp): { start: number, end: number } | null {
  const anchor = Math.max(0, Math.min(lines.length - 1, startLine - 1))
  let start = -1
  for (let i = anchor; i >= 0; i -= 1) {
    const line = lines[i]
    if (line && startPattern.test(line)) {
      start = i
      break
    }
  }
  if (start === -1) {
    for (let i = 0; i < lines.length; i += 1) {
      const line = lines[i]
      if (line && startPattern.test(line)) {
        start = i
        break
      }
    }
  }
  if (start === -1) return null

  let end = -1
  for (let i = start + 1; i < lines.length; i += 1) {
    const line = lines[i]
    if (line && endPattern.test(line)) {
      end = i
      break
    }
  }
  if (end === -1) return null
  return { start, end }
}

function ensureSettingsBlock(lines: string[]): { start: number, end: number } {
  const existing = findSimpleBlock(lines, 1, /^\s*settings__\s*$/i, /^\s*__settings\s*$/i)
  if (existing) return existing
  const lastLine = lines.length > 0 ? lines[lines.length - 1] : ''
  const pad = typeof lastLine === 'string' && lastLine.trim() !== '' ? ['', ''] : ['']
  const start = lines.length + pad.length
  lines.push(...pad, 'settings__', '__settings')
  return { start, end: start + 1 }
}

function stringValue(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed === '' ? null : trimmed
}

function numberValue(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value)
    if (Number.isFinite(parsed)) return parsed
  }
  return null
}

function booleanValue(value: unknown, fallback: boolean): boolean {
  if (typeof value === 'boolean') return value
  if (typeof value === 'string') return value.trim().toLowerCase() === 'true'
  return fallback
}

function timerLine(keyword: string, seconds: number | null, target: string | number | null): string[] {
  if (seconds == null || seconds <= 0 || target === null || target === undefined || String(target).trim() === '') return []
  return [`${keyword} ${seconds} ${quoteIfNeeded(target)}`]
}

function findSceneBlock(lines: string[], scene: SceneIndexEntry): { start: number, end: number } | null {
  return findSimpleBlock(lines, scene.line, /^\s*scene__\s*$/i, /^\s*__scene\s*$/i)
}

function findSectionBlock(lines: string[], section: SectionSettingsIndexEntry): { start: number, end: number } | null {
  const sectionLine = Math.max(1, section.line)
  const writer = findSimpleBlock(lines, sectionLine, /^\s*section\s+["'][^"']+["']\s*$/i, /^\s*end\s*$/i)
  if (writer && writer.start <= sectionLine - 1 && writer.end >= sectionLine - 1) return writer
  return findSimpleBlock(lines, sectionLine, /^\s*section__\s*$/i, /^\s*__section\s*$/i)
}

function findChoiceBlock(lines: string[], choice: ChoiceIndexEntry): { start: number, end: number } | null {
  if (choice.sourceMode === 'writer') return null
  return findSimpleBlock(lines, choice.line, /^\s*choice__\s*$/i, /^\s*__choice\s*$/i)
}

export function applyStoryInspectorPatch(content: string, input: {
  settings: StorySettingsIndexEntry
  fullTimerSeconds: number | null
  fullTimerTarget: string | number | null
  fullTimerOutcome: string | null
  storyAmbience: string | null
  storyAmbienceVolume: number | null
  storyAmbienceLoop: boolean
  presentationMode: 'literary' | 'cinematic'
}): { content: string, syntaxPreview: string } {
  const lines = splitLines(content)
  const block = ensureSettingsBlock(lines)
  const entries: RewriteEntry[] = []
  entries.push({ keyword: '@fullTimer', lines: timerLine('@fullTimer', input.fullTimerSeconds, input.fullTimerTarget) })
  entries.push({ keyword: '@fullTimerOutcome', lines: input.fullTimerOutcome ? [`@fullTimerOutcome ${quoteIfNeeded(input.fullTimerOutcome)}`] : [] })
  entries.push({ keyword: '@storyAmbience', lines: input.storyAmbience ? [`@storyAmbience ${quoteIfNeeded(input.storyAmbience)}`] : [] })
  entries.push({
    keyword: '@storyAmbienceVolume',
    lines: numberValue(input.storyAmbienceVolume) != null ? [`@storyAmbienceVolume ${numberValue(input.storyAmbienceVolume)}`] : []
  })
  entries.push({ keyword: '@storyAmbienceLoop', lines: [`@storyAmbienceLoop ${booleanValue(input.storyAmbienceLoop, true)}`] })
  entries.push({ keyword: '@presentationMode', lines: [`@presentationMode ${quoteIfNeeded(input.presentationMode)}`] })

  rewriteBlockProperties(lines, block.start, block.end, entries, '  ')
  const syntaxPreview = [
    ...timerLine('@fullTimer', input.fullTimerSeconds, input.fullTimerTarget),
    ...(input.fullTimerOutcome ? [`@fullTimerOutcome ${quoteIfNeeded(input.fullTimerOutcome)}`] : []),
    ...(input.storyAmbience ? [`@storyAmbience ${quoteIfNeeded(input.storyAmbience)}`] : []),
    ...(numberValue(input.storyAmbienceVolume) != null ? [`@storyAmbienceVolume ${numberValue(input.storyAmbienceVolume)}`] : []),
    `@storyAmbienceLoop ${booleanValue(input.storyAmbienceLoop, true)}`,
    `@presentationMode ${quoteIfNeeded(input.presentationMode)}`
  ].join('\n')
  return { content: joinLines(lines), syntaxPreview }
}

export function applySceneInspectorPatch(content: string, scene: SceneIndexEntry, input: {
  name: string
  first: string | number | null
  sections: Array<string | number>
  ambience: string | null
  ambienceVolume: number | null
  ambienceLoop: boolean
  transition: string
}): { content: string, syntaxPreview: string } {
  const lines = splitLines(content)
  const block = findSceneBlock(lines, scene)
  if (!block) return { content, syntaxPreview: '' }

  const sectionTokens = input.sections
    .map(value => String(value).trim())
    .filter(Boolean)
    .map(value => quoteIfNeeded(value))
  const entries: RewriteEntry[] = [
    { keyword: '@name', lines: input.name.trim() ? [`@name ${quoteIfNeeded(input.name.trim())}`] : [] },
    { keyword: '@first', lines: input.first === null || input.first === undefined || String(input.first).trim() === '' ? [] : [`@first ${quoteIfNeeded(input.first)}`] },
    { keyword: '@sections', lines: sectionTokens.length > 0 ? [`@sections ${sectionTokens.join(' ')}`] : [] },
    { keyword: '@sceneAmbience', lines: input.ambience ? [`@sceneAmbience ${quoteIfNeeded(input.ambience)}`] : [] },
    { keyword: '@sceneAmbienceVolume', lines: numberValue(input.ambienceVolume) != null ? [`@sceneAmbienceVolume ${numberValue(input.ambienceVolume)}`] : [] },
    { keyword: '@sceneAmbienceLoop', lines: [`@sceneAmbienceLoop ${booleanValue(input.ambienceLoop, true)}`] },
    { keyword: '@sceneTransition', lines: input.transition ? [`@sceneTransition ${quoteIfNeeded(input.transition)}`] : [] }
  ]
  rewriteBlockProperties(lines, block.start, block.end, entries, '  ')

  const syntaxPreview = entries.flatMap(entry => entry.lines).join('\n')
  return { content: joinLines(lines), syntaxPreview }
}

export function applySectionInspectorPatch(content: string, section: SectionSettingsIndexEntry, input: {
  timerSeconds: number | null
  timerTarget: string | number | null
  timerOutcome: string | null
  ambience: string | null
  ambienceVolume: number | null
  ambienceLoop: boolean
  sfx: string[]
  backdrop: string | null
  shot: string
  textPacing: string
}): { content: string, syntaxPreview: string } {
  const lines = splitLines(content)
  const block = findSectionBlock(lines, section)
  if (!block) return { content, syntaxPreview: '' }

  const sfxLines = input.sfx.map(value => value.trim()).filter(Boolean).map(value => `@sfx ${quoteIfNeeded(value)}`)
  const entries: RewriteEntry[] = [
    { keyword: '@timer', lines: timerLine('@timer', input.timerSeconds, input.timerTarget) },
    { keyword: '@timerOutcome', lines: input.timerOutcome ? [`@timerOutcome ${quoteIfNeeded(input.timerOutcome)}`] : [] },
    { keyword: '@ambience', lines: input.ambience ? [`@ambience ${quoteIfNeeded(input.ambience)}`] : [] },
    { keyword: '@ambienceVolume', lines: numberValue(input.ambienceVolume) != null ? [`@ambienceVolume ${numberValue(input.ambienceVolume)}`] : [] },
    { keyword: '@ambienceLoop', lines: [`@ambienceLoop ${booleanValue(input.ambienceLoop, true)}`] },
    { keyword: '@sfx', lines: sfxLines },
    { keyword: '@backdrop', lines: input.backdrop ? [`@backdrop ${quoteIfNeeded(input.backdrop)}`] : [] },
    { keyword: '@shot', lines: input.shot ? [`@shot ${quoteIfNeeded(input.shot)}`] : [] },
    { keyword: '@textPacing', lines: input.textPacing ? [`@textPacing ${quoteIfNeeded(input.textPacing)}`] : [] }
  ]
  rewriteBlockProperties(lines, block.start, block.end, entries, '  ')

  const syntaxPreview = entries.flatMap(entry => entry.lines).join('\n')
  return { content: joinLines(lines), syntaxPreview }
}

export function applyChoiceInspectorPatch(content: string, choice: ChoiceIndexEntry, input: {
  targetType: 'section' | 'scene'
  target: string | number | null
  choiceSfx: string | null
  focusSfx: string | null
}): { content: string, syntaxPreview: string, unsupportedWriterChoice: boolean } {
  if (choice.sourceMode === 'writer') {
    return {
      content,
      syntaxPreview: 'Writer-arrow choices currently support target edits in source code only.',
      unsupportedWriterChoice: true
    }
  }

  const lines = splitLines(content)
  const block = findChoiceBlock(lines, choice)
  if (!block) return { content, syntaxPreview: '', unsupportedWriterChoice: false }

  const entries: RewriteEntry[] = [
    { keyword: '@targetType', lines: [`@targetType ${quoteIfNeeded(input.targetType)}`] },
    {
      keyword: '@target',
      lines: input.target === null || input.target === undefined || String(input.target).trim() === ''
        ? []
        : [`@target ${quoteIfNeeded(input.target)}`]
    },
    { keyword: '@choiceSfx', lines: input.choiceSfx ? [`@choiceSfx ${quoteIfNeeded(input.choiceSfx)}`] : [] },
    { keyword: '@focusSfx', lines: input.focusSfx ? [`@focusSfx ${quoteIfNeeded(input.focusSfx)}`] : [] }
  ]

  rewriteBlockProperties(lines, block.start, block.end, entries, '    ')
  return {
    content: joinLines(lines),
    syntaxPreview: entries.flatMap(entry => entry.lines).join('\n'),
    unsupportedWriterChoice: false
  }
}
