import type {
  AuthorGraphEdge,
  AuthorGraphGroup,
  AuthorGraphModel,
  AuthorGraphNode,
  ChoiceIndexEntry,
  SceneIndexEntry,
  SectionIndexEntry,
  SectionSettingsIndexEntry
} from '../types/interfaces'

function tokenForGroup(seed: string): string {
  void seed
  return 'graph-group-slate'
}

function sectionKey(section: SectionIndexEntry): string {
  return section.entityId ?? `section:${section.file}:${section.line}:${section.serial}`
}

function unresolvedNode(id: string, label: string, file: string): AuthorGraphNode {
  return {
    id,
    kind: 'unresolved',
    label,
    file,
    sectionSerial: null,
    sceneSerial: null,
    sourceRange: null,
    unreachable: false,
    hasError: true,
    affordances: {
      hasTimer: false,
      hasAmbience: false,
      hasBackdrop: false,
      hasSfx: false,
      hasConditionalChoices: false
    }
  }
}

function matchSectionRef(
  ref: string | number | null | undefined,
  sectionsBySerial: Map<number, SectionIndexEntry>,
  sectionsByTitle: Map<string, SectionIndexEntry[]>
): SectionIndexEntry | null {
  if (typeof ref === 'number') return sectionsBySerial.get(ref) ?? null
  if (typeof ref !== 'string' || ref.trim() === '') return null
  const matches = sectionsByTitle.get(ref.trim()) ?? []
  return matches[0] ?? null
}

function resolveSceneMembership(
  sections: SectionIndexEntry[],
  scenes: SceneIndexEntry[]
): Map<string, SceneIndexEntry> {
  const bySectionId = new Map<string, SceneIndexEntry>()
  const bySerial = new Map<number, SectionIndexEntry>()
  const byTitle = new Map<string, SectionIndexEntry[]>()

  sections.forEach(section => {
    bySerial.set(section.serial, section)
    const list = byTitle.get(section.title) ?? []
    list.push(section)
    byTitle.set(section.title, list)
  })

  scenes.forEach(scene => {
    const refs = new Set<string | number>()
    scene.sections.forEach(ref => refs.add(ref))
    if (scene.first != null) refs.add(scene.first)
    refs.forEach(ref => {
      const match = matchSectionRef(ref, bySerial, byTitle)
      if (!match) return
      const key = sectionKey(match)
      if (!bySectionId.has(key)) bySectionId.set(key, scene)
    })
  })

  return bySectionId
}

function resolveChoiceTargetNodeId(
  choice: ChoiceIndexEntry,
  sectionsBySerial: Map<number, SectionIndexEntry>,
  sectionsByTitle: Map<string, SectionIndexEntry[]>,
  scenesBySerial: Map<number, SceneIndexEntry>,
  scenesByName: Map<string, SceneIndexEntry[]>,
  sceneSectionTargets: Map<number, string | null>
): { nodeId: string, unresolved: boolean } {
  if (choice.targetType === 'scene') {
    let scene: SceneIndexEntry | null = null
    if (typeof choice.target === 'number') {
      scene = scenesBySerial.get(choice.target) ?? null
    } else if (typeof choice.target === 'string' && choice.target.trim() !== '') {
      scene = (scenesByName.get(choice.target.trim()) ?? [])[0] ?? null
    }

    if (!scene) {
      return {
        nodeId: `unresolved:scene:${String(choice.target ?? '<missing>')}`,
        unresolved: true
      }
    }

    const firstNodeId = sceneSectionTargets.get(scene.serial) ?? null
    if (!firstNodeId) {
      return {
        nodeId: `unresolved:scene:${scene.name}`,
        unresolved: true
      }
    }

    return { nodeId: firstNodeId, unresolved: false }
  }

  const section = matchSectionRef(choice.target, sectionsBySerial, sectionsByTitle)
  if (!section) {
    return {
      nodeId: `unresolved:section:${String(choice.target ?? '<missing>')}`,
      unresolved: true
    }
  }
  return { nodeId: sectionKey(section), unresolved: false }
}

export function buildAuthorGraph(input: {
  graph: { deadEnds: string[] }
  sectionIndex: SectionIndexEntry[]
  sceneIndex: SceneIndexEntry[]
  sectionSettingsIndex: SectionSettingsIndexEntry[]
  choiceIndex: ChoiceIndexEntry[]
}): AuthorGraphModel {
  const sectionsBySerial = new Map<number, SectionIndexEntry>()
  const sectionsByTitle = new Map<string, SectionIndexEntry[]>()
  const sectionSettingsBySerial = new Map<number, SectionSettingsIndexEntry>()
  const scenesBySerial = new Map<number, SceneIndexEntry>()
  const scenesByName = new Map<string, SceneIndexEntry[]>()
  const membership = resolveSceneMembership(input.sectionIndex, input.sceneIndex)
  const deadEnds = new Set(input.graph.deadEnds)

  input.sectionIndex.forEach(section => {
    sectionsBySerial.set(section.serial, section)
    const list = sectionsByTitle.get(section.title) ?? []
    list.push(section)
    sectionsByTitle.set(section.title, list)
  })
  input.sectionSettingsIndex.forEach(section => {
    sectionSettingsBySerial.set(section.sectionSerial, section)
  })
  input.sceneIndex.forEach(scene => {
    scenesBySerial.set(scene.serial, scene)
    const list = scenesByName.get(scene.name) ?? []
    list.push(scene)
    scenesByName.set(scene.name, list)
  })

  const sceneSectionTargets = new Map<number, string | null>()
  input.sceneIndex.forEach(scene => {
    const match = matchSectionRef(scene.first, sectionsBySerial, sectionsByTitle)
    sceneSectionTargets.set(scene.serial, match ? sectionKey(match) : null)
  })

  const conditionalSections = new Set<number>()
  input.choiceIndex.forEach(choice => {
    if (choice.when) conditionalSections.add(choice.ownerSectionSerial)
  })

  const nodes = new Map<string, AuthorGraphNode>()
  input.sectionIndex.forEach(section => {
    const settings = sectionSettingsBySerial.get(section.serial)
    const scene = membership.get(sectionKey(section)) ?? null
    nodes.set(sectionKey(section), {
      id: sectionKey(section),
      kind: 'section',
      label: section.title,
      file: section.file,
      sectionSerial: section.serial,
      sceneSerial: scene?.serial ?? null,
      sourceRange: section.sourceRange ?? null,
      unreachable: false,
      hasError: deadEnds.has(sectionKey(section)),
      affordances: {
        hasTimer: Boolean(settings?.timerSeconds),
        hasAmbience: Boolean(settings?.ambience),
        hasBackdrop: Boolean(settings?.backdrop),
        hasSfx: Boolean(settings?.sfx.length),
        hasConditionalChoices: conditionalSections.has(section.serial)
      }
    })
  })

  const edges: AuthorGraphEdge[] = input.choiceIndex.map((choice) => {
    const owner = sectionsBySerial.get(choice.ownerSectionSerial)
    const fromNodeId = owner ? sectionKey(owner) : `unresolved:section:${choice.ownerSectionTitle}`
    const target = resolveChoiceTargetNodeId(choice, sectionsBySerial, sectionsByTitle, scenesBySerial, scenesByName, sceneSectionTargets)
    if (target.unresolved && !nodes.has(target.nodeId)) {
      const missingLabel = choice.targetType === 'scene'
        ? `Missing scene: ${String(choice.target ?? '<missing>')}`
        : `Missing section: ${String(choice.target ?? '<missing>')}`
      nodes.set(target.nodeId, unresolvedNode(target.nodeId, missingLabel, owner?.file ?? choice.file))
    }
    return {
      id: choice.entityId ?? `${choice.id}:${String(choice.target ?? '<missing>')}`,
      choiceId: choice.id,
      fromNodeId,
      toNodeId: target.nodeId,
      conditional: Boolean(choice.when),
      unresolved: target.unresolved,
      targetType: choice.targetType
    }
  })

  const groupsMap = new Map<string, AuthorGraphGroup>()
  input.sectionIndex.forEach(section => {
    const scene = membership.get(sectionKey(section)) ?? null
    const groupId = scene ? `scene:${scene.serial}` : `file:${section.file}`
    if (!groupsMap.has(groupId)) {
      const label = scene ? scene.name : section.file.replace('/workspace/', '')
      groupsMap.set(groupId, {
        id: groupId,
        kind: scene ? 'scene' : 'file',
        label,
        file: section.file,
        sceneSerial: scene?.serial ?? null,
        nodeIds: [],
        colorToken: tokenForGroup(groupId),
        iconKey: scene?.hasAmbience ? 'scene-audio' : (scene ? 'scene' : 'file')
      })
    }
    groupsMap.get(groupId)?.nodeIds.push(sectionKey(section))
  })

  return {
    nodes: Array.from(nodes.values()),
    edges,
    groups: Array.from(groupsMap.values()).sort((a, b) => a.label.localeCompare(b.label))
  }
}
