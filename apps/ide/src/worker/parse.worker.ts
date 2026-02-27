/// <reference lib="webworker" />
import IFScript from 'if-script-core'
import { analyzeStory } from '../analyzer/check'
import { buildStoryGraph } from '../graph/buildStoryGraph'
import type {
  IdeDiagnostic,
  InferredVariableType,
  ParseWorkerRequest,
  ParseWorkerResponse,
  SectionIndexEntry,
  VariableCatalogEntry
} from '../types/interfaces'

const globalScope: DedicatedWorkerGlobalScope = self as unknown as DedicatedWorkerGlobalScope

function parserErrorToDiagnostic(err: any, fallbackFile: string): IdeDiagnostic {
  return {
    severity: 'error',
    code: 'PARSE_OR_IMPORT_ERROR',
    file: err?.file ?? fallbackFile,
    line: typeof err?.line === 'number' ? err.line : null,
    col: typeof err?.col === 'number' ? err.col : null,
    message: String(err?.message ?? 'Unknown parser error'),
    hint: err?.hint ? String(err.hint) : null,
    source: 'parser'
  }
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

function buildSectionIndex(story: any, fallbackFile: string): SectionIndexEntry[] {
  const entries: SectionIndexEntry[] = []

  ;(story.sections ?? []).forEach((section: any) => {
    const source = section?.source
    if (!source || typeof source !== 'object') return
    const file = typeof source.file === 'string' && source.file.trim() !== ''
      ? source.file
      : fallbackFile
    const line = typeof source.line === 'number' && source.line > 0
      ? source.line
      : null
    const col = typeof source.col === 'number' && source.col > 0
      ? source.col
      : 1
    if (line === null) return
    const title = typeof section?.settings?.title === 'string' && section.settings.title.trim() !== ''
      ? section.settings.title
      : `Section ${section?.serial ?? '?'}`

    entries.push({
      serial: typeof section?.serial === 'number' ? section.serial : -1,
      title,
      file,
      line,
      col
    })
  })

  return entries.sort((a, b) => {
    if (a.file !== b.file) return a.file.localeCompare(b.file)
    if (a.line !== b.line) return a.line - b.line
    if (a.col !== b.col) return a.col - b.col
    return a.serial - b.serial
  })
}

function inferTypeFromValue(value: unknown): InferredVariableType {
  if (Array.isArray(value)) return 'array'
  if (typeof value === 'number') return 'number'
  if (typeof value === 'string') return 'string'
  if (typeof value === 'boolean') return 'boolean'
  if (value && typeof value === 'object') return 'object'
  return 'unknown'
}

function inferTypeFromNode(node: any): InferredVariableType {
  if (!node || typeof node !== 'object') return 'unknown'
  if (node._class === 'ArrayLiteral') return 'array'
  if (node._class === 'Token') {
    if (node.type === 'NUMBER') return 'number'
    if (node.type === 'STRING') return 'string'
    if (node.type === 'BOOLEAN') return 'boolean'
    return 'unknown'
  }
  return inferTypeFromValue(node)
}

function mergeTypes(current: InferredVariableType, next: InferredVariableType): InferredVariableType {
  if (current === next) return current
  if (current === 'unknown') return next
  if (next === 'unknown') return current
  return 'unknown'
}

function extractVariableNames(input: unknown): string[] {
  if (typeof input === 'string' && input.trim() !== '') return [input]
  if (Array.isArray(input)) return input.flatMap(entry => extractVariableNames(entry))
  if (!input || typeof input !== 'object') return []
  const node = input as any
  if (typeof node.symbol === 'string' && node.symbol.trim() !== '') return [node.symbol]
  if (typeof node.name === 'string' && node.name.trim() !== '') return [node.name]
  return []
}

function buildVariableCatalog(story: any): VariableCatalogEntry[] {
  const catalog = new Map<string, VariableCatalogEntry>()

  const mergeVariable = (name: string, inferredType: InferredVariableType, defaultValue?: unknown) => {
    if (!name || name === 'turn') return
    const existing = catalog.get(name)
    if (!existing) {
      const next: VariableCatalogEntry = { name, inferredType }
      if (defaultValue !== undefined) next.defaultValue = defaultValue
      catalog.set(name, next)
      return
    }
    existing.inferredType = mergeTypes(existing.inferredType, inferredType)
    if (existing.defaultValue === undefined && defaultValue !== undefined) {
      existing.defaultValue = defaultValue
    }
  }

  const persistent = story?.persistent ?? story?.variables ?? {}
  Object.entries(persistent).forEach(([name, value]) => {
    mergeVariable(name, inferTypeFromValue(value), value)
  })

  const stats = story?.stats ?? {}
  Object.keys(stats).forEach(name => {
    mergeVariable(name, 'unknown')
  })

  ;(story.sections ?? []).forEach((section: any) => {
    collectNodes(section?.text ?? [], (node) => {
      if (node?._class === 'Action' && node.type === 'assign') {
        const names = extractVariableNames(node.left)
        names.forEach(name => mergeVariable(name, inferTypeFromNode(node.right)))
      }
      if (node?._class === 'Choice') {
        extractVariableNames(node.input).forEach(name => mergeVariable(name, 'string'))
        extractVariableNames(node.variables).forEach(name => mergeVariable(name, 'string'))
      }
    })
  })

  return Array.from(catalog.values()).sort((a, b) => a.name.localeCompare(b.name))
}

globalScope.onmessage = async (event: MessageEvent<ParseWorkerRequest>) => {
  const startedAt = performance.now()
  const request = event.data

  try {
    const ifs = new IFScript({
      browser: {
        preloadedFiles: request.workspaceSnapshot,
        allowFetch: false
      },
      paths: {
        aliases: request.aliases,
        basePath: '/workspace'
      }
    })

    await ifs.init()

    const source = request.workspaceSnapshot[request.entryFile]
    if (typeof source !== 'string') {
      throw new Error(`Entry file not found in snapshot: ${request.entryFile}`)
    }

    const parseStart = performance.now()
    const story = await ifs.parse(source, request.entryFile)
    const parseMs = performance.now() - parseStart

    const analyzeStart = performance.now()
    const diagnostics = analyzeStory(story, request.entryFile)
    const graph = buildStoryGraph(story)
    const sectionIndex = buildSectionIndex(story, request.entryFile)
    const variableCatalog = buildVariableCatalog(story)
    const analyzeMs = performance.now() - analyzeStart

    const payload: ParseWorkerResponse = {
      ok: true,
      requestId: request.requestId,
      story: null,
      diagnostics,
      graph,
      sectionIndex,
      variableCatalog,
      timings: {
        parseMs,
        analyzeMs,
        totalMs: performance.now() - startedAt
      }
    }

    globalScope.postMessage(payload)
  } catch (err) {
    const payload: ParseWorkerResponse = {
      ok: false,
      requestId: request.requestId,
      story: null,
      diagnostics: [parserErrorToDiagnostic(err, request.entryFile)],
      graph: {
        nodes: [],
        edges: [],
        startNodeId: null,
        deadEnds: []
      },
      sectionIndex: [],
      variableCatalog: [],
      timings: {
        parseMs: 0,
        analyzeMs: 0,
        totalMs: performance.now() - startedAt
      }
    }
    globalScope.postMessage(payload)
  }
}

export {}
