# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-03-05)

**Core value:** Creators can upload a file, set a price, share a link, and get paid -- in under 2 minutes
**Current focus:** Phase 3

## Current Position

Phase: 3 of 5 (Purchase + Download)
Plan: 1 of 4 in current phase
Status: In progress
Last activity: 2026-03-05 -- Completed 03-01-PLAN.md

Progress: ██████▓░░░ 47%

## Performance Metrics

**Velocity:**
- Total plans completed: 7
- Average duration: ~4 min
- Total execution time: ~27 min

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 1 | 3/3 | ~14 min | ~5 min |
| 2 | 3/3 | ~10 min | ~3 min |
| 3 | 1/4 | ~3 min | ~3 min |

**Recent Trend:**
- Last 5 plans: 02-01 (~4 min), 02-02 (~3 min), 02-03 (~3 min), 03-01 (~3 min)
- Trend: Consistent fast execution

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- Next.js 16.1.6 installed (latest, not 15) -- middleware deprecated in favor of "proxy" but still works
- Zod v4.3.6 installed (latest, not v3) -- API compatible for our usage
- Manual Database types created (Docker unavailable for supabase gen types)
- Dark values in :root (dark-mode-first), .light class for optional light override
- Username uniqueness checked via pre-query before signUp (not database constraint error)
- Auth forms use inline confirmation cards ("check your email") instead of separate pages
- Reset password page guards with session check on mount, redirects unauthenticated users
- OAuth callback route prepared as placeholder for future provider support
- Marketing layout: data-driven arrays mapped to JSX for steps/features sections
- Server components used for all marketing pages (no client JS needed)
- Zod v4 uses `error` string instead of `errorMap` for enum validation customization
- Files dashboard page is "use client" for upload/list refresh coordination
- Storage verification uses supabase.storage.list() before creating DB record
- updateLinkSchema omits fileId (cannot change file after creation)
- priceDisplaySchema validates client-side decimal input with 0.50 minimum
- Link list uses inline Switch for active/inactive toggle
- Edit page uses React use() to unwrap params Promise in client component
- Preview upload failure handled gracefully without blocking form submission
- React cache() used to deduplicate server component data fetches between generateMetadata and page
- Database Relationships added to types for proper Supabase SDK join inference
- next/image remote patterns configured for Supabase storage URLs
- Stripe client uses lazy Proxy pattern to avoid build-time initialization failure (STRIPE_SECRET_KEY unavailable during next build)
- No client-side Stripe SDK -- hosted Checkout uses server-side redirect only
- link-page-card converted to client component for buy button interactivity

### Pending Todos

- Consider migrating middleware.ts to Next.js 16 "proxy" convention in future
- Configure Supabase email templates for confirm signup and reset password flows
- Add redirect URLs in Supabase dashboard (localhost and production)
- Deploy to Ubuntu server with Docker, accessible via test.trant.ch (git pull workflow)

### Blockers/Concerns

- Next.js 16 middleware deprecation: functional now but will need migration eventually
- Supabase email templates need manual dashboard configuration for verification/reset flows
- Supabase project must be on Pro plan for 500MB file uploads (Free plan limits to 50MB)
- Local Supabase: email confirmations disabled (enable_confirmations = false) -- accounts work immediately without email verification

## Session Continuity

Last session: 2026-03-05
Stopped at: Completed 03-01-PLAN.md
Resume file: None
