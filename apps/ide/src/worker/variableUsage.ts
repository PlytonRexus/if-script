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
    collectNode(node.input, visit)
    collectNode(node.variables, visit)
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

  if (klass === 'ArrayAccess') {
    collectNode(node.array, visit)
    collectNode(node.index, visit)
    return
  }

  if (klass === 'MemberAccess') {
    collectNode(node.object, visit)
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

function collectVariableNamesFromUnknown(input: unknown, out: Set<string>): void {
  if (typeof input === 'string') {
    const trimmed = input.trim()
    if (trimmed) out.add(trimmed)
    return
  }
  if (Array.isArray(input)) {
    input.forEach(entry => collectVariableNamesFromUnknown(entry, out))
    return
  }
  if (!input || typeof input !== 'object') return

  const node = input as any
  const klass = node._class

  if (klass === 'Token') {
    if (typeof node.symbol === 'string' && (!node.type || node.type === 'VARIABLE')) {
      const trimmed = node.symbol.trim()
      if (trimmed) out.add(trimmed)
    }
    return
  }

  if (klass === 'FunctionCall') {
    collectVariableNamesFromUnknown(node.args, out)
    return
  }

  if (klass === 'FunctionDef') {
    collectVariableNamesFromUnknown(node.body, out)
    return
  }

  if (klass === 'Action') {
    collectVariableNamesFromUnknown(node.left, out)
    collectVariableNamesFromUnknown(node.right, out)
    return
  }

  if (klass === 'ConditionalBlock') {
    collectVariableNamesFromUnknown(node.cond, out)
    collectVariableNamesFromUnknown(node.then, out)
    collectVariableNamesFromUnknown(node.ifBlock, out)
    collectVariableNamesFromUnknown(node.else, out)
    collectVariableNamesFromUnknown(node.elseBlock, out)
    return
  }

  if (klass === 'Loop') {
    collectVariableNamesFromUnknown(node.condition, out)
    collectVariableNamesFromUnknown(node.body, out)
    return
  }

  if (klass === 'Choice') {
    collectVariableNamesFromUnknown(node.text, out)
    collectVariableNamesFromUnknown(node.input, out)
    collectVariableNamesFromUnknown(node.variables, out)
    collectVariableNamesFromUnknown(node.when, out)
    collectVariableNamesFromUnknown(node.actions, out)
    return
  }

  if (klass === 'ArrayLiteral') {
    collectVariableNamesFromUnknown(node.elements, out)
    return
  }

  if (klass === 'ArrayAccess') {
    collectVariableNamesFromUnknown(node.array, out)
    collectVariableNamesFromUnknown(node.index, out)
    return
  }

  if (klass === 'MemberAccess') {
    collectVariableNamesFromUnknown(node.object, out)
    collectVariableNamesFromUnknown(node.args, out)
    return
  }

  if (typeof node.symbol === 'string' && (!node.type || node.type === 'VARIABLE')) {
    const trimmed = node.symbol.trim()
    if (trimmed) out.add(trimmed)
  }
  if (typeof node.name === 'string' && klass !== 'FunctionCall' && klass !== 'FunctionDef') {
    const trimmed = node.name.trim()
    if (trimmed) out.add(trimmed)
  }
}

export function extractVariableNames(input: unknown): string[] {
  const out = new Set<string>()
  collectVariableNamesFromUnknown(input, out)
  return Array.from(out)
}

function normalizeVariableName(name: string): string | null {
  const trimmed = name.trim()
  if (!trimmed || trimmed === 'turn') return null
  return trimmed
}

function collectInto(set: Set<string>, input: unknown): void {
  const names = extractVariableNames(input)
  names.forEach(name => {
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
      collectInto(names, node)
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
