# High Quality Safe Defaults Design

## Summary

Increase the default main export JPEG quality from `0.85` to `0.9` while keeping the current `MAX_OUTPUT_PIXELS = 4000000` safety cap. This improves output quality without weakening the mobile-safe batch behavior for 50+ photo processing.

## Goals

- Improve default exported image quality.
- Keep the current mobile memory safety guardrail.
- Apply the new default consistently across Android, iOS, and desktop export paths.
- Avoid any UI or workflow changes.

## Non-goals

- No output size control UI.
- No change to thumbnail preview quality.
- No change to the current pixel cap.

## Technical Design

- Keep `MAX_OUTPUT_PIXELS = 4000000`.
- Keep thumbnail generation at its current lower quality setting.
- Change the main exported image blob generation to use JPEG quality `0.9`.
- Reuse the existing export path so all platforms pick up the new default automatically.

## Risks

- Output files will be somewhat larger than before.
- Export speed may be slightly slower on weak phones, but the retained pixel cap should keep this within the current stability envelope.

## Testing / Verification

- `node --check script.js`
- confirm the main export path uses `0.9`
- confirm thumbnail export still uses the lower quality setting
- verify no change to `MAX_OUTPUT_PIXELS`
