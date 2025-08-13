# Repository Guidelines

## Project Structure & Module Organization
- `epub-reader/`: Next.js (TypeScript) app. Key folders: `src/app`, `src/components`, `src/hooks`, `src/lib`, `src/services`, `src/utils`, `src/providers`, `src/types`, `src/__tests__`.
- `epub-reader/e2e/`: Playwright end-to-end tests; config in `playwright.config.ts`.
- `supabase/`: SQL migrations and local tooling; schema also in `database-schema.sql`.
- `src/lib/mcp-playwright.ts`: MCP + Playwright helpers used by tooling.
- `.github/`: CI and automation.

## Build, Test, and Development Commands
Run all commands inside `epub-reader/`:
- `npm ci` or `npm install`: install dependencies.
- `npm run dev`: start Next.js on `http://localhost:3000`.
- `npm run build` / `npm start`: production build and serve.
- `npm test` | `npm run test:watch`: unit tests with Jest + RTL.
- `npm run test:coverage`: enforce coverage thresholds.
- `npm run test:e2e` (or `:ui`): Playwright E2E; auto-spawns dev server.
- `npm run lint` / `npm run lint:fix`: ESLint checks and fixes.
- `npm run format` / `format:check`: Prettier formatting.
- `npm run type-check`: strict TypeScript checks.

## Coding Style & Naming Conventions
- Formatting: Prettier (2 spaces, 80 cols, single quotes). ESLint extends `next` + `prettier`; import order enforced.
- TypeScript: strict mode with path aliases (`@/components/Button`, `@/lib/...`).
- Components: `PascalCase` in `src/components`; hooks `useX` in `src/hooks`; utilities in `src/utils`.
- Avoid `any`; prefer `const`; no console except `warn`/`error`.
- Pre-commit: Husky + lint-staged runs ESLint, Prettier, and `tsc`.

## Testing Guidelines
- Unit: Jest + @testing-library/react. Place specs in `src/__tests__` or `*.spec.tsx` near code.
- Coverage: configured at ≥70% global (see `jest.config.js`). Use `npm run test:coverage`.
- E2E: Playwright specs in `epub-reader/e2e`. Use data-testids for selectors.

## Commit & Pull Request Guidelines
- Conventional commits: `feat:`, `fix:`, `chore:`, `refactor:`, `test:`, `docs:`; scope optional (e.g., `fix(ui): ...`).
- PRs: clear description, linked issues, before/after screenshots for UI, test plan, and notes on breaking changes or migrations.

## Security & Configuration
- Env: copy `.env.local` (do not commit secrets). Supabase keys live in env vars.
- Secrets must never be added to Git; prefer `.env.local` and CI secrets.
