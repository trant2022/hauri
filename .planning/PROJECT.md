# Unlockt

## What This Is

A file monetization SaaS platform where creators lock digital files behind payment links. Buyers click a link, pay via Stripe Checkout, and instantly download the file. Features creator dashboard with earnings analytics, public creator profiles at /[username], and mobile-responsive buyer flow. No subscriptions, no marketplace discovery -- creators bring their own audience.

## Core Value

Creators can upload a file, set a price, share a link, and get paid -- in under 2 minutes. The simplest path from "I have a file" to "I'm making money."

## Requirements

### Validated

- Creator registration with email + username -- v1.0
- File upload (images, PDFs, videos, ZIP, max 500MB) via TUS resumable protocol -- v1.0
- Creator sets price per file in chosen currency (CHF, EUR, USD, GBP) -- v1.0
- Shareable payment link per file with unique URL, optional preview + description -- v1.0
- Optional max unlock count per link -- v1.0
- Creator dashboard: earnings, sales count, active links, per-link breakdown, payout history -- v1.0
- Payout via Stripe Connect Express with KYC onboarding -- v1.0
- Styled creator public profile (/[username]) with avatar, bio, social links -- v1.0
- Buyer pays via Stripe Checkout (credit card + TWINT for CHF) -- v1.0
- Instant download after payment with 48-hour re-download via email link -- v1.0
- No account required for buyers -- v1.0
- Fee structure: buyer pays base + 15%, creator receives base - 10% -- v1.0
- Files never publicly accessible -- signed URLs only after confirmed payment -- v1.0
- Dark-mode-first premium UI (Linear/Vercel-inspired) with mobile responsiveness -- v1.0
- Landing page at / -- v1.0

### Active

- Dockerfile with Next.js standalone build for production deployment -- v1.1
- Docker Compose setup with app + reverse proxy (auto-SSL) -- v1.1
- Git pull deploy workflow: SSH in, git pull, rebuild, restart -- v1.1
- App accessible at test.trant.ch with HTTPS -- v1.1
- .env.example documenting all required environment variables -- v1.1

### Out of Scope

- Marketplace/discovery features -- creators bring their own audience
- Subscription/recurring payments -- one-time purchases only for v1
- Mobile app -- web-first
- Real-time chat/messaging -- not a social platform
- Video streaming/preview -- download only
- Refund management UI -- handled via Stripe dashboard
- Analytics beyond basic dashboard stats -- defer to v2
- Multi-file bundles -- one file per link for v1
- Custom domains for creator profiles -- defer to v2

## Current Milestone: v1.1 Docker Deployment

**Goal:** Deploy Unlockt to Ubuntu server with Docker, accessible at test.trant.ch with HTTPS and a simple git pull deploy workflow.

**Target features:**
- Dockerfile with Next.js standalone output for production
- Docker Compose with app + reverse proxy (Caddy for auto-SSL)
- Deploy workflow: git pull → docker compose up --build -d
- .env.example for all required environment variables
- HTTPS via automatic Let's Encrypt certificates

## Context

- Shipped v1.0 with 8,315 lines of TypeScript across 156 files
- Tech stack: Next.js 16 App Router, Supabase (PostgreSQL + Auth + Storage), Stripe (Checkout + Connect Express), Tailwind CSS + shadcn/ui, Resend (email)
- Swiss-based business -- Stripe handles funds to avoid FINMA licensing requirements
- Multi-currency: creators choose CHF, EUR, USD, or GBP per link
- TWINT support via Stripe Checkout for Swiss payment method
- Large file uploads (up to 500MB) go direct from client to Supabase Storage via TUS protocol
- Buyers get 48-hour re-download window via HMAC-signed email links
- Deployment target: Ubuntu VPS with Docker installed, DNS A record for test.trant.ch via Hostpoint

## Constraints

- **Tech Stack**: Next.js 16 App Router + TypeScript strict + Supabase + Stripe + Tailwind/shadcn
- **Deployment**: Vercel -- serverless functions have timeout limits, large uploads bypass them
- **Storage**: Supabase private bucket -- files never served via public URLs
- **Payments**: Stripe Connect Express -- platform never touches funds directly
- **File Size**: 500MB max per upload
- **Currency**: CHF, EUR, USD, GBP -- creator selects per link
- **Fees**: Fixed at 15% buyer surcharge + 10% creator deduction = ~25% platform take

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Direct-to-Supabase uploads via TUS | Vercel serverless timeouts can't handle 500MB uploads | Good |
| Multi-currency (creator picks) | International market, not Swiss-only | Good |
| 48-hour download window with HMAC tokens | Balance between buyer convenience and file security | Good |
| Styled creator profiles at /[username] | More than a link list -- avatar, bio, social links | Good |
| Stripe holds all funds | Avoid FINMA licensing requirements in Switzerland | Good |
| Dark mode first with OKLCH | Premium feel matching Linear/Vercel aesthetic | Good |
| Stripe lazy Proxy pattern | Avoid build-time crashes without env vars | Good |
| Separate charges + transfers | Platform collects via Checkout, transfers to creators post-payment | Good |
| Dual webhook secret verification | Handle both direct and Connect events in single endpoint | Good |
| Reserved username blocklist | Prevent /[username] from shadowing static routes | Good |

---
*Last updated: 2026-03-06 after v1.1 milestone started*
