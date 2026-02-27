# IF-Script IDE vNext

Fresh rewrite of the IF-Script IDE built as a modern web-first PWA.

## Active App
- Path: `apps/ide`
- Stack: React + TypeScript + Vite + Monaco + Zustand
- Core runtime/parser: `if-script-core@^0.6.1`

## Runtime Requirements
- Node.js `22.12.0+`
- npm `10.9.0+`

Version hint files are included:
- `.nvmrc`
- `.node-version`

If you use `nvm`, run:
- `nvm use`

## Workspace Commands
From repository root:

- `npm run dev`
- `npm run build`
- `npm run test`
- `npm run test:e2e`
- `npm run lint`
- `npm run typecheck`
