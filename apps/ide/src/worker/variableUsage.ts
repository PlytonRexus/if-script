export function extractVariableNames(input: unknown): string[] {
  if (typeof input === 'string' && input.trim() !== '') return [input]
  if (Array.isArray(input)) return input.flatMap(entry => extractVariableNames(entry))
  if (!input || typeof input !== 'object') return []
  const node = input as any
  if (typeof node.symbol === 'string' && node.symbol.trim() !== '') return [node.symbol]
  if (typeof node.name === 'string' && node.name.trim() !== '') return [node.name]
  return []
}

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

export function visitSectionNodes(section: any, visit: (node: any) => void): void {
  collectNodes(section?.text ?? [], visit)
}

function normalizeVariableName(name: string): string | null {
  const trimmed = name.trim()
  if (!trimmed || trimmed === 'turn') return null
  return trimmed
}

function collectInto(set: Set<string>, input: unknown): void {
  extractVariableNames(input).forEach(name => {
    const normalized = normalizeVariableName(name)
    if (normalized) set.add(normalized)
  })
}

export function buildSectionVariableNamesBySerial(story: any): Record<number, string[]> {
  const out: Record<number, string[]> = {}

  ;(story?.sections ?? []).forEach((section: any) => {
    const serial = typeof section?.serial === 'number' ? section.serial : null
    if (serial == null) return

    const names = new Set<string>()
    visitSectionNodes(section, (node) => {
      if (!node || typeof node !== 'object') return
      if (node._class === 'Action') {
        collectInto(names, node.left)
        collectInto(names, node.right)
      }
      if (node._class === 'Choice') {
        collectInto(names, node.input)
        collectInto(names, node.variables)
        collectInto(names, node.when)
      }
    })

    out[serial] = Array.from(names).sort((a, b) => a.localeCompare(b))
  })

  return out
}
