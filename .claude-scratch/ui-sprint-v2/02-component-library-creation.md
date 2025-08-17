# Phase 2: Component Library Creation

## Navigation
- **Previous**: [01-theme-architecture-foundation.md](01-theme-architecture-foundation.md) - Theme foundation
- **Current**: 02-component-library-creation.md  
- **Next**: [03-reader-page-refactoring.md](03-reader-page-refactoring.md) - Reader refactoring

## Objective
Build a comprehensive, theme-aware component library that eliminates code duplication and provides consistent patterns for all reader UI elements.

## Component Analysis from Current Code

### Duplicated Patterns Identified

#### 1. **Glass Panels** (Used everywhere differently)
```typescript
// SearchPanel
"bg-white/90 dark:bg-black/90 backdrop-blur-xl"

// TableOfContents  
"reader-floating no-top-glint rounded-2xl"

// SettingsPanel
"modal-glass rounded-2xl"

// MobileToolbar dropdown
"bg-white/90 dark:bg-black/90 backdrop-blur-xl border border-white/20 rounded-2xl"
```

#### 2. **Interactive Buttons** (Inconsistent implementations)
```typescript
// MobileToolbar buttons
"mobile-btn p-2.5 rounded-xl bg-white/10 active:bg-white/30"

// Settings buttons  
"flex-1 px-3 py-1.5 text-xs font-medium rounded-lg bg-[rgba(var(--muted),0.05)]"

// TOC buttons
"w-full text-left transition-all duration-200 rounded-lg group"
```

#### 3. **Modal/Panel Headers** (Different everywhere)
```typescript
// SearchPanel header
"flex items-center justify-between px-6 py-4 border-b border-black/5 dark:border-white/10"

// SettingsPanel header  
"shrink-0 modal-header"

// TOC header
"px-6 py-5 shrink-0 border-b border-black/5 dark:border-white/5"
```

## Component Library Architecture

### Directory Structure
```
/components/ui/
├── core/
│   ├── Button/
│   │   ├── Button.tsx          # Base button component
│   │   ├── IconButton.tsx      # Icon-only buttons
│   │   └── TouchButton.tsx     # Mobile-optimized buttons
│   ├── Panel/
│   │   ├── Panel.tsx           # Base panel container
│   │   ├── PanelHeader.tsx     # Consistent panel headers
│   │   └── PanelContent.tsx    # Panel content areas
│   ├── Glass/
│   │   ├── GlassContainer.tsx  # Glass effect wrapper
│   │   └── GlassModal.tsx      # Full-screen glass modals
│   └── Layout/
│       ├── Sidebar.tsx         # Sidebar container
│       └── FloatingPanel.tsx   # Floating reader panels
├── reader/
│   ├── ReaderButton.tsx        # Reader-specific button styles
│   ├── ReaderPanel.tsx         # Reader panel wrapper
│   └── ReaderToolbar.tsx       # Toolbar container
└── index.ts                    # Export all components
```

## Core Component Specifications

### 1. **Button Component System**

```typescript
// /components/ui/core/Button/Button.tsx
interface ButtonProps {
  variant: 'primary' | 'secondary' | 'ghost' | 'reader';
  size: 'sm' | 'md' | 'lg' | 'touch';
  theme?: 'auto' | 'glass' | 'solid';
  disabled?: boolean;
  loading?: boolean;
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
}

const Button = ({ variant, size, theme = 'auto', ...props }: ButtonProps) => {
  const baseClasses = 'inline-flex items-center justify-center font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2';
  
  const variantClasses = {
    primary: 'bg-blue-500 text-white hover:bg-blue-600 focus:ring-blue-500',
    secondary: 'surface-secondary text-primary hover:surface-elevated',
    ghost: 'text-secondary hover:text-primary hover:interactive-hover',
    reader: 'text-secondary hover:text-primary hover:surface-glass-low'
  };
  
  const sizeClasses = {
    sm: 'px-3 py-1.5 text-sm rounded-lg',
    md: 'px-4 py-2 text-base rounded-xl', 
    lg: 'px-6 py-3 text-lg rounded-xl',
    touch: 'min-w-[44px] min-h-[44px] px-3 py-2 text-base rounded-xl' // Mobile-first
  };
  
  const themeClasses = {
    auto: '',
    glass: 'backdrop-blur-md bg-opacity-80',
    solid: 'bg-opacity-100'
  };
  
  return (
    <button 
      className={cn(
        baseClasses,
        variantClasses[variant],
        sizeClasses[size],
        themeClasses[theme],
        props.className
      )}
      {...props}
    >
      {props.children}
    </button>
  );
};
```

### 2. **Glass Container System**

```typescript
// /components/ui/core/Glass/GlassContainer.tsx
interface GlassContainerProps {
  opacity: 'low' | 'medium' | 'high' | 'solid';
  blur?: 'sm' | 'md' | 'lg' | 'xl';
  border?: boolean;
  shadow?: 'none' | 'sm' | 'md' | 'lg' | 'xl';
  rounded?: 'none' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  children: React.ReactNode;
  className?: string;
}

const GlassContainer = ({ 
  opacity = 'medium',
  blur = 'lg', 
  border = true,
  shadow = 'lg',
  rounded = 'xl',
  ...props 
}: GlassContainerProps) => {
  const opacityClasses = {
    low: 'surface-glass-low',
    medium: 'surface-glass-medium', 
    high: 'surface-glass-high',
    solid: 'surface-primary'
  };
  
  const blurClasses = {
    sm: 'backdrop-blur-sm',
    md: 'backdrop-blur-md',
    lg: 'backdrop-blur-lg', 
    xl: 'backdrop-blur-xl'
  };
  
  const shadowClasses = {
    none: '',
    sm: 'shadow-sm',
    md: 'shadow-md',
    lg: 'shadow-lg shadow-black/10',
    xl: 'shadow-xl shadow-black/20'
  };
  
  const roundedClasses = {
    none: '',
    sm: 'rounded-sm',
    md: 'rounded-md', 
    lg: 'rounded-lg',
    xl: 'rounded-xl',
    '2xl': 'rounded-2xl'
  };
  
  return (
    <div
      className={cn(
        opacityClasses[opacity],
        blurClasses[blur],
        'backdrop-saturate-200',
        border && 'border-primary',
        shadowClasses[shadow],
        roundedClasses[rounded],
        props.className
      )}
    >
      {props.children}
    </div>
  );
};
```

### 3. **Panel System**

```typescript
// /components/ui/core/Panel/Panel.tsx
interface PanelProps {
  variant: 'floating' | 'sidebar' | 'modal' | 'toolbar';
  position?: 'left' | 'right' | 'top' | 'bottom' | 'center';
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  children: React.ReactNode;
  onClose?: () => void;
  isOpen?: boolean;
}

const Panel = ({ variant, position = 'right', size = 'md', ...props }: PanelProps) => {
  const variantClasses = {
    floating: 'fixed z-50 transition-all duration-300',
    sidebar: 'fixed top-0 h-full z-40 transition-all duration-300',
    modal: 'fixed inset-0 z-50 flex items-center justify-center',
    toolbar: 'fixed z-30 transition-all duration-300'
  };
  
  const positionClasses = {
    left: variant === 'sidebar' ? 'left-0' : 'left-6 top-1/2 -translate-y-1/2',
    right: variant === 'sidebar' ? 'right-0' : 'right-6 top-1/2 -translate-y-1/2', 
    top: 'top-0 left-0 right-0',
    bottom: 'bottom-0 left-0 right-0',
    center: 'left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2'
  };
  
  const sizeClasses = {
    sm: variant === 'sidebar' ? 'w-80' : 'w-80 max-h-96',
    md: variant === 'sidebar' ? 'w-96' : 'w-96 max-h-[500px]',
    lg: variant === 'sidebar' ? 'w-[480px]' : 'w-[480px] max-h-[600px]',
    xl: variant === 'sidebar' ? 'w-[600px]' : 'w-[600px] max-h-[700px]',
    full: 'w-full h-full'
  };
  
  return (
    <div className={cn(
      variantClasses[variant],
      positionClasses[position],
      sizeClasses[size],
      props.isOpen ? 'translate-x-0 opacity-100' : 
        position === 'right' ? 'translate-x-full opacity-0' :
        position === 'left' ? '-translate-x-full opacity-0' : 
        'translate-y-full opacity-0'
    )}>
      <GlassContainer 
        opacity="high" 
        blur="xl" 
        shadow="xl"
        rounded="2xl"
        className="h-full flex flex-col"
      >
        {props.children}
      </GlassContainer>
    </div>
  );
};
```

### 4. **Reader-Specific Components**

```typescript
// /components/ui/reader/ReaderPanel.tsx
interface ReaderPanelProps {
  title: string;
  icon?: React.ComponentType<{ className?: string }>;
  onClose: () => void;
  children: React.ReactNode;
  position?: 'left' | 'right';
  size?: 'sm' | 'md' | 'lg';
}

const ReaderPanel = ({ title, icon: Icon, onClose, children, ...props }: ReaderPanelProps) => {
  return (
    <Panel variant="floating" position={props.position} size={props.size}>
      <PanelHeader>
        <div className="flex items-center gap-3">
          {Icon && (
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500/20 to-blue-500/10 flex items-center justify-center">
              <Icon className="w-5 h-5 text-blue-500" />
            </div>
          )}
          <div>
            <h3 className="text-base font-semibold text-primary">{title}</h3>
          </div>
        </div>
        <Button variant="ghost" size="touch" onClick={onClose}>
          <XMarkIcon className="w-4 h-4" />
        </Button>
      </PanelHeader>
      <PanelContent>
        {children}
      </PanelContent>
    </Panel>
  );
};
```

## Implementation Strategy

### Phase 2.1: Core Components
- [ ] Build Button component system
- [ ] Build GlassContainer system  
- [ ] Build Panel base components
- [ ] Create component export index

### Phase 2.2: Reader Components
- [ ] Build ReaderPanel wrapper
- [ ] Build ReaderButton variants
- [ ] Build ReaderToolbar container
- [ ] Create reader component index

### Phase 2.3: Integration Prep
- [ ] Create migration utilities
- [ ] Document component APIs
- [ ] Build component showcase/docs
- [ ] Test component combinations

### Phase 2.4: Validation
- [ ] All components theme-aware
- [ ] Consistent APIs across components
- [ ] Performance benchmarks met
- [ ] Mobile responsiveness validated

## Component API Standards

### Consistent Props Pattern
```typescript
interface BaseComponentProps {
  className?: string;           // Always allow className override
  children?: React.ReactNode;   // Content when applicable
  variant?: string;            // Style variants
  size?: string;               // Size variants  
  disabled?: boolean;          // Disabled states
  loading?: boolean;           // Loading states
  onClick?: () => void;        // Click handlers
}
```

### Theme Integration
- All components automatically inherit theme
- No manual dark: classes needed
- Semantic color names only
- CSS variables for all colors

### Mobile-First Design
- Touch targets minimum 44px
- Gesture-friendly interactions
- Responsive size variants
- Safe area awareness

## Success Criteria

1. **Zero Duplication**: No repeated button/panel/glass patterns
2. **Theme Inheritance**: All components automatically theme-aware
3. **Consistent APIs**: Predictable prop patterns across components
4. **Mobile Optimized**: Touch-friendly on all devices
5. **Performance**: No regression in render times

## Files to Create

### Core Components
- `/components/ui/core/Button/Button.tsx`
- `/components/ui/core/Button/IconButton.tsx` 
- `/components/ui/core/Button/TouchButton.tsx`
- `/components/ui/core/Glass/GlassContainer.tsx`
- `/components/ui/core/Glass/GlassModal.tsx`
- `/components/ui/core/Panel/Panel.tsx`
- `/components/ui/core/Panel/PanelHeader.tsx`
- `/components/ui/core/Panel/PanelContent.tsx`

### Reader Components  
- `/components/ui/reader/ReaderPanel.tsx`
- `/components/ui/reader/ReaderButton.tsx`
- `/components/ui/reader/ReaderToolbar.tsx`

### Utilities
- `/components/ui/utils/cn.ts` (className utility)
- `/components/ui/index.ts` (export all)

## Next Phase Preview

**Phase 3** will systematically replace all hardcoded components in SearchPanel, SettingsPanel, and MobileToolbar with these new reusable components, eliminating duplication and ensuring consistent theming.

---

**Key Success Factor**: Every new component must be more flexible and maintainable than the pattern it replaces, while maintaining identical visual and functional behavior.