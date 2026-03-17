import type { ChoiceIndexEntry, SceneIndexEntry, SectionIndexEntry, SectionSettingsIndexEntry, SourceRange, StorySettingsIndexEntry } from '../types/interfaces'

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

function writerArrowIndent(line: string): string {
  const match = line.match(/^(\s*)->/)
  return match?.[1] ?? ''
}

function parseWriterArrowChoiceLine(line: string): { text: string | null, targetType: 'section' | 'scene', target: string | number | null } {
  const match = line.match(/^\s*->\s*(["'])(.*?)\1\s*=>\s*(scene\s+)?(.+?)\s*$/i)
  if (!match) return { text: null, targetType: 'section', target: null }
  const targetRaw = (match[4] ?? '').trim()
  let target: string | number | null = null
  if (/^-?\d+$/.test(targetRaw)) target = Number(targetRaw)
  else {
    const q = targetRaw.match(/^(["'])(.*?)\1$/)
    target = q ? (q[2] ?? '') : targetRaw
  }
  return {
    text: match[2] ?? null,
    targetType: match[3] ? 'scene' : 'section',
    target
  }
}

export function applyStoryInspectorPatch(content: string, input: {
  settings: StorySettingsIndexEntry
  storyTitle?: string | null
  startAt?: string | number | null
  referrable?: boolean
  fullTimerSeconds: number | null
  fullTimerTarget: string | number | null
  fullTimerOutcome: string | null
  storyAmbience: string | null
  storyAmbienceVolume: number | null
  storyAmbienceLoop: boolean
  storyAmbienceFadeInMs?: number | null
  storyAmbienceFadeOutMs?: number | null
  presentationMode: 'literary' | 'cinematic'
  maxIterations?: number | null
  maxCallDepth?: number | null
  theme?: string | null
  allowUndo?: boolean
  showTurn?: boolean
  animations?: boolean
  autoSave?: boolean
}): { content: string, syntaxPreview: string } {
  const lines = splitLines(content)
  const block = ensureSettingsBlock(lines)
  const entries: RewriteEntry[] = []
  entries.push({ keyword: '@storyTitle', lines: input.storyTitle ? [`@storyTitle ${quoteIfNeeded(input.storyTitle)}`] : [] })
  entries.push({
    keyword: '@startAt',
    lines: input.startAt === null || input.startAt === undefined || String(input.startAt).trim() === ''
      ? []
      : [`@startAt ${quoteIfNeeded(input.startAt)}`]
  })
  entries.push({
    keyword: '@referrable',
    lines: input.referrable === undefined ? [] : [`@referrable ${booleanValue(input.referrable, false)}`]
  })
  entries.push({ keyword: '@fullTimer', lines: timerLine('@fullTimer', input.fullTimerSeconds, input.fullTimerTarget) })
  entries.push({ keyword: '@fullTimerOutcome', lines: input.fullTimerOutcome ? [`@fullTimerOutcome ${quoteIfNeeded(input.fullTimerOutcome)}`] : [] })
  entries.push({ keyword: '@storyAmbience', lines: input.storyAmbience ? [`@storyAmbience ${quoteIfNeeded(input.storyAmbience)}`] : [] })
  entries.push({
    keyword: '@storyAmbienceVolume',
    lines: numberValue(input.storyAmbienceVolume) != null ? [`@storyAmbienceVolume ${numberValue(input.storyAmbienceVolume)}`] : []
  })
  entries.push({ keyword: '@storyAmbienceLoop', lines: [`@storyAmbienceLoop ${booleanValue(input.storyAmbienceLoop, true)}`] })
  entries.push({
    keyword: '@storyAmbienceFadeInMs',
    lines: numberValue(input.storyAmbienceFadeInMs) != null ? [`@storyAmbienceFadeInMs ${numberValue(input.storyAmbienceFadeInMs)}`] : []
  })
  entries.push({
    keyword: '@storyAmbienceFadeOutMs',
    lines: numberValue(input.storyAmbienceFadeOutMs) != null ? [`@storyAmbienceFadeOutMs ${numberValue(input.storyAmbienceFadeOutMs)}`] : []
  })
  entries.push({ keyword: '@presentationMode', lines: [`@presentationMode ${quoteIfNeeded(input.presentationMode)}`] })
  entries.push({
    keyword: '@maxIterations',
    lines: numberValue(input.maxIterations) != null ? [`@maxIterations ${numberValue(input.maxIterations)}`] : []
  })
  entries.push({
    keyword: '@maxCallDepth',
    lines: numberValue(input.maxCallDepth) != null ? [`@maxCallDepth ${numberValue(input.maxCallDepth)}`] : []
  })
  entries.push({ keyword: '@theme', lines: input.theme ? [`@theme ${quoteIfNeeded(input.theme)}`] : [] })
  entries.push({ keyword: '@allowUndo', lines: input.allowUndo === undefined ? [] : [`@allowUndo ${booleanValue(input.allowUndo, true)}`] })
  entries.push({ keyword: '@showTurn', lines: input.showTurn === undefined ? [] : [`@showTurn ${booleanValue(input.showTurn, false)}`] })
  entries.push({ keyword: '@animations', lines: input.animations === undefined ? [] : [`@animations ${booleanValue(input.animations, true)}`] })
  entries.push({ keyword: '@autoSave', lines: input.autoSave === undefined ? [] : [`@autoSave ${booleanValue(input.autoSave, false)}`] })

  rewriteBlockProperties(lines, block.start, block.end, entries, '  ')
  const syntaxPreview = entries.flatMap(entry => entry.lines).join('\n')
  return { content: joinLines(lines), syntaxPreview }
}

export function applySceneInspectorPatch(content: string, scene: SceneIndexEntry, input: {
  name: string
  first: string | number | null
  sections: Array<string | number>
  ambience: string | null
  ambienceVolume: number | null
  ambienceLoop: boolean
  ambienceFadeInMs?: number | null
  ambienceFadeOutMs?: number | null
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
    { keyword: '@sceneAmbienceFadeInMs', lines: numberValue(input.ambienceFadeInMs) != null ? [`@sceneAmbienceFadeInMs ${numberValue(input.ambienceFadeInMs)}`] : [] },
    { keyword: '@sceneAmbienceFadeOutMs', lines: numberValue(input.ambienceFadeOutMs) != null ? [`@sceneAmbienceFadeOutMs ${numberValue(input.ambienceFadeOutMs)}`] : [] },
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
  ambienceFadeInMs?: number | null
  ambienceFadeOutMs?: number | null
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
    { keyword: '@ambienceFadeInMs', lines: numberValue(input.ambienceFadeInMs) != null ? [`@ambienceFadeInMs ${numberValue(input.ambienceFadeInMs)}`] : [] },
    { keyword: '@ambienceFadeOutMs', lines: numberValue(input.ambienceFadeOutMs) != null ? [`@ambienceFadeOutMs ${numberValue(input.ambienceFadeOutMs)}`] : [] },
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
  input?: string | null
  when?: string | null
  once?: boolean
  disabledText?: string | null
  actions?: string[]
  choiceSfx: string | null
  focusSfx: string | null
  choiceStyle?: 'default' | 'primary' | 'subtle' | 'danger' | null
}): { content: string, syntaxPreview: string, unsupportedWriterChoice: boolean } {
  const commonEntries: RewriteEntry[] = [
    { keyword: '@targetType', lines: [`@targetType ${quoteIfNeeded(input.targetType)}`] },
    {
      keyword: '@target',
      lines: input.target === null || input.target === undefined || String(input.target).trim() === ''
        ? []
        : [`@target ${quoteIfNeeded(input.target)}`]
    },
    {
      keyword: '@input',
      lines: input.input && input.input.trim() !== '' ? [`@input ${input.input.trim()}`] : []
    },
    {
      keyword: '@when',
      lines: input.when && input.when.trim() !== '' ? [`@when ${input.when.trim()}`] : []
    },
    {
      keyword: '@once',
      lines: input.once === undefined ? [] : [`@once ${booleanValue(input.once, false)}`]
    },
    {
      keyword: '@disabledText',
      lines: input.disabledText && input.disabledText.trim() !== '' ? [`@disabledText ${quoteIfNeeded(input.disabledText.trim())}`] : []
    },
    {
      keyword: '@action',
      lines: Array.isArray(input.actions)
        ? input.actions.map(action => action.trim()).filter(Boolean).map(action => `@action ${action}`)
        : []
    },
    { keyword: '@choiceSfx', lines: input.choiceSfx ? [`@choiceSfx ${quoteIfNeeded(input.choiceSfx)}`] : [] },
    { keyword: '@focusSfx', lines: input.focusSfx ? [`@focusSfx ${quoteIfNeeded(input.focusSfx)}`] : [] },
    { keyword: '@choiceStyle', lines: input.choiceStyle ? [`@choiceStyle ${quoteIfNeeded(input.choiceStyle)}`] : [] }
  ]

  if (choice.sourceMode === 'writer') {
    const lines = splitLines(content)
    const targetLine = Math.max(0, Math.min(lines.length - 1, choice.line - 1))
    const line = lines[targetLine]
    if (!line || !/^\s*->/.test(line)) {
      return {
        content,
        syntaxPreview: 'Writer-arrow choice could not be resolved to source line.',
        unsupportedWriterChoice: true
      }
    }
    const parsed = parseWriterArrowChoiceLine(line)
    const indent = writerArrowIndent(line)
    const rendered = [
      `${indent}choice__`,
      ...commonEntries.flatMap(entry => entry.lines).map(entry => `${indent}  ${entry}`),
      `${indent}  ${quoteIfNeeded(parsed.text ?? '')}`,
      `${indent}__choice`
    ]
    lines.splice(targetLine, 1, ...rendered)
    return {
      content: joinLines(lines),
      syntaxPreview: commonEntries.flatMap(entry => entry.lines).join('\n'),
      unsupportedWriterChoice: false
    }
  }

  const lines = splitLines(content)
  const block = findChoiceBlock(lines, choice)
  if (!block) return { content, syntaxPreview: '', unsupportedWriterChoice: false }

  rewriteBlockProperties(lines, block.start, block.end, commonEntries, '    ')
  return {
    content: joinLines(lines),
    syntaxPreview: commonEntries.flatMap(entry => entry.lines).join('\n'),
    unsupportedWriterChoice: false
  }
}

export function appendSectionScaffold(content: string, input: {
  title: string
  bodyText?: string
}): { content: string, line: number } {
  const normalized = content.replace(/\r\n/g, '\n').replace(/\s*$/, '')
  const line = normalized.length === 0 ? 1 : normalized.split('\n').length + 2
  const separator = normalized.length === 0 ? '' : '\n\n'
  const safeTitle = input.title.trim() || 'New Section'
  const safeBody = (input.bodyText?.trim() || `${safeTitle}.`).replace(/"/g, '\\"')
  return {
    content: `${normalized}${separator}section "${safeTitle.replace(/"/g, '\\"')}"\n  "${safeBody}"\nend\n`,
    line
  }
}

export function deleteSectionBySourceRange(content: string, range: SourceRange | null | undefined): string {
  if (!range?.startLine || !range?.endLine) return content
  const lines = splitLines(content)
  const start = Math.max(0, range.startLine - 1)
  const end = Math.min(lines.length, range.endLine)
  if (start >= end) return content
  lines.splice(start, end - start)
  while (lines.length > 1 && lines[start] === '' && lines[start - 1] === '') {
    lines.splice(start, 1)
  }
  return joinLines(lines)
}

export function appendChoiceToSection(content: string, section: SectionIndexEntry | SectionSettingsIndexEntry, input: {
  text: string
  target: string | number
  targetType?: 'section' | 'scene'
}): { content: string, line: number } {
  const lines = splitLines(content)
  const block = findSectionBlock(lines, {
    sectionSerial: 'sectionSerial' in section ? section.sectionSerial : section.serial,
    sectionTitle: 'sectionTitle' in section ? section.sectionTitle : section.title,
    file: section.file,
    line: section.line,
    col: section.col,
    timerSeconds: null,
    timerTarget: null,
    timerOutcome: null,
    ambience: null,
    ambienceVolume: 1,
    ambienceLoop: true,
    sfx: [],
    backdrop: null,
    shot: 'medium',
    textPacing: 'instant'
  })
  if (!block) return { content, line: section.line }

  const endLine = Math.max(block.start + 1, block.end)
  const closer = lines[endLine]
  const match = closer?.match(/^(\s*)/)
  const endIndent = match?.[1] ?? ''
  const indent = `${endIndent}  `
  const prefix = input.targetType === 'scene' ? 'scene ' : ''
  const target = typeof input.target === 'number'
    ? String(input.target)
    : `"${input.target.trim().replace(/"/g, '\\"')}"`
  const text = input.text.trim().replace(/"/g, '\\"') || 'Continue'
  const insertedLine = `${indent}-> "${text}" => ${prefix}${target}`
  lines.splice(endLine, 0, insertedLine)
  return {
    content: joinLines(lines),
    line: endLine + 1
  }
}
