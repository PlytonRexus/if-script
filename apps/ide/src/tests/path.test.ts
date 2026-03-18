import { describe, expect, it } from 'vitest'
import { toWorkspacePath, isStoryFile } from '../lib/path'

describe('path utilities', () => {
  it('normalizes paths into /workspace namespace', () => {
    expect(toWorkspacePath('chapters\\a.partial.if')).toBe('/workspace/chapters/a.partial.if')
    expect(toWorkspacePath('/workspace/main.if')).toBe('/workspace/main.if')
  })

  it('detects story files', () => {
    expect(isStoryFile('/workspace/main.if')).toBe(true)
    expect(isStoryFile('/workspace/notes.md')).toBe(false)
  })
})
