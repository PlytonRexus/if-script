# Author-First IDE Transformation Plan (Rebaseline + Finish)

## Summary
Finalize this roadmap as a vision-first but execution-usable plan, rebaselined to actual code state as of **February 28, 2026**.

- Keep cross-repo scope:
  - IDE: `C:\Users\jmihi\Downloads\code\if-script\apps\ide`
  - Core: `C:\Users\jmihi\Downloads\code\if-script-core`
- Include explicit status (`Shipped`, `In Progress`, `Planned`) so completed work is not treated as future scope.
- Use relative milestones with measurable acceptance criteria.
- Priority sequence is fixed: **M1 Storyboard Editing -> M2 Inspector Parity -> M3 Logic Builder**.

## Current State (Validated)

| Area | Status | Validation Notes |
| --- | --- | --- |
| Stable entity IDs + source ranges in IDE indexing/graph | Shipped | `entityId` and `sourceRange` are carried across indexes and graph node IDs. |
| Core authoring schema parity via `getAuthoringSchema()` | Shipped | Story/scene/section/choice advanced props are exposed from core schema. |
| Parser metadata support for `sourceRange` | Shipped | Parser attaches `source` + `sourceRange` for section/scene/choice/logic nodes. |
| Legacy authoring emitters (`renderSectionLegacy`, etc.) | Shipped | Core exports reusable legacy block emitters. |
| Storyboard-first default mode | Shipped | IDE defaults to storyboard mode with source as toggle. |
| Diagnostics quick-fixes (basic create target) | In Progress | Missing section/scene/timer target scaffolding exists; deeper guided repairs pending. |
| Storyboard workspace (read-oriented lanes/cards) | In Progress | Cross-file lanes/cards and open navigation exist; editing flows are pending. |
| Schema-driven inspector, guided target/media pickers | Planned | Inspector is still largely hardcoded and partial. |
| Visual create/edit/delete in storyboard | Planned | Storyboard write actions are not complete yet. |
| Structured logic builder | Planned | No visual logic authoring block system yet. |

## Shipped Foundation (M0)
The following foundation is already delivered and is now baseline, not future scope:

1. Core authoring contract:
- `IFScript.getAuthoringSchema()` with advanced story/scene/section/choice properties.
- Parser metadata includes source location details needed for deterministic patching.
- Legacy emitters are available for canonical block-style writeback.

2. IDE data model and parse pipeline:
- Worker builds indexes carrying `entityId`, `sourceRange`, and advanced property snapshots.
- Graph/index navigation no longer relies only on title strings.
- Storyboard layout metadata is already persisted in sidecar workspace state (IndexedDB + bundle metadata).

3. Authoring and diagnostics baseline:
- Source transforms handle advanced choice properties including writer-arrow conversion to legacy blocks when needed.
- Storyboard mode is available and defaulted.
- Runtime diagnostics hooks and quick-fix entry points are wired in the IDE.

## Important Public API / Interface / Type Changes
1. No breaking external API changes are required for M1/M2.

2. Planned additive IDE changes:
- Extend `StoryboardLayoutState` with selection/edge routing metadata required by editable storyboard interactions.
- Add explicit storyboard edit operation types for deterministic patch orchestration and undo checkpoints.

3. Optional additive core changes (M3 only, if needed):
- Add expression-fragment emitter helper(s) to complement existing legacy block emitters.
- Keep parser metadata option behavior additive; `includeSourceRange` remains enabled by default.

## Milestones

## M1: Storyboard Editing Foundation (Priority 1)
IDE scope:
1. Add visual create/edit/delete for sections and choices directly from storyboard lanes.
2. Add choice retargeting (section/scene) with direct unresolved-target repair actions.
3. Use persisted lane/node layout state in actual storyboard interactions (not storage-only).
4. Enforce entity-ID-based operations to keep duplicate-title stories safe cross-file.

Core scope:
1. No new parser features required.
2. Consume existing `sourceRange` metadata and legacy emitters for writeback behavior.

Acceptance criteria:
1. Author creates a section in a chosen file lane without opening source editor.
2. Author retargets a choice to section/scene from storyboard and only intended source ranges change.
3. Duplicate titles across files remain uniquely editable and navigable via entity IDs.
4. Storyboard layout reloads consistently from persisted metadata.

Non-goals:
1. Visual logic expression editing.

## M2: Inspector Parity + Guided Authoring
IDE scope:
1. Replace hardcoded inspector forms with schema-driven rendering for story/scene/section/choice contexts.
2. Provide full advanced property coverage, including choice logic fields (`@input`, `@when`, `@once`, `@disabledText`, `@action`).
3. Add guided target pickers for section/scene refs and media validators for timer/audio fields.
4. Expand diagnostics quick-fixes from scaffold creation to guided repair flows.

Core scope:
1. Schema remains source of truth.
2. No breaking API changes.

Acceptance criteria:
1. Every schema property appears in the appropriate guided form context.
2. Choice advanced fields are editable and write back correctly.
3. Diagnostics panel offers guided repairs beyond missing-target creation.

Non-goals:
1. Full drag-and-drop logic graph editing.

## M3: Structured Logic + Playtest Correlation
IDE scope:
1. Add visual block editing for `if__/else__`, `while__`, `@when`, `@action`, and assignment flows.
2. Add selected-node playtest launch and event timeline link-back to authored entities.
3. Keep raw-source escape hatch for advanced edge cases.

Core scope:
1. Add small emitter helper(s) only if needed for expression/logic fragment serialization.
2. Do not change runtime behavior semantics.

Acceptance criteria:
1. Visual logic roundtrips to legacy syntax and reparses with equivalent behavior.
2. Range-aware patching preserves unrelated comments/imports/top-level content.
3. Playtest events deep-link to authored entities in editor/storyboard.

Non-goals:
1. Replacing raw source editor for expert workflows.

## Implementation Workstreams
1. Storyboard editing workstream (M1)
- Entry criteria: baseline storyboard read-only lanes/cards are present.
- Exit criteria: create/edit/delete + retarget + unresolved repair actions are functional with range-safe writeback.

2. Inspector parity workstream (M2)
- Entry criteria: schema contract and advanced source transforms are stable.
- Exit criteria: schema-driven inspector reaches full property coverage with guided pickers/validators.

3. Structured logic workstream (M3)
- Entry criteria: M1 writeback model is stable and deterministic.
- Exit criteria: visual logic authoring roundtrips correctly and maps to playtest/runtime events.

4. Cross-repo contract workstream (M0-M3)
- Entry criteria: coordinated versioning and branch coordination exists between IDE/core.
- Exit criteria: each milestone ships without API breakage and with compatibility tests passing.

## Test Cases and Scenarios
1. Storyboard editing writes only targeted ranges across multiple files.
2. Cross-file duplicate titles do not collide in graph/navigation/edit actions.
3. Inspector schema parity check: all schema properties render and patch correctly.
4. Writer-arrow choice advanced edit flow converts safely to legacy block where needed.
5. Visual logic roundtrip equivalence test: emit -> parse -> runtime behavior match.
6. Diagnostics repair flow tests for scene/section/timer target cases.
7. Backward compatibility tests: old bundles load and metadata-absent bundles still work.

## Rollout and Migration (Relative)
1. M1 rollout:
- Enable editable storyboard behind an `author_mode_v1` sub-flag.
- Adoption gate: range-safe writeback and duplicate-title safety tests pass.

2. M2 rollout:
- Enable schema-driven inspector by default.
- Keep source-mode escape hatch fully available.
- Adoption gate: schema parity matrix and guided repair tests pass.

3. M3 rollout:
- Enable logic builder behind beta flag before default-on consideration.
- Adoption gate: roundtrip equivalence + playtest link-back validation pass.

4. Compatibility guardrails:
- `.if` remains canonical source of truth at all times.
- Sidecar metadata remains optional and backward compatible.
- No forced content migration.

## Assumptions and Defaults
1. Both repos continue coordinated development and release planning.
2. `if-script-core` authoring API additions remain additive and non-breaking.
3. Source mode remains available as an advanced fallback for all milestones.
4. Vision-first narrative remains, with measurable Definition-of-Done per milestone.
5. Milestone sequencing is fixed: **M1 Storyboard Editing -> M2 Inspector Parity -> M3 Logic Builder**.
