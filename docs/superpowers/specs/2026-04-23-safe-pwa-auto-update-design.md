# Safe PWA Auto Update Design

## Summary

Automatically apply new PWA versions when a new service worker is ready, but only reload the app when no export is actively running. If a batch process is in progress, defer the reload until processing finishes, errors, or is cancelled.

## Goals

- Reduce stale-code problems in the installed Android PWA.
- Reload automatically when safe.
- Never interrupt an active export run with an update reload.
- Keep the current workflow unchanged on iOS, Android, and desktop.

## Non-goals

- No manual update button.
- No visible update UI unless a future change explicitly adds one.
- No redesign of the service worker caching model beyond what is needed for safe reload timing.

## User Flow

### Idle app

1. User opens the app.
2. A new service worker becomes available.
3. The app activates it.
4. If no export is running, the app reloads automatically.

### Active export

1. User is processing images.
2. A new service worker becomes available.
3. The app activates it, but does not reload immediately.
4. Once processing completes, errors, or is cancelled, the app reloads automatically.

## Technical Design

### Processing state

Add a small global processing state in `script.js`.

Responsibilities:
- mark export start
- mark export end
- expose a check that the service worker registration logic can consult

This state must cover:
- Android folder save
- iOS/mobile share preparation and completion
- ZIP export

### Deferred reload flag

Track whether a service worker-triggered reload is pending.

Behavior:
- when `controllerchange` fires and processing is idle, reload immediately
- when `controllerchange` fires and processing is active, set a deferred reload flag
- when processing ends, if the deferred reload flag is set, reload once

### Safety

The reload logic must:
- avoid multiple reload loops
- avoid reloading during export
- still pick up new versions promptly once work is done

## Scope

Apply changes only to:
- `script.js` processing lifecycle state
- `index.html` service worker registration/reload handling

Keep:
- export behavior
- UI flow
- platform-specific save/share routing

## Risks

- Missing one export completion/error path would leave the deferred reload waiting indefinitely.
- Over-broad processing state could delay updates longer than needed.

## Testing / Verification

Manual verification targets:
- app reloads automatically when idle and a new service worker takes control
- app does not reload during Android export
- app does not reload during iOS/mobile share preparation
- app reloads after export completes if an update was waiting
- no regression in desktop ZIP export or Android/iOS save flows
