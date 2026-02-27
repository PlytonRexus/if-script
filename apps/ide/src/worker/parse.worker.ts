/// <reference lib="webworker" />
import IFScript from 'if-script-core'
import { analyzeStory } from '../analyzer/check'
import { buildStoryGraph } from '../graph/buildStoryGraph'
import type { IdeDiagnostic, ParseWorkerRequest, ParseWorkerResponse } from '../types/interfaces'

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
    const analyzeMs = performance.now() - analyzeStart

    const payload: ParseWorkerResponse = {
      ok: true,
      requestId: request.requestId,
      story: null,
      diagnostics,
      graph,
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
