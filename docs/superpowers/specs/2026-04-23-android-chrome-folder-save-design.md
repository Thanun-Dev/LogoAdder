# Android Chrome Folder Save Design

## Summary

Add an Android Chrome-specific export path that saves processed JPEG files directly into a user-chosen folder, while keeping iOS Web Share and desktop ZIP export unchanged.

## Goals

- Preserve the current iOS batch Web Share behavior.
- Preserve the current desktop ZIP export behavior.
- Improve Android Chrome saving so exported images land in a real folder, ideally under `Pictures`, instead of relying on share targets.
- Keep the Android-specific implementation isolated so it can be reverted cleanly.

## Non-goals

- No backend changes.
- No native app behavior.
- No changes to iOS and desktop export UX except any necessary shared helper extraction.
- No promise that Android Gallery indexes files instantly on every device.

## User Flow

### iOS

Unchanged. The app processes images in groups of 10 and uses the existing Web Share flow.

### Desktop

Unchanged. The app creates one ZIP and exposes the existing ZIP download button.

### Android Chrome

1. User taps the main export button.
2. The app detects Android Chrome and checks for File System Access support.
3. If no writable directory handle is already available, the app prompts the user to choose a target folder using `showDirectoryPicker()`, with `startIn: "pictures"` when supported.
4. The app creates or reuses a subfolder strategy if needed, then writes processed JPEG files directly into the chosen folder in batches of 10.
5. Progress UI updates during processing.
6. On success, the app shows a completion state explaining where files were saved.
7. If the folder picker is cancelled or writing fails, the app falls back to the existing Android-safe export path.

## Technical Design

### Platform detection

Add a narrow helper for Android Chrome detection. It should avoid affecting iOS Safari, desktop Chrome, or non-Chrome Android browsers.

Proposed logic:
- Android user agent signal
- Chromium/Chrome signal
- Exclude iOS Chrome-like agents

### Capability detection

Add a helper that checks whether File System Access APIs needed for directory writing are available:
- `window.showDirectoryPicker`
- writable file handles via `createWritable`

This gate prevents partial behavior on unsupported browsers.

### Directory handle lifecycle

Store the chosen directory handle in memory for the current session.
Optionally persist the handle in IndexedDB later, but the first implementation should stay scoped and use in-memory/session behavior unless current code structure makes persistence trivial.

The Android export path should request a directory only when necessary and only from a user gesture.

### Android export controller

Add a dedicated function, for example `startAndroidChromeFolderExport()`.

Responsibilities:
- obtain or request the target directory handle
- process files in batches of 10 using the existing image pipeline
- write each processed JPEG to the chosen directory
- update progress UI using the shared progress helpers
- finish with a clear saved-location message
- fall back cleanly on error or unsupported capability

### File writing

For each processed result:
1. Generate the output JPEG blob using the existing processing pipeline.
2. Create a target file handle in the selected directory.
3. Open a writable stream.
4. Write the blob.
5. Close the stream.

File names should stay consistent with the current export pattern:
- `LogoAdder_1.jpg`
- `LogoAdder_2.jpg`
- etc.

### Gallery visibility strategy

To maximize visibility in Android gallery apps:
- start the picker in `Pictures` when possible
- instruct users to choose a folder inside `Pictures` for best results
- avoid ZIP for this Android Chrome path

The app cannot force media scanning, but writing real JPEG files into a user-selected folder under `Pictures` is the best available web-only strategy.

### Fallback behavior

If Android Chrome folder-save cannot proceed because:
- the API is unavailable
- the user cancels folder selection
- writing fails

then route back to the current export fallback already used for Android-safe behavior.

### Revertability

Implementation will be isolated behind:
- Android Chrome detection helper
- capability detection helper
- one Android-specific export controller

Reverting later should only require removing the Android Chrome branch and routing Android back to the previous export path.

## UI changes

Minimal changes only:
- Android Chrome may show a one-time message before folder selection.
- Completion text should mention that photos were saved to the chosen folder.
- iOS and desktop labels remain unchanged unless a shared label must become slightly more generic internally.

No large layout changes are required.

## Error Handling

- If picker is cancelled: stop cleanly and restore the main button state.
- If a file write fails mid-run: surface an error and stop further writes unless fallback is explicitly safe.
- If capability checks fail: use the current Android fallback path.

## Testing / Verification

Manual verification targets:
- iOS: confirm existing 10-photo Web Share still works.
- Desktop: confirm ZIP export still works.
- Android Chrome:
  - picker opens from a button tap
  - folder can be chosen
  - 10+ images write successfully
  - files appear in the chosen folder
  - app remains memory-safe for larger batches
  - cancellation and failure fallback paths restore UI correctly

## Risks

- Some Android gallery apps may not show newly written files immediately.
- File System Access support may vary by Chrome version/device.
- Persisting directory access across sessions is outside this first pass and may be added later if needed.
