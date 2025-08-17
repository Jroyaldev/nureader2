# Phase 2: Theme Architecture Implementation

## Navigation
- **Previous**: [01-audit-discovery.md](01-audit-discovery.md) - UI audit results
- **Current**: 02-theme-architecture.md
- **Next**: [03-loading-states.md](03-loading-states.md) - Loading state improvements

## Theme System Objectives
Fix the non-functional theme toggle and implement a robust, performant theme system that works across all components with proper light/dark mode support.

## Current Issues Analysis

### Root Cause Investigation
1. **Theme Toggle Not Working**
   - Missing theme context provider
   - No localStorage persistence
   - Event handlers not connected
   - State not propagating to components

2. **Incomplete Light Mode**
   - Hard-coded dark mode colors
   - Missing CSS variable definitions
   - Tailwind classes not theme-aware
   - Component-specific overrides

## Implementation Strategy

### 1. Theme Context Architecture

```typescript
// contexts/ThemeContext.tsx
interface ThemeContextType {
  theme: 'light' | 'dark' | 'system';
  resolvedTheme: 'light' | 'dark';
  setTheme: (theme: 'light' | 'dark' | 'system') => void;
  systemTheme: 'light' | 'dark';
}

// Implementation requirements:
// - Detect system preference
// - Persist to localStorage
// - Prevent flash on load
// - SSR-safe implementation
```

### 2. CSS Variable System

```css
/* Base theme variables structure */
:root {
  /* Colors */
  --color-background: 255 255 255;
  --color-foreground: 0 0 0;
  --color-card: 255 255 255;
  --color-card-foreground: 0 0 0;
  --color-primary: 0 0 0;
  --color-primary-foreground: 255 255 255;
  --color-secondary: 245 245 245;
  --color-secondary-foreground: 0 0 0;
  --color-muted: 245 245 245;
  --color-muted-foreground: 115 115 115;
  --color-accent: 245 245 245;
  --color-accent-foreground: 0 0 0;
  --color-destructive: 239 68 68;
  --color-destructive-foreground: 255 255 255;
  --color-border: 229 229 229;
  --color-input: 229 229 229;
  --color-ring: 0 0 0;
  
  /* Glassmorphism */
  --glass-background: rgba(255, 255, 255, 0.7);
  --glass-border: rgba(255, 255, 255, 0.2);
  --glass-shadow: 0 8px 32px 0 rgba(31, 38, 135, 0.1);
  --backdrop-blur: 10px;
}

[data-theme="dark"] {
  /* Dark mode overrides */
  --color-background: 0 0 0;
  --color-foreground: 255 255 255;
  /* ... rest of dark mode variables */
  
  /* Dark glassmorphism */
  --glass-background: rgba(0, 0, 0, 0.7);
  --glass-border: rgba(255, 255, 255, 0.1);
  --glass-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.3);
}
```

### 3. Component Migration Plan

#### Phase 2.1: Core Components
1. **ThemeProvider Setup**
   ```typescript
   // app/layout.tsx modifications
   - Wrap app in ThemeProvider
   - Add theme detection script
   - Prevent FOUC with blocking script
   ```

2. **Reader Components**
   ```typescript
   // Priority components to fix:
   - ReaderPage.tsx
   - EnhancedSettingsPanel.tsx
   - AnnotationPanel.tsx
   - AIChatPanel.tsx
   - FloatingToolbar.tsx
   ```

#### Phase 2.2: Tailwind Integration
```javascript
// tailwind.config.js updates
module.exports = {
  darkMode: ['class', '[data-theme="dark"]'],
  theme: {
    extend: {
      colors: {
        background: 'rgb(var(--color-background) / <alpha-value>)',
        foreground: 'rgb(var(--color-foreground) / <alpha-value>)',
        // ... map all CSS variables
      }
    }
  }
}
```

### 4. Reader-Specific Theme Handling

#### EPUB.js Theme Integration
```typescript
// Special handling for epub.js rendition
const applyReaderTheme = (rendition: Rendition, theme: 'light' | 'dark') => {
  rendition.themes.register('light', {
    body: {
      color: '#000000',
      background: '#ffffff',
    },
    // ... light theme styles
  });
  
  rendition.themes.register('dark', {
    body: {
      color: '#ffffff',
      background: '#0a0a0a',
    },
    // ... dark theme styles
  });
  
  rendition.themes.select(theme);
};
```

### 5. Theme Toggle Implementation

#### Settings Panel Fix
```typescript
// components/reader/EnhancedSettingsPanel.tsx
const ThemeToggle = () => {
  const { theme, setTheme, resolvedTheme } = useTheme();
  
  return (
    <ToggleGroup
      type="single"
      value={theme}
      onValueChange={(value) => setTheme(value as Theme)}
    >
      <ToggleGroupItem value="light" aria-label="Light mode">
        <Sun className="h-4 w-4" />
      </ToggleGroupItem>
      <ToggleGroupItem value="dark" aria-label="Dark mode">
        <Moon className="h-4 w-4" />
      </ToggleGroupItem>
      <ToggleGroupItem value="system" aria-label="System preference">
        <Monitor className="h-4 w-4" />
      </ToggleGroupItem>
    </ToggleGroup>
  );
};
```

## Implementation Checklist

### Day 1: Foundation
- [ ] Create ThemeContext with proper TypeScript types
- [ ] Implement theme detection and persistence
- [ ] Add blocking script to prevent FOUC
- [ ] Set up CSS variable system
- [ ] Update Tailwind configuration

### Day 2: Component Migration
- [ ] Fix theme toggle in settings panel
- [ ] Update all reader components
- [ ] Migrate floating toolbar
- [ ] Update annotation panel
- [ ] Fix sidebar themes

### Day 3: Testing & Refinement
- [ ] Test all components in both themes
- [ ] Verify no FOUC on page load
- [ ] Check theme persistence
- [ ] Validate system preference detection
- [ ] Performance optimization

## Potential Roadblocks & Solutions

### 1. FOUC Prevention
**Problem**: Theme flashes on initial load
**Solution**: 
```html
<!-- Add to app/layout.tsx before body -->
<script>
  (function() {
    const theme = localStorage.getItem('theme') || 'system';
    if (theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      document.documentElement.setAttribute('data-theme', 'dark');
    }
  })();
</script>
```

### 2. Server-Side Rendering
**Problem**: Theme mismatch between server and client
**Solution**: Use cookies for SSR theme detection

### 3. EPUB Content Theming
**Problem**: EPUB content in iframe doesn't inherit theme
**Solution**: Inject theme styles into epub.js rendition

### 4. Performance Impact
**Problem**: Theme switching causes reflows
**Solution**: Use CSS variables and GPU-accelerated properties

## Testing Requirements

### Manual Testing
1. Toggle between all three theme modes
2. Refresh page in each mode
3. Change system preference while app is open
4. Test on multiple devices/browsers

### Automated Testing
```typescript
// Theme toggle test cases
describe('Theme System', () => {
  it('persists theme selection');
  it('respects system preference');
  it('applies theme without FOUC');
  it('updates all components');
});
```

## Success Criteria

1. ✅ Theme toggle works in all locations
2. ✅ Theme persists across sessions
3. ✅ No FOUC on page load
4. ✅ All components properly themed
5. ✅ System preference detected
6. ✅ Smooth theme transitions
7. ✅ Reader content themed appropriately

## Next Phase
Once theme system is fully implemented and tested, proceed to [03-loading-states.md](03-loading-states.md) to fix loading state issues.