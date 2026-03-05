# Phase 3 Plan 1: Stripe Checkout + Buy Button Summary

**One-liner:** Stripe SDK with lazy proxy init, checkout session creator with TWINT for CHF, and buy button wired to redirect-based hosted Checkout.

## What Was Done

### Task 1: Database migration + Stripe client + Checkout session creator
- Installed `stripe` SDK package
- Created migration `00003_transactions_rls_and_rpcs.sql`:
  - `stripe_payment_intent_id` column on transactions for dispute handling
  - Index on `stripe_payment_intent_id` for fast lookups
  - RLS policy for creators to read their own transactions
  - Atomic `increment_unlock_count` and `decrement_unlock_count` RPC functions
- Created `src/lib/stripe/client.ts` -- Stripe SDK singleton with lazy proxy pattern
- Created `src/lib/stripe/checkout.ts` -- `createCheckoutSession` with fee calculation, TWINT conditional (CHF only), and metadata for downstream webhook processing
- Updated `src/types/database.ts` -- added `stripe_payment_intent_id` to transaction types and `Functions` section for RPC type declarations

### Task 2: Checkout API route + buy button wiring
- Created `POST /api/checkout` route that validates link availability (active, not sold out) and returns Stripe Checkout URL
- Converted `link-page-card.tsx` from server to client component with `"use client"` directive
- Added `handleBuy` function: POST to `/api/checkout`, redirect to Stripe on success, toast on error
- Loading state with Loader2 spinner and disabled button during checkout creation
- All existing UI preserved (preview image, file info, fee breakdown, footer)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Stripe client lazy initialization for build compatibility**
- **Found during:** Task 2 verification (npm run build)
- **Issue:** Stripe SDK initialized at module evaluation time with `new Stripe(process.env.STRIPE_SECRET_KEY!)`. During `next build`, the env var is not available, causing "Neither apiKey nor config.authenticator provided" error that fails static page collection.
- **Fix:** Replaced eager initialization with a Proxy-based lazy getter that defers `new Stripe()` until first method call at runtime.
- **Files modified:** `src/lib/stripe/client.ts`
- **Commit:** 7548313

## Decisions Made

| Decision | Rationale |
|----------|-----------|
| Lazy Proxy pattern for Stripe client | Avoids build-time initialization failure while preserving singleton usage pattern; no consumer code changes needed |
| No client-side Stripe SDK | Hosted Checkout uses server-side redirect only; zero frontend Stripe JS |
| `window.location.href` for redirect | Standard pattern for hosted Checkout; no router needed for external URL |

## Verification Results

- `npx tsc --noEmit` -- passes clean
- `npm run build` -- succeeds, `/api/checkout` route registered as dynamic
- Migration file contains ALTER TABLE, CREATE INDEX, CREATE POLICY, CREATE FUNCTION (x2)
- Checkout API exports POST handler
- Buy button has onClick -> handleBuy -> fetch /api/checkout -> redirect

## Commits

| Hash | Type | Description |
|------|------|-------------|
| bad041f | feat | Stripe client, checkout session creator, and db migration |
| 7548313 | feat | Checkout API route and buy button wiring |

## Key Files

### Created
- `supabase/migrations/00003_transactions_rls_and_rpcs.sql`
- `src/lib/stripe/client.ts`
- `src/lib/stripe/checkout.ts`
- `src/app/api/checkout/route.ts`

### Modified
- `src/types/database.ts` -- stripe_payment_intent_id + Functions types
- `src/components/link-page-card.tsx` -- client component with buy button handler
- `package.json` / `package-lock.json` -- stripe dependency

## Duration

~3 minutes
