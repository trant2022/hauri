# Requirements: Unlockt

**Defined:** 2026-03-05
**Core Value:** Creators can upload a file, set a price, share a link, and get paid — in under 2 minutes

## v1 Requirements

### Authentication

- [ ] **AUTH-01**: Creator can register with email, password, and unique username
- [ ] **AUTH-02**: Creator receives email verification after signup
- [ ] **AUTH-03**: Creator can reset password via email link
- [ ] **AUTH-04**: Creator session persists across browser refresh

### File Management

- [ ] **FILE-01**: Creator can upload files (images, PDFs, videos, ZIP) up to 500MB via TUS resumable protocol direct to Supabase Storage
- [ ] **FILE-02**: Upload shows progress bar with percentage and supports resume on failure
- [ ] **FILE-03**: File type is validated on upload (whitelist of allowed MIME types)
- [ ] **FILE-04**: Creator can delete their uploaded files
- [ ] **FILE-05**: Upload rate limiting prevents abuse (max uploads per hour per user)

### Payment Links

- [ ] **LINK-01**: Creator can create a payment link for an uploaded file with a unique shareable URL
- [ ] **LINK-02**: Creator sets price per link in chosen currency (CHF, EUR, USD, GBP)
- [ ] **LINK-03**: Creator can optionally add preview image and description to link
- [ ] **LINK-04**: Creator can optionally set max unlock count per link
- [ ] **LINK-05**: Creator can view, edit, and deactivate their payment links
- [ ] **LINK-06**: Link page displays file name, preview (if set), price with fees breakdown, and buy button

### Payments

- [ ] **PAY-01**: Buyer can pay via Stripe Checkout with credit/debit card
- [ ] **PAY-02**: Buyer can pay with TWINT for CHF-priced links
- [ ] **PAY-03**: Buyer pays base price + 15% platform fee; creator receives base price minus 10%
- [ ] **PAY-04**: All fee calculations use integer arithmetic (Rappen/cents) to avoid rounding errors
- [ ] **PAY-05**: Stripe webhook handles checkout.session.completed with idempotent transaction recording
- [ ] **PAY-06**: Chargeback webhook (charge.disputed) revokes download access and notifies creator

### Download

- [ ] **DL-01**: Buyer receives instant download via signed URL (60s expiry) on success page after confirmed payment
- [ ] **DL-02**: Success page handles webhook race condition (polls or verifies via Stripe API)
- [ ] **DL-03**: Buyer receives email receipt with download link after purchase
- [ ] **DL-04**: Buyer can re-download within 48 hours via the email download link
- [ ] **DL-05**: Files are never publicly accessible — private Supabase bucket only

### Creator Dashboard

- [ ] **DASH-01**: Dashboard shows total earnings, total sales count, and number of active links
- [ ] **DASH-02**: Dashboard lists all payment links with per-link sales and earnings
- [ ] **DASH-03**: Dashboard shows payout history with status

### Stripe Connect & Payouts

- [ ] **CONN-01**: Creator can initiate Stripe Connect Express onboarding from settings
- [ ] **CONN-02**: Platform tracks Connect account state via account.updated webhooks
- [ ] **CONN-03**: Payouts are gated behind completed Connect onboarding (KYC verified, charges_enabled)
- [ ] **CONN-04**: Creator can request payout to bank account via Stripe Connect
- [ ] **CONN-05**: Re-engagement flow for creators who abandon Connect onboarding mid-flow

### Public Pages

- [ ] **PAGE-01**: Landing page at / explains the product, shows how it works, and has signup CTA
- [ ] **PAGE-02**: Creator profile page at /[username] shows avatar, bio, social links, and all active payment links
- [ ] **PAGE-03**: Buyer-facing link page at /l/[linkId] with preview, price, fees, and buy button

### Design & UX

- [ ] **UX-01**: Dark-mode-first design with Linear/Vercel-inspired aesthetic
- [ ] **UX-02**: Mobile-responsive buyer flow (link page, checkout, success page, download)
- [ ] **UX-03**: No buyer account required — friction-free purchase flow
- [ ] **UX-04**: Every async action shows loading state and toast notification
- [ ] **UX-05**: All inputs validated with Zod; clear error messages

## v2 Requirements

### Creator Tools

- **TOOL-01**: Discount codes for payment links
- **TOOL-02**: Pay-what-you-want pricing with minimum
- **TOOL-03**: Post-purchase message / custom thank-you content
- **TOOL-04**: Multi-file bundles (sell collection as one purchase)
- **TOOL-05**: Embeddable buy button / widget for creator websites

### Analytics & API

- **ANLYT-01**: Per-link analytics (views, conversions, downloads, referrer)
- **ANLYT-02**: Purchase webhook / API for creator automations
- **ANLYT-03**: Configurable download expiry per link (24h/48h/72h/permanent)

### Platform

- **PLAT-01**: PDF watermarking/stamping with buyer email
- **PLAT-02**: Custom domains for creator profiles
- **PLAT-03**: Affiliate/referral system
- **PLAT-04**: Multi-language UI (German, French)
- **PLAT-05**: Team accounts (multiple creators per account)

## Out of Scope

| Feature | Reason |
|---------|--------|
| Marketplace / discovery | Creators bring their own audience; marketplace requires search, ranking, moderation |
| Subscriptions / recurring billing | Entirely different product; 10x complexity for different customer segment |
| Built-in email marketing | Better served by dedicated tools (ConvertKit, Mailchimp); webhook on purchase instead |
| In-platform messaging | Support burden shifts to platform; creators use their own social channels |
| DRM / heavy copy protection | Universally hated, always cracked; signed URLs + expiry provide sufficient protection |
| Video streaming / preview playback | Requires transcoding pipeline, CDN; preview images suffice for v1 |
| Real-time chat | Not a social platform |
| Mobile app | Web-first, mobile later |
| OAuth login (Google, GitHub) | Email/password sufficient for v1 creators |
| Refund management UI | Handle via Stripe dashboard; webhook detects and revokes access |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| AUTH-01 | Pending | Pending |
| AUTH-02 | Pending | Pending |
| AUTH-03 | Pending | Pending |
| AUTH-04 | Pending | Pending |
| FILE-01 | Pending | Pending |
| FILE-02 | Pending | Pending |
| FILE-03 | Pending | Pending |
| FILE-04 | Pending | Pending |
| FILE-05 | Pending | Pending |
| LINK-01 | Pending | Pending |
| LINK-02 | Pending | Pending |
| LINK-03 | Pending | Pending |
| LINK-04 | Pending | Pending |
| LINK-05 | Pending | Pending |
| LINK-06 | Pending | Pending |
| PAY-01 | Pending | Pending |
| PAY-02 | Pending | Pending |
| PAY-03 | Pending | Pending |
| PAY-04 | Pending | Pending |
| PAY-05 | Pending | Pending |
| PAY-06 | Pending | Pending |
| DL-01 | Pending | Pending |
| DL-02 | Pending | Pending |
| DL-03 | Pending | Pending |
| DL-04 | Pending | Pending |
| DL-05 | Pending | Pending |
| DASH-01 | Pending | Pending |
| DASH-02 | Pending | Pending |
| DASH-03 | Pending | Pending |
| CONN-01 | Pending | Pending |
| CONN-02 | Pending | Pending |
| CONN-03 | Pending | Pending |
| CONN-04 | Pending | Pending |
| CONN-05 | Pending | Pending |
| PAGE-01 | Pending | Pending |
| PAGE-02 | Pending | Pending |
| PAGE-03 | Pending | Pending |
| UX-01 | Pending | Pending |
| UX-02 | Pending | Pending |
| UX-03 | Pending | Pending |
| UX-04 | Pending | Pending |
| UX-05 | Pending | Pending |

**Coverage:**
- v1 requirements: 41 total
- Mapped to phases: 0
- Unmapped: 41

---
*Requirements defined: 2026-03-05*
*Last updated: 2026-03-05 after initial definition*
