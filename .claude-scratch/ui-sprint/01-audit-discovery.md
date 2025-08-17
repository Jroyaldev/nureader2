# Phase 1: UI Audit & Discovery

## Navigation
- **Previous**: [00-sprint-overview.md](00-sprint-overview.md) - Sprint overview
- **Current**: 01-audit-discovery.md
- **Next**: [02-theme-architecture.md](02-theme-architecture.md) - Theme system implementation

## Audit Objectives
Systematically identify and document every UI issue, inconsistency, and improvement opportunity across the Arcadia Reader application.

## Audit Methodology

### 1. Component Inventory
Create a complete map of all UI components and their current state.

```typescript
interface ComponentAudit {
  name: string;
  location: string;
  themeSupport: {
    dark: boolean;
    light: boolean;
    issues: string[];
  };
  responsive: {
    desktop: boolean;
    tablet: boolean;
    mobile: boolean;
    issues: string[];
  };
  accessibility: {
    keyboard: boolean;
    screenReader: boolean;
    contrast: boolean;
    issues: string[];
  };
}
```

### 2. Theme Audit Checklist

#### Global Theme Issues
- [ ] Theme toggle in reader settings not functioning
- [ ] No theme persistence across sessions
- [ ] System preference not detected
- [ ] Theme context not properly implemented
- [ ] CSS variables not comprehensive

#### Component-Specific Theme Issues
- [ ] **Reader Components**
  - [ ] Floating toolbar only styled for dark mode
  - [ ] Annotation panel lacks light mode colors
  - [ ] Settings panel background not theme-aware
  - [ ] TOC sidebar missing light mode styles
- [ ] **Library Page**
  - [ ] Book cards need light mode refinement
  - [ ] Upload modal theme inconsistency
- [ ] **Authentication Pages**
  - [ ] Form inputs not fully theme-aware
  - [ ] Error messages lack theme styling

### 3. Loading State Audit

#### Issues to Document
- [ ] Loading screen becomes transparent mid-load
- [ ] No skeleton screens for content
- [ ] Jarring transitions between states
- [ ] Missing loading indicators for async operations
- [ ] FOUC on initial page load

#### Performance Metrics
```typescript
interface PerformanceAudit {
  metric: string;
  current: number;
  target: number;
  impact: 'critical' | 'high' | 'medium' | 'low';
}
```

### 4. Component Interaction Audit

#### Sidebar Management
- [ ] Multiple sidebars can open simultaneously
- [ ] No z-index management system
- [ ] Overlapping UI elements
- [ ] Missing backdrop for mobile sidebars
- [ ] No escape key handling

#### Modal & Overlay Issues
- [ ] Inconsistent backdrop styling
- [ ] Focus management problems
- [ ] Scroll locking not implemented
- [ ] Animation timing inconsistencies

### 5. Visual Design Audit

#### Icon Quality
- [ ] Settings panel icons are low quality
- [ ] Inconsistent icon sizes
- [ ] Missing hover states
- [ ] No icon loading states
- [ ] Accessibility labels missing

#### Glassmorphism Consistency
- [ ] Backdrop blur values vary
- [ ] Border colors inconsistent
- [ ] Shadow depths not standardized
- [ ] Transparency levels differ

### 6. Mobile Responsiveness Audit

#### Breakpoint Issues
- [ ] Components break at non-standard widths
- [ ] Text overflow on small screens
- [ ] Touch targets too small
- [ ] Missing mobile-specific layouts
- [ ] Horizontal scroll issues

#### Mobile-Specific Problems
- [ ] No swipe gestures
- [ ] Desktop hover states on mobile
- [ ] Fixed positioning issues
- [ ] Viewport meta tag problems
- [ ] iOS safe area compliance

### 7. Accessibility Audit

#### WCAG Compliance
- [ ] Color contrast ratios
- [ ] Focus indicators
- [ ] Keyboard navigation
- [ ] Screen reader support
- [ ] ARIA labels and roles

## Audit Execution Plan

### Step 1: Automated Scanning
```bash
# Run accessibility audit
npm run audit:a11y

# Check bundle size
npm run analyze

# Performance profiling
npm run profile
```

### Step 2: Manual Component Review
For each component:
1. Test in light mode
2. Test in dark mode
3. Test at mobile breakpoint
4. Test at tablet breakpoint
5. Test keyboard navigation
6. Test with screen reader

### Step 3: User Flow Testing
Critical paths to test:
1. First-time user onboarding
2. Upload and read first book
3. Create annotations workflow
4. Manage collections
5. Change themes and settings

### Step 4: Device Testing Matrix
| Device | OS | Browser | Priority |
|--------|-----|---------|----------|
| Desktop | macOS | Chrome | Critical |
| Desktop | Windows | Edge | High |
| iPhone 14 | iOS 17 | Safari | Critical |
| Pixel 7 | Android 14 | Chrome | High |
| iPad | iPadOS | Safari | Medium |

## Documentation Requirements

### Issue Template
```markdown
## Issue: [Component Name] - [Issue Description]

**Severity**: Critical/High/Medium/Low
**Category**: Theme/Loading/Interaction/Visual/Mobile/Accessibility

**Current Behavior**:
[Description of current state]

**Expected Behavior**:
[Description of desired state]

**Steps to Reproduce**:
1. [Step 1]
2. [Step 2]

**Technical Context**:
- File: [path/to/component.tsx]
- Line: [line numbers]
- Dependencies: [related components]

**Proposed Solution**:
[Technical approach to fix]

**Potential Roadblocks**:
[Known challenges or dependencies]
```

## Audit Deliverables

1. **Component Inventory Spreadsheet**
   - All components mapped
   - Current state documented
   - Priority rankings assigned

2. **Issue Tracking System**
   - GitHub issues created
   - Labels applied (theme, mobile, etc.)
   - Milestones set

3. **Performance Baseline**
   - Current metrics recorded
   - Target metrics defined
   - Improvement strategies outlined

4. **Screenshot Documentation**
   - Before states captured
   - Problem areas highlighted
   - Annotation of issues

## Critical Findings (To Be Populated)

### Immediate Fixes Required
1. Theme toggle functionality
2. Loading screen transparency
3. Multiple sidebar prevention

### High Priority Improvements
1. Light mode component styling
2. Mobile responsiveness
3. Icon replacement

### Medium Priority Enhancements
1. Animation refinements
2. Micro-interactions
3. Performance optimizations

## Next Phase Preparation

Before proceeding to Phase 2:
1. Complete all audit checklists
2. Document all findings
3. Prioritize issues by impact
4. Estimate fix complexity
5. Identify dependencies

## Proceed to Next Phase
Once audit is complete, continue to [02-theme-architecture.md](02-theme-architecture.md) to implement the theme system fixes.