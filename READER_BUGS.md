# Arcadia Reader - Comprehensive Bug List

## Critical Bugs

### 1. Toolbar Overlapping Annotations Panel
**Location**: `/epub-reader/src/app/reader/page.tsx:658-792`
**Issue**: When toolbar is sticky/pinned, it has z-index 80 which overlaps with the annotations panel (z-index 70)
**Impact**: Cannot interact with annotations when toolbar is pinned
**Fix**: Adjust z-index hierarchy - annotations should be 85+ when open

### 2. Annotation Navigation Not Precise
**Location**: `/epub-reader/src/app/reader/page.tsx:504-513`, `/epub-reader/src/lib/epub-renderer.ts:1163-1215`
**Issue**: CFI navigation falls back to simple scroll position, doesn't highlight the exact annotation location
**Impact**: Clicking annotation jumps to general area, not exact text
**Fix**: Implement proper CFI highlighting after navigation and visual indicator

### 3. Highlights Don't Persist Visually
**Location**: `/epub-reader/src/lib/epub-renderer.ts` (missing functionality)
**Issue**: No visual rendering of saved highlights in the text
**Impact**: Users can't see their previous highlights when reopening a book
**Fix**: Add highlight rendering layer that applies saved annotations on book load

### 4. Text Selection Toolbar Position Issues
**Location**: `/epub-reader/src/app/reader/page.tsx:115-131`
**Issue**: Annotation toolbar position calculated from window selection, doesn't account for scroll or container offset
**Impact**: Toolbar appears in wrong position when selecting text
**Fix**: Calculate position relative to container and viewport

## Major UX Issues

### 5. Missing Visual Feedback for Saved Annotations
**Location**: `/epub-reader/src/app/reader/page.tsx:459-502`
**Issue**: After creating annotation, no visual confirmation or highlight application
**Impact**: Users unsure if annotation was saved
**Fix**: Add success toast and immediately apply visual highlight

### 6. Annotation Color Not Applied to Text
**Location**: `/epub-reader/src/lib/epub-renderer.ts` (missing)
**Issue**: Color selection in annotation toolbar doesn't apply to selected text
**Impact**: All highlights look the same, can't differentiate types
**Fix**: Inject CSS for highlight colors based on annotation data

### 7. Chapter Navigation Scroll Issues
**Location**: `/epub-reader/src/lib/epub-renderer.ts:995-1000`
**Issue**: `scrollIntoView` with smooth behavior can be interrupted, doesn't wait for completion
**Impact**: Navigation feels broken when rapidly clicking chapters
**Fix**: Use promise-based scroll with completion detection

### 8. Progress Saving Race Conditions
**Location**: `/epub-reader/src/app/reader/page.tsx:361-381`
**Issue**: Multiple save triggers (interval, debounce, scroll) can conflict
**Impact**: Progress may not save correctly or save outdated position
**Fix**: Implement single source of truth with queue-based saving

## Functional Bugs

### 9. Empty Note Modal Allows Save
**Location**: `/epub-reader/src/components/NoteModal.tsx` (not shown but referenced)
**Issue**: Can save empty notes which creates useless annotations
**Impact**: Clutters annotation list with empty entries
**Fix**: Disable save button when note is empty

### 10. Keyboard Shortcuts Conflict with Text Selection
**Location**: `/epub-reader/src/app/reader/page.tsx:544-581`
**Issue**: Arrow keys navigate pages even when selecting text
**Impact**: Can't use keyboard to adjust text selection
**Fix**: Check if text is being selected before handling navigation keys

### 11. Mobile Swipe Gestures Too Sensitive
**Location**: `/epub-reader/src/app/reader/page.tsx:610-631`
**Issue**: 50px threshold too low, triggers accidentally while scrolling
**Impact**: Unintended page changes while reading
**Fix**: Increase threshold to 100px and add velocity check

### 12. Theme Toggle Doesn't Persist
**Location**: `/epub-reader/src/app/reader/page.tsx:431-438`
**Issue**: Local theme override not saved to user preferences
**Impact**: Theme resets on page refresh
**Fix**: Save theme preference to localStorage or user profile

## Visual/Layout Issues

### 13. TOC Panel Width Too Narrow
**Location**: `/epub-reader/src/app/reader/page.tsx:797`
**Issue**: Fixed 340px width cuts off long chapter titles
**Impact**: Can't read full chapter names
**Fix**: Make width responsive or add tooltip for truncated text

### 14. Progress Bar Updates Laggy
**Location**: `/epub-reader/src/lib/epub-renderer.ts:619-627`
**Issue**: requestAnimationFrame throttling causes delayed updates
**Impact**: Progress feels unresponsive while scrolling
**Fix**: Use immediate updates with debouncing for saves only

### 15. Annotation Panel Doesn't Auto-Refresh
**Location**: `/epub-reader/src/components/AnnotationPanel.tsx:75-79`
**Issue**: Only fetches on open, doesn't listen for new annotations
**Impact**: Must close/reopen panel to see new annotations
**Fix**: Add real-time subscription or refresh on annotation creation

### 16. Drop Caps Interfere with Selection
**Location**: `/epub-reader/src/lib/epub-renderer.ts:966-975`
**Issue**: CSS drop caps make first letter unselectable
**Impact**: Can't select text starting from paragraph beginning
**Fix**: Use ::first-letter with user-select: text

## Performance Issues

### 17. Image Loading Blocks Rendering
**Location**: `/epub-reader/src/lib/epub-renderer.ts:350-439`
**Issue**: Synchronous image processing delays initial render
**Impact**: Long wait before seeing any content
**Fix**: Load images progressively after text renders

### 18. Memory Leaks from Blob URLs
**Location**: `/epub-reader/src/lib/epub-renderer.ts:1084-1091`
**Issue**: Blob URLs only revoked on destroy, not on navigation
**Impact**: Memory usage grows with each book opened
**Fix**: Track and revoke URLs when switching books

### 19. Scroll Listener Performance
**Location**: `/epub-reader/src/lib/epub-renderer.ts:602-617`
**Issue**: No passive flag, throttling not optimal
**Impact**: Janky scrolling on lower-end devices
**Fix**: Add passive: true, optimize throttling logic

## Accessibility Issues

### 20. No Keyboard Navigation for Annotations
**Location**: `/epub-reader/src/components/AnnotationPanel.tsx`
**Issue**: Can't navigate annotation list with keyboard
**Impact**: Not accessible for keyboard users
**Fix**: Add tabindex and keyboard handlers

## Reproduction Steps

1. **Toolbar Overlap**: Pin toolbar → Open annotations → Try to interact with top annotations
2. **Imprecise Navigation**: Create annotation → Close book → Reopen → Click annotation in panel
3. **Missing Highlights**: Create highlight → Refresh page → Highlight not visible in text
4. **Selection Toolbar**: Select text near bottom of viewport → Toolbar appears off-screen
5. **Color Not Applied**: Select text → Choose color → Create highlight → Color not shown
6. **Progress Race**: Scroll quickly → Close tab immediately → Progress saves wrong position

## Priority Fixes

1. Fix z-index hierarchy (Critical)
2. Implement highlight persistence (Critical)  
3. Fix annotation navigation precision (Critical)
4. Add visual feedback for saves (Major)
5. Fix toolbar positioning (Major)