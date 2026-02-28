import type * as Monaco from 'monaco-editor'

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

function uniqueSorted(values: string[]): string[] {
  return Array.from(new Set(values.filter(Boolean))).sort((a, b) => a.localeCompare(b))
}

export function setIfScriptCompletionContext(input: CompletionContext): void {
  completionContext.parseStatus = input.parseStatus
  completionContext.sectionTitles = uniqueSorted(input.sectionTitles)
  completionContext.variableNames = uniqueSorted(input.variableNames)
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
      if (completionContext.parseStatus === 'ok') {
        suggestions.push(...sectionTargetSuggestions(monaco, range))
        suggestions.push(...variableSuggestions(monaco, range))
      }

      return { suggestions }
    }
  })
}

export const IF_SCRIPT_LANGUAGE_ID = languageId
