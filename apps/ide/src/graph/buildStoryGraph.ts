import type { StoryGraph, StoryGraphEdge, StoryGraphNode } from '../types/interfaces'

function collectNodes(nodes: any[], visit: (node: any) => void): void {
  if (!Array.isArray(nodes)) return
  nodes.forEach(node => collectNode(node, visit))
}

function collectNode(node: any, visit: (node: any) => void): void {
  if (!node) return
  visit(node)

  const klass = node._class
  if (klass === 'ConditionalBlock') {
    collectNode(node.cond, visit)
    collectNode(node.then, visit)
    collectNodes(node.ifBlock, visit)
    collectNode(node.else, visit)
    collectNodes(node.elseBlock, visit)
    return
  }

  if (klass === 'Loop') {
    collectNode(node.condition, visit)
    collectNodes(node.body, visit)
    return
  }

  if (klass === 'FunctionDef') {
    collectNodes(node.body, visit)
    return
  }

  if (klass === 'Choice') {
    collectNodes(node.text, visit)
    collectNode(node.when, visit)
    collectNodes(node.actions, visit)
    return
  }

  if (klass === 'Action') {
    collectNode(node.left, visit)
    collectNode(node.right, visit)
    return
  }

  if (klass === 'FunctionCall') {
    collectNodes(node.args, visit)
    return
  }

  if (klass === 'ArrayLiteral') {
    collectNodes(node.elements, visit)
  }
}

function idPart(input: any, serialFallback: unknown): string {
  const source = input?.sourceRange ?? input?.source ?? null
  const file = typeof source?.file === 'string' ? source.file : '<inline>'
  const startLine = typeof source?.startLine === 'number'
    ? source.startLine
    : (typeof source?.line === 'number' ? source.line : 0)
  const startCol = typeof source?.startCol === 'number'
    ? source.startCol
    : (typeof source?.col === 'number' ? source.col : 0)
  const endLine = typeof source?.endLine === 'number' ? source.endLine : startLine
  const endCol = typeof source?.endCol === 'number' ? source.endCol : startCol
  return `${file}:${startLine}:${startCol}:${endLine}:${endCol}:${String(serialFallback ?? '?')}`
}

function sectionNodeId(section: any): string {
  return `section:${idPart(section, section?.serial)}`
}

function sceneNodeId(scene: any): string {
  return `scene:${idPart(scene, scene?.serial)}`
}

function resolveSectionTargets(story: any, sectionRef: unknown): any[] {
  if (sectionRef === undefined || sectionRef === null || sectionRef === '') return []
  const sections = Array.isArray(story?.sections) ? story.sections : []
  if (typeof sectionRef === 'number') {
    return sections.filter((section: any) => section?.serial === sectionRef)
  }
  const text = String(sectionRef)
  return sections.filter((section: any) => String(section?.settings?.title ?? '') === text)
}

function resolveSceneTargets(story: any, sceneRef: unknown): any[] {
  if (sceneRef === undefined || sceneRef === null || sceneRef === '') return []
  const scenes = Array.isArray(story?.scenes) ? story.scenes : []
  if (typeof sceneRef === 'number') {
    return scenes.filter((scene: any) => scene?.serial === sceneRef)
  }
  const text = String(sceneRef)
  return scenes.filter((scene: any) => String(scene?.name ?? '') === text)
}

function getChoiceTargets(section: any): any[] {
  const choices: any[] = []
  collectNodes(section?.text ?? [], node => {
    if (node?._class === 'Choice') {
      choices.push(node)
    }
  })
  return choices
}

function endingTitle(title: string): boolean {
  return /^END-[A-Z]:\s/i.test(title)
}

function bfsReachable(start: string | null, edges: StoryGraphEdge[]): Set<string> {
  const reachable = new Set<string>()
  if (!start) return reachable

  const adjacency = new Map<string, string[]>()
  edges.forEach(edge => {
    if (edge.unresolved) return
    const list = adjacency.get(edge.from) ?? []
    list.push(edge.to)
    adjacency.set(edge.from, list)
  })

  const queue = [start]
  reachable.add(start)

  while (queue.length > 0) {
    const current = queue.shift()
    if (!current) break
    const nextNodes = adjacency.get(current) ?? []
    nextNodes.forEach(next => {
      if (!reachable.has(next)) {
        reachable.add(next)
        queue.push(next)
      }
    })
  }

  return reachable
}

export function buildStoryGraph(story: any): StoryGraph {
  const nodes = new Map<string, StoryGraphNode>()
  const edges: StoryGraphEdge[] = []
  const unresolvedTargets = new Set<string>()

  ;(story.sections ?? []).forEach((section: any) => {
    const title = section?.settings?.title ?? `Section ${section?.serial ?? '?'}`
    const id = sectionNodeId(section)
    nodes.set(id, {
      id,
      label: title,
      nodeType: 'section',
      ending: endingTitle(title),
      unreachable: false,
      hasError: false
    })
  })

  ;(story.scenes ?? []).forEach((scene: any) => {
    const sceneName = scene?.name ?? `Scene ${scene?.serial ?? '?'}`
    const sceneId = sceneNodeId(scene)
    nodes.set(sceneId, {
      id: sceneId,
      label: sceneName,
      nodeType: 'scene',
      ending: false,
      unreachable: false,
      hasError: false
    })

    const firstTargets = resolveSectionTargets(story, scene?.first)
    if (firstTargets.length === 0 && scene?.first !== undefined && scene?.first !== null && scene?.first !== '') {
      const unresolvedId = `unresolved:section:${String(scene.first)}`
      edges.push({
        from: sceneId,
        to: unresolvedId,
        targetType: 'scene',
        conditional: false,
        unresolved: true
      })
      unresolvedTargets.add(unresolvedId)
      return
    }
    firstTargets.forEach((targetSection: any) => {
      edges.push({
        from: sceneId,
        to: sectionNodeId(targetSection),
        targetType: 'scene',
        conditional: false,
        unresolved: false
      })
    })
  })

  ;(story.sections ?? []).forEach((section: any) => {
    const from = sectionNodeId(section)

    getChoiceTargets(section).forEach(choice => {
      const targetType = choice.targetType === 'scene' ? 'scene' : 'section'
      const conditional = Boolean(choice.when)
      const isSet = choice.target !== undefined && choice.target !== null && choice.target !== ''

      if (targetType === 'scene') {
        const targets = resolveSceneTargets(story, choice.target)
        if (!isSet || targets.length === 0) {
          const unresolvedId = `unresolved:scene:${String(choice.target ?? '<missing>')}`
          edges.push({ from, to: unresolvedId, targetType, conditional, unresolved: true })
          unresolvedTargets.add(unresolvedId)
          return
        }
        targets.forEach((sceneTarget: any) => {
          edges.push({
            from,
            to: sceneNodeId(sceneTarget),
            targetType,
            conditional,
            unresolved: false
          })
        })
        return
      }

      const targets = resolveSectionTargets(story, choice.target)
      if (!isSet || targets.length === 0) {
        const unresolvedId = `unresolved:section:${String(choice.target ?? '<missing>')}`
        edges.push({ from, to: unresolvedId, targetType, conditional, unresolved: true })
        unresolvedTargets.add(unresolvedId)
        return
      }
      targets.forEach((sectionTarget: any) => {
        edges.push({
          from,
          to: sectionNodeId(sectionTarget),
          targetType,
          conditional,
          unresolved: false
        })
      })
    })
  })

  unresolvedTargets.forEach(targetId => {
    if (nodes.has(targetId)) return
    nodes.set(targetId, {
      id: targetId,
      label: targetId
        .replace(/^unresolved:section:/, 'missing section: ')
        .replace(/^unresolved:scene:/, 'missing scene: '),
      nodeType: 'unresolved',
      ending: false,
      unreachable: false,
      hasError: true
    })
  })

  const startTargets = resolveSectionTargets(story, story?.settings?.startAt)
  const startNodeId = startTargets[0] ? sectionNodeId(startTargets[0]) : null
  const reachable = bfsReachable(startNodeId, edges)

  const deadEnds: string[] = []
  nodes.forEach(node => {
    if (node.nodeType !== 'section') return
    const outgoing = edges.filter(edge => edge.from === node.id && !edge.unresolved)
    if (!node.ending && outgoing.length === 0) {
      deadEnds.push(node.id)
      node.hasError = true
    }

    if (startNodeId && !reachable.has(node.id)) {
      node.unreachable = true
    }

    const hasUnresolvedOutgoing = edges.some(edge => edge.from === node.id && edge.unresolved)
    if (hasUnresolvedOutgoing) node.hasError = true
  })

  if (startNodeId && nodes.has(startNodeId)) {
    const startNode = nodes.get(startNodeId)
    if (startNode) startNode.unreachable = false
  }

  return {
    nodes: Array.from(nodes.values()),
    edges,
    startNodeId,
    deadEnds
  }
}

