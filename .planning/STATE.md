# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-03-05)

**Core value:** Creators can upload a file, set a price, share a link, and get paid -- in under 2 minutes
**Current focus:** Phase 5

## Current Position

Phase: 5 of 5 (Dashboard + Profiles + Polish)
Plan: 0 of 3 in current phase
Status: Ready to plan
Last activity: 2026-03-05 -- Phase 4 verified and complete

Progress: ████████████░░ 80%

## Performance Metrics

**Velocity:**
- Total plans completed: 12
- Average duration: ~3 min
- Total execution time: ~38 min

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 1 | 3/3 | ~14 min | ~5 min |
| 2 | 3/3 | ~10 min | ~3 min |
| 3 | 4/4 | ~9 min | ~2 min |
| 4 | 2/2 | ~5 min | ~2.5 min |

**Recent Trend:**
- Last 5 plans: 03-03 (~2 min), 03-04 (~2 min), 04-01 (~3 min), 04-02 (~2 min)
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
- Webhook returns 200 even on handler errors (only signature failures return non-200) to prevent Stripe retry storms
- Duplicate transaction detection uses PostgreSQL 23505 unique constraint error (atomic, no race conditions)
- HMAC tokens use base64url encoding with timingSafeEqual for constant-time signature comparison
- Success page is a server component calling Stripe API directly (no client-side fetch)
- Download route redirects to signed URL (offloads bandwidth to Supabase CDN)
- Resend SDK uses lazy singleton init (same pattern as Stripe) to avoid build-time crash without RESEND_API_KEY
- Email sending is fire-and-forget with .catch() -- never blocks webhook response
- Using onboarding@resend.dev as dev sender (production needs custom domain)
- Dual webhook secret verification: tries primary secret first, falls back to Connect secret for account.updated events
- Transfer error isolation: transfer failures never break checkout webhook or email sending
- Pending transfer pattern: transactions default 'not_applicable', set 'pending' when creator not onboarded, batch-processed on account.updated
- source_transaction used on transfers for automatic fund availability timing
- Connect status as 4-state machine: NOT_STARTED, ONBOARDING, PENDING, ACTIVE
- window.location.href for Stripe redirect (leaving app entirely, not Next.js router)
- Earnings aggregation done in server component (not SQL) for multi-currency grouping

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
Stopped at: Phase 4 verified and complete
Resume file: None
