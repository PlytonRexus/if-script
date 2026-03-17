import type {
  ChoiceIndexEntry,
  SceneIndexEntry,
  SectionContentBlock,
  SectionContentConditionalBlock,
  SectionContentIndexEntry,
  SourceRange,
  SectionSettingsIndexEntry,
  StorySettingsIndexEntry
} from '../types/interfaces'

interface SourceLike {
  file?: unknown
  line?: unknown
  col?: unknown
  mode?: unknown
}

function sourceFile(source: SourceLike | undefined, fallbackFile: string): string {
  if (source && typeof source.file === 'string' && source.file.trim() !== '') return source.file
  return fallbackFile
}

function sourceLine(source: SourceLike | undefined, fallbackLine = 1): number {
  if (source && typeof source.line === 'number' && Number.isFinite(source.line) && source.line > 0) return source.line
  return fallbackLine
}

function sourceCol(source: SourceLike | undefined, fallbackCol = 1): number {
  if (source && typeof source.col === 'number' && Number.isFinite(source.col) && source.col > 0) return source.col
  return fallbackCol
}

function sourceRange(source: any, fallbackFile: string, fallbackLine = 1, fallbackCol = 1): SourceRange {
  const nested = source?.sourceRange
  if (nested && typeof nested === 'object') {
    return {
      file: typeof nested.file === 'string' ? nested.file : fallbackFile,
      startLine: typeof nested.startLine === 'number' ? nested.startLine : fallbackLine,
      startCol: typeof nested.startCol === 'number' ? nested.startCol : fallbackCol,
      endLine: typeof nested.endLine === 'number' ? nested.endLine : (typeof nested.startLine === 'number' ? nested.startLine : fallbackLine),
      endCol: typeof nested.endCol === 'number' ? nested.endCol : (typeof nested.startCol === 'number' ? nested.startCol : fallbackCol)
    }
  }
  const line = sourceLine(source, fallbackLine)
  const col = sourceCol(source, fallbackCol)
  return {
    file: sourceFile(source, fallbackFile),
    startLine: line,
    startCol: col,
    endLine: line,
    endCol: col
  }
}

function makeEntityId(kind: string, range: SourceRange, discriminator = ''): string {
  const suffix = discriminator ? `:${discriminator}` : ''
  return `${kind}:${range.file}:${range.startLine ?? 0}:${range.startCol ?? 0}:${range.endLine ?? 0}:${range.endCol ?? 0}${suffix}`
}

function sectionRefExists(target: unknown, serials: Set<number>, titles: Set<string>): boolean {
  if (target === null || target === undefined || target === '') return false
  if (typeof target === 'number') return serials.has(target)
  return titles.has(String(target))
}

function choiceTextPreview(choice: any): string {
  const text = Array.isArray(choice?.text) ? choice.text : []
  const out: string[] = []
  text.forEach((node: any) => {
    if (!node) return
    if (typeof node === 'string') out.push(node)
    if (typeof node?.symbol === 'string') out.push(node.symbol)
  })
  const preview = out.join(' ').replace(/\s+/g, ' ').trim()
  return preview.slice(0, 120)
}

export function expressionPreview(node: any): string {
  if (node == null) return ''
  if (typeof node === 'string' || typeof node === 'number' || typeof node === 'boolean') return String(node)
  if (node?._class === 'Token') return String(node.symbol ?? '')
  if (node?._class === 'Action') {
    if (node.type === 'assign') return `${expressionPreview(node.left)} = ${expressionPreview(node.right)}`
    if (node.type === 'binary') return `${expressionPreview(node.left)} ${node.operator} ${expressionPreview(node.right)}`
    if (node.type === 'unary') return `${node.operator}${expressionPreview(node.left)}`
    if (node.type === 'return') return `return__ ${expressionPreview(node.left)}`
  }
  if (node?._class === 'FunctionCall') {
    const name = typeof node.name === 'string' ? node.name : expressionPreview(node.name)
    const args = Array.isArray(node.args) ? node.args.map(expressionPreview).join(', ') : ''
    return `${name}(${args})`
  }
  if (node?._class === 'MemberAccess') {
    const args = Array.isArray(node.args) ? `(${node.args.map(expressionPreview).join(', ')})` : ''
    return `${expressionPreview(node.object)}.${String(node.member ?? '')}${args}`
  }
  if (node?._class === 'ArrayAccess') return `${expressionPreview(node.array)}[${expressionPreview(node.index)}]`
  if (node?._class === 'ArrayLiteral') return `[${Array.isArray(node.elements) ? node.elements.map(expressionPreview).join(', ') : ''}]`
  return ''
}

function buildNodeSourceRange(node: any, fallbackFile: string, fallbackLine = 1, fallbackCol = 1): SourceRange | null {
  if (!node || typeof node !== 'object') return null
  return sourceRange(node, fallbackFile, fallbackLine, fallbackCol)
}

function blockId(sectionSerial: number, prefix: string, index: number): string {
  return `section-content:${sectionSerial}:${prefix}:${index}`
}

function extractSectionContentBlocks(
  nodes: any[],
  sectionSerial: number,
  fallbackFile: string,
  unsupportedKinds: Set<string>,
  path = 'root'
): SectionContentBlock[] {
  const blocks: SectionContentBlock[] = []

  nodes.forEach((node, index) => {
    const id = blockId(sectionSerial, `${path}`, index)
    if (!node || typeof node !== 'object') {
      if (typeof node === 'string' && node.trim() !== '') {
        blocks.push({ id, kind: 'text', text: node, sourceRange: null })
      }
      return
    }

    if (node._class === 'Token' && node.type === 'STRING') {
      blocks.push({
        id,
        kind: 'text',
        text: typeof node.symbol === 'string' ? node.symbol : String(node.symbol ?? ''),
        sourceRange: buildNodeSourceRange(node, fallbackFile, typeof node.line === 'number' ? node.line : 1, typeof node.col === 'number' ? node.col : 1)
      })
      return
    }

    if (node._class === 'Choice') {
      const choiceIndex = typeof node.choiceI === 'number' ? node.choiceI : index + 1
      blocks.push({
        id,
        kind: 'choice',
        choiceId: `choice:${sectionSerial}:${choiceIndex}`,
        sourceRange: buildNodeSourceRange(node, fallbackFile)
      })
      return
    }

    if (node._class === 'ConditionalBlock') {
      const conditional: SectionContentConditionalBlock = {
        id,
        kind: 'conditional',
        condition: expressionPreview(node.cond),
        thenBranch: {
          blocks: extractSectionContentBlocks(
            Array.isArray(node.ifBlock) ? node.ifBlock : [],
            sectionSerial,
            fallbackFile,
            unsupportedKinds,
            `${path}-then-${index}`
          )
        },
        elseBranch: Array.isArray(node.elseBlock)
          ? {
              blocks: extractSectionContentBlocks(
                node.elseBlock,
                sectionSerial,
                fallbackFile,
                unsupportedKinds,
                `${path}-else-${index}`
              )
            }
          : null,
        sourceRange: buildNodeSourceRange(node, fallbackFile)
      }
      blocks.push(conditional)
      return
    }

    unsupportedKinds.add(String(node._class ?? typeof node))
  })

  return blocks
}

function extractChoiceInput(input: any): string | null {
  if (typeof input === 'string' && input.trim() !== '') return input.trim()
  if (input && typeof input === 'object' && input._class === 'Token' && typeof input.symbol === 'string' && input.symbol.trim() !== '') {
    return input.symbol.trim()
  }
  return null
}

export function buildStorySettingsIndex(story: any, fallbackFile: string): StorySettingsIndexEntry | null {
  if (!story || typeof story !== 'object') return null
  const settings = story.settings ?? {}
  const range = sourceRange(story?.source ?? null, fallbackFile, 1, 1)
  return {
    entityId: makeEntityId('story', range, 'settings'),
    file: fallbackFile,
    line: 1,
    col: 1,
    sourceRange: range,
    storyTitle: typeof settings.name === 'string' ? settings.name : null,
    startAt: settings?.startAt ?? null,
    referrable: settings?.referrable === true,
    fullTimerSeconds: typeof settings?.fullTimer?.timer === 'number' ? settings.fullTimer.timer : null,
    fullTimerTarget: settings?.fullTimer?.target ?? null,
    fullTimerOutcome: typeof settings.fullTimerOutcome === 'string' ? settings.fullTimerOutcome : null,
    storyAmbience: typeof settings.storyAmbience === 'string' ? settings.storyAmbience : null,
    storyAmbienceVolume: typeof settings.storyAmbienceVolume === 'number' ? settings.storyAmbienceVolume : 1,
    storyAmbienceLoop: settings.storyAmbienceLoop !== undefined ? settings.storyAmbienceLoop !== false : true,
    storyAmbienceFadeInMs: typeof settings.storyAmbienceFadeInMs === 'number' ? settings.storyAmbienceFadeInMs : 0,
    storyAmbienceFadeOutMs: typeof settings.storyAmbienceFadeOutMs === 'number' ? settings.storyAmbienceFadeOutMs : 0,
    presentationMode: settings.presentationMode === 'cinematic' ? 'cinematic' : 'literary',
    maxIterations: typeof settings.maxIterations === 'number' ? settings.maxIterations : null,
    maxCallDepth: typeof settings.maxCallDepth === 'number' ? settings.maxCallDepth : null,
    theme: typeof settings.theme === 'string' ? settings.theme : null,
    allowUndo: settings.allowUndo !== false,
    showTurn: settings.showTurn === true,
    animations: settings.animations !== false,
    autoSave: settings.autoSave === true
  }
}

export function buildSceneIndex(story: any, fallbackFile: string): SceneIndexEntry[] {
  const scenes = Array.isArray(story?.scenes) ? story.scenes : []
  const sections = Array.isArray(story?.sections) ? story.sections : []
  const sectionSerials = new Set<number>(sections.map((section: any) => section?.serial).filter((serial: unknown): serial is number => typeof serial === 'number'))
  const sectionTitles = new Set<string>(
    sections
      .map((section: any) => section?.settings?.title)
      .filter((title: unknown): title is string => typeof title === 'string' && title.trim() !== '')
  )

  return scenes.map((scene: any) => {
    const source = scene?.source as SourceLike | undefined
    const range = sourceRange(scene, fallbackFile, sourceLine(source, 1), sourceCol(source, 1))
    const first = scene?.first ?? null
    return {
      entityId: makeEntityId('scene', range, String(scene?.serial ?? '')),
      serial: typeof scene?.serial === 'number' ? scene.serial : -1,
      name: typeof scene?.name === 'string' && scene.name.trim() !== '' ? scene.name : `Scene ${scene?.serial ?? '?'}`,
      first,
      sections: Array.isArray(scene?.sections) ? scene.sections : [],
      file: sourceFile(source, fallbackFile),
      line: sourceLine(source, 1),
      col: sourceCol(source, 1),
      sourceRange: range,
      hasAmbience: typeof scene?.music === 'string' && scene.music.trim() !== '',
      ambienceVolume: typeof scene?.musicVolume === 'number' ? scene.musicVolume : 1,
      ambienceLoop: scene?.musicLoop !== undefined ? scene.musicLoop !== false : true,
      ambienceFadeInMs: typeof scene?.musicFadeInMs === 'number' ? scene.musicFadeInMs : 0,
      ambienceFadeOutMs: typeof scene?.musicFadeOutMs === 'number' ? scene.musicFadeOutMs : 0,
      sceneTransition: typeof scene?.sceneTransition === 'string' && scene.sceneTransition.trim() !== '' ? scene.sceneTransition : 'cut',
      firstResolved: sectionRefExists(first, sectionSerials, sectionTitles)
    }
  }).sort((a: SceneIndexEntry, b: SceneIndexEntry) => {
    if (a.file !== b.file) return a.file.localeCompare(b.file)
    if (a.line !== b.line) return a.line - b.line
    return a.serial - b.serial
  })
}

export function buildSectionSettingsIndex(story: any, fallbackFile: string): SectionSettingsIndexEntry[] {
  const sections = Array.isArray(story?.sections) ? story.sections : []
  return sections.map((section: any) => {
    const source = section?.source as SourceLike | undefined
    const settings = section?.settings ?? {}
    const range = sourceRange(section, fallbackFile, sourceLine(source, 1), sourceCol(source, 1))
    return {
      entityId: makeEntityId('section', range, String(section?.serial ?? '')),
      sectionSerial: typeof section?.serial === 'number' ? section.serial : -1,
      sectionTitle: typeof settings?.title === 'string' && settings.title.trim() !== ''
        ? settings.title
        : `Section ${section?.serial ?? '?'}`,
      file: sourceFile(source, fallbackFile),
      line: sourceLine(source, 1),
      col: sourceCol(source, 1),
      sourceRange: range,
      timerSeconds: typeof settings?.timer?.timer === 'number' && settings.timer.timer > 0 ? settings.timer.timer : null,
      timerTarget: settings?.timer?.target ?? null,
      timerOutcome: typeof settings?.timerOutcome === 'string' ? settings.timerOutcome : null,
      ambience: typeof settings?.ambience === 'string' ? settings.ambience : null,
      ambienceVolume: typeof settings?.ambienceVolume === 'number' ? settings.ambienceVolume : 1,
      ambienceLoop: settings?.ambienceLoop !== undefined ? settings.ambienceLoop !== false : true,
      ambienceFadeInMs: typeof settings?.ambienceFadeInMs === 'number' ? settings.ambienceFadeInMs : 0,
      ambienceFadeOutMs: typeof settings?.ambienceFadeOutMs === 'number' ? settings.ambienceFadeOutMs : 0,
      sfx: Array.isArray(settings?.sfx) ? settings.sfx.filter((entry: unknown): entry is string => typeof entry === 'string') : [],
      backdrop: typeof settings?.backdrop === 'string' ? settings.backdrop : null,
      shot: settings?.shot === 'wide' || settings?.shot === 'close' || settings?.shot === 'extreme_close' ? settings.shot : 'medium',
      textPacing: settings?.textPacing === 'typed' || settings?.textPacing === 'cinematic' ? settings.textPacing : 'instant'
    }
  }).sort((a: SectionSettingsIndexEntry, b: SectionSettingsIndexEntry) => {
    if (a.file !== b.file) return a.file.localeCompare(b.file)
    if (a.line !== b.line) return a.line - b.line
    return a.sectionSerial - b.sectionSerial
  })
}

export function buildChoiceIndex(story: any, fallbackFile: string): ChoiceIndexEntry[] {
  const sections = Array.isArray(story?.sections) ? story.sections : []
  const out: ChoiceIndexEntry[] = []

  sections.forEach((section: any) => {
    const sectionSerial = typeof section?.serial === 'number' ? section.serial : -1
    const sectionTitle = typeof section?.settings?.title === 'string' && section.settings.title.trim() !== ''
      ? section.settings.title
      : `Section ${sectionSerial}`
    const choices = Array.isArray(section?.choices) ? section.choices : []
    choices.forEach((choice: any, idx: number) => {
      const source = choice?.source as SourceLike | undefined
      const choiceIndex = typeof choice?.choiceI === 'number' ? choice.choiceI : idx + 1
      const targetType = choice?.targetType === 'scene' ? 'scene' : 'section'
      const line = sourceLine(source, sourceLine(section?.source as SourceLike | undefined, 1))
      const col = sourceCol(source, 1)
      const range = sourceRange(choice, fallbackFile, line, col)
      const id = `choice:${sectionSerial}:${choiceIndex}`
      out.push({
        entityId: makeEntityId('choice', range, id),
        id,
        ownerSectionSerial: sectionSerial,
        ownerSectionTitle: sectionTitle,
        choiceIndex,
        file: sourceFile(source, fallbackFile),
        line,
        col,
        sourceRange: range,
        sourceMode: source && source.mode === 'writer' ? 'writer' : 'legacy',
        targetType,
        target: choice?.target ?? null,
        input: extractChoiceInput(choice?.input),
        when: choice?.when ? expressionPreview(choice.when) : null,
        once: choice?.once === true,
        disabledText: typeof choice?.disabledText === 'string' ? choice.disabledText : null,
        actions: Array.isArray(choice?.actions)
          ? choice.actions.map((entry: any) => expressionPreview(entry)).filter((entry: string) => entry.trim() !== '')
          : [],
        choiceSfx: typeof choice?.choiceSfx === 'string' ? choice.choiceSfx : null,
        focusSfx: typeof choice?.focusSfx === 'string' ? choice.focusSfx : null,
        choiceStyle: choice?.choiceStyle === 'primary' || choice?.choiceStyle === 'subtle' || choice?.choiceStyle === 'danger'
          ? choice.choiceStyle
          : 'default',
        textPreview: choiceTextPreview(choice)
      })
    })
  })

  return out.sort((a, b) => {
    if (a.file !== b.file) return a.file.localeCompare(b.file)
    if (a.line !== b.line) return a.line - b.line
    if (a.ownerSectionSerial !== b.ownerSectionSerial) return a.ownerSectionSerial - b.ownerSectionSerial
    return a.choiceIndex - b.choiceIndex
  })
}

export function buildSectionContentIndex(story: any, fallbackFile: string): SectionContentIndexEntry[] {
  const sections = Array.isArray(story?.sections) ? story.sections : []
  return sections.map((section: any) => {
    const source = section?.source as SourceLike | undefined
    const range = sourceRange(section, fallbackFile, sourceLine(source, 1), sourceCol(source, 1))
    const sectionSerial = typeof section?.serial === 'number' ? section.serial : -1
    const unsupportedKinds = new Set<string>()
    const blocks = extractSectionContentBlocks(
      Array.isArray(section?.text) ? section.text : [],
      sectionSerial,
      sourceFile(source, fallbackFile),
      unsupportedKinds
    )
    return {
      sectionSerial,
      file: sourceFile(source, fallbackFile),
      sourceRange: range,
      blocks,
      supported: unsupportedKinds.size === 0,
      unsupportedNodeKinds: Array.from(unsupportedKinds).sort()
    }
  }).sort((a: SectionContentIndexEntry, b: SectionContentIndexEntry) => a.sectionSerial - b.sectionSerial)
}
