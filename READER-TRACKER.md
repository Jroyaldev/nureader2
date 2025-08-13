# Reader Improvement Tracker

This document tracks the cleanup and improvements applied to the EPUB reader, and the prioritized backlog.

## Completed

- Remove legacy/unused code
  - Deleted `src/app/reader/page-old.tsx`
  - Deleted `src/components/reader/EnhancedEpubReader.tsx`
  - Deleted `src/lib/epub-theme-manager.ts`
- Table of Contents fixes
  - Corrected search filtering to return a pruned tree instead of misusing `filter`
  - Implemented functional “Expand All/Collapse All” that cascades to nested items
- Reader rendering
  - Wired font size control: added `EpubRenderer.setFontSize()` and used it from `ContextualToolbar`
  - Applied `font-size: ${this.fontSize}px` in renderer theme CSS
  - Stored scroll handler and removed it in `EpubRenderer.destroy()` to prevent leaks
- Typography and media polish
  - Neutralized drop caps (no oversized first letters) via CSS overrides and DOM cleanup
  - Refined blockquote styling to a subtle, book-like left rule with italics
  - Improved charts/tables: wrap `svg/canvas/table` in scrollable containers, responsive sizing, basic SVG a11y labels
- UI polish
  - TOC uses `reader-floating` glass style with softer hairline dividers instead of solid borders
  - Annotation panel cards switched to `glass-card`, softer textarea styling; header uses hairline divider to match TOC
- Event binding
  - Fixed `annotationClick` listener effect to bind/unbind predictably (dependent on container readiness)
- Tooling
  - Removed duplicate lockfile warning by deleting root `package-lock.json` (project uses `epub-reader/package-lock.json`)

## In Progress / Next Up (High Priority)

- Sanitize EPUB HTML before injecting into the DOM (strip scripts/handlers/unsafe URLs) to prevent XSS
- Add progressive rendering/virtualization for large books (incremental chapter loading around viewport)
- Improve last-moment progress save by using `navigator.sendBeacon` on unload
- Accessibility: keyboard navigation and focus management for TOC/Settings (trap focus, return focus to trigger)

## Backlog

- Replace `<img>` with `next/image` in library views for LCP/bandwidth gains
- Add a lightweight debug logger and gate verbose logs behind an env flag
- Add a Playwright spec: open → scroll → annotate → reload → highlight persists
- Consider bundling a local `public/sample.epub` or show a clearer “Open EPUB” call to action when none available

## Notes

- Coverage thresholds are strict (70% global). With legacy files removed and fixes in place, consider excluding non-critical files from coverage or adding focused tests around the new renderer to meet thresholds.
