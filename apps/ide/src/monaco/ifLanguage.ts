import type * as Monaco from 'monaco-editor'

const languageId = 'ifscript'

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
      const range = {
        startLineNumber: position.lineNumber,
        endLineNumber: position.lineNumber,
        startColumn: model.getWordUntilPosition(position).startColumn,
        endColumn: model.getWordUntilPosition(position).endColumn
      }

      return {
        suggestions: [
          {
            label: 'section (writer mode)',
            kind: monaco.languages.CompletionItemKind.Snippet,
            insertText: 'section "${1:Title}"\\n  "${2:Description}"\\n  -> "${3:Choice}" => "${4:Target}"\\nend',
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
    }
  })
}

export const IF_SCRIPT_LANGUAGE_ID = languageId
