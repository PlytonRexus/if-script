# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Is

IF-Script IDE vNext: a React + TypeScript + Vite web IDE for authoring interactive fiction stories. The IDE imports `if-script-core` (parser, interpreter, runtime) from the npm registry. Stories are written in IF-Script syntax using `keyword__` / `__keyword` block delimiters.

The active application lives in `apps/ide/`.

## Commands

All commands run from the repository root (npm workspaces proxy to `apps/ide`):

```bash
npm run dev          # Vite dev server
npm run build        # tsc -b && vite build
npm run test         # Vitest (all unit tests, single run)
npm run test:e2e     # Playwright E2E tests
npm run lint         # ESLint (flat config, TypeScript + React)
npm run typecheck    # tsc --noEmit
```

Run a single test file:
```bash
npx --workspace apps/ide vitest run src/tests/sourceTransforms.test.ts
```

Run tests in watch mode:
```bash
npm --workspace apps/ide run test:watch
```

### Cross-Repo Linking

When developing against an unpublished `if-script-core`:
```bash
npm run link:core      # symlinks node_modules/if-script-core -> ../if-script-core
npm run unlink:core    # restores registry resolution (MUST do before committing)
```

A pre-commit hook rejects commits if `package-lock.json` still contains a local link to `if-script-core`.

## Architecture

### State Management

Single Zustand store in `apps/ide/src/store/workspaceStore.ts` (`useIdeStore` hook). Manages workspace files, parse results (diagnostics, graphs, indices, variable catalog), and UI state (theme, command palette, panel layout, runtime events). All parse results carry a `requestId` monotonic counter to discard stale worker responses.

### Parse Pipeline

Parsing runs in a Web Worker (`src/worker/parse.worker.ts`) to keep the UI responsive:

1. Main thread posts `ParseWorkerRequest` with workspace file snapshot
2. Worker creates `IFScript` instance with `BrowserFileAdapter` (preloaded files, no fetch)
3. Worker runs: parse -> static analysis (`src/analyzer/check.ts`) -> build StoryGraph -> build AuthorGraph -> build indices -> infer variable types
4. Worker posts `ParseWorkerResponse` back; store applies results if `requestId` matches

Supporting worker modules: `authoringIndex.ts` (section/scene/choice/settings indices), `variableInference.ts` (fixpoint type inference, max 8 passes), `variableUsage.ts` (section-scoped variable mapping).

### Dual Graph Representations

- **StoryGraph** (`src/graph/buildStoryGraph.ts`): Runtime reachability graph. BFS from `startAt` to mark unreachable nodes and identify dead ends. Node types: section, scene, unresolved.
- **AuthorGraph** (`src/graph/buildAuthorGraph.ts`): Enriched graph with file/scene grouping, source ranges, affordance badges (timer, ambience, backdrop, SFX, conditional choices). Groups sections by scene membership or file.
- **FocusGraph** (`src/graph/focusGraph.ts`): Computes incoming/outgoing edges and highlight sets for a selected node.

### Source Transforms

`src/authoring/sourceTransforms.ts` applies range-based text patches for visual editing. Pure functions that locate `keyword__`/`__keyword` blocks via regex, rewrite property lines, and return `{ content, syntaxPreview }`. Separate patch functions for story, scene, section, and choice inspector contexts. Also handles writer-mode section body rewrites, section scaffolding, and writer-arrow to legacy block conversion.

### Monaco Integration

`src/monaco/ifLanguage.ts` registers a custom `'ifscript'` language with Monarch tokenizer, completion provider (snippets, schema properties, section targets, variables), hover provider (schema descriptions), and code action provider (deprecated property quick-fixes). Completion context is updated after each parse via `setIfScriptCompletionContext()`.

### Persistence

Three storage backends in `src/lib/`:
- **IndexedDB** (`indexedDb.ts`): Primary, with localStorage and in-memory fallbacks (1200ms timeout)
- **File System Access API** (`fsAccess.ts`): Chromium directory mode via `showDirectoryPicker()`
- **Project bundles** (`projectBundle.ts`): `.ifproj.json` export/import fallback

### Layout

`react-grid-layout` for draggable/resizable panels. Panel IDs: workspace, editor, inspector, preview, graph, diagnostics, runtime, timings. Layout config in `src/layout/panelLayout.ts`. Graph layout (pinned nodes, groups, zoom, viewport, node cap) in `src/layout/graphLayout.ts`.

### Key UI Components (in `src/components/`)

- `IdePage.tsx` (in `src/routes/`): Main page, manages parse worker lifecycle, grid layout, keyboard shortcuts
- `GraphWorkspacePane.tsx`: AuthorGraph visualization with XY Flow, scene grouping, ELK auto-layout
- `InspectorPane.tsx`: Property inspector for story/scene/section/choice contexts
- `PreviewPane.tsx`: Runs if-script-core runtime for live playtest
- `CommandPalette.tsx`: Quick open for files (`Ctrl+P`), sections (`Ctrl+Shift+O`)

## Vite Configuration

- `NodeFileAdapter.mjs` aliased to `BrowserFileAdapter.mjs` for browser compatibility with if-script-core
- `if-script-core` and `showdown` excluded from dep optimization
- Workers use ES module format
- Base path: `/if-script/` for GitHub Pages, `./` for dev
- Build target: `es2022` with sourcemaps

## Code Style

- 2-space indentation, no semicolons, LF line endings, UTF-8
- Max line length: 160 characters
- TypeScript strict mode with `noUncheckedIndexedAccess`
- `@typescript-eslint/no-explicit-any` is off
- `if-script-core` has an ambient module declaration only (`declare module 'if-script-core'`), so its API is untyped

## Testing

- **Unit tests**: Vitest with jsdom, files in `apps/ide/src/tests/`. Setup extends `expect` with `@testing-library/jest-dom` matchers.
- **Test helpers**: `src/tests/helpers/factories.ts` (test data factories), `src/tests/helpers/renderHelpers.tsx` (React Testing Library wrappers)
- **E2E tests**: Playwright in `apps/ide/e2e/`, runs against dev server on `127.0.0.1:4173`

## CI

GitHub Actions workflow (`.github/workflows/deploy.yml`) builds and deploys to GitHub Pages on push/PR to `master`.

## Runtime Requirements

- Node.js 22.13.0+ (`.nvmrc` and `.node-version` provided)
- npm 10.9.0+ (`engine-strict=true` in `.npmrc`)
