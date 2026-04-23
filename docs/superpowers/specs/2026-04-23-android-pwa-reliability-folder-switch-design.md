# Android PWA Reliability and Folder Switch Design

## Summary

Fix Android installed-PWA reliability by bundling runtime libraries locally, tightening the service worker caching strategy, and adding an Android Chrome-only "Change save folder" control so users can switch save destinations without waiting for an error path.

## Goals

- Improve Android installed-PWA reliability.
- Keep the current workflow intact.
- Reduce dependency on CDN-hosted runtime libraries in installed mode.
- Add an Android Chrome-only control for changing the save folder explicitly.
- Preserve iOS and desktop behavior.

## Non-goals

- No redesign of the main export workflow.
- No native app behavior.
- No backend changes.
- No visible Android-specific controls on iOS or desktop.

## User Flow

### Android Chrome installed or in-browser

1. User opens the app.
2. Android Chrome users see a small `Change save folder` button in the action area.
3. User can tap it to choose a new folder at any time.
4. Export uses the current saved folder as before.
5. If the folder is invalid or permission is missing, the app recovers cleanly.

### iOS and desktop

Unchanged. No new folder button appears.

## Technical Design

### Local runtime libraries

Move runtime-critical libraries into the project and load them from the same origin:
- JSZip
- heic2any

This allows the service worker to cache them directly and removes Android installed-mode dependence on external CDNs.

### Service worker strategy

Adjust the service worker so the app shell updates more safely:
- keep cache versioning
- cache local shell assets and local libraries
- avoid relying on stale cached HTML forever
- allow updated app-shell files to replace old cache versions cleanly

The goal is to reduce stale-shell problems in Android installed mode.

### Android-only folder switch control

Add a button that appears only when Android Chrome folder-save support is active.

Responsibilities:
- open the directory picker intentionally
- replace the stored directory handle with the new selection
- update any related UI state if needed

This keeps the workflow intact while giving users a direct escape hatch.

### UI placement

Place the button in the existing action area, below or near the export button, without changing the primary flow.

### Revertability

This change should remain isolated behind:
- local library file references
- service worker cache logic
- Android Chrome detection for the folder-switch control

## Risks

- Service worker update changes can still be tricky on installed PWAs.
- Local library bundling increases repository size slightly.
- Folder-switch UI must stay unobtrusive so it does not confuse non-Android users.

## Testing / Verification

Manual verification targets:
- Android Chrome installed PWA loads all runtime logic correctly
- Android Chrome export still works after install
- `Change save folder` appears only on Android Chrome
- changing the folder updates the saved destination
- iOS and desktop behavior remain unchanged
- no regression in HEIC support or ZIP export
