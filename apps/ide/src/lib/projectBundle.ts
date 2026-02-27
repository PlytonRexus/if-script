import type { WorkspaceBundle } from '../types/interfaces'

export function makeBundleBlob(bundle: WorkspaceBundle): Blob {
  return new Blob([JSON.stringify(bundle, null, 2)], { type: 'application/json' })
}

export function downloadBundle(bundle: WorkspaceBundle, fileName = 'project.ifproj.json'): void {
  const blob = makeBundleBlob(bundle)
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = fileName
  a.click()
  URL.revokeObjectURL(url)
}

export async function readBundleFromFile(file: File): Promise<WorkspaceBundle> {
  const text = await file.text()
  const parsed = JSON.parse(text) as WorkspaceBundle
  if (!parsed || parsed.version !== 1 || !parsed.manifest || !parsed.files) {
    throw new Error('Invalid project bundle format.')
  }
  return parsed
}
