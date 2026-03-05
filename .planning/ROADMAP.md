# Roadmap: Unlockt

## Overview

Unlockt is built in five phases that follow the critical path of value delivery: first establish the foundation and auth system, then enable creators to upload files and create payment links, then wire up the purchase-to-download money flow, then connect creators to payouts via Stripe Connect, and finally polish with dashboard analytics, creator profiles, and mobile responsiveness. Each phase delivers a complete, verifiable capability -- a creator can progressively do more real things after each phase ships.

## Phases

- [x] **Phase 1: Foundation + Auth** - Project scaffolding, database schema, auth system, design system, and landing page
- [x] **Phase 2: Creator Workflow** - File upload with resumable protocol and payment link creation with public link pages
- [x] **Phase 3: Purchase + Download** - Stripe Checkout payment flow, webhook processing, and secure file delivery with email receipts
- [x] **Phase 4: Connect + Payouts** - Stripe Connect Express onboarding, account state tracking, and creator payout requests
- [ ] **Phase 5: Dashboard + Profiles + Polish** - Creator dashboard with earnings data, public creator profiles, and mobile-responsive buyer flow

## Phase Details

### Phase 1: Foundation + Auth
**Goal**: Creators can register, log in, and navigate a protected dashboard shell on a dark-mode-first app with a public landing page
**Depends on**: Nothing (first phase)
**Requirements**: AUTH-01, AUTH-02, AUTH-03, AUTH-04, UX-01, UX-04, UX-05, PAGE-01
**Success Criteria** (what must be TRUE):
  1. Creator can register with email/password/username, verify email, and log in to a protected dashboard area
  2. Creator session persists across browser refresh without re-login
  3. Creator can reset a forgotten password via email link and regain access
  4. Landing page at / explains the product, shows how it works, and has a working signup CTA
  5. Every form validates input with clear error messages, and every async action shows loading state and toast feedback

**Plans:** 3 plans

Plans:
- [x] 01-01-PLAN.md — Next.js 15 project scaffolding, Supabase config, database schema, dark-mode design system, route group layouts
- [x] 01-02-PLAN.md — Auth flows: signup with username, login, forgot password, email verification, password reset, session redirects
- [x] 01-03-PLAN.md — Landing page with hero, how-it-works, features, and signup CTA

### Phase 2: Creator Workflow
**Goal**: Creators can upload large files and create shareable payment links with prices, previews, and descriptions
**Depends on**: Phase 1 (auth, database, design system)
**Requirements**: FILE-01, FILE-02, FILE-03, FILE-04, FILE-05, LINK-01, LINK-02, LINK-03, LINK-04, LINK-05, LINK-06, PAGE-03
**Success Criteria** (what must be TRUE):
  1. Creator can upload a file up to 500MB with a progress bar that survives connection interruption and resumes
  2. Creator can create a payment link for an uploaded file, setting price in CHF/EUR/USD/GBP, with optional preview image, description, and max unlock count
  3. Creator can view, edit, and deactivate their payment links from the dashboard
  4. Buyer visiting a payment link URL sees file name, preview (if set), price with fee breakdown, and a buy button
  5. Invalid file types are rejected on upload, and rate limiting prevents upload abuse

**Plans:** 3 plans

Plans:
- [x] 02-01-PLAN.md — Storage infrastructure, TUS resumable file upload with progress and validation, files API with rate limiting, files dashboard
- [x] 02-02-PLAN.md — Payment link CRUD with price/currency/preview, fee preview, links API with nanoid slugs, links dashboard pages
- [x] 02-03-PLAN.md — Public buyer-facing link page at /l/[slug] with OG metadata, fee breakdown, preview, and buy button

### Phase 3: Purchase + Download
**Goal**: Buyers can pay for a file and instantly download it, with email receipt and 48-hour re-download window
**Depends on**: Phase 2 (files, links, link pages)
**Requirements**: PAY-01, PAY-02, PAY-03, PAY-04, PAY-05, PAY-06, DL-01, DL-02, DL-03, DL-04, DL-05, UX-03
**Success Criteria** (what must be TRUE):
  1. Buyer can pay via Stripe Checkout with credit/debit card (and TWINT for CHF links) without creating an account
  2. After confirmed payment, buyer lands on a success page and can immediately download the file via a signed URL
  3. Buyer receives an email receipt with a download link that works for 48 hours after purchase
  4. Duplicate webhook deliveries do not create duplicate transactions or inflate revenue numbers
  5. Files are never accessible via public URL -- only via time-limited signed URLs after verified payment

**Plans:** 4 plans

Plans:
- [x] 03-01-PLAN.md — Stripe SDK setup, DB migration (payment_intent_id, RLS, RPCs), Checkout session creation, buy button wiring
- [x] 03-02-PLAN.md — Webhook handler (checkout.session.completed, charge.dispute.created) with idempotent transaction recording
- [x] 03-03-PLAN.md — Download token system (HMAC, 48h), success page with Stripe API verification, re-download API route
- [x] 03-04-PLAN.md — Email receipt via Resend with download link, wired into webhook handler

### Phase 4: Connect + Payouts
**Goal**: Creators can onboard to Stripe Connect, complete KYC, and request payouts to their bank account
**Depends on**: Phase 3 (payment flow must work before payouts make sense)
**Requirements**: CONN-01, CONN-02, CONN-03, CONN-04, CONN-05
**Success Criteria** (what must be TRUE):
  1. Creator can initiate Stripe Connect Express onboarding from their settings page and complete the full KYC flow
  2. Creators who abandon onboarding mid-flow can resume from where they left off
  3. Payouts are blocked until Connect onboarding is fully complete (charges_enabled = true)
  4. Creator can request a payout to their bank account and see it reflected in their payout history

**Plans:** 2 plans

Plans:
- [x] 04-01-PLAN.md — DB migration (Connect fields + transfer tracking), Stripe Connect/Transfer libs, webhook account.updated handler, transfer-after-checkout logic
- [x] 04-02-PLAN.md — Connect onboarding API routes, settings page with Connect status UI, earnings dashboard with transfer totals and re-engagement

### Phase 5: Dashboard + Profiles + Polish
**Goal**: Creators have a data-rich dashboard and styled public profile, and buyers have a polished mobile experience
**Depends on**: Phase 4 (dashboard needs payout history data; profile needs active links data)
**Requirements**: DASH-01, DASH-02, DASH-03, PAGE-02, UX-02
**Success Criteria** (what must be TRUE):
  1. Dashboard shows total earnings, total sales count, active links count, and payout history with status
  2. Dashboard lists all payment links with per-link sales and earnings breakdown
  3. Creator profile page at /[username] displays avatar, bio, social links, and all active payment links
  4. Buyer flow (link page, checkout, success page, download) is fully usable on mobile devices

**Plans:** 3 plans

Plans:
- [ ] 05-01-PLAN.md — Dashboard overview with stats cards, per-link earnings breakdown, and transfer history
- [ ] 05-02-PLAN.md — Profile system: DB migration, avatar upload, profile editing, public profile page at /[username]
- [ ] 05-03-PLAN.md — Mobile responsiveness: Sheet-based dashboard sidebar and buyer page audit

## Progress

| Phase | Plans Complete | Status | Completed |
|-------|---------------|--------|-----------|
| 1. Foundation + Auth | 3/3 | Verified | 2026-03-05 |
| 2. Creator Workflow | 3/3 | Verified | 2026-03-05 |
| 3. Purchase + Download | 4/4 | Verified | 2026-03-06 |
| 4. Connect + Payouts | 2/2 | Verified | 2026-03-05 |
| 5. Dashboard + Profiles + Polish | 0/3 | Planning complete | - |

---
*Roadmap created: 2026-03-05*
*Last updated: 2026-03-06 after Phase 5 planning*
