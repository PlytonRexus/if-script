import type { IdeDiagnostic } from '../types/interfaces'

const BUILTIN_NAMES = new Set([
  'random',
  'floor',
  'ceil',
  'round',
  'min',
  'max',
  'abs',
  'pow',
  'sqrt',
  'length'
])

function makeDiagnostic(
  severity: IdeDiagnostic['severity'],
  code: string,
  message: string,
  {
    file = null,
    line = null,
    col = null,
    hint = null,
    source = 'analyzer' as const
  }: Partial<IdeDiagnostic> = {}
): IdeDiagnostic {
  return { severity, code, message, file, line, col, hint, source }
}

function collectNodes(nodes: any[], visit: (node: any, ctx: { inLoop: boolean, inFunction: boolean }) => void, ctx = { inLoop: false, inFunction: false }): void {
  if (!Array.isArray(nodes)) return
  nodes.forEach(node => collectNode(node, visit, ctx))
}

function collectNode(node: any, visit: (node: any, ctx: { inLoop: boolean, inFunction: boolean }) => void, ctx = { inLoop: false, inFunction: false }): void {
  if (!node) return
  visit(node, ctx)

  const klass = node._class
  if (klass === 'ConditionalBlock') {
    collectNode(node.cond, visit, ctx)
    collectNode(node.then, visit, ctx)
    collectNodes(node.ifBlock, visit, ctx)
    collectNode(node.else, visit, ctx)
    collectNodes(node.elseBlock, visit, ctx)
    return
  }

  if (klass === 'Loop') {
    collectNode(node.condition, visit, { ...ctx, inLoop: true })
    collectNodes(node.body, visit, { ...ctx, inLoop: true })
    return
  }

  if (klass === 'FunctionDef') {
    collectNodes(node.body, visit, { ...ctx, inFunction: true })
    return
  }

  if (klass === 'Choice') {
    collectNodes(node.text, visit, ctx)
    collectNode(node.when, visit, ctx)
    collectNodes(node.actions, visit, ctx)
    return
  }

  if (klass === 'Action') {
    collectNode(node.left, visit, ctx)
    collectNode(node.right, visit, ctx)
    return
  }

  if (klass === 'FunctionCall') {
    collectNodes(node.args, visit, ctx)
    return
  }

  if (klass === 'ArrayLiteral') {
    collectNodes(node.elements, visit, ctx)
  }
}

function collectChoicesFromStory(story: any): Array<{ choice: any, section: any }> {
  const choices: Array<{ choice: any, section: any }> = []
  ;(story.sections ?? []).forEach((section: any) => {
    collectNodes(section.text ?? [], node => {
      if (node?._class === 'Choice') {
        choices.push({ choice: node, section })
      }
    })
  })
  return choices
}

function collectFunctionNamesFromStory(story: any): string[] {
  const names: string[] = []

  ;(story.functions ?? []).forEach((func: any) => {
    if (typeof func?.name === 'string' && func.name.trim() !== '') {
      names.push(func.name)
    }
  })

  ;(story.sections ?? []).forEach((section: any) => {
    collectNodes(section.text ?? [], node => {
      if (node?._class === 'FunctionDef' && typeof node.name === 'string' && node.name.trim() !== '') {
        names.push(node.name)
      }
    })
  })

  return names
}

function isResolvableSectionRef(target: unknown, serials: Set<number>, titles: Set<string>): boolean {
  return typeof target === 'number' ? serials.has(target) : titles.has(String(target))
}

export function analyzeStory(story: any, inputPath: string): IdeDiagnostic[] {
  const diagnostics: IdeDiagnostic[] = []

  const sectionTitles = new Map<string, number[]>()
  const sceneNames = new Map<string, number[]>()

  ;(story.sections ?? []).forEach((section: any) => {
    const title = section?.settings?.title
    if (typeof title !== 'string' || title.trim() === '') return
    if (!sectionTitles.has(title)) sectionTitles.set(title, [])
    sectionTitles.get(title)?.push(section.serial)
  })

  ;(story.scenes ?? []).forEach((scene: any) => {
    const name = scene?.name
    if (typeof name !== 'string' || name.trim() === '') return
    if (!sceneNames.has(name)) sceneNames.set(name, [])
    sceneNames.get(name)?.push(scene.serial)
  })

  sectionTitles.forEach((serials, title) => {
    if (serials.length > 1) {
      diagnostics.push(makeDiagnostic('warning', 'DUPLICATE_SECTION_TITLE', `Duplicate section title "${title}" used by sections: ${serials.join(', ')}`, {
        file: inputPath,
        hint: 'Use unique section titles when targeting by string reference.'
      }))
    }
  })

  sceneNames.forEach((serials, name) => {
    if (serials.length > 1) {
      diagnostics.push(makeDiagnostic('warning', 'DUPLICATE_SCENE_NAME', `Duplicate scene name "${name}" used by scenes: ${serials.join(', ')}`, {
        file: inputPath,
        hint: 'Use unique scene names when using @targetType "scene".'
      }))
    }
  })

  const sectionSerials = new Set<number>((story.sections ?? []).map((s: any) => s.serial))
  const sectionTitleSet = new Set<string>((story.sections ?? []).map((s: any) => s?.settings?.title).filter(Boolean))
  const sceneSerials = new Set<number>((story.scenes ?? []).map((s: any) => s.serial))
  const sceneNameSet = new Set<string>((story.scenes ?? []).map((s: any) => s?.name).filter(Boolean))

  const startAt = story.settings?.startAt
  if (startAt !== undefined && startAt !== null && startAt !== '' && !isResolvableSectionRef(startAt, sectionSerials, sectionTitleSet)) {
    diagnostics.push(makeDiagnostic('error', 'START_AT_UNRESOLVED', `@startAt points to unknown section target "${startAt}".`, {
      file: inputPath,
      hint: 'Set @startAt to an existing section serial or title.'
    }))
  }

  const fullTimerTarget = story.settings?.fullTimer?.target
  if (fullTimerTarget !== undefined && fullTimerTarget !== null && fullTimerTarget !== '' && !isResolvableSectionRef(fullTimerTarget, sectionSerials, sectionTitleSet)) {
    diagnostics.push(makeDiagnostic('error', 'FULL_TIMER_TARGET_UNRESOLVED', `@fullTimer points to unknown section target "${fullTimerTarget}".`, {
      file: inputPath,
      hint: 'Set @fullTimer target to an existing section serial or title.'
    }))
  }

  ;(story.sections ?? []).forEach((section: any) => {
    const timerTarget = section?.settings?.timer?.target
    if (timerTarget !== undefined && timerTarget !== null && timerTarget !== '' && !isResolvableSectionRef(timerTarget, sectionSerials, sectionTitleSet)) {
      diagnostics.push(makeDiagnostic('error', 'SECTION_TIMER_TARGET_UNRESOLVED', `Section ${section.serial} @timer points to unknown section target "${timerTarget}".`, {
        file: inputPath,
        hint: 'Set section @timer target to an existing section serial or title.'
      }))
    }
  })

  ;(story.scenes ?? []).forEach((scene: any) => {
    const first = scene?.first
    if (first !== undefined && first !== null && first !== '' && !isResolvableSectionRef(first, sectionSerials, sectionTitleSet)) {
      diagnostics.push(makeDiagnostic('error', 'SCENE_FIRST_UNRESOLVED', `Scene "${scene.name || scene.serial}" @first points to unknown section target "${first}".`, {
        file: inputPath,
        hint: 'Set scene @first to an existing section serial or title.'
      }))
    }
  })

  collectChoicesFromStory(story).forEach(({ choice, section }) => {
    const isScene = choice.targetType === 'scene'
    const target = choice.target
    if (target === undefined || target === null || target === '') {
      diagnostics.push(makeDiagnostic('error', 'CHOICE_TARGET_MISSING', `Choice in section ${section.serial} is missing a target.`, { file: inputPath }))
      return
    }

    const exists = isScene
      ? (typeof target === 'number' ? sceneSerials.has(target) : sceneNameSet.has(String(target)))
      : (typeof target === 'number' ? sectionSerials.has(target) : sectionTitleSet.has(String(target)))

    if (!exists) {
      diagnostics.push(makeDiagnostic('error', 'CHOICE_TARGET_UNRESOLVED', `Choice in section ${section.serial} points to unknown ${isScene ? 'scene' : 'section'} target "${target}".`, {
        file: inputPath,
        hint: isScene ? 'Create the scene or update @target/@targetType.' : 'Create the section or update @target.'
      }))
    }
  })

  const functionNames = collectFunctionNamesFromStory(story)
  const functionCounts = new Map<string, number>()
  functionNames.forEach(name => functionCounts.set(name, (functionCounts.get(name) ?? 0) + 1))

  functionCounts.forEach((count, name) => {
    if (count > 1) {
      diagnostics.push(makeDiagnostic('warning', 'DUPLICATE_FUNCTION_NAME', `Function "${name}" is defined ${count} times; later definitions override earlier ones.`, {
        file: inputPath,
        hint: 'Rename one definition to avoid accidental overrides.'
      }))
    }
  })

  ;(story.sections ?? []).forEach((section: any) => {
    collectNodes(section.text ?? [], (node, ctx) => {
      if (node?.type === 'break' && !ctx.inLoop) {
        diagnostics.push(makeDiagnostic('error', 'BREAK_OUTSIDE_LOOP', `break__ used outside loop in section ${section.serial}.`, { file: inputPath }))
      }
      if (node?.type === 'continue' && !ctx.inLoop) {
        diagnostics.push(makeDiagnostic('error', 'CONTINUE_OUTSIDE_LOOP', `continue__ used outside loop in section ${section.serial}.`, { file: inputPath }))
      }
      if (node?._class === 'Action' && node.type === 'return' && !ctx.inFunction) {
        diagnostics.push(makeDiagnostic('error', 'RETURN_OUTSIDE_FUNCTION', `return__ used outside function in section ${section.serial}.`, { file: inputPath }))
      }
    })
  })

  ;(story.functions ?? []).forEach((func: any) => {
    if (BUILTIN_NAMES.has(func?.name)) {
      diagnostics.push(makeDiagnostic('warning', 'FUNCTION_SHADOWS_BUILTIN', `Function "${func.name}" shadows a builtin function.`, {
        file: inputPath,
        hint: 'Rename the function to avoid unexpected calls to the builtin.'
      }))
    }
  })

  return diagnostics
}
