import { useEffect, useMemo, useRef, useState } from 'react'
import IFScript from 'if-script-core'
import { buildSectionPreviewStartOptions, buildVariableOverridesTemplate, parseVariableOverridesJson } from '../preview/sectionPreview'
import type { RuntimeEventEntry, SectionIndexEntry, VariableCatalogEntry, WorkspaceManifest } from '../types/interfaces'

const FORWARDED_EVENTS = [
  'session_started',
  'section_entered',
  'choices_updated',
  'stats_updated',
  'variable_changed',
  'scene_changed',
  'timer_started',
  'timer_elapsed',
  'timer_stopped',
  'turn_changed',
  'choice_consumed',
  'save_written',
  'save_loaded',
  'error_raised'
] as const

interface PreviewPaneProps {
  manifest: WorkspaceManifest
  snapshot: Record<string, string>
  parseStatus: 'idle' | 'running' | 'error' | 'ok'
  focusedSection: SectionIndexEntry | null
  variableCatalog: VariableCatalogEntry[]
  variableOverrideText: string
  onVariableOverrideTextChange: (next: string) => void
  playtestNonce: number
  onRuntimeEvent: (entry: RuntimeEventEntry) => void
}

export function PreviewPane(props: PreviewPaneProps): JSX.Element {
  const {
    manifest,
    snapshot,
    parseStatus,
    focusedSection,
    variableCatalog,
    variableOverrideText,
    onVariableOverrideTextChange,
    playtestNonce,
    onRuntimeEvent
  } = props
  const previewRef = useRef<HTMLDivElement | null>(null)
  const runtimeRef = useRef<any>(null)
  const latestRef = useRef({
    manifest,
    snapshot,
    parseStatus,
    focusedSection,
    variableOverrideText,
    onRuntimeEvent
  })
  const [status, setStatus] = useState('idle')
  const [message, setMessage] = useState('Move the cursor inside a section to mount preview.')

  const parsedOverrides = useMemo(() => {
    return parseVariableOverridesJson(variableOverrideText)
  }, [variableOverrideText])

  const startOptions = useMemo(() => {
    return buildSectionPreviewStartOptions(focusedSection, parsedOverrides.value ?? {})
  }, [focusedSection, parsedOverrides.value])

  useEffect(() => {
    latestRef.current = {
      manifest,
      snapshot,
      parseStatus,
      focusedSection,
      variableOverrideText,
      onRuntimeEvent
    }
  }, [focusedSection, manifest, onRuntimeEvent, parseStatus, snapshot, variableOverrideText])

  useEffect(() => {
    let cancelled = false
    if (!focusedSection) {
      setStatus('idle')
      setMessage('Move the cursor inside a section to mount preview.')
      return
    }
    if (parseStatus !== 'ok') {
      setStatus('idle')
      setMessage('Fix parse errors to preview the focused section.')
      return
    }
    if (parsedOverrides.error) {
      setStatus('error')
      setMessage('Variable overrides JSON is invalid.')
      return
    }
    if (!startOptions) return

    const run = async () => {
      if (!previewRef.current) return
      setStatus('running')
      setMessage(`Starting preview at "${focusedSection.title}"...`)

      try {
        const current = latestRef.current
        const source = current.snapshot[current.manifest.rootFile]
        if (typeof source !== 'string') {
          throw new Error(`Entry file not found: ${current.manifest.rootFile}`)
        }

        if (runtimeRef.current?.destroy) {
          runtimeRef.current.destroy()
        }

        previewRef.current.innerHTML = ''

        const ifs = new IFScript({
          browser: {
            preloadedFiles: current.snapshot,
            allowFetch: false
          },
          paths: {
            aliases: current.manifest.aliases,
            basePath: '/workspace'
          }
        })

        await ifs.init()
        const story = await ifs.parse(source, current.manifest.rootFile)
        const runtime = await ifs.createRuntime({ debug: true })
        runtimeRef.current = runtime

        FORWARDED_EVENTS.forEach(eventName => {
          runtime.on(eventName, (payload: unknown) => {
            current.onRuntimeEvent({
              event: eventName,
              at: new Date().toISOString(),
              payload
            })
          })
        })

        runtime.mount(previewRef.current)
        runtime.start(story, startOptions)

        if (!cancelled) {
          setStatus('ok')
          setMessage(`Preview active for "${focusedSection.title}".`)
        }
      } catch (err) {
        if (cancelled) return
        setStatus('error')
        setMessage(String((err as Error)?.message ?? err))
      }
    }

    const delay = playtestNonce > 0 ? 50 : 320
    const timer = window.setTimeout(() => {
      run().catch(() => {})
    }, delay)

    return () => {
      cancelled = true
      window.clearTimeout(timer)
    }
  }, [focusedSection, parseStatus, parsedOverrides.error, playtestNonce, startOptions])

  const handleUseTemplate = () => {
    const template = buildVariableOverridesTemplate(variableCatalog)
    onVariableOverrideTextChange(JSON.stringify(template, null, 2))
  }

  useEffect(() => {
    return () => {
      if (runtimeRef.current?.destroy) {
        runtimeRef.current.destroy()
      }
      runtimeRef.current = null
    }
  }, [])

  return (
    <section className="panel preview-panel">
      <div className="panel-header">
        <h2>Section Playtest</h2>
        <span className={`status-pill status-${status === 'running' ? 'running' : status === 'ok' ? 'ok' : status === 'error' ? 'error' : 'idle'}`}>{status}</span>
      </div>

      <p className="preview-section-context">
        {focusedSection
          ? `Focused: ${focusedSection.title} (line ${focusedSection.line})`
          : 'Focused: none'}
      </p>
      <p className="preview-message">{message}</p>
      <div className="preview-seed-editor">
        <div className="preview-seed-header">
          <h3>Variables JSON</h3>
          <button type="button" className="mini-btn" onClick={handleUseTemplate}>Use Template</button>
        </div>
        <textarea
          className="preview-seed-input"
          value={variableOverrideText}
          onChange={(event) => onVariableOverrideTextChange(event.currentTarget.value)}
          spellCheck={false}
          disabled={!focusedSection}
        />
        {parsedOverrides.error ? <p className="preview-seed-error">{parsedOverrides.error}</p> : null}
        {variableCatalog.length > 0 ? (
          <p className="preview-seed-hints">
            Suggested variables: {variableCatalog.map(variable => `${variable.name}:${variable.inferredType}`).join(', ')}
          </p>
        ) : (
          <p className="preview-seed-hints">No variable hints yet.</p>
        )}
      </div>
      <div ref={previewRef} className="preview-host" id="if_r-output-area" />
    </section>
  )
}
