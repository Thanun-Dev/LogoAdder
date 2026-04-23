# Mobile Export Filename Preservation Design

## Summary

Preserve the source photo's base filename for mobile exports while keeping the exported extension aligned with the actual output format (`.jpg`). On Android folder save, prevent overwriting existing files by appending ` (1)`, ` (2)`, and so on when a name collision is detected.

## Goals

- Keep iOS shared export filenames close to the original source names.
- Keep Android saved filenames close to the original source names.
- Ensure Android never overwrites an existing file in the selected folder.
- Keep the exported extension honest to the actual output format (`.jpg`).
- Preserve the current export workflow and platform split.

## Non-goals

- No change to the rendered image format.
- No change to desktop ZIP workflow unless it naturally shares the same helper.
- No change to gallery preview behavior.

## User Flow

### iOS

1. User selects source photos.
2. User exports through the existing share flow.
3. Shared files use the original source filename stem with a `.jpg` extension.

Example:
- `IMG_1034.HEIC` -> `IMG_1034.jpg`

### Android Chrome

1. User selects source photos.
2. User exports through the existing folder-save flow.
3. Saved files use the original source filename stem with a `.jpg` extension.
4. If a file with that name already exists in the chosen folder, the app saves:
   - `IMG_1034.jpg`
   - `IMG_1034 (1).jpg`
   - `IMG_1034 (2).jpg`

## Technical Design

### Filename helper

Add a helper that:
- extracts the source filename stem from `file.name`
- removes the original extension
- normalizes the output to `.jpg`

### Android collision handling

Before writing a file into the chosen directory:
- try the base output name first
- if that file already exists, increment with ` (1)`, ` (2)`, and so on
- only create the new file once a free name is found

This must avoid overwriting an existing exported or source file in the selected folder.

### Scope

Apply the helper to:
- iOS/mobile share export naming
- Android folder-save naming

Desktop ZIP export can remain unchanged for now unless reusing the same helper is clearly cleaner and low-risk.

## Risks

- Some source files may already contain suffixes like ` (1)`, which is acceptable because collision handling still remains deterministic.
- Very unusual filenames may need light sanitization if the browser or filesystem rejects characters.

## Testing / Verification

Manual verification targets:
- iOS share exports use original-name-based `.jpg` filenames
- Android saves use original-name-based `.jpg` filenames
- Android never overwrites an existing file with the same name
- repeated exports into the same folder produce ` (1)`, ` (2)` suffixes
- no regression in desktop ZIP export
