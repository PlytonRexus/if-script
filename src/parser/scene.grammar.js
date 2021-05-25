// Generated automatically by nearley, version 2.19.4

import { Grammar } from "nearley"

// http://github.com/Hardmath123/nearley
function id (x) { return x[0] }

class Scene {
  constructor (sections, { first, name, music, serial }) {
    if (!(sections instanceof Array)) {
      throw new IFError('Unexpected argument supplied.' + sections + 'is not an array.')
    }

    this.sections = sections
    this.first = parseInt(first) || sections[0]

    this.name = name || 'Untitled'
    this.music = music
    this.serial = serial || 1
  }
}
const grammar = {
  Lexer: undefined,
  ParserRules: [
    { name: 'scene$string$1', symbols: [{ literal: 's' }, { literal: 'c' }, { literal: 'e' }, { literal: 'n' }, { literal: 'e' }, { literal: '>' }], postprocess: function joiner (d) { return d.join('') } },
    { name: 'scene$subexpression$1$ebnf$1$subexpression$1$string$1', symbols: [{ literal: '@' }, { literal: 'f' }, { literal: 'i' }, { literal: 'r' }, { literal: 's' }, { literal: 't' }, { literal: ' ' }], postprocess: function joiner (d) { return d.join('') } },
    { name: 'scene$subexpression$1$ebnf$1$subexpression$1', symbols: ['scene$subexpression$1$ebnf$1$subexpression$1$string$1', '_', 'LN', '_'] },
    { name: 'scene$subexpression$1$ebnf$1', symbols: ['scene$subexpression$1$ebnf$1$subexpression$1'], postprocess: id },
    { name: 'scene$subexpression$1$ebnf$1', symbols: [], postprocess: function (d) { return null } },
    { name: 'scene$subexpression$1$ebnf$2$subexpression$1$string$1', symbols: [{ literal: '@' }, { literal: 'm' }, { literal: 'u' }, { literal: 's' }, { literal: 'i' }, { literal: 'c' }, { literal: ' ' }], postprocess: function joiner (d) { return d.join('') } },
    { name: 'scene$subexpression$1$ebnf$2$subexpression$1', symbols: ['scene$subexpression$1$ebnf$2$subexpression$1$string$1', '_', 'nospace', '_'] },
    { name: 'scene$subexpression$1$ebnf$2', symbols: ['scene$subexpression$1$ebnf$2$subexpression$1'], postprocess: id },
    { name: 'scene$subexpression$1$ebnf$2', symbols: [], postprocess: function (d) { return null } },
    { name: 'scene$subexpression$1$subexpression$1$string$1', symbols: [{ literal: '@' }, { literal: 's' }, { literal: 'e' }, { literal: 'c' }, { literal: 't' }, { literal: 'i' }, { literal: 'o' }, { literal: 'n' }, { literal: 's' }, { literal: ' ' }], postprocess: function joiner (d) { return d.join('') } },
    { name: 'scene$subexpression$1$subexpression$1$ebnf$1$subexpression$1', symbols: ['LN', '__'] },
    { name: 'scene$subexpression$1$subexpression$1$ebnf$1', symbols: ['scene$subexpression$1$subexpression$1$ebnf$1$subexpression$1'] },
    { name: 'scene$subexpression$1$subexpression$1$ebnf$1$subexpression$2', symbols: ['LN', '__'] },
    { name: 'scene$subexpression$1$subexpression$1$ebnf$1', symbols: ['scene$subexpression$1$subexpression$1$ebnf$1', 'scene$subexpression$1$subexpression$1$ebnf$1$subexpression$2'], postprocess: function arrpush (d) { return d[0].concat([d[1]]) } },
    { name: 'scene$subexpression$1$subexpression$1', symbols: ['scene$subexpression$1$subexpression$1$string$1', '_', 'scene$subexpression$1$subexpression$1$ebnf$1', '_'] },
    { name: 'scene$subexpression$1$ebnf$3$subexpression$1$string$1', symbols: [{ literal: '@' }, { literal: 'n' }, { literal: 'a' }, { literal: 'm' }, { literal: 'e' }, { literal: ' ' }], postprocess: function joiner (d) { return d.join('') } },
    { name: 'scene$subexpression$1$ebnf$3$subexpression$1', symbols: ['scene$subexpression$1$ebnf$3$subexpression$1$string$1', '_', 'LNS', '_'] },
    { name: 'scene$subexpression$1$ebnf$3', symbols: ['scene$subexpression$1$ebnf$3$subexpression$1'], postprocess: id },
    { name: 'scene$subexpression$1$ebnf$3', symbols: [], postprocess: function (d) { return null } },
    { name: 'scene$subexpression$1', symbols: ['scene$subexpression$1$ebnf$1', 'scene$subexpression$1$ebnf$2', 'scene$subexpression$1$subexpression$1', 'scene$subexpression$1$ebnf$3'] },
    { name: 'scene$string$2', symbols: [{ literal: '<' }, { literal: 's' }, { literal: 'c' }, { literal: 'e' }, { literal: 'n' }, { literal: 'e' }], postprocess: function joiner (d) { return d.join('') } },
    {
      name: 'scene',
      symbols: ['scene$string$1', '_', 'scene$subexpression$1', '_', 'scene$string$2'],
      postprocess:
      function (d) {
        const sections = []
        d[2][2][2].forEach(ele => { if (parseInt(ele)) sections.push(parseInt(ele)) })
        let first = sections[0]
        if (d[2][0]) {
          first = d[2][0][2]
        }
        let music = null
        if (d[2][1]) {
          music = d[2][1][2]
        }

        let name
        if (d[2][3]) {
          name = d[2][3][2]
        }
        return new Scene(sections, { music, first, name })
      }
    },
    { name: 'LN$ebnf$1', symbols: [/[a-zA-Z0-9]/] },
    { name: 'LN$ebnf$1', symbols: ['LN$ebnf$1', /[a-zA-Z0-9]/], postprocess: function arrpush (d) { return d[0].concat([d[1]]) } },
    { name: 'LN', symbols: ['LN$ebnf$1'], postprocess: function (d) { return d[0].join('') } },
    { name: 'LNS$ebnf$1', symbols: [/[a-zA-Z0-9 ]/] },
    { name: 'LNS$ebnf$1', symbols: ['LNS$ebnf$1', /[a-zA-Z0-9 ]/], postprocess: function arrpush (d) { return d[0].concat([d[1]]) } },
    { name: 'LNS', symbols: ['LNS$ebnf$1'], postprocess: function (d) { return d[0].join('') } },
    { name: 'int$ebnf$1', symbols: [/[0-9]/] },
    { name: 'int$ebnf$1', symbols: ['int$ebnf$1', /[0-9]/], postprocess: function arrpush (d) { return d[0].concat([d[1]]) } },
    { name: 'int', symbols: ['int$ebnf$1'], postprocess: function (d) { return d[0].join('') } },
    { name: 'oneline$ebnf$1', symbols: [/[a-zA-Z0-9#$.@`'"_%\(\)\{\}|?;:!&\]+*-/\[= |]/] },
    { name: 'oneline$ebnf$1', symbols: ['oneline$ebnf$1', /[a-zA-Z0-9#$.@`'"_%\(\)\{\}|?;:!&\]+*-/\[= |]/], postprocess: function arrpush (d) { return d[0].concat([d[1]]) } },
    { name: 'oneline', symbols: ['oneline$ebnf$1'], postprocess: function (d) { return d[0].join('') } },
    { name: 'text$ebnf$1', symbols: [/[a-zA-Z0-9#$@`'"_.%\(\)\{\}|?;:!&\]+*-/\[=\s|]/] },
    { name: 'text$ebnf$1', symbols: ['text$ebnf$1', /[a-zA-Z0-9#$@`'"_.%\(\)\{\}|?;:!&\]+*-/\[=\s|]/], postprocess: function arrpush (d) { return d[0].concat([d[1]]) } },
    { name: 'text', symbols: ['text$ebnf$1'], postprocess: function (d) { return d[0].join('') } },
    { name: 'nospace$ebnf$1', symbols: [/[a-zA-Z0-9#$.@`'"_%\(\)\{\}|?;:!&\]+*-/\[=|]/] },
    { name: 'nospace$ebnf$1', symbols: ['nospace$ebnf$1', /[a-zA-Z0-9#$.@`'"_%\(\)\{\}|?;:!&\]+*-/\[=|]/], postprocess: function arrpush (d) { return d[0].concat([d[1]]) } },
    { name: 'nospace', symbols: ['nospace$ebnf$1'], postprocess: function (d) { return d[0].join('') } },
    { name: '_$ebnf$1', symbols: [] },
    { name: '_$ebnf$1', symbols: ['_$ebnf$1', /[\s]/], postprocess: function arrpush (d) { return d[0].concat([d[1]]) } },
    { name: '_', symbols: ['_$ebnf$1'], postprocess: function (d) { return null } },
    { name: '_N$ebnf$1', symbols: [] },
    { name: '_N$ebnf$1', symbols: ['_N$ebnf$1', /[\r\t ]/], postprocess: function arrpush (d) { return d[0].concat([d[1]]) } },
    { name: '_N', symbols: ['_N$ebnf$1'], postprocess: function (d) { return null } },
    { name: '__', symbols: [{ literal: ' ' }] }
  ],
  ParserStart: 'scene'
}

export {grammar}
