# Android HEIC Resilience and Summary Design

## Summary

Harden the Android installed-app batch pipeline for HEIC-heavy runs by skipping stalled or failed files instead of freezing the whole export. Add a small completion summary card near the progress area, visible throughout Android processing and shown only after the full batch completes on iPhone.

## Goals

- Prevent a single HEIC failure or stall from stopping the full Android batch.
- Allow Android HEIC-heavy batches to continue with skipped-file tracking.
- Add a small status summary card near the progress area.
- Show the summary during Android processing and only after the full batch on iPhone.
- Preserve the current export workflow and desktop behavior.

## Non-goals

- No backend processing.
- No redesign of Android/iPhone save flow.
- No desktop summary card behavior change.
- No promise that every HEIC file will always succeed on weak mobile hardware.

## User Flow

### Android

1. User starts a large batch.
2. Summary card appears near the progress area.
3. If a HEIC file fails or stalls too long, the app skips it and continues.
4. The summary updates with saved count and skipped count.
5. When the batch completes, the user sees a final summary instead of a silent partial stop.

### iPhone

1. User processes the batch with the current share flow.
2. No summary card is shown during intermediate share batches.
3. After the full batch is complete, the summary card appears with the final result.

## Technical Design

### Guarded per-file processing

Wrap single-file processing in a guard that:
- runs the existing image pipeline
- applies a timeout
- catches errors
- returns either a success result or a skipped result

### Timeout behavior

Use a per-file timeout for mobile HEIC-heavy processing.

Behavior:
- if a file finishes normally, continue as before
- if a file throws, mark it skipped
- if a file exceeds the timeout, mark it skipped
- continue to the next file

This timeout should be applied in the Android folder-save path first, where the stall is currently observed.

### Summary state

Track:
- total files
- completed/saved count
- skipped count
- destination label
- final status

### Summary card

Add a small status card near the progress area.

Behavior:
- hidden by default
- Android: visible once export begins and updated live
- iPhone: shown only after full completion
- reset on new export

### Cleanup / yielding

Add slightly more deliberate yielding around per-file guarded processing so Android has a better chance to release memory between HEIC conversions.

## Risks

- Timeout too short could skip files that would have succeeded.
- Timeout too long could reduce the benefit of skip-and-continue behavior.
- Missing a completion path could leave summary state stale.

## Testing / Verification

- Android HEIC-heavy batch continues after a failed/stalled file
- skipped count increases correctly
- already processed files remain saved
- summary card updates during Android processing
- iPhone summary appears only after the full batch completes
- no regression in desktop ZIP behavior
