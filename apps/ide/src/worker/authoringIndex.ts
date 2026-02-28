import type {
  ChoiceIndexEntry,
  SceneIndexEntry,
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

export function buildStorySettingsIndex(story: any, fallbackFile: string): StorySettingsIndexEntry | null {
  if (!story || typeof story !== 'object') return null
  const settings = story.settings ?? {}
  return {
    file: fallbackFile,
    line: 1,
    col: 1,
    storyTitle: typeof settings.name === 'string' ? settings.name : null,
    fullTimerSeconds: typeof settings?.fullTimer?.timer === 'number' ? settings.fullTimer.timer : null,
    fullTimerTarget: settings?.fullTimer?.target ?? null,
    fullTimerOutcome: typeof settings.fullTimerOutcome === 'string' ? settings.fullTimerOutcome : null,
    storyAmbience: typeof settings.storyAmbience === 'string' ? settings.storyAmbience : null,
    storyAmbienceVolume: typeof settings.storyAmbienceVolume === 'number' ? settings.storyAmbienceVolume : 1,
    storyAmbienceLoop: settings.storyAmbienceLoop !== undefined ? settings.storyAmbienceLoop !== false : true,
    presentationMode: settings.presentationMode === 'cinematic' ? 'cinematic' : 'literary'
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
    const first = scene?.first ?? null
    return {
      serial: typeof scene?.serial === 'number' ? scene.serial : -1,
      name: typeof scene?.name === 'string' && scene.name.trim() !== '' ? scene.name : `Scene ${scene?.serial ?? '?'}`,
      first,
      sections: Array.isArray(scene?.sections) ? scene.sections : [],
      file: sourceFile(source, fallbackFile),
      line: sourceLine(source, 1),
      col: sourceCol(source, 1),
      hasAmbience: typeof scene?.music === 'string' && scene.music.trim() !== '',
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
    return {
      sectionSerial: typeof section?.serial === 'number' ? section.serial : -1,
      sectionTitle: typeof settings?.title === 'string' && settings.title.trim() !== ''
        ? settings.title
        : `Section ${section?.serial ?? '?'}`,
      file: sourceFile(source, fallbackFile),
      line: sourceLine(source, 1),
      col: sourceCol(source, 1),
      timerSeconds: typeof settings?.timer?.timer === 'number' && settings.timer.timer > 0 ? settings.timer.timer : null,
      timerTarget: settings?.timer?.target ?? null,
      timerOutcome: typeof settings?.timerOutcome === 'string' ? settings.timerOutcome : null,
      ambience: typeof settings?.ambience === 'string' ? settings.ambience : null,
      ambienceVolume: typeof settings?.ambienceVolume === 'number' ? settings.ambienceVolume : 1,
      ambienceLoop: settings?.ambienceLoop !== undefined ? settings.ambienceLoop !== false : true,
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
      out.push({
        id: `choice:${sectionSerial}:${choiceIndex}`,
        ownerSectionSerial: sectionSerial,
        ownerSectionTitle: sectionTitle,
        choiceIndex,
        file: sourceFile(source, fallbackFile),
        line: sourceLine(source, sourceLine(section?.source as SourceLike | undefined, 1)),
        col: sourceCol(source, 1),
        sourceMode: source && source.mode === 'writer' ? 'writer' : 'legacy',
        targetType,
        target: choice?.target ?? null,
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
