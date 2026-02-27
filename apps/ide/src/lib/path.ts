const WORKSPACE_PREFIX = '/workspace'

export function toWorkspacePath(input: string): string {
  const normalized = input.replaceAll('\\', '/').replace(/\/+/g, '/').trim()
  if (normalized.startsWith(WORKSPACE_PREFIX + '/')) return normalized
  if (normalized === WORKSPACE_PREFIX) return `${WORKSPACE_PREFIX}/main.if`
  if (normalized.startsWith('/')) return `${WORKSPACE_PREFIX}${normalized}`
  return `${WORKSPACE_PREFIX}/${normalized}`
}

export function dirname(path: string): string {
  const normalized = path.replaceAll('\\', '/')
  const slash = normalized.lastIndexOf('/')
  if (slash <= 0) return '/'
  return normalized.slice(0, slash)
}

export function basename(path: string): string {
  const normalized = path.replaceAll('\\', '/')
  const slash = normalized.lastIndexOf('/')
  if (slash === -1) return normalized
  return normalized.slice(slash + 1)
}

export function extname(path: string): string {
  const base = basename(path)
  const dot = base.lastIndexOf('.')
  if (dot === -1) return ''
  return base.slice(dot)
}

export function isStoryFile(path: string): boolean {
  return /\.(if|partial\.if)$/i.test(path)
}

export function toRelativeWorkspacePath(path: string): string {
  const normalized = toWorkspacePath(path)
  return normalized.replace(`${WORKSPACE_PREFIX}/`, '')
}

export function sortWorkspacePaths(paths: string[]): string[] {
  return [...paths].sort((a, b) => a.localeCompare(b))
}
