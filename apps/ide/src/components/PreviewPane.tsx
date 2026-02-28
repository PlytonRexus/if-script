import { useEffect, useMemo, useRef, useState } from 'react'
import IFScript from 'if-script-core'
import {
  applyDefaultsToVariables,
  buildSectionPreviewStartOptions,
  buildVariableOverridesTemplate,
  buildVisibleVariableCatalog,
  parseVariableOverridesJson,
  randomValueForVariable,
  randomizeVariables,
  removeOverrideVariables,
  replaceOverrideValue,
  resolveVariableValue,
  serializeVariableOverridesJson
} from '../preview/sectionPreview'
import type {
  RuntimeEventEntry,
  SectionIndexEntry,
  VariableCatalogEntry,
  VariablePreset,
  WorkspaceManifest
} from '../types/interfaces'

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

type PreviewEditorMode = 'form' | 'json'

interface PreviewPaneProps {
  manifest: WorkspaceManifest
  snapshot: Record<string, string>
  parseStatus: 'idle' | 'running' | 'error' | 'ok'
  focusedSection: SectionIndexEntry | null
  variableCatalog: VariableCatalogEntry[]
  sectionVariableNamesBySerial: Record<number, string[]>
  variableOverrideText: string
  onVariableOverrideTextChange: (next: string) => void
  variablePresets: VariablePreset[]
  onSaveVariablePreset: (name: string, values: Record<string, unknown>) => void
  onLoadVariablePreset: (presetId: string) => void
  onDeleteVariablePreset: (presetId: string) => void
  previewAutoFollow: boolean
  onPreviewAutoFollowChange: (next: boolean) => void
  previewPinned: boolean
  onTogglePreviewPin: () => void
  playtestNonce: number
  onRuntimeEvent: (entry: RuntimeEventEntry) => void
}

function hasOwnValue(input: Record<string, unknown>, name: string): boolean {
  return Object.prototype.hasOwnProperty.call(input, name)
}

function runtimeTypeOfValue(value: unknown): VariableCatalogEntry['inferredType'] {
  if (Array.isArray(value)) return 'array'
  if (typeof value === 'number') return 'number'
  if (typeof value === 'string') return 'string'
  if (typeof value === 'boolean') return 'boolean'
  if (value && typeof value === 'object') return 'object'
  return 'unknown'
}

function resolveAllowedTypes(variable: VariableCatalogEntry): VariableCatalogEntry['inferredType'][] {
  const normalized = (variable.inferredTypes ?? [])
    .filter((type): type is VariableCatalogEntry['inferredType'] => typeof type === 'string')
  if (normalized.length > 0) return Array.from(new Set(normalized))
  return [variable.inferredType]
}

function isMixedTypeVariable(variable: VariableCatalogEntry): boolean {
  const concrete = resolveAllowedTypes(variable).filter(type => type !== 'unknown')
  return concrete.length > 1
}

export function PreviewPane(props: PreviewPaneProps): JSX.Element {
  const {
    manifest,
    snapshot,
    parseStatus,
    focusedSection,
    variableCatalog,
    sectionVariableNamesBySerial,
    variableOverrideText,
    onVariableOverrideTextChange,
    variablePresets,
    onSaveVariablePreset,
    onLoadVariablePreset,
    onDeleteVariablePreset,
    previewAutoFollow,
    onPreviewAutoFollowChange,
    previewPinned,
    onTogglePreviewPin,
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
  const [editorMode, setEditorMode] = useState<PreviewEditorMode>('form')
  const [showAllVariables, setShowAllVariables] = useState(false)
  const [presetName, setPresetName] = useState('')
  const [selectedPresetId, setSelectedPresetId] = useState('')
  const [jsonDrafts, setJsonDrafts] = useState<Record<string, string>>({})
  const [jsonDraftErrors, setJsonDraftErrors] = useState<Record<string, string>>({})

  const parsedOverrides = useMemo(() => {
    return parseVariableOverridesJson(variableOverrideText)
  }, [variableOverrideText])

  const sectionVariableNames = useMemo(() => {
    if (!focusedSection) return []
    return sectionVariableNamesBySerial[focusedSection.serial] ?? []
  }, [focusedSection, sectionVariableNamesBySerial])

  const visibleVariableCatalog = useMemo(() => {
    return buildVisibleVariableCatalog(variableCatalog, sectionVariableNames, showAllVariables)
  }, [sectionVariableNames, showAllVariables, variableCatalog])

  const hiddenVariableCount = Math.max(variableCatalog.length - visibleVariableCatalog.length, 0)

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
    if (!selectedPresetId && variablePresets[0]) {
      setSelectedPresetId(variablePresets[0].id)
      return
    }

    if (selectedPresetId && !variablePresets.some(preset => preset.id === selectedPresetId)) {
      setSelectedPresetId(variablePresets[0]?.id ?? '')
    }
  }, [selectedPresetId, variablePresets])

  useEffect(() => {
    setShowAllVariables(false)
    setJsonDrafts({})
    setJsonDraftErrors({})
    setSelectedPresetId('')
  }, [focusedSection?.serial])

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
  }, [focusedSection, parseStatus, parsedOverrides.error, playtestNonce, previewAutoFollow, startOptions])

  const writeOverrides = (next: Record<string, unknown>) => {
    onVariableOverrideTextChange(serializeVariableOverridesJson(next))
  }

  const handleUseTemplate = () => {
    const template = buildVariableOverridesTemplate(variableCatalog)
    writeOverrides(template)
  }

  const handleRepairJson = () => {
    writeOverrides({})
  }

  const handleVariableChange = (variableName: string, value: unknown) => {
    if (!parsedOverrides.value) return
    const next = replaceOverrideValue(parsedOverrides.value, variableName, value)
    writeOverrides(next)
  }

  const handleRandomizeOne = (variable: VariableCatalogEntry) => {
    if (!parsedOverrides.value) return
    handleVariableChange(variable.name, randomValueForVariable(variable))
  }

  const handleRandomizeVisible = () => {
    if (!parsedOverrides.value) return
    const next = randomizeVariables(parsedOverrides.value, visibleVariableCatalog)
    writeOverrides(next)
  }

  const handleResetVisibleDefaults = () => {
    if (!parsedOverrides.value) return
    const next = applyDefaultsToVariables(parsedOverrides.value, visibleVariableCatalog)
    writeOverrides(next)
  }

  const handleClearVisible = () => {
    if (!parsedOverrides.value) return
    const next = removeOverrideVariables(parsedOverrides.value, visibleVariableCatalog.map(variable => variable.name))
    writeOverrides(next)
  }

  const handleSavePreset = () => {
    if (!parsedOverrides.value) return
    const name = presetName.trim()
    if (!name) return
    onSaveVariablePreset(name, parsedOverrides.value)
    setPresetName('')
  }

  const renderVariableControl = (variable: VariableCatalogEntry): JSX.Element => {
    const readOnly = !focusedSection || !parsedOverrides.value
    const current = resolveVariableValue(parsedOverrides.value ?? {}, variable)
    const allowedTypes = resolveAllowedTypes(variable)
    const mixedType = isMixedTypeVariable(variable)
    const acceptsUnknown = allowedTypes.includes('unknown')
    const acceptsType = (inferredType: VariableCatalogEntry['inferredType']): boolean => {
      if (acceptsUnknown) return true
      return allowedTypes.includes(inferredType)
    }

    if (!mixedType && variable.inferredType === 'number') {
      const numeric = typeof current === 'number' ? String(current) : ''
      return (
        <input
          className="preview-var-input"
          type="number"
          value={numeric}
          onChange={(event) => {
            const raw = event.currentTarget.value.trim()
            if (raw === '') return handleVariableChange(variable.name, 0)
            const next = Number(raw)
            if (Number.isFinite(next)) handleVariableChange(variable.name, next)
          }}
          disabled={readOnly}
        />
      )
    }

    if (!mixedType && variable.inferredType === 'string') {
      const text = typeof current === 'string' ? current : ''
      return (
        <input
          className="preview-var-input"
          type="text"
          value={text}
          onChange={(event) => handleVariableChange(variable.name, event.currentTarget.value)}
          disabled={readOnly}
        />
      )
    }

    if (!mixedType && variable.inferredType === 'boolean') {
      const boolValue = typeof current === 'boolean' ? current : false
      return (
        <label className="preview-boolean-toggle">
          <input
            type="checkbox"
            checked={boolValue}
            onChange={(event) => handleVariableChange(variable.name, event.currentTarget.checked)}
            disabled={readOnly}
          />
          <span>{boolValue ? 'true' : 'false'}</span>
        </label>
      )
    }

    const draft = jsonDrafts[variable.name]
    const raw = draft ?? JSON.stringify(current, null, 2)
    const error = jsonDraftErrors[variable.name] ?? null

    return (
      <div className="preview-var-json-wrap">
        <textarea
          className="preview-var-json-input"
          value={raw}
          onChange={(event) => {
            const nextRaw = event.currentTarget.value
            setJsonDrafts(state => ({ ...state, [variable.name]: nextRaw }))

            try {
              const parsed = JSON.parse(nextRaw)
              const parsedType = runtimeTypeOfValue(parsed)
              if (!acceptsType(parsedType)) {
                throw new Error(`Expected one of: ${allowedTypes.join(', ')}.`)
              }
              handleVariableChange(variable.name, parsed)
              setJsonDraftErrors(state => {
                const next = { ...state }
                delete next[variable.name]
                return next
              })
              setJsonDrafts(state => {
                const next = { ...state }
                delete next[variable.name]
                return next
              })
            } catch (err) {
              setJsonDraftErrors(state => ({
                ...state,
                [variable.name]: String((err as Error)?.message ?? err)
              }))
            }
          }}
          disabled={readOnly}
        />
        {error ? <p className="preview-var-json-error">{error}</p> : null}
      </div>
    )
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
        <div className="preview-header-actions">
          <label className="preview-follow-toggle">
            <input
              type="checkbox"
              checked={previewAutoFollow}
              onChange={(event) => onPreviewAutoFollowChange(event.currentTarget.checked)}
            />
            <span>Auto-follow</span>
          </label>
          <button type="button" className={['mini-btn', previewPinned ? 'active' : ''].join(' ').trim()} onClick={onTogglePreviewPin}>
            {previewPinned ? 'Unpin Section' : 'Pin Section'}
          </button>
          <span className={`status-pill status-${status === 'running' ? 'running' : status === 'ok' ? 'ok' : status === 'error' ? 'error' : 'idle'}`}>{status}</span>
        </div>
      </div>

      <p className="preview-section-context">
        {focusedSection
          ? `Previewing: ${focusedSection.title} (line ${focusedSection.line})${previewPinned ? ' [pinned]' : ''}`
          : 'Previewing: none'}
      </p>
      <p className="preview-message">{message}</p>
      <div className="preview-seed-editor">
        <div className="preview-seed-header">
          <h3>Variable Overrides</h3>
          <div className="preview-editor-mode">
            <button
              type="button"
              className={['mini-btn', editorMode === 'form' ? 'active' : ''].join(' ').trim()}
              onClick={() => setEditorMode('form')}
            >
              Form
            </button>
            <button
              type="button"
              className={['mini-btn', editorMode === 'json' ? 'active' : ''].join(' ').trim()}
              onClick={() => setEditorMode('json')}
            >
              JSON
            </button>
          </div>
        </div>

        <div className="preview-seed-actions">
          <button type="button" className="mini-btn" onClick={handleRandomizeVisible} disabled={!focusedSection || !!parsedOverrides.error || visibleVariableCatalog.length === 0}>Randomize All</button>
          <button type="button" className="mini-btn" onClick={handleResetVisibleDefaults} disabled={!focusedSection || !!parsedOverrides.error || visibleVariableCatalog.length === 0}>Reset Defaults</button>
          <button type="button" className="mini-btn" onClick={handleClearVisible} disabled={!focusedSection || !!parsedOverrides.error || visibleVariableCatalog.length === 0}>Clear</button>
          <button type="button" className="mini-btn" onClick={handleUseTemplate} disabled={!focusedSection}>Use Template</button>
          <label className="preview-show-all-toggle">
            <input
              type="checkbox"
              checked={showAllVariables}
              onChange={(event) => setShowAllVariables(event.currentTarget.checked)}
              disabled={variableCatalog.length === 0}
            />
            <span>Show all variables</span>
          </label>
        </div>

        {!showAllVariables && hiddenVariableCount > 0 ? (
          <p className="preview-seed-hints">
            Showing {visibleVariableCatalog.length} of {variableCatalog.length} variables for this section.
          </p>
        ) : null}

        <div className="preview-presets">
          <input
            type="text"
            className="preview-preset-input"
            placeholder="Preset name"
            value={presetName}
            onChange={(event) => setPresetName(event.currentTarget.value)}
            disabled={!focusedSection || !!parsedOverrides.error}
          />
          <button type="button" className="mini-btn" onClick={handleSavePreset} disabled={!focusedSection || !!parsedOverrides.error || !presetName.trim()}>Save Preset</button>
          <select
            className="preview-preset-select"
            value={selectedPresetId}
            onChange={(event) => setSelectedPresetId(event.currentTarget.value)}
            disabled={variablePresets.length === 0}
          >
            <option value="">Choose preset</option>
            {variablePresets.map(preset => (
              <option key={preset.id} value={preset.id}>{preset.name}</option>
            ))}
          </select>
          <button type="button" className="mini-btn" onClick={() => selectedPresetId && onLoadVariablePreset(selectedPresetId)} disabled={!selectedPresetId}>Load</button>
          <button type="button" className="mini-btn" onClick={() => selectedPresetId && onDeleteVariablePreset(selectedPresetId)} disabled={!selectedPresetId}>Delete</button>
        </div>

        {editorMode === 'json' ? (
          <>
            <textarea
              className="preview-seed-input"
              value={variableOverrideText}
              onChange={(event) => onVariableOverrideTextChange(event.currentTarget.value)}
              spellCheck={false}
              disabled={!focusedSection}
            />
            {parsedOverrides.error ? <p className="preview-seed-error">{parsedOverrides.error}</p> : null}
          </>
        ) : (
          <>
            {parsedOverrides.error ? (
              <div className="preview-seed-error-wrap">
                <p className="preview-seed-error">{parsedOverrides.error}</p>
                <button type="button" className="mini-btn" onClick={handleRepairJson}>Repair JSON</button>
              </div>
            ) : null}

            {!parsedOverrides.error && visibleVariableCatalog.length === 0 ? (
              <p className="preview-seed-hints">
                No section-specific variables found. Enable "Show all variables" to edit the full catalog.
              </p>
            ) : null}

            {!parsedOverrides.error && visibleVariableCatalog.length > 0 ? (
              <div className="preview-variable-list">
                {visibleVariableCatalog.map(variable => (
                  <div key={variable.name} className="preview-variable-row">
                    <div className="preview-variable-meta">
                      <strong>{variable.name}</strong>
                      {resolveAllowedTypes(variable).map(type => (
                        <span key={`${variable.name}-${type}`} className="preview-type-badge">{type}</span>
                      ))}
                      {!parsedOverrides.value || !hasOwnValue(parsedOverrides.value, variable.name)
                        ? <span className="preview-var-origin">default</span>
                        : <span className="preview-var-origin">override</span>}
                    </div>
                    <div className="preview-variable-controls">
                      {renderVariableControl(variable)}
                      <button
                        type="button"
                        className="mini-btn"
                        onClick={() => handleRandomizeOne(variable)}
                        disabled={!focusedSection || !!parsedOverrides.error}
                      >
                        Randomize
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : null}
          </>
        )}
      </div>
      <div ref={previewRef} className="preview-host" id="if_r-output-area" />
    </section>
  )
}
