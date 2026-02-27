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

function resolveSectionTitle(story: any, sectionRef: unknown): string | null {
  if (sectionRef === undefined || sectionRef === null || sectionRef === '') return null
  if (typeof sectionRef === 'number') {
    const section = (story.sections ?? []).find((item: any) => item.serial === sectionRef)
    return section?.settings?.title ?? null
  }
  return String(sectionRef)
}

function resolveScene(story: any, sceneRef: unknown): any | null {
  if (sceneRef === undefined || sceneRef === null || sceneRef === '') return null
  if (typeof sceneRef === 'number') {
    return (story.scenes ?? []).find((scene: any) => scene.serial === sceneRef) ?? null
  }
  return (story.scenes ?? []).find((scene: any) => scene.name === String(sceneRef)) ?? null
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
    const id = `section:${title}`
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
    const sceneId = `scene:${sceneName}`
    nodes.set(sceneId, {
      id: sceneId,
      label: sceneName,
      nodeType: 'scene',
      ending: false,
      unreachable: false,
      hasError: false
    })

    const firstTitle = resolveSectionTitle(story, scene?.first)
    if (!firstTitle) return
    const firstId = `section:${firstTitle}`
    edges.push({
      from: sceneId,
      to: firstId,
      targetType: 'scene',
      conditional: false,
      unresolved: !nodes.has(firstId)
    })
    if (!nodes.has(firstId)) unresolvedTargets.add(firstId)
  })

  ;(story.sections ?? []).forEach((section: any) => {
    const sourceTitle = section?.settings?.title ?? `Section ${section?.serial ?? '?'}`
    const from = `section:${sourceTitle}`

    getChoiceTargets(section).forEach(choice => {
      const targetType = choice.targetType === 'scene' ? 'scene' : 'section'
      const conditional = Boolean(choice.when)

      if (targetType === 'scene') {
        const scene = resolveScene(story, choice.target)
        const sceneName = scene?.name ?? String(choice.target)
        const sceneId = `scene:${sceneName}`
        const unresolved = !scene || !nodes.has(sceneId)
        edges.push({ from, to: sceneId, targetType, conditional, unresolved })
        if (unresolved) unresolvedTargets.add(sceneId)
      } else {
        const title = resolveSectionTitle(story, choice.target)
        const targetId = title ? `section:${title}` : `unresolved:${String(choice.target)}`
        const unresolved = !title || !nodes.has(targetId)
        edges.push({ from, to: targetId, targetType, conditional, unresolved })
        if (unresolved) unresolvedTargets.add(targetId)
      }
    })
  })

  unresolvedTargets.forEach(targetId => {
    if (nodes.has(targetId)) return
    nodes.set(targetId, {
      id: targetId,
      label: targetId.replace(/^unresolved:/, '').replace(/^scene:/, ''),
      nodeType: 'unresolved',
      ending: false,
      unreachable: false,
      hasError: true
    })
  })

  const startTitle = resolveSectionTitle(story, story?.settings?.startAt)
  const startNodeId = startTitle ? `section:${startTitle}` : null
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
