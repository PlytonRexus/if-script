import type * as Monaco from 'monaco-editor'
import { FALLBACK_AUTHORING_SCHEMA } from '../authoring/schema'
import type { AuthoringSchema } from '../types/interfaces'

const languageId = 'ifscript'

interface CompletionContext {
  parseStatus: 'idle' | 'running' | 'error' | 'ok'
  sectionTitles: string[]
  variableNames: string[]
}

const completionContext: CompletionContext = {
  parseStatus: 'idle',
  sectionTitles: [],
  variableNames: []
}
let schemaContext: AuthoringSchema = FALLBACK_AUTHORING_SCHEMA
const DEPRECATED_SCENE_AUDIO_REPLACEMENTS: Record<string, string> = {
  '@music': '@sceneAmbience',
  '@musicVolume': '@sceneAmbienceVolume',
  '@musicLoop': '@sceneAmbienceLoop',
  '@musicFadeInMs': '@sceneAmbienceFadeInMs',
  '@musicFadeOutMs': '@sceneAmbienceFadeOutMs'
}

function uniqueSorted(values: string[]): string[] {
  return Array.from(new Set(values.filter(Boolean))).sort((a, b) => a.localeCompare(b))
}

export function setIfScriptCompletionContext(input: CompletionContext): void {
  completionContext.parseStatus = input.parseStatus
  completionContext.sectionTitles = uniqueSorted(input.sectionTitles)
  completionContext.variableNames = uniqueSorted(input.variableNames)
}

export function setIfScriptAuthoringSchema(input: AuthoringSchema | null | undefined): void {
  if (!input) {
    schemaContext = FALLBACK_AUTHORING_SCHEMA
    return
  }
  schemaContext = input
}

function snippetSuggestions(monaco: typeof Monaco, range: Monaco.IRange): Monaco.languages.CompletionItem[] {
  return [
    {
      label: 'section (writer mode)',
      kind: monaco.languages.CompletionItemKind.Snippet,
      insertText: 'section "${1:Title}"\\n  "${2:Description}"\\n  -> "${3:Choice}" => "${4:Target}"\\nend',
      insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
      range
    },
    {
      label: 'scene block',
      kind: monaco.languages.CompletionItemKind.Snippet,
      insertText: 'scene__\\n  @name "${1:SceneName}"\\n  @first "${2:SectionTitle}"\\n__scene',
      insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
      range
    },
    {
      label: 'import block',
      kind: monaco.languages.CompletionItemKind.Snippet,
      insertText: 'import__\\n  @path "${1:/workspace/chapter-2.partial.if}"\\n__import',
      insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
      range
    },
    {
      label: 'conditional choice',
      kind: monaco.languages.CompletionItemKind.Snippet,
      insertText: '-> "${1:Choice text}" => "${2:Target}" when (${3:condition})',
      insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
      range
    },
    {
      label: 'timer settings',
      kind: monaco.languages.CompletionItemKind.Snippet,
      insertText: '@timer {"seconds": ${1:30}, "target": "${2:SectionTitle}"}',
      insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
      range
    },
    {
      label: 'function block',
      kind: monaco.languages.CompletionItemKind.Snippet,
      insertText: 'function__ ${1:name}(${2:args}) {\\n  ${3:// body}\\n  return__ ${4:value}\\n}',
      insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
      range
    },
    {
      label: 'choice block',
      kind: monaco.languages.CompletionItemKind.Snippet,
      insertText: 'choice__\\n  @target "${1:Target}"\\n  "${2:Choice Text}"\\n__choice',
      insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
      range
    },
    {
      label: 'if conditional',
      kind: monaco.languages.CompletionItemKind.Snippet,
      insertText: 'if__ (${1:condition}) {\\n  ${2:// actions}\\n}',
      insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
      range
    }
  ]
}

function sectionTargetSuggestions(monaco: typeof Monaco, range: Monaco.IRange): Monaco.languages.CompletionItem[] {
  return completionContext.sectionTitles.map((title) => ({
    label: title,
    detail: 'Section target',
    kind: monaco.languages.CompletionItemKind.Value,
    insertText: `"${title}"`,
    range
  }))
}

function variableSuggestions(monaco: typeof Monaco, range: Monaco.IRange): Monaco.languages.CompletionItem[] {
  return completionContext.variableNames.map((name) => ({
    label: name,
    detail: 'Story variable',
    kind: monaco.languages.CompletionItemKind.Variable,
    insertText: name,
    range
  }))
}

function schemaPropertySuggestions(monaco: typeof Monaco, range: Monaco.IRange): Monaco.languages.CompletionItem[] {
  const out: Monaco.languages.CompletionItem[] = []
  const contexts = [schemaContext.contexts.story, schemaContext.contexts.scene, schemaContext.contexts.section, schemaContext.contexts.choice]
  contexts.forEach(context => {
    context.properties.forEach(prop => {
      const snippet = prop.type === 'enum' && prop.enumValues && prop.enumValues.length > 0
        ? `${prop.keyword} "${prop.enumValues[0]}"`
        : prop.type === 'boolean'
          ? `${prop.keyword} \${1:true}`
          : prop.type === 'number'
            ? `${prop.keyword} \${1:${typeof prop.defaultValue === 'number' ? prop.defaultValue : 1}}`
            : `${prop.keyword} "\${1:value}"`
      out.push({
        label: `${prop.keyword} (${context.title})`,
        detail: prop.description ?? `${context.title} property`,
        kind: monaco.languages.CompletionItemKind.Property,
        insertText: snippet,
        insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
        range
      })
    })
  })
  return out
}

export function registerIfScriptLanguage(monaco: typeof Monaco): void {
  if (monaco.languages.getLanguages().some(lang => lang.id === languageId)) return

  monaco.languages.register({ id: languageId })

  monaco.languages.setMonarchTokensProvider(languageId, {
    tokenizer: {
      root: [
        [/\b(settings__|__settings|section__|__section|choice__|__choice|scene__|__scene|if__|else__|then__|while__|break__|continue__|function__|return__|import__|end)\b/, 'keyword'],
        [/@[A-Za-z_][\w]*/, 'attribute.name'],
        [/"([^"\\]|\\.)*"/, 'string'],
        [/\b(true|false|null)\b/, 'constant.language'],
        [/\b\d+(\.\d+)?\b/, 'number'],
        [/\$\{[^}]*\}/, 'variable'],
        [/\/\*/, 'comment', '@comment'],
        [/\/\/.*$/, 'comment']
      ],
      comment: [
        [/[^/*]+/, 'comment'],
        [/\*\//, 'comment', '@pop'],
        [/[/*]/, 'comment']
      ]
    }
  })

  monaco.languages.setLanguageConfiguration(languageId, {
    comments: {
      blockComment: ['/*', '*/'],
      lineComment: '//'
    },
    brackets: [
      ['{', '}'],
      ['[', ']'],
      ['(', ')']
    ],
    autoClosingPairs: [
      { open: '{', close: '}' },
      { open: '[', close: ']' },
      { open: '(', close: ')' },
      { open: '"', close: '"' }
    ]
  })

  monaco.languages.registerCompletionItemProvider(languageId, {
    provideCompletionItems: (model, position) => {
      const word = model.getWordUntilPosition(position)
      const range: Monaco.IRange = {
        startLineNumber: position.lineNumber,
        endLineNumber: position.lineNumber,
        startColumn: word.startColumn,
        endColumn: word.endColumn
      }

      const suggestions = snippetSuggestions(monaco, range)
      suggestions.push(...schemaPropertySuggestions(monaco, range))
      if (completionContext.parseStatus === 'ok') {
        suggestions.push(...sectionTargetSuggestions(monaco, range))
        suggestions.push(...variableSuggestions(monaco, range))
      }

      return { suggestions }
    }
  })

  monaco.languages.registerHoverProvider(languageId, {
    provideHover: (model, position) => {
      const word = model.getWordAtPosition(position)
      if (!word) return null
      const keyword = word.word.startsWith('@') ? word.word : `@${word.word}`
      const contexts = [schemaContext.contexts.story, schemaContext.contexts.scene, schemaContext.contexts.section, schemaContext.contexts.choice]
      const prop = contexts.flatMap(context => context.properties).find(entry => entry.keyword === keyword)
      if (!prop) return null
      return {
        range: {
          startLineNumber: position.lineNumber,
          endLineNumber: position.lineNumber,
          startColumn: word.startColumn,
          endColumn: word.endColumn
        },
        contents: [
          { value: `**${prop.keyword}**` },
          { value: prop.description ?? 'IF-Script property' },
          ...(prop.enumValues ? [{ value: `Allowed: ${prop.enumValues.map(v => `\`${v}\``).join(', ')}` }] : [])
        ]
      }
    }
  })

  monaco.languages.registerCodeActionProvider(languageId, {
    provideCodeActions: (model, _range, context) => {
      const actions = context.markers
        .map(marker => {
          const rawCode = typeof marker.code === 'string' ? marker.code : typeof marker.code === 'number' ? String(marker.code) : ''
          if (!rawCode.startsWith('DEPRECATED_PROP:')) return null
          const deprecated = rawCode.replace('DEPRECATED_PROP:', '')
          const replacement = DEPRECATED_SCENE_AUDIO_REPLACEMENTS[deprecated]
          if (!replacement) return null
          return {
            title: `Replace ${deprecated} with ${replacement}`,
            kind: 'quickfix',
            edit: {
              edits: [
                {
                  resource: model.uri,
                  textEdit: {
                    range: {
                      startLineNumber: marker.startLineNumber,
                      startColumn: marker.startColumn,
                      endLineNumber: marker.endLineNumber,
                      endColumn: marker.endColumn
                    },
                    text: replacement
                  },
                  versionId: undefined
                }
              ]
            },
            diagnostics: [marker],
            isPreferred: true
          }
        })
        .filter((action): action is NonNullable<typeof action> => Boolean(action))
      return { actions, dispose: () => {} }
    }
  })
}

export const IF_SCRIPT_LANGUAGE_ID = languageId
