---
phase: 04-connect-payouts
plan: 02
subsystem: connect-onboarding-ui-earnings
tags: [stripe-connect, onboarding-ui, earnings-dashboard, settings-page, sidebar-navigation]
dependency-graph:
  requires: [04-01-connect-backend]
  provides: [connect-onboarding-flow, earnings-visibility, settings-page, connect-status-ui]
  affects: [05-creator-profile]
tech-stack:
  added: []
  patterns: [connect-state-machine-ui, re-engagement-banner, server-client-component-split]
key-files:
  created:
    - src/app/api/connect/onboard/route.ts
    - src/app/api/connect/refresh/route.ts
    - src/app/(dashboard)/dashboard/settings/page.tsx
    - src/app/(dashboard)/dashboard/settings/connect-status.tsx
    - src/app/(dashboard)/dashboard/earnings/page.tsx
  modified:
    - src/lib/supabase/queries.ts
    - src/components/dashboard-sidebar.tsx
decisions:
  - id: connect-status-state-machine
    summary: "Connect status derived from 4 states: NOT_STARTED (no stripe_account_id), ONBOARDING (has account, not details_submitted), PENDING (details_submitted, not charges_enabled), ACTIVE (charges_enabled + payouts_enabled)"
  - id: window-location-redirect
    summary: "Onboard button uses window.location.href for Stripe redirect (leaving app entirely), not Next.js router"
  - id: earnings-aggregation-in-component
    summary: "Transaction aggregation done in server component (not SQL) to support multi-currency grouping"
metrics:
  duration: ~2 min
  completed: 2026-03-05
---

# Phase 4 Plan 2: Connect Onboarding UI + Earnings Dashboard Summary

**Settings page with Connect state machine UI and onboard button, earnings page with transfer totals and re-engagement banner, sidebar navigation update.**

## What Was Built

### Connect Onboard API Route (`/api/connect/onboard`)
- POST endpoint creates Express account (if creator doesn't have one) via `createExpressAccount`
- Saves `stripe_account_id` to user profile
- Generates fresh Account Link via `createAccountLink` and returns URL
- Auth-protected with error handling returning `{ error: string }` on failure

### Connect Refresh API Route (`/api/connect/refresh`)
- GET endpoint for Stripe's `refresh_url` callback when Account Links expire
- Generates fresh Account Link and redirects (302) to it
- Falls back to `/dashboard/settings?connect=error` on failure
- Redirects unauthenticated users to `/login`

### Settings Page (`/dashboard/settings`)
- Server component displaying account info (email, username) and Connect status
- Derives Connect state from database fields: NOT_STARTED, ONBOARDING, PENDING, ACTIVE
- Shows contextual banners for `?connect=return` (post-Stripe) and `?connect=error` states

### Connect Status Component (`connect-status.tsx`)
- Client component with status badge (colored dot + label) for each state
- NOT_STARTED: gray dot, "Connect with Stripe" button
- ONBOARDING: yellow dot, "Resume onboarding" button
- PENDING: yellow dot, no action (waiting for Stripe review)
- ACTIVE: green dot, automatic payout note
- Button POSTs to `/api/connect/onboard`, redirects to Stripe via `window.location.href`
- Loading state with Loader2 spinner, toast on error

### Earnings Page (`/dashboard/earnings`)
- Server component with transaction aggregation by currency
- Three stats cards: Total Earned, Transferred, Pending
- Multi-currency support (shows primary + additional currencies)
- Re-engagement banner when pending earnings exist but onboarding incomplete
- Transaction history table with date, amount, currency, transfer status badges
- Empty state for creators with no sales

### Sidebar Navigation Update
- Added "Earnings" nav item with DollarSign icon between Links and Settings
- Imported DollarSign from lucide-react

### New Supabase Queries
- `getCreatorEarnings`: Joins transactions with links via `!inner` to filter by creator user_id
- `getCreatorConnectStatus`: Fetches Connect-related fields from users table

## Decisions Made

| Decision | Rationale |
|----------|-----------|
| Connect status as 4-state machine | Maps directly to Stripe Connect lifecycle; RESTRICTED state deferred until requirements.past_due data available |
| window.location.href for Stripe redirect | Leaving the app entirely to go to Stripe hosted onboarding; Next.js router not appropriate |
| Aggregation in server component | Multi-currency grouping easier in JS than SQL; transaction volumes per creator are manageable |
| Re-engagement checks all currencies | Pending earnings across any currency triggers the banner, not just primary |

## Deviations from Plan

None -- plan executed exactly as written.

## Commits

| Hash | Message |
|------|---------|
| 727beb9 | feat(04-02): Connect onboard/refresh API routes + settings page with Connect status UI |
| 2cc87d4 | feat(04-02): earnings page with transfer totals, re-engagement banner, and sidebar nav |

## Next Phase Readiness

Phase 4 (Connect + Payouts) is now complete. The full flow is:
1. Creator visits Settings, clicks "Connect with Stripe"
2. Express account created, redirected to Stripe hosted onboarding
3. On return, settings page shows status (webhook updates fields async)
4. Earnings page shows sales breakdown with transfer status
5. Pending transfers auto-resolve when account.updated webhook fires

Phase 5 (Creator Profiles) can build on:
- User profile data already queryable (email, username)
- Connect status available for profile badges
- Earnings data accessible for any profile statistics
