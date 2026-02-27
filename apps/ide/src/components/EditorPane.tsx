import { useEffect, useMemo, useRef } from 'react'
import Editor, { loader, type OnMount, type BeforeMount } from '@monaco-editor/react'
import * as Monaco from 'monaco-editor'
import editorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker'
import cssWorker from 'monaco-editor/esm/vs/language/css/css.worker?worker'
import htmlWorker from 'monaco-editor/esm/vs/language/html/html.worker?worker'
import jsonWorker from 'monaco-editor/esm/vs/language/json/json.worker?worker'
import tsWorker from 'monaco-editor/esm/vs/language/typescript/ts.worker?worker'
import { IF_SCRIPT_LANGUAGE_ID, registerIfScriptLanguage } from '../monaco/ifLanguage'
import type { IdeDiagnostic, WorkspaceFile } from '../types/interfaces'

const monacoEnv = self as typeof self & {
  MonacoEnvironment?: {
    getWorker: (_moduleId: string, label: string) => Worker
  }
}

if (!monacoEnv.MonacoEnvironment) {
  monacoEnv.MonacoEnvironment = {
    getWorker(_moduleId: string, label: string): Worker {
      if (label === 'json') return new jsonWorker()
      if (label === 'css' || label === 'scss' || label === 'less') return new cssWorker()
      if (label === 'html' || label === 'handlebars' || label === 'razor') return new htmlWorker()
      if (label === 'typescript' || label === 'javascript') return new tsWorker()
      return new editorWorker()
    }
  }
}

loader.config({ monaco: Monaco })

interface CursorTarget {
  line: number
  col: number
  nonce: number
}

interface EditorPaneProps {
  file: WorkspaceFile | null
  diagnostics: IdeDiagnostic[]
  cursorTarget: CursorTarget | null
  onChange: (next: string) => void
}

function severityToMonaco(monaco: typeof Monaco, severity: IdeDiagnostic['severity']): Monaco.MarkerSeverity {
  if (severity === 'error') return monaco.MarkerSeverity.Error
  if (severity === 'warning') return monaco.MarkerSeverity.Warning
  return monaco.MarkerSeverity.Info
}

export function EditorPane(props: EditorPaneProps): JSX.Element {
  const editorRef = useRef<Monaco.editor.IStandaloneCodeEditor | null>(null)
  const monacoRef = useRef<typeof Monaco | null>(null)

  const activeDiagnostics = useMemo(() => {
    if (!props.file) return []
    return props.diagnostics.filter(d => d.file === props.file?.path)
  }, [props.diagnostics, props.file])

  const beforeMount: BeforeMount = (monaco) => {
    registerIfScriptLanguage(monaco)
  }

  const onMount: OnMount = (editor, monaco) => {
    editorRef.current = editor
    monacoRef.current = monaco
  }

  useEffect(() => {
    if (!props.file || !editorRef.current || !monacoRef.current) return
    const model = editorRef.current.getModel()
    if (!model) return

    const markers: Monaco.editor.IMarkerData[] = activeDiagnostics.map(d => {
      const line = d.line ?? 1
      const col = d.col ?? 1
      return {
        severity: severityToMonaco(monacoRef.current as typeof Monaco, d.severity),
        message: d.hint ? `${d.message}\nHint: ${d.hint}` : d.message,
        startLineNumber: line,
        startColumn: col,
        endLineNumber: line,
        endColumn: Math.max(col + 1, col),
        code: d.code
      }
    })

    monacoRef.current.editor.setModelMarkers(model, 'ifscript-diagnostics', markers)
  }, [activeDiagnostics, props.file])

  useEffect(() => {
    if (!props.cursorTarget || !editorRef.current) return
    editorRef.current.setPosition({ lineNumber: props.cursorTarget.line, column: props.cursorTarget.col })
    editorRef.current.revealLineInCenter(props.cursorTarget.line)
    editorRef.current.focus()
  }, [props.cursorTarget])

  if (!props.file) {
    return (
      <section className="panel editor-pane">
        <div className="panel-header"><h2>Editor</h2></div>
        <p className="empty-message">No file selected.</p>
      </section>
    )
  }

  return (
    <section className="panel editor-pane">
      <div className="panel-header">
        <h2>Editor</h2>
        <span>{props.file.path}</span>
      </div>

      <Editor
        key={props.file.path}
        path={`file://${props.file.path}`}
        defaultLanguage={IF_SCRIPT_LANGUAGE_ID}
        value={props.file.content}
        beforeMount={beforeMount}
        onMount={onMount}
        onChange={(next) => props.onChange(next ?? '')}
        theme="vs-dark"
        options={{
          minimap: { enabled: false },
          smoothScrolling: true,
          fontSize: 14,
          lineNumbersMinChars: 3,
          scrollBeyondLastLine: false,
          automaticLayout: true,
          wordWrap: 'on',
          tabSize: 2
        }}
      />
    </section>
  )
}
