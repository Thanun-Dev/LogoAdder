# HEIC Worker Batch-Only Design

## Summary

Improve responsiveness by moving HEIC conversion for batch export work off the main thread into a Web Worker. This first pass applies only to batch export paths and does not change preview loading yet.

## Goals

- Reduce UI blocking during HEIC-heavy batch exports.
- Keep Android, iPhone, and desktop export workflows intact.
- Limit the first worker rollout to batch processing only.
- Avoid changing preview behavior in this pass.

## Non-goals

- No HEIC worker use for preview loading.
- No change to folder-save/share/ZIP routing.
- No backend changes.

## Scope

Apply worker-based HEIC conversion only in:
- Android folder-save batch processing
- iPhone/mobile share batch preparation
- desktop ZIP export processing

Do not apply worker-based conversion in:
- `loadCurrentImg`
- normal preview navigation

## Technical Design

### Worker

Add a dedicated worker file, for example:
- `heic-worker.js`

Responsibilities:
- receive a source file/blob
- run `heic2any` conversion
- return the converted JPEG blob
- return a structured error on failure

### Main-thread integration

Replace direct main-thread HEIC conversion in the batch-processing path with a worker-backed helper.

Recommended shape:
- keep `loadImage(file)` for preview path as-is
- add a separate batch helper such as:
  - `loadBatchImage(file)`
  - or `convertHeicToJpegBlobInWorker(file)`

This preserves the current preview path while improving the expensive batch path.

### Fallback

If worker creation or worker conversion fails:
- surface a normal error to the existing guarded processing path
- let Android skip-and-continue continue working

## Risks

- Worker blob transfer needs to be handled carefully.
- `heic2any` may behave differently inside a worker depending on library assumptions.
- Service worker caching must include the new worker file.

## Testing / Verification

- HEIC-heavy Android batch remains responsive
- Android skip-and-continue still works
- iPhone batch share preparation still works
- desktop ZIP export still works
- preview loading behavior remains unchanged
