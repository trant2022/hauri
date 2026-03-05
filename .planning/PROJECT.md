# Unlockt

## What This Is

A file monetization SaaS platform where creators lock digital files behind payment links. Buyers click a link, pay via Stripe Checkout, and instantly download the file. No subscriptions, no marketplace discovery — creators bring their own audience. Think Gumroad meets link-in-bio, stripped down to the essentials.

## Core Value

Creators can upload a file, set a price, share a link, and get paid — in under 2 minutes. The simplest path from "I have a file" to "I'm making money."

## Requirements

### Validated

(None yet — ship to validate)

### Active

- [ ] Creator registration with email + username
- [ ] Identity verification via Stripe Identity (required before payouts)
- [ ] File upload (images, PDFs, videos, ZIP, max 500MB) direct to Supabase Storage
- [ ] Creator sets price per file in chosen currency (CHF, EUR, USD, GBP)
- [ ] Shareable payment link per file with unique URL
- [ ] Optional max unlock count per link
- [ ] Optional preview image + description on link page
- [ ] Creator dashboard: earnings, sales count, active links, payout history
- [ ] Payout request to bank account via Stripe Connect Express
- [ ] Styled creator public profile (/[username]) with avatar, bio, social links
- [ ] Buyer lands on payment link, sees file info + price with fees
- [ ] Buyer pays via Stripe Checkout (credit card + TWINT)
- [ ] Instant download after payment with 48-hour re-download window
- [ ] No account required for buyers
- [ ] Fee structure: buyer pays base + 15%, creator receives base - 10%, platform collects ~25%
- [ ] Files never publicly accessible — signed URLs with 60s expiry only after confirmed payment
- [ ] KYC + Stripe Connect onboarding before payouts enabled
- [ ] Stripe holds all funds — platform never holds money directly
- [ ] Dark-mode-first premium UI (Linear/Vercel-inspired)
- [ ] Landing page at /

### Out of Scope

- Marketplace/discovery features — creators bring their own audience
- Subscription/recurring payments — one-time purchases only for v1
- Mobile app — web-first
- Real-time chat/messaging — not a social platform
- Video streaming/preview — download only
- Refund management UI — handled via Stripe dashboard for v1
- Analytics beyond basic dashboard stats — defer to v2
- Multi-file bundles — one file per link for v1
- Custom domains for creator profiles — defer to v2

## Context

- Inspired by unlockt.me — new build, not a rebuild
- Target market: international creators (influencers, educators, designers, musicians)
- Swiss-based business — Stripe handles funds to avoid FINMA licensing requirements
- Multi-currency support: creators choose CHF, EUR, USD, or GBP per link
- TWINT support via Stripe Checkout (Swiss payment method)
- Large file uploads (up to 500MB) should go direct from client to Supabase Storage to bypass Vercel serverless function limits
- Buyers get a 48-hour window to re-download purchased files
- Creator profiles are styled pages with avatar, bio, and social links — not just a link list

## Constraints

- **Tech Stack**: Next.js 14 App Router + TypeScript strict + Supabase + Stripe + Tailwind/shadcn — already decided
- **Deployment**: Vercel — serverless functions have timeout limits, large uploads must bypass them
- **Storage**: Supabase private bucket — files never served via public URLs
- **Payments**: Stripe Connect Express — platform never touches funds directly
- **File Size**: 500MB max per upload
- **Currency**: CHF, EUR, USD, GBP — creator selects per link
- **Fees**: Fixed at 15% buyer surcharge + 10% creator deduction = ~25% platform take

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Direct-to-Supabase uploads | Vercel serverless timeouts can't handle 500MB uploads | -- Pending |
| Multi-currency (creator picks) | International market, not Swiss-only | -- Pending |
| 48-hour download window | Balance between buyer convenience and file security | -- Pending |
| Styled creator profiles | More than a link list — avatar, bio, social links | -- Pending |
| Stripe holds all funds | Avoid FINMA licensing requirements in Switzerland | -- Pending |
| Dark mode first | Premium feel matching Linear/Vercel aesthetic | -- Pending |

---
*Last updated: 2026-03-05 after initialization*
