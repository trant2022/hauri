# Project Research Summary

**Project:** Unlockt
**Domain:** File Monetization SaaS
**Researched:** 2026-03-05
**Confidence:** MEDIUM

## Executive Summary

Unlockt is a pay-per-file-unlock platform where creators upload files, set prices in multiple currencies (CHF/EUR/USD/GBP), share payment links, and receive payouts via Stripe Connect. The standard way to build this is a Next.js App Router application backed by Supabase (PostgreSQL + Auth + Storage) with Stripe handling all money movement. The architecture is well-understood: direct browser-to-Supabase uploads for large files (up to 500MB via TUS resumable protocol), Stripe Checkout for payment collection, Stripe Connect Express for creator payouts, and Supabase Storage signed URLs for secure file delivery. The user's pre-selected stack is strong with one correction: use Next.js 15 (current stable) instead of 14.

The recommended approach is a layered build: foundation and auth first, then file upload and link creation, then the payment-to-download critical path, then Stripe Connect for payouts, and finally polish (profiles, dashboard, landing page). The most important architectural decision -- which must be made before writing any code -- is whether to use Stripe Direct Charges or Destination Charges. The PITFALLS research strongly recommends Direct Charges for FINMA compliance, since they ensure buyer payment principal never enters the platform's Stripe balance. This contradicts the STACK research which assumed Destination Charges. Direct Charges should be the default unless a Swiss fintech lawyer advises otherwise.

The key risks are: (1) the webhook-gated download flow must be idempotent from day one or purchase data is corrupted, (2) large file uploads will silently fail without TUS resumable protocol and robust progress UI, (3) Stripe Connect Express account state is a complex state machine that most developers under-handle, and (4) email receipts with download links are missing from the current plan but are a critical table-stakes feature without which buyer support burden will be unsustainable. The 25% total fee (15% buyer + 10% creator) is significantly higher than every competitor and will be the primary objection from creators -- the product must justify this through simplicity, TWINT support, and premium UX.

## Key Findings

### Recommended Stack

The user's chosen stack is validated with minor adjustments. Next.js 15 (not 14) with App Router, TypeScript strict, React 19. Supabase for database, auth, and storage -- using `@supabase/ssr` (NOT the deprecated `@supabase/auth-helpers-nextjs`). Stripe for payments, Connect Express for payouts, Checkout for buyer UX. Tailwind CSS + shadcn/ui for UI (verify Tailwind v4 compatibility with shadcn before adopting v4; fall back to v3.4.x). React Hook Form + Zod for forms. Vercel for deployment.

**Core technologies:**
- **Next.js 15 + React 19:** Full-stack framework with stable Server Actions, opt-in caching, Turbopack -- greenfield project should not start on 14
- **Supabase (PostgreSQL + Auth + Storage):** Eliminates infrastructure management; private storage buckets with signed URLs for secure delivery; TUS resumable uploads for 500MB files
- **Stripe (Checkout + Connect Express):** PCI-compliant payment collection, marketplace-style payouts, TWINT support for CHF charges
- **tus-js-client:** Required for resumable uploads over 6MB -- standard Supabase upload has a 6MB limit
- **@supabase/ssr:** The ONLY correct way to use Supabase Auth with Next.js App Router; replaces deprecated auth-helpers

**Critical version note:** All version numbers are based on May 2025 training data. Run `npm view <package> version` before installation.

### Expected Features

**Must have (table stakes):**
- File upload with resumable protocol (500MB support)
- Per-file price setting with multi-currency (CHF/EUR/USD/GBP)
- Shareable payment links with clean URLs
- Stripe Checkout (cards + TWINT for CHF)
- Instant download via signed URLs after payment
- **Email receipt with download link** (CRITICAL GAP -- not in current plan, must add)
- 48-hour re-download window via email-based token
- Basic creator dashboard (earnings, sales count, per-link breakdown)
- Stripe Connect Express onboarding and payouts
- Creator profile page (/[username])
- Chargeback/dispute webhook handling (partially missing from plan)

**Should have (differentiators):**
- TWINT payment support (untouchable Swiss moat -- no competitor offers this)
- No buyer account required (genuine conversion advantage)
- Multi-currency per link (not per account -- unique in the space)
- Max unlock count per link (limited edition digital -- no competitor has this)
- Dark-mode-first premium UI (Linear/Vercel quality signals "premium")
- Simplicity as the product (under 2 minutes to first sale)

**Defer (v1.x / v2+):**
- Discount codes, pay-what-you-want, post-purchase messages (v1.x)
- Embeddable buy buttons, purchase webhooks/API, multi-file bundles (v1.x)
- PDF watermarking, custom domains, affiliate system, i18n (v2+)

### Architecture Approach

The architecture follows a layered pattern: Next.js App Router with route groups for layout isolation (marketing, auth, creator dashboard), public-facing routes for buyer flow (/l/[linkId]) and creator profiles (/[username]), and API route handlers for Stripe operations and webhooks. Three Supabase client tiers enforce security boundaries: browser client (RLS-enforced) for client components, server client (session-aware, RLS-enforced) for server components, and admin client (service role, bypasses RLS) strictly for webhook handlers. Files are uploaded directly from browser to Supabase Storage (never through Vercel serverless functions due to 4.5MB body limit). Two storage buckets: private for purchased files, public for preview images.

**Major components:**
1. **Auth boundary (middleware):** Protects /(creator) routes, passes through public pages and webhook endpoints
2. **Supabase client tier system:** Three clients with strict import boundaries enforce data access control
3. **Stripe webhook dispatcher:** Single endpoint with signature verification, dispatches to per-event handler functions for testability
4. **Fee calculation module:** Single canonical function shared between display and checkout creation -- all math in integer cents
5. **Download token system:** Signed URLs generated on-demand (not at page render), gated behind purchase verification and 48-hour window

**Database schema:** 5 tables -- users (extends auth.users), files, links (with slug, price, currency, max_unlocks), transactions (with stripe_session_id UNIQUE for idempotency), payouts

### Critical Pitfalls

1. **Direct Charges vs Destination Charges (FINMA risk)** -- Destination charges route funds through the platform's Stripe balance before transfer to creators, which Swiss regulators may interpret as fund-holding requiring a financial intermediary license. Use Direct Charges instead: buyer pays the connected account directly, platform collects only the application fee. Decide BEFORE writing any Stripe code.

2. **Webhook idempotency** -- Stripe delivers webhooks at-least-once, not exactly-once. Without a UNIQUE constraint on `stripe_session_id` and an upsert pattern, duplicate webhooks create duplicate purchases and inflated revenue. Always verify `payment_status === 'paid'` via Stripe API inside the handler.

3. **Large file upload failures** -- Standard Supabase `upload()` has a 6MB limit. Files approaching 500MB require TUS resumable upload protocol with chunking, retry, and progress UI. Test with real 200MB+ files early -- small-file tests hide this entirely.

4. **Checkout success page timing race** -- Buyer arrives at success page before webhook fires. The page must either poll for the transaction record or verify payment via Stripe API directly. Never trust the URL redirect as payment proof.

5. **Connect Express state machine** -- Express accounts have multiple states (charges_enabled, payouts_enabled, details_submitted). Developers assume linear happy path but users abandon onboarding mid-flow. Must store state, listen to `account.updated` webhooks, and build re-engagement flow.

## Implications for Roadmap

Based on research, suggested phase structure:

### Phase 0: Pre-Development Decisions
**Rationale:** Two architectural decisions affect every downstream phase and cannot be changed later without major refactoring.
**Delivers:** Architectural decisions document, Stripe account configuration
**Decisions required:**
- Direct Charges vs Destination Charges (recommendation: Direct Charges for FINMA safety)
- Tailwind v3.4 vs v4 (check shadcn/ui compatibility at project init time)
- Transactional email provider selection (Resend, Postmark, or Supabase built-in) for purchase receipts
**Avoids:** Pitfall 5 (FINMA fund-holding risk), architectural rework

### Phase 1: Foundation + Auth
**Rationale:** Everything depends on project setup, database schema, auth, and middleware. This is Layer 0-1 from the architecture research.
**Delivers:** Running Next.js 15 app with Supabase Auth, protected routes, user registration with username, database schema with RLS policies, Supabase client tier system (server/client/admin), shadcn/ui component library initialized
**Addresses:** Creator registration, route protection, database foundation
**Avoids:** Anti-pattern of single Supabase client, service role key leakage

### Phase 2: File Upload + Link Creation
**Rationale:** The core creator workflow (upload file, create payment link) must work before payments can be tested. This is Layers 2-3 from the architecture.
**Delivers:** Direct-to-Supabase file upload with TUS resumable protocol, file management, payment link creation with price/currency/description, public link page with preview, fee calculation module
**Addresses:** File upload (500MB), price setting, payment link generation, link page with preview
**Avoids:** Pitfall 6 (large file upload failures), anti-pattern of routing uploads through serverless

### Phase 3: Payment + Download Critical Path
**Rationale:** This is the money flow -- the most complex and highest-risk phase. It connects Stripe Checkout to webhook processing to signed URL delivery. The architecture research identifies this as the critical path.
**Delivers:** Stripe Checkout integration (cards), webhook handler with idempotent transaction recording, post-payment download page, signed URL generation on-demand, 48-hour re-download via email token, email receipt with download link
**Addresses:** Stripe Checkout, instant download, email receipt (critical gap), 48-hour window, webhook handling
**Avoids:** Pitfall 1 (webhook idempotency), Pitfall 2 (signed URL leakage), Pitfall 7 (orphaned checkout sessions), Pitfall 8 (fee rounding), Gotcha 5 (success page timing race)

### Phase 4: Stripe Connect + Payouts
**Rationale:** Creators need to receive money. Connect Express onboarding is complex (state machine) but decoupled from the purchase flow -- creators can sell before onboarding, with payouts gated on completion.
**Delivers:** Connect Express account creation and onboarding flow, account state tracking via webhooks, application_fee_amount integration in checkout sessions, payout dashboard, re-engagement flow for incomplete onboarding
**Addresses:** Stripe Connect onboarding, KYC (via Connect's built-in verification -- do NOT add separate Stripe Identity), payout tracking
**Avoids:** Pitfall 3 (Connect state machine complexity), Pitfall 4 (currency mismatch), Gotcha 3 (return_url vs refresh_url), Gotcha 4 (duplicate KYC with Stripe Identity)

### Phase 5: TWINT + Multi-Currency Polish
**Rationale:** TWINT is a key differentiator for the Swiss market but is additive -- card payments must work first. Multi-currency display and creator guidance around FX fees belong here.
**Delivers:** TWINT payment method for CHF charges, currency mismatch warnings for creators, fee transparency on buyer-facing pages, async payment confirmation handling for redirect-based methods
**Addresses:** TWINT support, multi-currency UX, buyer fee transparency
**Avoids:** Pitfall 9 (TWINT limitations), Pitfall 4 (currency mismatch), UX Pitfall 2 (buyer fee bait-and-switch)

### Phase 6: Profiles + Dashboard + Landing
**Rationale:** Public-facing polish and creator retention features. These are independent of the core payment flow and can ship after the product is functional.
**Delivers:** Creator profile page (/[username]), enhanced dashboard with earnings chart and per-link stats, marketing landing page, max unlock count enforcement, basic fraud protection (chargeback webhook handling)
**Addresses:** Creator profile, dashboard, landing page, max unlock count, dispute handling
**Avoids:** Performance Trap 2 (unoptimized dashboard queries -- use materialized aggregates)

### Phase Ordering Rationale

- **Phases 0-3 are the critical path.** A creator cannot earn their first dollar without foundation, upload, links, and payments all working. These must be built in strict dependency order.
- **Phase 4 (Connect) is decoupled from the purchase flow** but should follow immediately. The FINMA-safe charge model (Direct Charges) means Connect account IDs are needed in checkout session creation, so Phase 4 integrates back into Phase 3's code.
- **Phase 5 (TWINT) is additive** and can be enabled by simply adding the payment method to Stripe Dashboard and handling async confirmation. Low code effort, high market value.
- **Phase 6 (Profiles/Dashboard) is independent** of the money flow. These are retention and polish features that enhance but don't enable the core product.
- **Email receipt (Phase 3) is non-negotiable.** Every competitor sends email receipts. Without it, buyers who close their browser lose their purchase, generating support tickets and chargebacks.

### Research Flags

Phases likely needing deeper research during planning:
- **Phase 0:** Direct Charges vs Destination Charges -- needs validation against current Stripe docs and ideally Swiss fintech legal counsel. The PITFALLS and STACK research disagree on the default charge model.
- **Phase 3:** Webhook idempotency pattern and success page race condition handling -- well-documented in principle but the exact Next.js 15 App Router implementation details (raw body parsing, async headers) should be verified.
- **Phase 4:** Stripe Connect Express account state management -- the state machine is complex and the exact webhook events and account fields should be verified against current Stripe docs.
- **Phase 5:** TWINT availability and behavior in Stripe Checkout -- training data is from 2024, TWINT integration details may have changed.

Phases with standard patterns (skip research-phase):
- **Phase 1:** Supabase Auth + Next.js App Router middleware is thoroughly documented by Supabase. Standard pattern.
- **Phase 2:** File upload to Supabase Storage and CRUD operations are well-established patterns.
- **Phase 6:** Profile pages and dashboard UI are standard Next.js patterns with no special integration complexity.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | MEDIUM | Core technologies are correct but all version numbers need live verification. Next.js 15 was confirmed released (Oct 2024) but may have newer versions by now. Tailwind v4/shadcn compatibility is uncertain. |
| Features | MEDIUM | Table stakes and differentiators are well-reasoned. Competitor feature data is from pre-May 2025 training data and may be stale. The critical gap (email receipts) is a strong finding. Fee positioning (25% total) concern is high confidence. |
| Architecture | MEDIUM | Core patterns (App Router, Supabase client tiers, webhook dispatcher, direct uploads) are well-established and stable. Specific API syntax for @supabase/ssr middleware and TUS uploads should be verified. Database schema is sound. |
| Pitfalls | MEDIUM | The identified pitfalls are real and well-documented across Stripe and Supabase communities. The FINMA/Direct Charges recommendation is the most critical finding but needs legal validation. Webhook idempotency and large file upload pitfalls are high confidence. |

**Overall confidence:** MEDIUM -- The architectural patterns and pitfalls are well-understood. The primary uncertainty is around version-specific API details and the FINMA compliance question. Both are resolvable with targeted verification before each phase.

### Gaps to Address

- **Direct Charges vs Destination Charges:** The two most important research files (STACK and PITFALLS) give conflicting default recommendations. This must be resolved with current Stripe docs and legal review before Phase 3-4.
- **Transactional email provider:** Email receipts are critical but no provider has been selected. Evaluate Resend (developer-friendly, good Next.js integration), Postmark (high deliverability), or Supabase built-in email (simpler but less flexible).
- **Tailwind v4 compatibility:** Cannot determine if shadcn/ui supports Tailwind v4 without live verification. Check at project initialization time.
- **Stripe TWINT current status:** TWINT support via Stripe Checkout should be re-verified against current Stripe documentation and tested in test mode early.
- **Supabase Storage plan limits:** The 500MB file size limit and concurrent upload limits on the Supabase plan need to be verified in the Supabase dashboard.
- **Swiss VAT/MWST on platform fees:** 8.1% VAT may apply to platform fees. This is a legal/accounting question, not a technical one, but affects fee calculation display.
- **KYC approach:** The PITFALLS research identified that Stripe Connect Express already handles KYC during onboarding, making a separate Stripe Identity integration potentially redundant. Validate whether Connect's built-in KYC meets requirements before adding Identity.

## Sources

### Primary (HIGH confidence)
- Stripe Connect Express destination charges documentation -- stable, well-established API
- Stripe Checkout Sessions API -- stable, widely used
- Supabase Storage signed URLs and private buckets -- core documented feature
- Supabase Auth with @supabase/ssr -- official migration from deprecated auth-helpers
- Next.js App Router patterns (route groups, server/client components, middleware)

### Secondary (MEDIUM confidence)
- Stripe TWINT payment method support -- documented as of 2024, verify current availability
- Supabase TUS resumable upload protocol -- documented but API may have evolved
- Stripe Connect Direct Charges vs Destination Charges for FINMA compliance -- architectural reasoning is sound but needs legal validation
- Competitor feature analysis (Gumroad, Payhip, Lemon Squeezy, etc.) -- pre-May 2025 data
- Next.js 15 specific APIs (async headers/cookies) -- released Oct 2024, details may have changed

### Tertiary (LOW confidence)
- Tailwind CSS v4 + shadcn/ui compatibility -- unknown, must verify at init time
- Exact npm package versions -- all need `npm view` verification
- Swiss FINMA financial intermediary licensing thresholds -- needs legal counsel, not developer research

---
*Research completed: 2026-03-05*
*Ready for roadmap: yes*
