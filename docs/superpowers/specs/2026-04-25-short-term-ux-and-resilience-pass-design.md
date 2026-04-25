# Short-Term UX and Resilience Pass Design

## Summary

Improve the app’s short-term usability and reliability without changing the core platform workflows. This pass adds richer completion summaries, per-file failure reporting, current-file status text during processing, and safer preview loading in `loadCurrentImg`.

## Goals

- Make export progress easier to understand during long batch runs.
- Give users clearer final feedback after Android and iPhone batch processing.
- Preserve a lightweight record of skipped/failed files during batch processing.
- Prevent preview loading failures from breaking navigation or the UI.
- Keep existing Android, iPhone, and desktop workflows intact.

## Non-goals

- No export flow redesign.
- No desktop summary redesign.
- No long visible error list in the main UI.
- No backend or worker-based processing changes in this pass.

## User Flow

### Android

1. User starts a batch.
2. Progress text shows the current file being processed.
3. If a file is skipped, processing continues.
4. The summary card updates with saved/skipped counts and final status.
5. After completion, the card shows a richer end-state summary.

### iPhone

1. User starts a batch.
2. Progress text shows the current file being prepared.
3. During intermediate share batches, no persistent summary card is shown.
4. After the full batch completes, the summary card appears with final status and skipped count if relevant.

### Preview navigation

1. User selects files and navigates previews.
2. If one image fails to load for preview, the app keeps working.
3. The preview area shows a safe fallback status instead of breaking navigation.

## Technical Design

### Richer completion summary

Extend the existing summary card state to support:
- saved count
- skipped count
- destination label
- current/final status
- optional short note when files were skipped

### Per-file failure reporting

Track skipped-file items in memory with:
- file name
- short reason

This reporting is primarily for summary accuracy and future diagnostics. The main UI will remain compact.

### Current-file status text

Before each file starts processing, update the progress text with the current file name.

This applies to:
- Android folder-save flow
- iPhone/mobile share preparation flow
- desktop ZIP flow where practical

### Hardened preview loading

Wrap `loadCurrentImg` in guarded error handling:
- if preview load succeeds, render normally
- if it fails, clear the previous preview safely
- show a fallback status message
- keep next/previous navigation available

## Risks

- Over-updating progress text could make long filenames noisy.
- Missing a state reset could leave stale summary or failed-file data between runs.
- Preview fallback must not accidentally interfere with export logic.

## Testing / Verification

- Android batch shows current-file progress text
- Android summary card shows saved/skipped/final status correctly
- iPhone summary card appears only after the full batch completes
- skipped-file counts remain accurate
- a preview load failure does not break navigation or export
- no regression in Android folder save, iPhone share, or desktop ZIP export
