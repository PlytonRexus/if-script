import type {
  AuthorGraphNode,
  ChoiceIndexEntry,
  CommandPaletteItem,
  IdeDiagnostic,
  RuntimeDebugSnapshot,
  RuntimeErrorEntry,
  RuntimeEventEntry,
  SceneIndexEntry,
  SectionContentIndexEntry,
  SectionIndexEntry,
  SectionSettingsIndexEntry,
  StoryGraph,
  StoryGraphEdge,
  StoryGraphNode,
  StorySettingsIndexEntry,
  VariableCatalogEntry,
  WorkspaceFile,
  WorkspaceManifest
} from '../../types/interfaces'

let counter = 0
function nextId(): string {
  counter += 1
  return `factory-${counter}`
}

export function resetFactoryCounter(): void {
  counter = 0
}

export function makeDiagnostic(overrides?: Partial<IdeDiagnostic>): IdeDiagnostic {
  return {
    severity: 'error',
    code: 'TEST_CODE',
    file: '/workspace/main.if',
    line: 1,
    col: 1,
    message: 'Test diagnostic message',
    hint: null,
    source: 'parser',
    ...overrides
  }
}

export function makeSectionIndex(overrides?: Partial<SectionIndexEntry>): SectionIndexEntry {
  return {
    serial: 1,
    title: 'Test Section',
    file: '/workspace/main.if',
    line: 1,
    col: 1,
    ...overrides
  }
}

export function makeSceneIndex(overrides?: Partial<SceneIndexEntry>): SceneIndexEntry {
  return {
    serial: 1,
    name: 'Test Scene',
    first: 'Prologue',
    sections: ['Prologue'],
    file: '/workspace/main.if',
    line: 1,
    col: 1,
    hasAmbience: false,
    sceneTransition: 'cut',
    firstResolved: true,
    ...overrides
  }
}

export function makeStorySettings(overrides?: Partial<StorySettingsIndexEntry>): StorySettingsIndexEntry {
  return {
    file: '/workspace/main.if',
    line: 1,
    col: 1,
    storyTitle: 'Test Story',
    startAt: 'Prologue',
    fullTimerSeconds: null,
    fullTimerTarget: null,
    fullTimerOutcome: null,
    storyAmbience: null,
    storyAmbienceVolume: 1,
    storyAmbienceLoop: true,
    presentationMode: 'literary',
    ...overrides
  }
}

export function makeSectionSettings(overrides?: Partial<SectionSettingsIndexEntry>): SectionSettingsIndexEntry {
  return {
    sectionSerial: 1,
    sectionTitle: 'Intro',
    file: '/workspace/main.if',
    line: 1,
    col: 1,
    timerSeconds: null,
    timerTarget: null,
    timerOutcome: null,
    ambience: null,
    ambienceVolume: 1,
    ambienceLoop: true,
    sfx: [],
    backdrop: null,
    shot: 'medium',
    textPacing: 'instant',
    ...overrides
  }
}

export function makeChoiceIndex(overrides?: Partial<ChoiceIndexEntry>): ChoiceIndexEntry {
  return {
    id: overrides?.id ?? nextId(),
    ownerSectionSerial: 1,
    ownerSectionTitle: 'Intro',
    choiceIndex: 0,
    file: '/workspace/main.if',
    line: 5,
    col: 3,
    sourceMode: 'legacy',
    targetType: 'section',
    target: 'Hallway',
    choiceSfx: null,
    focusSfx: null,
    choiceStyle: 'default',
    textPreview: 'Go to the hallway',
    ...overrides
  }
}

export function makeRuntimeEvent(overrides?: Partial<RuntimeEventEntry>): RuntimeEventEntry {
  return {
    event: 'section_enter',
    at: new Date().toISOString(),
    category: 'engine',
    summary: 'Entered section',
    payload: {},
    ...overrides
  }
}

export function makeRuntimeError(overrides?: Partial<RuntimeErrorEntry>): RuntimeErrorEntry {
  return {
    id: overrides?.id ?? nextId(),
    at: new Date().toISOString(),
    message: 'Something went wrong',
    code: 'RUNTIME_EXCEPTION',
    phase: 'execution',
    severity: 'error',
    sectionSerial: null,
    sceneSerial: null,
    location: null,
    summary: 'Something went wrong',
    details: null,
    ...overrides
  }
}

export function makeCommandPaletteItem(overrides?: Partial<CommandPaletteItem>): CommandPaletteItem {
  return {
    id: overrides?.id ?? nextId(),
    title: 'Test Command',
    shortcut: '',
    category: 'General',
    run: overrides?.run ?? (() => {}),
    ...overrides
  }
}

export function makeRuntimeDebugSnapshot(overrides?: Partial<RuntimeDebugSnapshot>): RuntimeDebugSnapshot {
  return {
    engine: null,
    audio: null,
    timeline: [],
    ...overrides
  }
}

export function makeManifest(overrides?: Partial<WorkspaceManifest>): WorkspaceManifest {
  return {
    id: 'workspace-default',
    name: 'Test Project',
    rootFile: '/workspace/main.if',
    files: ['/workspace/main.if'],
    aliases: {},
    updatedAt: new Date().toISOString(),
    storageMode: 'local-only',
    ...overrides
  }
}

export function makeWorkspaceFile(overrides?: Partial<WorkspaceFile>): WorkspaceFile {
  return {
    path: '/workspace/main.if',
    content: 'section "Intro"\nend\n',
    dirty: false,
    version: 1,
    lastSavedAt: null,
    ...overrides
  }
}

export function makeStoryGraph(overrides?: Partial<StoryGraph>): StoryGraph {
  return {
    nodes: [],
    edges: [],
    startNodeId: null,
    deadEnds: [],
    ...overrides
  }
}

export function makeStoryGraphNode(overrides?: Partial<StoryGraphNode>): StoryGraphNode {
  return {
    id: overrides?.id ?? nextId(),
    label: 'Test Node',
    nodeType: 'section',
    ending: false,
    unreachable: false,
    hasError: false,
    ...overrides
  }
}

export function makeStoryGraphEdge(overrides?: Partial<StoryGraphEdge>): StoryGraphEdge {
  return {
    from: 'n1',
    to: 'n2',
    targetType: 'section',
    conditional: false,
    unresolved: false,
    ...overrides
  }
}

export function makeAuthorGraphNode(overrides?: Partial<AuthorGraphNode>): AuthorGraphNode {
  return {
    id: overrides?.id ?? nextId(),
    kind: 'section',
    label: 'Test Node',
    file: '/workspace/main.if',
    sectionSerial: 1,
    sceneSerial: null,
    sourceRange: null,
    unreachable: false,
    hasError: false,
    affordances: {
      hasTimer: false,
      hasAmbience: false,
      hasBackdrop: false,
      hasSfx: false,
      hasConditionalChoices: false
    },
    ...overrides
  }
}

export function makeSectionContentIndex(overrides?: Partial<SectionContentIndexEntry>): SectionContentIndexEntry {
  return {
    sectionSerial: 1,
    file: '/workspace/main.if',
    blocks: [],
    supported: true,
    unsupportedNodeKinds: [],
    ...overrides
  }
}

export function makeVariableCatalogEntry(overrides?: Partial<VariableCatalogEntry>): VariableCatalogEntry {
  return {
    name: 'testVar',
    inferredType: 'number',
    inferredTypes: ['number'],
    defaultValue: 0,
    ...overrides
  }
}
