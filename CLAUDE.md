# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

IF-Script is an interactive fiction authoring tool with a custom syntax that parses stories into HTML/CSS/JavaScript. This repository contains the web-based editor and development environment. The core parsing and interpretation logic is in the separate `if-script-core` npm package (v0.6.1+).

**Important**: The IF-Script syntax has been completely rewritten. The current implementation uses a custom stream-based parser (not NearleyJS), with a new double-underscore delimiter syntax.

## Build and Development Commands

### Development
```bash
npm start              # Start webpack dev server at localhost:8080
npm run serve          # Serve production build from dist/ on port 3001
```

### Building
```bash
npm run build          # Production build for general deployment
npm run build:gh       # Production build optimized for GitHub Pages
```

### Code Quality
```bash
npm test               # Run StandardJS linter
npm run fix            # Auto-fix linting issues with StandardJS
```

### Deployment
```bash
npm run deploy         # Build for GH Pages, commit dist/, and push to gh-pages branch
```

### Grammar Compilation (Legacy - from old NearleyJS implementation)
The compile scripts still exist but may be deprecated:
```bash
npm run compile        # Compile all grammars
```

## IF-Script Syntax (Current Implementation)

The current syntax (v0.6.1+) uses **double-underscore delimiters** and JavaScript-like expressions:

### Story Settings
```
settings__
  @storyTitle "My Story"
  @fullTimer 100000 1
  @startAt 1
__settings
```

### Sections
```
section__
  @title "Section Title"
  variableName = 12
  "Text content here with **markdown** support"
  choice__
    @target 2
    "Choice text"
  __choice
__section
```

### Choices
```
choice__
  @target 3
  @input variableName
  "Choice text here"
__choice
```

### Conditional Blocks
```
if__ (variable > 10 && otherVar == 4) {
  choice__
    @target 2
    "Conditional choice"
  __choice
} else variable = 10
```

### Variables and Expressions
- Variable assignment: `variableName = value`
- Variable interpolation in text: Use standard templating (check if-script-core for exact syntax)
- JavaScript-like operators: `&&`, `||`, `==`, `>`, `<`, `>=`, `<=`, `!=`

### Properties (@ directives)
- **Settings**: `@storyTitle`, `@fullTimer`, `@startAt`, `@referrable`
- **Section**: `@title`, `@timer`
- **Choice**: `@target`, `@targetType`, `@input`, `@action`
- **Scene**: `@first`, `@music`, `@sections`, `@name`

### File Imports
```
import__"filename.partial.if"__import
```

## Architecture

### Repository Structure

**This repository (if-script)** - Web editor and UI
- `src/web/js/index.js` - Main application entry point
- `src/web/preview/index.js` - Preview window entry point
- `src/web/css/` - Stylesheets
- `src/lib/` - Third-party libraries (Nearley, Showdown, w3Highlighter)
- `config/` - Webpack configurations

**Core package (if-script-core)** - Parser and interpreter
- Custom stream-based parser in `src/parsers/custom/`
- Interpreter in `src/interpreters/custom/`
- Models for Story, Section, Choice, etc. in `src/models/`
- Three parser versions available: LEGACY, EARLY, STREAM (current is STREAM)

### Key Components

**Web Application** (`src/web/js/index.js`)
- Programmatically creates entire UI using `createElement()` helper
- Two-panel layout: editor (left) and output/help/tools (right)
- Tab system for Story/Stats editors and Output/Help/Tools views
- LocalStorage management for auto-save and preferences

**Parser Integration**
- Imports `if-script-core` package
- Three parser versions (use `IFScript.versions().STREAM` for current syntax)
- Parser converts IF-Script text to Story objects with structured data

**Interpreter**
- Manages story runtime state and variable scope
- Handles choice navigation and scene transitions
- Supports markdown rendering via Showdown.js
- Manages section timers and music playback

**LocalStorage Keys** (prefixed with `if_r-`)
- `if_r-story-text` - Story editor content
- `if_r-story-stats` - Stats editor content
- `if_r-scheme-preference` - Dark/light theme
- `if_r-mode-preference` - Compact/regular menubar mode
- `if_r-view-preference` - Read/write/balanced panel layout
- `if_r-if-object` - Compiled story object
- `if_r-editor-preference` - Active editor tab
- `if_r-output-preference` - Active output tab

### Webpack Configuration

Multi-page setup with two entry points:
- **main** - Editor interface (`src/web/js/index.js` → `dist/index.html`)
- **preview** - Preview window (`src/web/preview/index.js` → `dist/preview/index.html`)

Configurations:
- `webpack.config.js` - Base configuration
- `webpack.dev.js` - Development mode with dev server
- `webpack.prod.js` - Production optimizations
- `webpack.gh.js` - GitHub Pages specific (publicPath handling)

## Development Workflow

### Working with IF-Script Core

The `if-script-core` package is consumed from the npm registry (`^0.6.1`). Only `apps/ide/package.json` declares the dependency; the root `package.json` is a workspace orchestrator with no direct dependency on it.

For local cross-repo development, link and unlink with convenience scripts:
```bash
npm run link:core      # symlinks node_modules/if-script-core -> ../if-script-core
npm run unlink:core    # restores registry resolution, run before committing
```

A pre-commit hook (`scripts/pre-commit.sh`, installed automatically via the `prepare` script) rejects commits if `package-lock.json` still references `../if-script-core`.

The core package has its own repository and can be developed separately:
```bash
git clone https://github.com/PlytonRexus/if-script-core.git
cd if-script-core
npm install
npm run test:parse    # Test the parser
npm run test:interpret # Test the interpreter
```

### Parser Versions

The IFScript class supports three parser versions:
- `versions.LEGACY` - Original regex-based parser
- `versions.EARLY` - NearleyJS-based parser (old syntax with `ss>`, `ch>`, etc.)
- `versions.STREAM` - Current custom stream-based parser (double-underscore syntax)

Initialize with: `new IFScript(IFScript.versions().STREAM)`

### UI Features

**Editor Modes**
- Textarea editor (current implementation)
- ContentEditable editor (partial implementation exists in code)

**View Modes**
- Read - Output panel only (100% width)
- Write - Editor panel only (100% width)
- Balanced - Split view (50/50)

**Theme Modes**
- Dark mode - Dark background, light text
- Light mode - Light background, dark text

**Menubar Modes**
- Regular - Visible top navigation bar (10vh)
- Compact - Hidden menubar (0vh), show via auxiliary button

### Auto-save Implementation

- 750ms debounce on keyup events
- Saves to localStorage automatically
- Manual save: Ctrl+S
- Document title updates to "Saved" temporarily

### Download Features

- **Download story** - Exports compiled story object as `story.js` for embedding
- **Download story text** - Exports raw IF-Script text as `story.txt`
- Both use Blob URLs for client-side file generation

## Code Style

- **Linting**: StandardJS (configured in package.json)
- **Ignored paths**: `src/web/assets/**`, `src/web/js/lib/**`, `dist/**`
- **Babel**: Uses `@babel/preset-env` and `@babel/plugin-proposal-class-properties`
- **Browser compatibility**: Checks for IE/Edge via user agent detection

## Testing and Examples

Example stories are in `if-script-core`:
- `test/examples/introduction.mjs` - Full tutorial story
- `test/examples/simple.mjs` - Basic example
- `test/examples-if/*.if` - IF-Script source files

The introduction example from `src/web/js/globals.js` may still use old syntax and should be updated to match current parser.

## Common Development Tasks

### Adding New Syntax Features
1. Modify parser in `if-script-core` repository
2. Update models if needed (Story, Section, Choice, etc.)
3. Update interpreter to handle new features
4. Add examples to test suite
5. Bump and publish `if-script-core` version
6. Update the dependency version in `apps/ide/package.json` and run `npm install`

### Updating the Web UI
1. Main UI logic is in `src/web/js/index.js`
2. Helper functions at top of file (createElement, useScheme, useView, etc.)
3. All DOM elements created programmatically
4. Modal system for settings and help dialogs
5. Help text defined in `src/web/js/globals.js`

### Modifying Build Process
1. Webpack configs in `config/` directory
2. Paths defined in `config/paths.js`
3. HTML templates in `src/web/*.template.html`
4. Asset handling configured in webpack module rules
