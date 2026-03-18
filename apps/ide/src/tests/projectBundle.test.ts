import { describe, expect, it } from 'vitest'
import { makeBundleBlob, readBundleFromFile } from '../lib/projectBundle'
import { makeManifest } from './helpers/factories'
import type { WorkspaceBundle } from '../types/interfaces'

function makeBundle(overrides?: Partial<WorkspaceBundle>): WorkspaceBundle {
  return {
    version: 1,
    manifest: makeManifest(),
    files: { '/workspace/main.if': 'section "A"\nend\n' },
    ...overrides
  }
}

function readBlobText(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(reader.error)
    reader.readAsText(blob)
  })
}

function makeFileWithText(json: string, name = 'project.ifproj.json'): File {
  const file = new File([json], name, { type: 'application/json' })
  if (typeof file.text !== 'function') {
    file.text = () => Promise.resolve(json)
  }
  return file
}

function makeFileFromJson(data: unknown): File {
  return makeFileWithText(JSON.stringify(data))
}

describe('projectBundle', () => {
  describe('makeBundleBlob', () => {
    it('creates a valid JSON Blob', async () => {
      const blob = makeBundleBlob(makeBundle())
      expect(blob).toBeInstanceOf(Blob)
      expect(blob.type).toBe('application/json')
      const text = await readBlobText(blob)
      const parsed = JSON.parse(text) as WorkspaceBundle
      expect(parsed.version).toBe(1)
      expect(parsed.manifest.name).toBe('Test Project')
    })
  })

  describe('readBundleFromFile', () => {
    it('parses a valid bundle', async () => {
      const bundle = makeBundle()
      const file = makeFileFromJson(bundle)
      const result = await readBundleFromFile(file)
      expect(result.version).toBe(1)
      expect(result.manifest.name).toBe('Test Project')
      expect(result.files['/workspace/main.if']).toBe('section "A"\nend\n')
    })

    it('rejects invalid version', async () => {
      const file = makeFileFromJson({ version: 2, manifest: makeManifest(), files: {} })
      await expect(readBundleFromFile(file)).rejects.toThrow('Invalid project bundle format.')
    })

    it('rejects missing manifest', async () => {
      const file = makeFileFromJson({ version: 1, files: {} })
      await expect(readBundleFromFile(file)).rejects.toThrow('Invalid project bundle format.')
    })

    it('rejects missing files', async () => {
      const file = makeFileFromJson({ version: 1, manifest: makeManifest() })
      await expect(readBundleFromFile(file)).rejects.toThrow('Invalid project bundle format.')
    })

    it('rejects invalid JSON', async () => {
      const file = makeFileWithText('not json')
      await expect(readBundleFromFile(file)).rejects.toThrow()
    })
  })
})
