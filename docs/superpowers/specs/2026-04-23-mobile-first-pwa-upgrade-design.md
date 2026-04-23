# Mobile-First PWA Upgrade Design

## Summary

Upgrade the website into a mobile-first installable PWA so it feels like a standalone tool on phones, especially Android and iPhone home-screen use, while leaving desktop as a secondary experience.

## Goals

- Make the app installable to the home screen.
- Make the app open in standalone app mode instead of feeling like a browser tab.
- Improve repeat-use polish and perceived quality on mobile.
- Keep the current image-processing behavior intact.
- Prioritize mobile over desktop refinements.

## Non-goals

- No native mobile app.
- No app store packaging.
- No large redesign of core export workflows.
- No desktop-specific polish beyond what naturally follows from PWA support.

## User Flow

### First-time mobile visitor

1. User opens the site on mobile.
2. App looks clean and app-like.
3. Browser can offer installability through the web manifest and service worker.
4. Optional in-app install guidance can appear at the right moment.

### Installed mobile user

1. User launches the app from the home screen.
2. App opens in standalone mode.
3. Core assets load quickly from cache.
4. User gets the same image-processing experience without browser-tab chrome.

## Technical Design

### PWA manifest

Add a web app manifest with:
- app name and short name
- theme/background colors
- standalone display mode
- start URL
- mobile-friendly icons
- portrait-friendly orientation if appropriate

### App icons

Provide at minimum:
- 192x192 icon
- 512x512 icon
- maskable icon if feasible

### Service worker

Add a lightweight service worker for app-shell caching:
- `index.html`
- `style.css`
- `script.js`
- local image assets
- manifest
- local icons

The goal is fast repeat launches and a more app-like feel, not aggressive offline job syncing.

### Mobile-first standalone polish

Adjust the app for installed-mode behavior:
- correct theme color and status bar presentation
- ensure viewport and layout feel natural in standalone mode
- avoid dependency on browser UI affordances
- keep primary actions visible and clear on mobile

### Install UX

If feasible, add a minimal install prompt strategy for supported browsers, especially Android Chrome.
This should be subtle and only enhance the experience; it should not interrupt the tool’s primary workflow.

### Scope control

The PWA upgrade should not refactor the core export logic. It should layer on top of the existing frontend with minimal risk.

## UI changes

Minimal, product-focused polish only:
- manifest metadata
- app icons
- standalone-mode refinements if needed
- optional install prompt/supportive copy

## Risks

- iOS and Android install experiences differ.
- Service worker caching can create stale-asset issues if not versioned carefully.
- Installed-mode layout may expose spacing/viewport issues not visible in normal tab mode.

## Testing / Verification

Manual verification targets:
- Android Chrome: install to home screen, launch in standalone mode
- iPhone Safari: add to home screen, launch as web app
- repeat launches load quickly
- cached app shell still updates correctly after deployment
- existing image processing still works in installed mode
- no regression in normal browser-tab usage
