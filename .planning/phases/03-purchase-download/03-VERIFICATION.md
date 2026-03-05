---
phase: 03-purchase-download
verified: 2026-03-05T22:07:30Z
status: passed
score: 5/5 must-haves verified
---

# Phase 3: Purchase + Download Verification Report

**Phase Goal:** Buyers can pay for a file and instantly download it, with email receipt and 48-hour re-download window
**Verified:** 2026-03-05T22:07:30Z
**Status:** PASSED
**Re-verification:** No -- initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Buyer can pay via Stripe Checkout with credit/debit card (and TWINT for CHF links) without creating an account | VERIFIED | `link-page-card.tsx` has `handleBuy` that POSTs to `/api/checkout`; checkout route validates link and calls `createCheckoutSession`; `checkout.ts` sets `payment_method_types: ["card", "twint"]` for CHF, `["card"]` otherwise; no auth required on checkout API; Stripe hosted Checkout handles all payment UI |
| 2 | After confirmed payment, buyer lands on a success page and can immediately download the file via a signed URL | VERIFIED | `checkout.ts` sets `success_url` to `/l/success?session_id={CHECKOUT_SESSION_ID}`; success page retrieves session via `stripe.checkout.sessions.retrieve`, checks `payment_status === "paid"`, fetches link+file data, generates 60s signed URL via `createSignedUrl` with `{ download: fileName }`; renders download button as `<a href={signedUrl} download={fileData.name}>` |
| 3 | Buyer receives an email receipt with a download link that works for 48 hours after purchase | VERIFIED | `webhooks.ts` calls `sendPurchaseReceipt` after transaction insert; `send-receipt.ts` creates HMAC token via `createDownloadToken(transactionId, linkId)` with 48h TTL, builds URL `/api/download/${token}`, sends via Resend with React template; template shows item title, amount, and "Download your file" button linking to token URL |
| 4 | Duplicate webhook deliveries do not create duplicate transactions or inflate revenue numbers | VERIFIED | `transactions` table has `stripe_session_id text unique` constraint (00001_initial_schema.sql:89); `handleCheckoutCompleted` checks for error code `23505` (unique_violation) and returns early on duplicates; `increment_unlock_count` only called after successful insert; email only sent after successful insert (not after duplicate detection) |
| 5 | Files are never accessible via public URL -- only via time-limited signed URLs after verified payment | VERIFIED | Files bucket created with `public: false` (00002_storage_and_rls.sql:13); no `getPublicUrl` calls on files bucket anywhere in codebase (only on `previews` bucket for preview images); all file access goes through `createSignedUrl` with 60s expiry in both success page and re-download route; re-download route verifies HMAC token + checks transaction status + validates link_id match before serving signed URL |

**Score:** 5/5 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/lib/stripe/client.ts` | Stripe SDK singleton | VERIFIED (24 lines, exported, imported by 2+ consumers) | Lazy Proxy pattern defers init to runtime; used by checkout.ts, webhooks route, success page |
| `src/lib/stripe/checkout.ts` | createCheckoutSession function | VERIFIED (53 lines, exports function, imported by checkout route) | Full Stripe session creation with fee calculation, TWINT conditional, metadata |
| `src/app/api/checkout/route.ts` | POST endpoint for Checkout session creation | VERIFIED (72 lines, exports POST, wired from link-page-card) | Validates link exists, is active, not sold out; returns Stripe URL |
| `src/app/api/webhooks/stripe/route.ts` | Stripe webhook POST endpoint | VERIFIED (56 lines, exports POST) | Raw body via req.text(), signature verification, event dispatch, 200 on handler errors |
| `src/lib/stripe/webhooks.ts` | Event handlers for checkout + dispute | VERIFIED (108 lines, exports both handlers) | Idempotent insert with 23505 check, fee metadata, dispute revocation, email wiring |
| `src/lib/download-token.ts` | HMAC token creation and verification | VERIFIED (56 lines, exports both functions) | SHA-256 HMAC, base64url encoding, timingSafeEqual, 48h TTL |
| `src/app/l/success/page.tsx` | Post-payment success page | VERIFIED (176 lines, server component) | Stripe API verification, pending state, file info, signed URL download, expiry note |
| `src/app/api/download/[token]/route.ts` | Token-verified download route | VERIFIED (75 lines, exports GET) | Token verification, transaction status check, link_id match, fresh signed URL redirect |
| `src/lib/email/send-receipt.ts` | sendPurchaseReceipt via Resend | VERIFIED (45 lines, exports function) | Lazy Resend init, creates download token, formats price, sends via Resend |
| `src/lib/email/templates/purchase-receipt.tsx` | React Email template | VERIFIED (113 lines, exports component) | Branded layout, item + amount display, download button, 48h expiry note |
| `supabase/migrations/00003_transactions_rls_and_rpcs.sql` | DB migration for Phase 3 | VERIFIED (40 lines) | stripe_payment_intent_id column, index, RLS policy, increment/decrement RPCs |
| `src/types/database.ts` | Updated types | VERIFIED (252 lines) | stripe_payment_intent_id on transactions, Functions section with RPC types |
| `src/components/link-page-card.tsx` | Buy button wired to checkout | VERIFIED (153 lines, client component) | handleBuy POSTs to /api/checkout, redirects to Stripe, loading state, toast errors |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `link-page-card.tsx` | `/api/checkout` | `fetch("/api/checkout", { method: "POST", ... })` | WIRED | Line 56: POST with linkId, line 65: redirect to data.url |
| `api/checkout/route.ts` | `stripe/checkout.ts` | `createCheckoutSession()` call | WIRED | Line 49: calls with all link data |
| `stripe/checkout.ts` | `lib/fees.ts` | `calculateFees()` for pricing | WIRED | Line 20: calculates fees from priceAmountCents |
| `webhooks/stripe/route.ts` | `stripe/client.ts` | `stripe.webhooks.constructEvent` | WIRED | Line 27: signature verification |
| `webhooks/stripe/route.ts` | `stripe/webhooks.ts` | `handleCheckoutCompleted` / `handleDisputeCreated` | WIRED | Lines 39-44: event dispatch via switch |
| `stripe/webhooks.ts` | `supabaseAdmin` | Transaction insert + RPC calls | WIRED | Lines 18-32: insert; line 45: increment; line 101: decrement |
| `stripe/webhooks.ts` | `email/send-receipt.ts` | `sendPurchaseReceipt()` after insert | WIRED | Lines 59-67: fire-and-forget with .catch() |
| `email/send-receipt.ts` | `download-token.ts` | `createDownloadToken()` | WIRED | Line 27: creates token for email URL |
| `email/send-receipt.ts` | Resend SDK | `resend.emails.send()` | WIRED | Line 31: sends via getResend() lazy singleton |
| `success/page.tsx` | `stripe/client.ts` | `stripe.checkout.sessions.retrieve` | WIRED | Line 24: retrieves session for payment verification |
| `success/page.tsx` | `supabaseAdmin.storage` | `createSignedUrl()` | WIRED | Lines 103-105: 60s signed URL with download option |
| `api/download/[token]/route.ts` | `download-token.ts` | `verifyDownloadToken()` | WIRED | Line 11: verifies HMAC token |
| `api/download/[token]/route.ts` | `supabaseAdmin.storage` | `createSignedUrl()` for re-download | WIRED | Lines 60-64: fresh 60s signed URL, redirects to it |

### Requirements Coverage

| Requirement | Status | Blocking Issue |
|-------------|--------|----------------|
| PAY-01: Buyer can pay via Stripe Checkout with credit/debit card | SATISFIED | -- |
| PAY-02: Buyer can pay with TWINT for CHF-priced links | SATISFIED | -- |
| PAY-03: Buyer pays base price + 15% fee; creator receives base - 10% | SATISFIED | fees.ts uses integer arithmetic; metadata stores all fee components |
| PAY-04: All fee calculations use integer arithmetic (cents) | SATISFIED | Math.round in calculateFees, all amounts in cents |
| PAY-05: Stripe webhook handles checkout.session.completed with idempotent recording | SATISFIED | 23505 unique constraint check |
| PAY-06: Chargeback webhook revokes download and notifies creator | SATISFIED | charge.dispute.created handler updates status to "disputed" and decrements unlock_count |
| DL-01: Buyer receives instant download via signed URL (60s) on success page | SATISFIED | -- |
| DL-02: Success page handles webhook race condition (verifies via Stripe API) | SATISFIED | stripe.checkout.sessions.retrieve, not DB lookup |
| DL-03: Buyer receives email receipt with download link | SATISFIED | -- |
| DL-04: Buyer can re-download within 48 hours via email link | SATISFIED | HMAC token with 48h TTL, /api/download/[token] route |
| DL-05: Files are never publicly accessible -- private bucket only | SATISFIED | files bucket is private; only signed URLs used |
| UX-03: No buyer account required -- friction-free purchase | SATISFIED | No auth on checkout API; Stripe hosted Checkout handles buyer info |

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| -- | -- | -- | -- | No anti-patterns found across all Phase 3 files |

Zero TODO, FIXME, placeholder, or stub patterns found in any Phase 3 artifact.

### Human Verification Required

### 1. Stripe Checkout Flow End-to-End
**Test:** Click "Buy" on a link page, complete Stripe Checkout with test card (4242...), arrive at success page, download file
**Expected:** Redirected to Stripe Checkout with correct price and product name; after payment, success page shows green checkmark, file info, formatted price, and working download button
**Why human:** Requires Stripe test keys, running server, and browser interaction to verify the full redirect flow

### 2. TWINT Payment Method Appearance
**Test:** Create a CHF-priced link and click Buy; verify Stripe Checkout shows TWINT alongside card
**Expected:** TWINT payment option visible in Checkout
**Why human:** Requires Stripe test mode with CHF currency to verify TWINT appears

### 3. Email Receipt Delivery
**Test:** Complete a purchase and check buyer email for receipt
**Expected:** Email arrives with correct item name, formatted price, and clickable "Download your file" button
**Why human:** Requires Resend API key and actual email delivery; template rendering in email clients varies

### 4. 48-Hour Re-download Link
**Test:** Click the download link from the email receipt
**Expected:** Browser downloads the file with the original filename
**Why human:** Requires completing a purchase first to generate the email with token URL

### 5. Success Page Pending State
**Test:** Visit `/l/success?session_id=<valid-unpaid-session>` (e.g., an abandoned checkout)
**Expected:** Shows "Payment Pending" state with clock icon and "will receive email" message
**Why human:** Requires creating a Checkout session without completing payment

### 6. Visual Appearance
**Test:** View success page, email template, and link page buy button on dark mode
**Expected:** Consistent styling with rest of app; success page is centered with proper card layout
**Why human:** Visual correctness cannot be verified programmatically

### Gaps Summary

No gaps found. All 5 observable truths are verified, all 13 artifacts pass three-level verification (existence, substance, wiring), all 13 key links are confirmed wired, all 12 requirements are satisfied, and zero anti-patterns were detected.

The phase delivers a complete purchase-to-download flow:
1. Buy button on link page -> POST /api/checkout -> Stripe hosted Checkout redirect
2. Stripe webhook -> idempotent transaction recording -> email receipt with 48h download token
3. Success page -> Stripe API verification (race-condition-proof) -> 60s signed URL download
4. Email download link -> HMAC token verification -> fresh signed URL redirect
5. Disputes -> mark transaction disputed -> decrement unlock count

All file access is gated behind either verified Stripe payment (success page) or cryptographically signed HMAC tokens (email re-download), with files stored in a private Supabase bucket accessible only via time-limited signed URLs.

---

_Verified: 2026-03-05T22:07:30Z_
_Verifier: Claude (gsd-verifier)_
