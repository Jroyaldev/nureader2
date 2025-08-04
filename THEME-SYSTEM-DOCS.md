# Theme System Architecture & Fixes

## Overview
Comprehensive overhaul of the theme system to fix all UX issues including:
- ✅ Theme persistence from user profile
- ✅ System theme detection and sync
- ✅ Chapter transition white flashes
- ✅ Background color application
- ✅ Theme reversion prevention
- ✅ Visual page navigation feedback

## Architecture

### 1. ThemeProvider (`src/providers/ThemeProvider.tsx`)
**Purpose**: Global theme state management
- Loads user preference from profile/database
- Syncs with system preferences
- Applies theme to document root
- Prevents FOUC with localStorage caching

**Key Features**:
- Real-time system theme detection
- Database synchronization
- Immediate body background updates
- Theme class and data attribute management

### 2. EpubThemeManager (`src/lib/epub-theme-manager.ts`)
**Purpose**: Robust epub.js theme handling
- Chapter-aware theme preloading
- Iframe background management
- Event-driven theme application
- Debug logging for troubleshooting

**Key Features**:
- Comprehensive event hooks (started, rendered, relocated, layout)
- CSS injection into iframe documents
- Background preloading to prevent flashes
- Smooth transitions with opacity management

### 3. ThemeScript (`src/app/theme-script.tsx`)
**Purpose**: Prevent flash of unstyled content (FOUC)
- Runs before React hydration
- Sets initial theme based on localStorage
- Handles system theme detection
- Applies body background immediately

## Fixes Implemented

### ✅ Theme Persistence
- User's theme preference loaded from profile on app start
- Changes saved to database and localStorage
- Syncs across all page loads

### ✅ System Theme Logic
- Proper detection of `prefers-color-scheme`
- Real-time updates when system theme changes
- Respects user's "system" preference setting

### ✅ Background Color Issues
- Force CSS rules for `html` and `body` backgrounds
- Multiple CSS selectors for robustness (`.dark`, `[data-theme="dark"]`)
- Immediate application via JavaScript

### ✅ Chapter Transition Flashes
- Pre-render iframe background styling
- CSS injection before content loads
- Opacity transitions for smooth rendering
- Multiple event hooks for reliability

### ✅ Theme Reversion Prevention
- Centralized theme state management
- Automatic theme reapplication on page turns
- Event-driven updates on all epub.js events

### ✅ Visual Navigation Feedback
- Hover indicators for page navigation areas
- Animation states during navigation
- Loading states to prevent double-clicks

## CSS Improvements

### Background Forcing
```css
/* Force dark mode background */
html.dark,
html[data-theme="dark"] {
  background-color: #101215 !important;
}

html.dark body,
html[data-theme="dark"] body {
  background-color: #101215 !important;
}
```

### Iframe Styling
```css
/* Prevent white flash on page turns in dark mode */
html.dark .epub-container iframe,
html[data-theme="dark"] .epub-container iframe {
  background-color: #101215 !important;
}
```

### Smooth Transitions
```css
/* Smooth theme transitions */
* {
  transition-property: background-color, border-color, color, fill, stroke;
  transition-duration: 0.3s;
  transition-timing-function: ease;
}
```

## Testing Checklist

### Basic Theme Operations
- [ ] Theme persists across page reloads
- [ ] Profile theme setting syncs with reader
- [ ] System theme changes update app immediately
- [ ] Manual theme toggle works correctly

### Reader-Specific Tests
- [ ] No white flashes when turning pages in dark mode
- [ ] No black pages in light mode
- [ ] Theme doesn't revert during navigation
- [ ] Chapter transitions maintain theme
- [ ] New chapters load with correct theme

### Cross-Component Sync
- [ ] Profile page theme selection updates reader
- [ ] Reader theme toggle works (if implemented)
- [ ] All floating UI elements respect theme
- [ ] Loading states show correct theme

### Performance Tests
- [ ] Theme application is immediate
- [ ] No visible lag during theme changes
- [ ] Smooth transitions without jarring jumps
- [ ] Memory usage remains stable

## Debug Mode
The EpubThemeManager includes debug logging. To enable:
```typescript
themeManagerRef.current = new EpubThemeManager(rendition, theme, true);
```

This will log all theme operations to the browser console for troubleshooting.

## Troubleshooting

### Theme Not Applying
1. Check browser console for EpubThemeManager logs
2. Verify localStorage has correct `theme` and `resolvedTheme`
3. Check if profile has theme preference set
4. Ensure CSS classes are applied to `html` element

### White Flashes Still Occurring
1. Enable debug mode to track epub.js events
2. Check if iframe backgrounds are being set
3. Verify CSS injection is working
4. Test with different EPUB files

### Background Not Changing
1. Check CSS specificity (use `!important` rules)
2. Verify both `.dark` class and `[data-theme]` attribute
3. Test with browser dev tools theme simulation
4. Clear localStorage and test fresh

## Technical Notes

### Why Multiple CSS Selectors?
We use both `.dark` class and `[data-theme="dark"]` attribute for maximum browser compatibility and to ensure styles apply even if one method fails.

### Why EpubThemeManager?
epub.js has complex iframe rendering that requires special handling. The theme manager ensures themes apply to:
- The main rendition container
- All iframe documents
- Dynamically loaded content
- Chapter transitions

### Why ThemeScript?
Next.js server-side rendering can cause FOUC. The script runs immediately to apply the saved theme before React hydrates, preventing the flash.