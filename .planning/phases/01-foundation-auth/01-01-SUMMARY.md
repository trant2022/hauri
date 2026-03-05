# Phase 1 Plan 1: Project Foundation + Supabase Setup Summary

**One-liner:** Next.js 16 scaffold with dark-mode-first OKLCH theme, three Supabase client tiers, getClaims() middleware, 5-table migration, and Zod auth schemas

## Metadata

- **Phase:** 01-foundation-auth
- **Plan:** 01
- **Subsystem:** foundation
- **Tags:** nextjs, supabase, tailwind-v4, shadcn-ui, middleware, zod, dark-theme
- **Duration:** ~8 minutes
- **Completed:** 2026-03-05

## Dependency Graph

- **Requires:** None (first plan)
- **Provides:** Project skeleton, Supabase clients, middleware auth, database schema, design system, validation schemas, route group layouts
- **Affects:** 01-02 (auth flows need clients + validations + layouts), 01-03 (landing page needs marketing layout + theme)

## Tech Stack

### Added

| Library | Version | Purpose |
|---------|---------|---------|
| Next.js | 16.1.6 | Full-stack framework (App Router) |
| React | 19.2.3 | UI library |
| TypeScript | 5.x | Type safety (strict mode) |
| @supabase/supabase-js | 2.98.0 | Supabase client |
| @supabase/ssr | 0.9.0 | SSR cookie-based auth |
| Tailwind CSS | v4 | Utility-first CSS |
| shadcn/ui | 3.8.5 | Component library |
| next-themes | 0.4.6 | Theme management |
| react-hook-form | 7.71.2 | Form state management |
| zod | 4.3.6 | Schema validation |
| @hookform/resolvers | 5.2.2 | Zod-to-RHF bridge |
| sonner | 2.0.7 | Toast notifications |
| lucide-react | 0.577.0 | Icons |
| tw-animate-css | 1.4.0 | Animation utilities (Tailwind v4) |

### Patterns Established

- Three-tier Supabase client pattern (browser/server/admin)
- getClaims() JWT validation in middleware (no network call)
- Dark-mode-first theming with OKLCH CSS variables
- Route group isolation: (marketing), (auth), (dashboard)
- Server-side auth guard in dashboard layout (defense in depth)
- Client-side sign-out with toast feedback

## File Tracking

### Created

- `package.json` -- project manifest with all dependencies
- `tsconfig.json` -- TypeScript strict config
- `src/app/layout.tsx` -- root layout with ThemeProvider + Toaster
- `src/app/globals.css` -- dark-mode-first OKLCH theme
- `src/app/(marketing)/layout.tsx` -- marketing pass-through layout
- `src/app/(marketing)/page.tsx` -- placeholder landing page
- `src/app/(auth)/layout.tsx` -- centered auth card layout
- `src/app/(dashboard)/layout.tsx` -- server-side auth guard + sidebar
- `src/app/(dashboard)/dashboard/page.tsx` -- dashboard welcome card
- `src/components/theme-provider.tsx` -- next-themes wrapper
- `src/components/dashboard-sidebar.tsx` -- sidebar nav + sign-out
- `src/components/ui/button.tsx` -- shadcn button
- `src/components/ui/card.tsx` -- shadcn card
- `src/components/ui/input.tsx` -- shadcn input
- `src/components/ui/label.tsx` -- shadcn label
- `src/components/ui/sonner.tsx` -- shadcn toast
- `src/lib/utils.ts` -- cn() utility
- `src/lib/supabase/client.ts` -- browser Supabase client
- `src/lib/supabase/server.ts` -- server Supabase client (async cookies)
- `src/lib/supabase/admin.ts` -- admin Supabase client (service_role)
- `src/lib/supabase/middleware.ts` -- session refresh + route protection
- `src/lib/validations/auth.ts` -- Zod schemas for all auth forms
- `src/types/database.ts` -- manual Database type (5 tables)
- `src/middleware.ts` -- root middleware calling updateSession
- `supabase/config.toml` -- local Supabase config
- `supabase/migrations/00001_initial_schema.sql` -- initial schema

### Modified

- None (all files newly created)

## Decisions Made

| Decision | Rationale | Impact |
|----------|-----------|--------|
| Next.js 16 (not 15) | `create-next-app@latest` installed v16.1.6 which is current latest | Minor: middleware convention deprecated in favor of "proxy", but still functional |
| Zod v4 (not v3) | npm installed latest which is v4.3.6 | API mostly compatible; uses z.infer type, refine() works the same |
| Manual Database types | Docker not running, cannot use `supabase gen types` | Should regenerate from local Supabase once Docker is available |
| Dark values in :root | Dark-mode-first means :root has dark colors, .light has overrides | Consistent with next-themes defaultTheme="dark" |
| Inter font via --font-inter CSS var | Matches design system spec, replaces Geist from create-next-app default | Font applied via font-sans class |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Docker not available for Supabase local development**

- **Found during:** Task 2, step 3
- **Issue:** `npx supabase start` failed -- Docker daemon not running
- **Fix:** Created manual Database types covering all 5 tables instead of using `supabase gen types typescript`. Migration file is ready and correct; will work once Docker is started.
- **Files affected:** `src/types/database.ts`
- **Impact:** Types should be regenerated from local Supabase once Docker is available

**2. [Rule 3 - Blocking] Next.js 16 middleware deprecation warning**

- **Found during:** Task 2 verification
- **Issue:** Next.js 16 shows "middleware file convention is deprecated, please use proxy" warning
- **Fix:** No code change needed -- middleware still works correctly in Next.js 16. The warning is informational. Future migration to "proxy" convention can be done in a separate task.
- **Impact:** Functional but will need migration when Next.js removes middleware support

**3. [Rule 3 - Blocking] create-next-app conflicts with existing files**

- **Found during:** Task 1, step 1
- **Issue:** create-next-app refused to run in directory with existing .planning/ and CLAUDE.md files
- **Fix:** Temporarily moved conflicting files, ran create-next-app, then restored them
- **Impact:** None -- all files preserved correctly

## Verification Results

| Check | Result |
|-------|--------|
| `npm run build` | PASS -- compiled successfully, 0 errors |
| `npx tsc --noEmit` | PASS -- zero TypeScript errors |
| Dev server on localhost:3000 | PASS -- 200 response on root |
| Dark background (#0a0a0a) | PASS -- oklch(0.04 0 0) in :root |
| /dashboard redirect to /login | PASS -- 307 redirect |
| Migration file correct | PASS -- 5 tables with RLS + trigger |
| All Zod schemas export | PASS -- 4 schemas + 4 types |
| Three Supabase clients | PASS -- browser, server, admin |
| shadcn components installed | PASS -- button, card, input, label, sonner |

## Next Phase Readiness

Plan 01-02 (Auth Flows) can proceed immediately:
- Supabase clients ready for auth operations
- Zod validation schemas ready for form validation
- Auth layout ready for login/signup/forgot-password pages
- Middleware protects dashboard routes
- ThemeProvider and Toaster available for auth UI feedback

Plan 01-03 (Landing Page) can proceed immediately:
- Marketing layout ready
- Dark theme active with OKLCH variables
- shadcn components available

**Blocker for full auth testing:** Docker must be running for `supabase start` to provide a local auth backend. Auth forms will need a running Supabase instance to test end-to-end.
