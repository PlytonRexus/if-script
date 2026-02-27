import { useEffect, useRef, useState } from 'react'
import IFScript from 'if-script-core'
import type { RuntimeEventEntry, WorkspaceManifest } from '../types/interfaces'

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
  playtestNonce: number
  onRuntimeEvent: (entry: RuntimeEventEntry) => void
}

export function PreviewPane(props: PreviewPaneProps): JSX.Element {
  const { manifest, snapshot, playtestNonce, onRuntimeEvent } = props
  const previewRef = useRef<HTMLDivElement | null>(null)
  const runtimeRef = useRef<any>(null)
  const latestRef = useRef({ manifest, snapshot, onRuntimeEvent })
  const [status, setStatus] = useState('idle')
  const [message, setMessage] = useState('Run Playtest to mount runtime preview.')

  useEffect(() => {
    latestRef.current = { manifest, snapshot, onRuntimeEvent }
  }, [manifest, onRuntimeEvent, snapshot])

  useEffect(() => {
    if (playtestNonce === 0) return

    let cancelled = false

    const run = async () => {
      if (!previewRef.current) return
      setStatus('running')
      setMessage('Starting runtime...')

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
        runtime.start(story, {
          resumePrompt: false,
          theme: 'literary-default'
        })

        if (!cancelled) {
          setStatus('ok')
          setMessage('Runtime active.')
        }
      } catch (err) {
        if (cancelled) return
        setStatus('error')
        setMessage(String((err as Error)?.message ?? err))
      }
    }

    run().catch(() => {})

    return () => {
      cancelled = true
    }
  }, [playtestNonce])

  return (
    <section className="panel preview-panel">
      <div className="panel-header">
        <h2>Live Playtest</h2>
        <span className={`status-pill status-${status === 'running' ? 'running' : status === 'ok' ? 'ok' : status === 'error' ? 'error' : 'idle'}`}>{status}</span>
      </div>

      <p className="preview-message">{message}</p>
      <div ref={previewRef} className="preview-host" id="if_r-output-area" />
    </section>
  )
}
