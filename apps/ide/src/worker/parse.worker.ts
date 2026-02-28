/// <reference lib="webworker" />
import IFScript from 'if-script-core'
import { analyzeStory } from '../analyzer/check'
import { buildStoryGraph } from '../graph/buildStoryGraph'
import { FALLBACK_AUTHORING_SCHEMA } from '../authoring/schema'
import { buildChoiceIndex, buildSceneIndex, buildSectionSettingsIndex, buildStorySettingsIndex } from './authoringIndex'
import { buildSectionVariableNamesBySerial } from './variableUsage'
import { buildVariableCatalogAndWarnings } from './variableInference'
import type {
  IdeDiagnostic,
  ParseWorkerRequest,
  ParseWorkerResponse,
  SectionIndexEntry
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

function buildVariableInferenceDiagnostics(
  warnings: Array<{ name: string, inferredTypes: string[] }>,
  sourceFile: string
): IdeDiagnostic[] {
  return warnings.map((warning): IdeDiagnostic => ({
    severity: 'warning',
    code: 'VARIABLE_MULTI_TYPE',
    file: sourceFile,
    line: null,
    col: null,
    message: `Variable "${warning.name}" is inferred as multiple types: ${warning.inferredTypes.join(', ')}.`,
    hint: 'Consider normalizing this variable to a single type or explicitly handling type changes.',
    source: 'analyzer'
  }))
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
    const analyzerDiagnostics = analyzeStory(story, request.entryFile)
    const graph = buildStoryGraph(story)
    const sectionIndex = buildSectionIndex(story, request.entryFile)
    const variableInference = buildVariableCatalogAndWarnings(story)
    const variableCatalog = variableInference.variableCatalog
    const variableInferenceDiagnostics = buildVariableInferenceDiagnostics(variableInference.warnings, request.entryFile)
    const diagnostics = [...analyzerDiagnostics, ...variableInferenceDiagnostics]
    const sectionVariableNamesBySerial = buildSectionVariableNamesBySerial(story)
    const sceneIndex = buildSceneIndex(story, request.entryFile)
    const storySettingsIndex = buildStorySettingsIndex(story, request.entryFile)
    const sectionSettingsIndex = buildSectionSettingsIndex(story, request.entryFile)
    const choiceIndex = buildChoiceIndex(story, request.entryFile)
    const maybeSchema = typeof (ifs as any).getAuthoringSchema === 'function'
      ? (ifs as any).getAuthoringSchema()
      : null
    const authoringSchema = maybeSchema && typeof maybeSchema === 'object' ? maybeSchema : FALLBACK_AUTHORING_SCHEMA
    const analyzeMs = performance.now() - analyzeStart

    const payload: ParseWorkerResponse = {
      ok: true,
      requestId: request.requestId,
      story: null,
      diagnostics,
      graph,
      sectionIndex,
      sceneIndex,
      storySettingsIndex,
      sectionSettingsIndex,
      choiceIndex,
      authoringSchema,
      variableCatalog,
      sectionVariableNamesBySerial,
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
      sceneIndex: [],
      storySettingsIndex: null,
      sectionSettingsIndex: [],
      choiceIndex: [],
      authoringSchema: FALLBACK_AUTHORING_SCHEMA,
      variableCatalog: [],
      sectionVariableNamesBySerial: {},
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
