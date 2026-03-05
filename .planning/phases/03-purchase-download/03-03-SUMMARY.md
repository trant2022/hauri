---
phase: 03-purchase-download
plan: 03
subsystem: payments, api
tags: [hmac, crypto, stripe-checkout, supabase-storage, signed-url, download-token]

# Dependency graph
requires:
  - phase: 03-01
    provides: Stripe client, checkout session creation, success_url with session_id
  - phase: 02-03
    provides: Public link page, link/file database structure
provides:
  - HMAC download token creation and verification (48h expiry, base64url, stateless)
  - Post-payment success page with Stripe API payment verification
  - Token-based re-download route with transaction status checking
  - Signed URL file delivery (60s expiry) from private Supabase bucket
affects: [03-04 (email receipt with download token), 04-connect (payout uses transaction data)]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "HMAC-signed stateless tokens using Node.js built-in crypto (no JWT dependency)"
    - "Stripe API verification on success page to avoid webhook race condition"
    - "Supabase Storage signed URLs with download option for original filenames"
    - "Server component for success page (direct async Stripe API calls)"

key-files:
  created:
    - src/lib/download-token.ts
    - src/app/l/success/page.tsx
    - src/app/api/download/[token]/route.ts
  modified: []

key-decisions:
  - "HMAC tokens use base64url encoding (URL-safe, no padding) for embeddability in email links"
  - "timingSafeEqual for signature comparison to prevent timing attacks"
  - "Success page is a server component -- calls Stripe API directly without client-side fetching"
  - "Supabase join files relation cast to single object (one-to-one via file_id foreign key)"

patterns-established:
  - "Download token format: base64url(payload).base64url(hmac) -- stateless, no DB lookup for verification"
  - "Signed URL pattern: 60s expiry, { download: fileName } for Content-Disposition header"
  - "Re-download route: verify token -> check transaction status -> validate link_id -> serve fresh signed URL"

# Metrics
duration: 2min
completed: 2026-03-05
---

# Phase 3 Plan 3: Download Token + Success Page + Re-download Route Summary

**HMAC-signed download tokens with 48h expiry, Stripe-verified success page with instant download, and token-based re-download route serving fresh signed URLs from private storage**

## Performance

- **Duration:** 2 min
- **Started:** 2026-03-05T21:56:47Z
- **Completed:** 2026-03-05T21:59:16Z
- **Tasks:** 2
- **Files created:** 3

## Accomplishments
- HMAC download token module with constant-time signature verification (timingSafeEqual) and 48h expiry
- Success page verifies payment directly via Stripe API (no race condition with webhook), shows file info + formatted price + immediate download button with 60s signed URL
- Re-download route validates token, checks transaction not disputed, confirms link_id match, and redirects to fresh signed URL
- Files exclusively served via time-limited Supabase Storage signed URLs (never public)

## Task Commits

Each task was committed atomically:

1. **Task 1: HMAC download token module** - `9ae271d` (feat)
2. **Task 2: Success page + re-download API route** - `23dfd47` (feat)

## Files Created/Modified
- `src/lib/download-token.ts` - createDownloadToken and verifyDownloadToken with HMAC-SHA256, base64url, 48h TTL
- `src/app/l/success/page.tsx` - Server component: Stripe session retrieval, payment verification, signed URL download
- `src/app/api/download/[token]/route.ts` - Token-verified GET route: validates HMAC, checks transaction, serves redirect to signed URL

## Decisions Made
- Used Node.js built-in crypto (createHmac, timingSafeEqual) instead of JWT library -- lighter, no external dependency
- Success page is a server component for direct async Stripe API calls
- Supabase join result for files cast as single object (links have one file_id foreign key)
- Download route redirects to signed URL (NextResponse.redirect) instead of proxying the file -- offloads bandwidth to Supabase CDN

## Deviations from Plan
None - plan executed exactly as written.

## Issues Encountered
None.

## User Setup Required
Add DOWNLOAD_TOKEN_SECRET environment variable:
- Generate: `openssl rand -hex 32`
- Add to `.env.local`: `DOWNLOAD_TOKEN_SECRET=<generated-value>`
- Add to Vercel environment variables for production

## Next Phase Readiness
- Download token system ready for email receipt integration (plan 03-04)
- Success page and re-download route fully functional
- createDownloadToken exported for use in webhook handler's receipt email flow

---
*Phase: 03-purchase-download*
*Completed: 2026-03-05*
