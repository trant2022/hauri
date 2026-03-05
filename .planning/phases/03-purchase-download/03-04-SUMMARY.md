---
phase: 03-purchase-download
plan: 04
subsystem: email
tags: [resend, react-email, transactional-email, hmac-token, webhook]

# Dependency graph
requires:
  - phase: 03-purchase-download/03-02
    provides: "Stripe webhook handler with transaction recording"
  - phase: 03-purchase-download/03-03
    provides: "HMAC download token system and download route"
provides:
  - "Purchase receipt email via Resend after every successful payment"
  - "React Email template with download link using HMAC token"
  - "Fire-and-forget email sending that never breaks webhook flow"
affects: [04-creator-dashboard, 05-polish]

# Tech tracking
tech-stack:
  added: [resend]
  patterns: [lazy-sdk-init, fire-and-forget-email, react-email-template]

key-files:
  created:
    - src/lib/email/send-receipt.ts
    - src/lib/email/templates/purchase-receipt.tsx
  modified:
    - src/lib/stripe/webhooks.ts

key-decisions:
  - "Resend SDK uses lazy singleton init (same pattern as Stripe) to avoid build-time crash"
  - "Email sending is fire-and-forget with .catch() -- never blocks webhook response"
  - "Using onboarding@resend.dev as dev sender (production needs custom domain)"

patterns-established:
  - "Lazy SDK init: Resend instance created on first use, not module load"
  - "Fire-and-forget side effects: .catch(console.error) for non-critical async operations"

# Metrics
duration: 2min
completed: 2026-03-05
---

# Phase 3 Plan 4: Purchase Receipt Email Summary

**Resend transactional email with React template sending purchase receipts containing HMAC-token 48-hour download links after every successful Stripe payment**

## Performance

- **Duration:** 2 min
- **Started:** 2026-03-05T22:01:43Z
- **Completed:** 2026-03-05T22:04:06Z
- **Tasks:** 2
- **Files modified:** 3 (+ package.json, package-lock.json)

## Accomplishments
- Purchase receipt email template with branded layout, item details, formatted price, and download button
- sendPurchaseReceipt function creates HMAC download tokens (48-hour TTL) and sends via Resend
- Webhook handler wired to send email after every new transaction (skips duplicates naturally)
- Email failures are caught and logged without affecting transaction recording or webhook response

## Task Commits

Each task was committed atomically:

1. **Task 1: Resend setup + email template + send function** - `e6a28b7` (feat)
2. **Task 2: Wire email sending into webhook handler** - `8a9452f` (feat)

## Files Created/Modified
- `src/lib/email/templates/purchase-receipt.tsx` - React Email template with branded receipt layout (inline styles for email compatibility)
- `src/lib/email/send-receipt.ts` - sendPurchaseReceipt function: creates HMAC token, formats price, sends via Resend
- `src/lib/stripe/webhooks.ts` - Updated handleCheckoutCompleted to return transaction id and send receipt email

## Decisions Made
- Resend SDK uses lazy singleton initialization (same Proxy-less pattern as Stripe client) to avoid build-time crash when RESEND_API_KEY is unavailable during `next build`
- Email template uses inline styles (the one documented exception to the no-inline-styles rule -- email clients require them)
- Email sending wrapped in `.catch(console.error)` for fire-and-forget behavior -- webhook must return 200 quickly
- Using `onboarding@resend.dev` as dev sender address (production will need a verified custom domain)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Resend SDK lazy initialization for build-time compatibility**
- **Found during:** Task 2 verification (`npm run build`)
- **Issue:** `new Resend(process.env.RESEND_API_KEY)` at module scope crashes during `next build` because env var is undefined at build time
- **Fix:** Changed to lazy singleton pattern -- `getResend()` function creates instance on first call, matching the existing Stripe client pattern
- **Files modified:** src/lib/email/send-receipt.ts
- **Verification:** `npm run build` succeeds
- **Committed in:** 8a9452f (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Essential fix for build compatibility. No scope creep. Follows established project pattern.

## Issues Encountered
None beyond the auto-fixed deviation above.

## User Setup Required

**External service requires manual configuration:**
- **RESEND_API_KEY** environment variable needed from resend.com (API Keys -> Create API Key)
- During development, emails are sent from `onboarding@resend.dev` (Resend's shared test sender)
- For production: verify a custom domain in Resend dashboard and update the `from` address

## Next Phase Readiness
- Purchase flow is complete end-to-end: buyer pays -> transaction recorded -> receipt email sent -> download link works for 48 hours
- Phase 3 (Purchase + Download) is fully complete with all 4 plans executed
- Ready for Phase 4 (Creator Dashboard) which will build on the transaction data

---
*Phase: 03-purchase-download*
*Completed: 2026-03-05*
