# Phase 1: Theme Architecture Foundation

## Navigation
- **Previous**: [00-sprint-overview.md](00-sprint-overview.md) - Sprint overview
- **Current**: 01-theme-architecture-foundation.md
- **Next**: [02-component-library-creation.md](02-component-library-creation.md) - Component library

## Objective
Create a bulletproof theme system that eliminates all hardcoded colors and ensures every component responds properly to theme changes, using the TOC component as the gold standard.

## Current Theme Analysis

### ✅ **What Works (TOC Pattern)**
```css
/* TOC uses proper CSS variable patterns */
.reader-floating {
  background: rgba(var(--bg), 0.95);
  border: 1px solid rgba(var(--border), var(--border-opacity));
  color: rgb(var(--fg));
}

.hover\:bg-[rgba(var(--muted),0.08)] {
  /* Properly uses CSS variables */
}
```

### ❌ **What Doesn't Work (Hardcoded Patterns)**
```css
/* SearchPanel, MobileToolbar, SettingsPanel */
bg-white/90 dark:bg-black/90
bg-gray-900/90 dark:bg-gray-900/90
text-gray-600 dark:text-gray-400
border-black/10 dark:border-white/20
```

## Root Cause Analysis

### Problem 1: Inconsistent Color System
- **TOC**: Uses CSS variables → Works perfectly
- **Other Components**: Use Tailwind color classes → Breaks with themes
- **Solution**: Standardize on CSS variable system

### Problem 2: Missing Theme Inheritance
- Components don't automatically inherit theme changes
- Manual dark: prefixes required for each element
- No systematic approach to theme-aware styling

### Problem 3: Glass Effect Fragmentation
- Multiple implementations of glass/blur effects
- Different opacity values across components
- No unified glass component system

## New Theme Architecture

### 1. **Enhanced CSS Variable System**

```css
/* /styles/themes/base.css */
:root {
  /* Surface colors */
  --surface-primary: 255 255 255;     /* Main backgrounds */
  --surface-secondary: 250 250 251;   /* Card backgrounds */
  --surface-elevated: 255 255 255;    /* Modal/panel backgrounds */
  --surface-glass: 255 255 255;       /* Glass effect base */
  
  /* Text colors */
  --text-primary: 28 32 36;           /* Main text */
  --text-secondary: 110 118 126;      /* Secondary text */
  --text-tertiary: 156 163 175;       /* Tertiary text */
  --text-inverse: 255 255 255;        /* Inverse text */
  
  /* Border colors */
  --border-primary: 0 0 0;            /* Main borders */
  --border-secondary: 156 163 175;    /* Secondary borders */
  --border-glass: 255 255 255;        /* Glass borders */
  
  /* Interactive states */
  --interactive-hover: 0 0 0;         /* Hover backgrounds */
  --interactive-active: 0 0 0;        /* Active backgrounds */
  --interactive-disabled: 156 163 175; /* Disabled states */
  
  /* Glass opacity levels */
  --glass-opacity-low: 0.80;          /* Subtle glass */
  --glass-opacity-medium: 0.90;       /* Standard glass */
  --glass-opacity-high: 0.95;         /* Strong glass */
  --glass-opacity-solid: 0.98;        /* Near-opaque glass */
}

.dark {
  /* Surface colors */
  --surface-primary: 16 18 21;
  --surface-secondary: 24 27 31;
  --surface-elevated: 32 36 41;
  --surface-glass: 16 18 21;
  
  /* Text colors */
  --text-primary: 245 245 247;
  --text-secondary: 155 160 170;
  --text-tertiary: 107 114 128;
  --text-inverse: 16 18 21;
  
  /* Border colors */
  --border-primary: 255 255 255;
  --border-secondary: 75 85 99;
  --border-glass: 255 255 255;
  
  /* Interactive states */
  --interactive-hover: 255 255 255;
  --interactive-active: 255 255 255;
  --interactive-disabled: 75 85 99;
}
```

### 2. **Semantic Color Classes**

```css
/* /styles/themes/semantic.css */
.surface-primary {
  background-color: rgba(var(--surface-primary), 1);
}

.surface-glass-low {
  background-color: rgba(var(--surface-glass), var(--glass-opacity-low));
  backdrop-filter: blur(20px) saturate(180%);
  border: 1px solid rgba(var(--border-glass), 0.1);
}

.surface-glass-medium {
  background-color: rgba(var(--surface-glass), var(--glass-opacity-medium));
  backdrop-filter: blur(24px) saturate(200%);
  border: 1px solid rgba(var(--border-glass), 0.15);
}

.surface-glass-high {
  background-color: rgba(var(--surface-glass), var(--glass-opacity-high));
  backdrop-filter: blur(28px) saturate(220%);
  border: 1px solid rgba(var(--border-glass), 0.2);
}

.text-primary {
  color: rgb(var(--text-primary));
}

.text-secondary {
  color: rgb(var(--text-secondary));
}

.text-tertiary {
  color: rgb(var(--text-tertiary));
}

.border-primary {
  border-color: rgba(var(--border-primary), 0.1);
}

.border-secondary {
  border-color: rgba(var(--border-secondary), 0.2);
}

.interactive-hover {
  background-color: rgba(var(--interactive-hover), 0.05);
}

.interactive-active {
  background-color: rgba(var(--interactive-active), 0.1);
}
```

### 3. **Component Theme Patterns**

```typescript
// Pattern 1: Glass Panel Base
const glassPanel = "surface-glass-high text-primary border-primary";

// Pattern 2: Interactive Elements
const interactiveBase = "text-secondary hover:text-primary hover:interactive-hover active:interactive-active";

// Pattern 3: Reader-specific patterns
const readerPanel = `${glassPanel} rounded-2xl shadow-xl`;
const readerButton = `${interactiveBase} touch-target rounded-xl transition-all duration-200`;
```

## Implementation Plan

### Step 1: Create Theme Foundation
```bash
# New file structure
/styles/
  themes/
    base.css          # Core CSS variables
    semantic.css      # Semantic color classes
    reader.css        # Reader-specific theme patterns
```

### Step 2: Update Tailwind Configuration
```javascript
// tailwind.config.js
module.exports = {
  content: [...],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        'surface': {
          'primary': 'rgba(var(--surface-primary), <alpha-value>)',
          'secondary': 'rgba(var(--surface-secondary), <alpha-value>)',
          'elevated': 'rgba(var(--surface-elevated), <alpha-value>)',
          'glass': 'rgba(var(--surface-glass), <alpha-value>)',
        },
        'text': {
          'primary': 'rgb(var(--text-primary))',
          'secondary': 'rgb(var(--text-secondary))',
          'tertiary': 'rgb(var(--text-tertiary))',
        },
        'interactive': {
          'hover': 'rgba(var(--interactive-hover), <alpha-value>)',
          'active': 'rgba(var(--interactive-active), <alpha-value>)',
        }
      }
    }
  }
}
```

### Step 3: Create Theme-Aware Utility Functions
```typescript
// /utils/theme.ts
export const getGlassClasses = (opacity: 'low' | 'medium' | 'high' = 'medium') => {
  const base = 'backdrop-filter backdrop-blur-3xl backdrop-saturate-200';
  const opacityMap = {
    low: 'surface-glass-low',
    medium: 'surface-glass-medium', 
    high: 'surface-glass-high'
  };
  return `${base} ${opacityMap[opacity]} border-primary`;
};

export const getInteractiveClasses = (variant: 'button' | 'panel' | 'input' = 'button') => {
  const base = 'text-secondary hover:text-primary transition-colors duration-200';
  const variantMap = {
    button: `${base} hover:interactive-hover active:interactive-active`,
    panel: `${base} hover:surface-secondary`,
    input: `${base} focus:text-primary focus:border-primary`
  };
  return variantMap[variant];
};
```

## Migration Strategy

### Phase 1.1: Foundation Setup
- [ ] Create new theme CSS files
- [ ] Update Tailwind configuration
- [ ] Add theme utilities
- [ ] Test theme switching

### Phase 1.2: Component Pattern Audit
- [ ] Analyze TOC success patterns
- [ ] Document SearchPanel hardcoded colors
- [ ] Document MobileToolbar hardcoded colors  
- [ ] Document SettingsPanel hardcoded colors
- [ ] Create migration map

### Phase 1.3: Glass System Standardization
- [ ] Replace all glass implementations with semantic classes
- [ ] Ensure consistent opacity across components
- [ ] Test glass effects in both themes

### Phase 1.4: Validation
- [ ] All components respond to theme toggle
- [ ] No hardcoded colors remain
- [ ] Glass effects consistent
- [ ] Performance maintained

## Success Metrics

1. **Zero Hardcoded Colors**: No `bg-white/90 dark:bg-black/90` patterns
2. **Theme Inheritance**: All components automatically adapt to theme changes
3. **Glass Consistency**: Unified glass system across all panels
4. **Developer Experience**: Easy to add new theme-aware components
5. **Performance**: No regression in theme switching speed

## Key Files to Create/Modify

### New Files
- `/styles/themes/base.css`
- `/styles/themes/semantic.css`
- `/styles/themes/reader.css`
- `/utils/theme.ts`

### Files to Update
- `tailwind.config.js`
- `/app/globals.css` (import new theme files)
- `/components/reader/SearchPanel.tsx`
- `/components/reader/MobileToolbar.tsx`
- `/components/reader/EnhancedSettingsPanel.tsx`

## Next Phase Preview

Once this theme foundation is solid, **Phase 2** will create reusable UI components that inherit these theme patterns automatically, eliminating the need to manually apply theme classes to every component.

---

**Critical Success Factor**: Every component must work as well as TOC currently does with theme switching. No exceptions.