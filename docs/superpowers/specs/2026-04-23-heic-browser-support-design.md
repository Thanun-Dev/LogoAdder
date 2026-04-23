# HEIC Browser Support Design

## Summary

Add free, client-side HEIC/HEIF support so the website can accept and process iPhone-origin HEIC images anywhere browser-native decoding is available or can be supplemented by an in-browser conversion library.

## Goals

- Support HEIC/HEIF uploads everywhere possible without adding backend cost.
- Keep the application website-only.
- Preserve the existing rendering, preview, export, and batching flows once an image is decoded.
- Minimize disruption to iOS, Android, and desktop behavior already working today.

## Non-goals

- No backend conversion service.
- No native app integration.
- No change to the current JPEG export target format.
- No attempt to preserve every HEIC metadata field beyond what is needed for visually correct rendering.

## User Flow

1. User selects `.heic`, `.heif`, or regular image files.
2. The app accepts the file through the same image selection flow.
3. The loader attempts to decode the image.
4. If the browser cannot decode the HEIC file natively, the app converts it client-side to a browser-readable blob.
5. The rest of the app continues normally using the decoded/converted image.

## Technical Design

### Library strategy

Use a free client-side HEIC conversion library in the browser, such as `heic2any`.

### Integration point

Integrate HEIC handling at the image loading layer only. The existing app already has a single image loading pipeline, so the most stable design is:
- detect HEIC/HEIF input
- attempt native browser decode first when practical
- fall back to client-side conversion
- hand a normal decoded image object to the existing render/export pipeline

### File acceptance

Ensure the file inputs and drag/drop image filtering accept HEIC and HEIF MIME types or file extensions where browser MIME reporting is inconsistent.

### Output handling

Converted images should continue through the current JPEG export path. No special output format is required.

### Performance strategy

- Convert only when needed.
- Reuse the current image processing flow after conversion.
- Avoid holding both the source file and multiple large converted copies longer than needed.
- Continue respecting the current output pixel budget and batching strategy.

### Error handling

If HEIC decoding and conversion both fail:
- surface a clear upload/processing error
- leave the rest of the app functional for supported images

### Revertability

HEIC support should be isolated behind:
- one external client-side library include
- one HEIC detection helper
- one conversion helper in the image loading path

Removing the feature later should be straightforward.

## Risks

- HEIC conversion can be slow on low-end mobile devices.
- Very large HEIC files may increase memory pressure during conversion.
- Browser MIME reporting for HEIC files is inconsistent, so extension-based detection may also be needed.
- Orientation handling may vary depending on the conversion library output.

## Testing / Verification

Manual verification targets:
- iPhone-origin `.heic` uploads on desktop Chrome
- `.heic` uploads on Android Chrome
- `.heic` uploads on iPhone Safari if allowed by the browser/file picker
- mixed batches of JPG/PNG/HEIC
- preview rendering correctness
- final JPEG export correctness
- failure handling when a corrupted HEIC is provided
