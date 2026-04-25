# Safe Script Split, Presets, and First-Run Guidance Design

## Summary

Refactor the current single-file frontend logic into focused plain-script files, then add export quality/output size presets and a lightweight first-run guidance layer. The app must keep the current Android folder-save workflow, iPhone share workflow, desktop ZIP workflow, naming behavior, and PWA update behavior.

## Goals

- Split `script.js` into smaller files with clear responsibilities.
- Keep the current runtime model based on normal `<script>` tags instead of converting to ES modules.
- Add export quality presets and output size presets with the existing defaults preserved.
- Add a small first-run guidance layer that helps mobile users without interrupting the workflow.
- Preserve the current platform-specific export behavior.

## Non-goals

- No ES module migration in this pass.
- No redesign of Android, iPhone, or desktop export flows.
- No backend changes.
- No large visual redesign of the app.
- No change to the current file naming policy.

## Current Constraints

- The app already has multiple platform-specific paths:
  - Android Chrome folder save
  - iPhone/mobile share batching
  - desktop ZIP export
- The app already uses a service worker and a HEIC worker.
- The app already has local-only changes in progress, so the split must work with the current behavior rather than assume a clean restart from older code.

## Architecture

The current `script.js` will be split into focused plain-script files loaded in order from `index.html`.

### `app-state.js`

Owns:
- shared DOM references
- constants
- global state
- small app-wide state helpers
- config persistence entry points

### `summary-ui.js`

Owns:
- export summary card state
- summary rendering helpers
- failed-file note helpers
- compact vs detailed summary behavior

### `image-io.js`

Owns:
- image loading
- HEIC detection and conversion
- HEIC worker-backed batch conversion
- canvas/blob helpers
- output size calculation

### `preview-ui.js`

Owns:
- canvas render function
- preview loading
- preview fallback behavior
- gallery preview pagination
- navigation status updates

### `android-save.js`

Owns:
- IndexedDB save-folder persistence
- Android directory restore/request helpers
- permission helpers
- collision-safe directory writing
- Android change-folder action

### `export-flows.js`

Owns:
- Android folder-save batch flow
- iPhone/mobile share preparation and sharing flow
- desktop ZIP export flow
- per-file progress text updates
- output file naming integration

### `app.js`

Owns:
- startup wiring
- event listeners
- control updates
- platform routing
- first-run guidance trigger

## Runtime Loading

The files will be loaded by normal `<script>` tags in a fixed order.

This preserves:
- shared global state
- current worker behavior
- service worker integration assumptions
- low-risk browser compatibility

## Presets

### Quality presets

Add three presets:
- `High`
- `Balanced`
- `Small File`

Default:
- `High`

Mapping:
- `High` -> `0.9`
- `Balanced` -> `0.85`
- `Small File` -> `0.75`

### Output size presets

Add four presets:
- `Original`
- `Large`
- `Medium`
- `Small`

Default:
- `Original`

Important behavior:
- `Original` does **not** mean uncapped raw output on every device.
- It means the current safe-original behavior, preserving the existing batch-safe default.

Implementation mapping:
- `Original` -> current safe-original output path
- `Large` -> reduced pixel budget
- `Medium` -> lower pixel budget
- `Small` -> smallest budget

The exact pixel caps will be encoded in one place and reused across Android, iPhone, and ZIP export flows.

### Persistence

Preset choices will be saved with the existing config persistence so the app remembers the user’s last selection.

## First-Run Guidance Layer

### UX style

The first-run guidance will be a compact, dismissible inline panel near the action area.

It will not be:
- a modal
- a popup
- a forced tutorial

### Platform-specific guidance

#### Android Chrome

Show short guidance about:
- choosing a save folder
- Chrome permission prompts
- the `Change save folder` button

#### iPhone

Show short guidance about:
- saving/sharing in batches
- the final share/save flow

#### Desktop

Keep minimal guidance or none if the current workflow is already obvious.

### Persistence

Use `localStorage` to remember whether the user has dismissed the guidance.

The guidance should appear:
- on first run
- or when the stored version is older than the new guidance version key

## Safety Rules

This pass must not change:
- Android folder-save behavior
- iPhone share batching behavior
- desktop ZIP behavior
- export naming behavior
- current PWA update behavior
- preview/result gallery behavior except as needed for the split and new preset controls

## Implementation Notes

- Shared helpers must move with their true responsibility, not arbitrarily by line count.
- The split should keep function names stable where possible to reduce risk.
- `index.html` will be updated to load the new files in a deterministic order.
- Preset controls should integrate into the existing sidebar rather than introducing a new screen.
- Guidance should be lightweight enough that it does not feel like a blocking onboarding flow.

## Risks

- Incorrect script load order could break shared globals.
- Preset wiring could accidentally diverge across Android, iPhone, and ZIP paths.
- First-run guidance could become noisy if it is too prominent or too persistent.
- Refactoring shared state across files could break subtle interactions if boundaries are too aggressive.

## Testing / Verification

Manual verification targets:
- Android Chrome folder-save flow still works
- Android remembered folder still works
- iPhone share batching still works
- desktop ZIP still works
- HEIC-heavy batch flow still works
- preview navigation still works
- preset changes persist across reloads
- defaults remain `High` + `Original`
- first-run guidance appears once, can be dismissed, and stays dismissed
