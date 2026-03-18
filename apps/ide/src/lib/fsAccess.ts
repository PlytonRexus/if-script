import { isStoryFile, toWorkspacePath, toRelativeWorkspacePath } from './path'

export type DirectoryHandleLike = any

function hasFileSystemApi(): boolean {
  return typeof window !== 'undefined' && 'showDirectoryPicker' in window
}

async function walkDirectory(
  dirHandle: DirectoryHandleLike,
  parentRelativePath: string,
  files: Record<string, string>
): Promise<void> {
  for await (const [name, handle] of dirHandle.entries()) {
    const relPath = parentRelativePath ? `${parentRelativePath}/${name}` : name
    if (handle.kind === 'directory') {
      await walkDirectory(handle, relPath, files)
      continue
    }

    if (handle.kind === 'file' && isStoryFile(relPath)) {
      const file = await handle.getFile()
      files[toWorkspacePath(relPath)] = await file.text()
    }
  }
}

export async function openWorkspaceFromDirectory(): Promise<{
  rootHandle: DirectoryHandleLike
  files: Record<string, string>
  rootFile: string
}> {
  if (!hasFileSystemApi()) {
    throw new Error('File System Access API not available in this browser.')
  }

  const rootHandle = await (window as any).showDirectoryPicker({ mode: 'readwrite' })
  const files: Record<string, string> = {}
  await walkDirectory(rootHandle, '', files)

  const candidates = Object.keys(files)
  if (candidates.length === 0) {
    throw new Error('No .if or .partial.if files found in selected directory.')
  }

  const preferredMain = candidates.find(path => /\/main\.if$/i.test(path))
  const rootFile = preferredMain ?? candidates.sort()[0] ?? '/workspace/main.if'

  return { rootHandle, files, rootFile }
}

async function ensureDirectory(root: DirectoryHandleLike, segments: string[]): Promise<DirectoryHandleLike> {
  let current = root
  for (const segment of segments) {
    current = await current.getDirectoryHandle(segment, { create: true })
  }
  return current
}

export async function writeWorkspaceToDirectory(
  rootHandle: DirectoryHandleLike,
  files: Record<string, string>
): Promise<void> {
  const entries = Object.entries(files)
  for (const [workspacePath, content] of entries) {
    const relativePath = toRelativeWorkspacePath(workspacePath)
    const segments = relativePath.split('/').filter(Boolean)
    const fileName = segments.pop()
    if (!fileName) continue

    const targetDirectory = await ensureDirectory(rootHandle, segments)
    const fileHandle = await targetDirectory.getFileHandle(fileName, { create: true })
    const writable = await fileHandle.createWritable()
    await writable.write(content)
    await writable.close()
  }
}

export async function verifyDirectoryPermission(rootHandle: DirectoryHandleLike): Promise<boolean> {
  if (!rootHandle?.queryPermission) return false
  const opts = { mode: 'readwrite' as const }
  const current = await rootHandle.queryPermission(opts)
  if (current === 'granted') return true
  const requested = await rootHandle.requestPermission(opts)
  return requested === 'granted'
}
