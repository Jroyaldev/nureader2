# AGENTS.md - Jules AI Coding Assistant Guide

## Project: Arcadia Reader
Modern EPUB reader built with Next.js 15 and Supabase. Production-ready with comprehensive database integration and advanced reading features.

## Quick Setup for Jules
```bash
cd epub-reader
npm install
npm run dev  # Starts on http://localhost:3000
```

## Key Commands (Run from epub-reader/)
```bash
npm run dev          # Development server with hot reload
npm run build        # Production build
npm run lint         # Check code quality
npm run test         # Run unit tests
npm run test:e2e     # Run Playwright tests
npm run type-check   # TypeScript validation
```

## Project Architecture

### Core Technologies
- **Frontend**: Next.js 15.4.5 (App Router), React 19, Tailwind CSS v4
- **Backend**: Supabase (PostgreSQL, Auth, Storage, Realtime)
- **EPUB Engine**: epub.js v0.3.93
- **Testing**: Jest, React Testing Library, Playwright

### Directory Structure
```
epub-reader/
├── src/
│   ├── app/           # Next.js App Router pages
│   ├── components/    # React components (PascalCase)
│   ├── hooks/         # Custom hooks (useXxx naming)
│   ├── lib/          # Core utilities and Supabase client
│   ├── services/     # Business logic and API calls
│   ├── utils/        # Helper functions
│   ├── types/        # TypeScript definitions
│   └── __tests__/    # Unit tests
├── e2e/              # Playwright E2E tests
└── public/           # Static assets
```

## Database Schema (6 Tables)
- **profiles**: User preferences and reading goals
- **books**: EPUB metadata with storage paths
- **reading_progress**: Chapter and position tracking
- **annotations**: Highlights, notes, bookmarks with CFI
- **collections**: Book organization system
- **book_collections**: Many-to-many relationships

## Key Features & Implementation Status

### ✅ Completed (100% MVP)
- Authentication flow with email confirmation
- EPUB upload and metadata extraction
- Advanced reader with floating UI controls
- Full annotations system (highlights, notes, bookmarks)
- Collections for book organization
- Reading progress tracking with analytics
- Theme switching (light/dark/sepia/night)
- Responsive design (desktop-first)

### 🚧 Current Focus
- UI component system refactoring
- Mobile experience optimization
- Performance improvements for large EPUBs

## Development Patterns

### Component Guidelines
- Use `'use client'` for interactive components
- Prefer server components for static content
- Follow existing component patterns in codebase
- Use Tailwind CSS for styling

### State Management
- Zustand for global state (reader settings, UI state)
- React hooks for local component state
- Supabase realtime for sync

### File Storage
```
epub-files/{user_id}/{book_id}/book.epub
covers/{user_id}/{book_id}/cover.jpg
```

### API Routes Pattern
```typescript
// Server-side operations requiring service role
app/api/supabase/[operation]/route.ts

// Client-side uses
utils/supabase/client.ts
```

## Testing Strategy

### Unit Tests (Jest + RTL)
```bash
npm test              # Run all tests
npm run test:watch    # Watch mode
npm run test:coverage # Coverage report (≥70% required)
```

### E2E Tests (Playwright)
```bash
npm run test:e2e      # Headless
npm run test:e2e:ui   # Interactive UI
```

### Test File Locations
- Unit: `src/__tests__/` or `*.spec.tsx`
- E2E: `epub-reader/e2e/`
- Use `data-testid` for selectors

## Code Quality Standards

### TypeScript
- Strict mode enabled
- No `any` types
- Path aliases: `@/components/*`, `@/lib/*`

### Formatting (Prettier)
- 2 spaces indentation
- 80 character line limit
- Single quotes for strings

### Linting (ESLint)
- Extends Next.js and Prettier configs
- Import order enforced
- No console.log (warn/error allowed)

### Pre-commit Hooks
Husky runs automatically:
1. ESLint fixes
2. Prettier formatting
3. TypeScript compilation check

## Common Tasks for Jules

### Adding a New Feature
1. Check existing patterns in similar components
2. Use Supabase client from `utils/supabase/client`
3. Add types to `src/types/`
4. Write tests alongside implementation
5. Update this file if adding new agents/tools

### Fixing Bugs
1. Check browser console for errors
2. Verify Supabase RLS policies
3. Check authentication state
4. Review recent commits for context

### Database Operations
```bash
# From root directory
npx supabase db reset        # Reset to initial state
npx supabase migration new    # Create migration
```

## Environment Variables
Required in `.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=your_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_key
```

## Troubleshooting

### Common Issues
- **406 Errors**: Check Supabase client import path
- **Books not loading**: Verify authentication state
- **Build warnings**: Edge Runtime incompatibilities (ignorable)
- **Husky fails**: Git hooks issue, check .git existence

### Performance Tips
- Use dynamic imports for epub.js
- Implement lazy loading for book covers
- Cache frequently accessed data
- Use React.memo for expensive components

## Git Workflow

### Commit Format
```
feat: Add new feature
fix: Resolve bug
chore: Update dependencies
refactor: Improve code structure
test: Add tests
docs: Update documentation
```

### PR Checklist
- [ ] Tests passing
- [ ] TypeScript checks clean
- [ ] Linting passes
- [ ] Documentation updated
- [ ] Screenshots for UI changes

## Contact & Resources
- **Repository**: github.com/Jroyaldev/nureader2
- **Tech Stack Docs**: nextjs.org, supabase.com
- **EPUB.js Docs**: github.com/futurepress/epub.js

## Notes for Jules
- This is a production app with real users
- Always test changes thoroughly
- Follow existing patterns in codebase
- Check CLAUDE.md for additional context
- Prioritize user experience and performance