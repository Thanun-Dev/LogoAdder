# Android Chrome Persistent Folder Access Design

## Summary

Improve the Android Chrome folder-save flow by persisting the selected directory handle across sessions so the website can try to reuse the same folder without making the user browse for it again.

## Goals

- Keep the app website-only and free.
- Reduce repeated folder-picking friction on Android Chrome.
- Reuse the previously selected save folder when Chrome still allows it.
- Accept that Chrome may still require a permission prompt in some cases.
- Keep iOS and desktop behavior unchanged.

## Non-goals

- No guarantee of permanent write permission across all devices or Chrome versions.
- No backend or native app changes.
- No changes to the existing HEIC support, iOS flow, or desktop flow beyond shared helper reuse if needed.

## User Flow

### First Android Chrome use

1. User starts export.
2. Website asks user to choose a save folder.
3. Website stores the selected directory handle locally.
4. Export writes images into that folder.

### Later Android Chrome use

1. User starts export again.
2. Website loads the previously stored handle.
3. Website checks permission status.
4. If permission is still granted, export proceeds immediately.
5. If permission is not granted but the handle is still valid, website requests permission again without requiring folder re-selection.
6. If the stored handle cannot be used, website falls back to the folder picker.

## Technical Design

### Storage mechanism

Persist the `FileSystemDirectoryHandle` in IndexedDB.

This is the recommended browser-side storage for File System Access handles and keeps the implementation website-only.

### Handle lifecycle

Add a small persistence layer with responsibilities:
- save a directory handle after successful folder selection
- load the stored directory handle on demand
- clear the stored handle if it becomes invalid or unusable

### Permission flow

For a restored handle:
- check current permission state when possible
- if `granted`, use it directly
- if `prompt`, request permission from a user gesture
- if permission cannot be restored, clear the handle and fall back to picker

### Android export integration

The existing Android Chrome folder-save controller should be updated to:
- first try the persisted handle path
- then request permission if needed
- then fall back to the picker only when restore fails

### UI behavior

Minimal changes only:
- if a saved folder is reused, no folder picker should appear
- if permission is needed again, a short message should explain that Chrome needs confirmation for the saved folder
- if the saved folder is invalid, the app should quietly fall back to picking a new folder

### Revertability

Implementation should stay isolated behind:
- small IndexedDB helpers
- directory handle permission helpers
- the existing Android Chrome export branch

Removing this later should be straightforward.

## Error Handling

- If IndexedDB storage fails, continue with the normal folder picker flow.
- If the stored handle cannot be queried or used, clear it and request a new folder.
- If permission request is denied, restore UI state cleanly.

## Risks

- Chrome on Android may still revoke or forget permission between sessions.
- Some devices may restore handles inconsistently.
- IndexedDB persistence may work while permission still requires a fresh user confirmation.

## Testing / Verification

Manual verification targets:
- first Android Chrome run stores the selected folder
- page refresh reuses the same folder when permission remains granted
- browser restart reuses the same folder when possible
- permission prompt reappears only when Chrome requires it
- invalid or revoked handle falls back to choosing a new folder
- iOS and desktop behavior remain unchanged
