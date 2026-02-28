# @if-script/ide

IF-Script IDE vNext (React + TypeScript + Vite).

## Requirements
- Node.js `22.12.0+`
- npm `10.9.0+`

## Highlights
- Monaco-based IF-Script editor
- Worker-based parse + diagnostics
- Live runtime playtest via `if-script-core@0.6.1`
- Story graph explorer with unresolved/dead-end visibility
- Files/Sections workspace navigator with section status badges
- Command palette quick open (`Ctrl/Cmd+P` files, `Ctrl/Cmd+Shift+O` sections)
- Context-aware authoring completions (section targets + variables + snippets)
- Diagnostics quick-fix for creating missing section targets
- Section preview focus controls (auto-follow + pin section)
- Workspace persistence via IndexedDB
- Chromium directory workspace mode via File System Access API
- Bundle import/export fallback (`.ifproj.json`)

## Scripts
- `npm run dev`
- `npm run build`
- `npm run test`
- `npm run test:e2e`
- `npm run lint`
- `npm run typecheck`
