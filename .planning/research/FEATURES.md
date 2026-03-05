# Feature Research

**Domain:** File Monetization SaaS (Pay-Per-File Unlock Model)
**Researched:** 2026-03-05
**Confidence:** MEDIUM (based on training data -- WebSearch and WebFetch unavailable; all competitor knowledge reflects pre-May 2025 training data and should be spot-checked against current competitor sites)

## Methodology Note

Web research tools were unavailable during this research session. All findings below are based on training knowledge of: Gumroad, Payhip, Lemon Squeezy, Ko-fi Shop, Sellix, SendOwl, E-Junkie, Sellfy, Paddle, and Whop. Confidence is MEDIUM because competitor feature sets may have changed since training cutoff. Recommendations for Unlockt's specific positioning (simplified pay-per-file, no marketplace) are HIGH confidence as they derive from architectural reasoning, not competitor-specific facts.

---

## Feature Landscape

### Table Stakes (Users Expect These)

Without these, creators will not adopt the platform. These are non-negotiable for launch.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| **File upload + storage** | Core product -- no file, no product | Medium | Already planned. 500MB limit is reasonable; Gumroad allows 16GB, but most files are under 100MB. Direct-to-Supabase upload is the right call for Vercel. |
| **Price setting per file** | Creators must control pricing | Low | Already planned. Multi-currency (CHF/EUR/USD/GBP) is a strong differentiator for Swiss-based platform. |
| **Shareable payment link** | The entire distribution model -- creators share links on social, email, etc. | Low | Already planned. This IS the product. Clean, short URLs matter (e.g., unlockt.app/[slug] or /[username]/[slug]). |
| **Stripe Checkout payment** | Buyers expect card payments with a trusted checkout | Medium | Already planned. Stripe Checkout handles PCI compliance, mobile responsiveness, and trust signals. |
| **Instant download after payment** | Every competitor delivers instantly. Any delay = support tickets | Medium | Already planned. Signed URL approach is correct. Must handle Stripe webhook race condition (buyer redirected before webhook fires). |
| **Email receipt with download link** | Buyers close tabs, lose downloads. Email is the safety net | Low | NOT in current plan -- this is a critical gap. Every competitor sends an email with the download link. Without this, support burden is enormous. |
| **Preview/description on link page** | Buyers need to know what they're paying for before clicking "pay" | Low | Already planned (optional preview image + description). Consider: preview should not be optional for good conversion rates. |
| **Creator dashboard with sales data** | Creators obsess over revenue. No dashboard = no retention | Medium | Already planned. Minimum: total earnings, sales count, per-link breakdown, time series (even basic). |
| **Payout mechanism** | Creators need to get paid | High | Already planned via Stripe Connect Express. This is the most complex integration -- Connect onboarding, payout schedules, KYC, tax forms. |
| **Mobile-responsive buyer flow** | 60-70% of link clicks from social media are on mobile | Low | Not explicitly called out but Stripe Checkout and modern CSS handle this. Must test: file download on mobile is often broken/confusing. |
| **HTTPS + secure file delivery** | Files must not be accessible without payment | Medium | Already planned (signed URLs with 60s expiry). This is a hard requirement -- if files leak, creators leave. |
| **Basic fraud protection** | Chargebacks and stolen cards are common in digital goods | Medium | Stripe Radar handles most of this. Platform should have: webhook handling for disputes/refunds, automatic download link revocation on chargeback. |

### Differentiators (Competitive Advantage)

These separate Unlockt from "just another Gumroad clone." Prioritize based on positioning.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| **Simplicity as a feature** | Gumroad has grown complex (courses, memberships, subscriptions, workflows). Unlockt does ONE thing. Speed to first sale < 2 minutes is the pitch. | N/A (design philosophy) | This is Unlockt's #1 differentiator. Resist feature bloat aggressively. Every feature should be evaluated against "does this keep us simple?" |
| **TWINT support** | Swiss payment method. No competitor offers this. Swiss creators and Swiss buyers have a native payment option. | Low (Stripe handles it) | Already planned. This is a genuine competitive moat for the Swiss market. Highlight prominently on landing page. |
| **Styled creator profile pages** | Gumroad profiles are marketplace-centric. Payhip profiles are basic. A beautiful /[username] page that creators are proud to share is sticky. | Medium | Already planned. Make this look like a premium link-in-bio page, not a storefront. Avatar, bio, social links, list of purchasable files. |
| **No buyer account required** | Gumroad forces account creation. Payhip sends login links. Friction-free purchase is a conversion advantage. | Low | Already planned. This is underrated as a differentiator -- every extra step loses ~20% of buyers. |
| **Multi-currency per link** | Most platforms set currency at the account level. Per-link currency lets creators sell in CHF to Swiss audience and USD to international. | Low | Already planned. Unique in the space. Most competitors convert everything to USD. |
| **Dark-mode-first premium UI** | Most digital download platforms look dated (Gumroad) or generic (Payhip). A Linear/Vercel-quality UI signals "premium" to creators. | Medium | Already planned. This matters more than people think -- creators want to share links that look good. The payment page IS marketing. |
| **Download link expiry (48h)** | Creates urgency, reduces link sharing/piracy. Most platforms offer permanent download links. | Low | Already planned. Good balance. Consider: configurable per-link (24h/48h/72h/permanent) would be a v1.x feature. |
| **Max unlock count per link** | Limited editions. No major competitor offers this natively for digital downloads. Creates scarcity for digital goods. | Low | Already planned. Excellent differentiator -- enables "first 100 buyers" model that drives urgency on social media. |
| **Webhook/API for creators** | Power users want to trigger automations (email sequences, Discord access, etc.) on purchase. | Medium | Not in current plan. Defer to v1.x. Gumroad, Lemon Squeezy, and Payhip all offer this. It becomes expected quickly for power creators. |
| **Discount codes / pay-what-you-want** | Creators run promotions. Discount codes are a growth lever. PWYW lets audiences support at different levels. | Medium | Not in current plan. Consider for v1.x. Gumroad's "pay what you want" with minimum price is popular with creators. |
| **Custom thank-you page / post-purchase message** | After payment, creators want to say "Join my Discord" or "Follow me on X." Post-purchase is a high-attention moment. | Low | Not in current plan. Low-effort, high-value. Even a simple text field shown after purchase adds value. |
| **Embeddable buy buttons / widgets** | Creators want to sell from their own website, not just share links. | Medium | Not in current plan. Gumroad overlay widget was their biggest growth driver. Consider for v1.x. |
| **PDF stamping / watermarking** | Each buyer gets a uniquely watermarked PDF with their email embedded. Deters piracy. | High | Not in current plan. Technically complex but a genuine differentiator for ebook/document sellers. v2+ feature. |
| **Bundle / multi-file packages** | Sell a collection of files as one product (e.g., font family, template pack). | Medium | Explicitly out of scope for v1. Correct call -- keep v1 simple. Strong v1.x candidate. |

### Anti-Features (Deliberately NOT Building)

These are commonly requested but would damage Unlockt's positioning, add complexity disproportionate to value, or create operational burden.

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| **Marketplace / discovery** | "Help me find buyers!" | Destroys the simple positioning. Marketplace requires: search, categories, ranking algorithms, moderation, content policy enforcement, SEO. Gumroad's marketplace drives <5% of creator sales. | Double down on "bring your own audience" messaging. Make sharing links dead simple instead. |
| **Subscription / recurring billing** | "I want monthly income" | Entirely different product. Subscriptions require: billing cycle management, failed payment retry, grace periods, cancellation flows, pro-rating. 10x complexity for a different customer segment. | Stay one-time purchases. If recurring is needed later, it's a separate product/mode. |
| **Built-in email marketing** | "Let me email my buyers" | Turns platform into an email service. Deliverability, unsubscribe management, CAN-SPAM/GDPR compliance, template builder. Gumroad's email feature is mediocre; dedicated tools (ConvertKit, Mailchimp) are better. | Offer webhook on purchase so creators can pipe buyers into their existing email tool. Export buyer emails (with consent) as CSV. |
| **Affiliate / referral system** | "Let others promote my files" | High complexity: tracking, attribution, split payouts, affiliate dashboards, fraud detection. Premature for v1. | Consider v2+ if there's proven demand. Lemon Squeezy does this well but they have a large team. |
| **In-platform messaging** | "Let buyers contact me" | Support burden shifts to platform. Moderation requirements. Becomes a social feature. | Show creator's social links on profile. Buyers contact creator directly via their channels. |
| **DRM / heavy copy protection** | "Protect my files from piracy" | DRM is universally hated, always cracked, and creates terrible buyer experience. Technical complexity is enormous. | Signed URLs with expiry, download limits, and optional watermarking (v2) provide "good enough" protection. Honest messaging: "We deter casual sharing, not determined pirates." |
| **Video streaming / preview playback** | "Let buyers preview video before purchasing" | Requires transcoding pipeline, video player, bandwidth costs, CDN complexity. Completely different infrastructure challenge. | Allow preview images/thumbnails. For video sellers: suggest they post preview clips on YouTube/social and link to Unlockt for the full file. |
| **Refund management UI** | "Handle refunds in-platform" | Adds significant complexity: refund policies, partial refunds, download revocation, creator disputes. Low frequency event doesn't justify the UI. | Handle via Stripe dashboard for v1. Platform detects refund via webhook and revokes download access. |
| **Multi-language UI** | "Translate to German/French" | i18n adds complexity to every string, every component, every future feature. Premature optimization for an unvalidated product. | English-only for v1. Consider i18n in v2 if Swiss market demands it (many Swiss users are comfortable with English for digital products). |
| **Custom domains for creator profiles** | "I want my-brand.com to show my Unlockt page" | DNS management, SSL provisioning, domain verification -- significant infrastructure complexity for a v1. | Offer /[username] profile pages. Custom domains in v2 if creators demand it. |

---

## Feature Dependencies

```
Registration
  |
  +-- File Upload --> Price Setting --> Payment Link Generation --> Share Link
  |                                          |
  |                                          +--> Link Page (preview, price, buy button)
  |                                                   |
  |                                                   +--> Stripe Checkout --> Payment Webhook
  |                                                                              |
  |                                                                              +--> Download Delivery (signed URL)
  |                                                                              |
  |                                                                              +--> Email Receipt with download link
  |                                                                              |
  |                                                                              +--> Dashboard Update (sales count, earnings)
  |
  +-- Stripe Connect Onboarding --> KYC (Stripe Identity) --> Payout Requests
  |
  +-- Profile Page (/[username]) -- depends on: registration, at least 1 published link

Key dependency chains:
  1. Upload --> Price --> Link --> Checkout --> Download (critical path, must all work for v1)
  2. Connect Onboarding --> KYC --> Payouts (can be deferred slightly; creators can sell before onboarding but can't withdraw)
  3. Profile page is independent but requires published links to be useful
  4. Email receipt is independent of other features but MUST ship with download delivery
```

### Dependency Insights for Phasing

- **Stripe Connect onboarding can be decoupled from the purchase flow.** Creators can upload and sell before completing Connect onboarding. Earnings accumulate. Payouts are gated behind KYC/Connect completion. This is how Gumroad and Lemon Squeezy work -- reduce friction to first upload.
- **Profile pages are independent.** They enhance the product but don't block the core purchase flow. Could ship in a later phase if needed.
- **Email receipt is NOT independent of download.** It must ship simultaneously. Without email receipt, buyers who close their browser tab lose access to their purchase. This generates support tickets from day one.

---

## MVP Definition

### Launch With (v1) -- "First Dollar Earned"

The minimum set that lets a creator upload a file, share a link, and get paid. Anything missing from this list means the product doesn't work.

1. **Creator registration** (email + username)
2. **File upload** (direct-to-Supabase, 500MB limit)
3. **Price setting** (multi-currency: CHF, EUR, USD, GBP)
4. **Payment link generation** (unique URL per file)
5. **Link page** (preview image, description, price with fees, buy button)
6. **Stripe Checkout** (cards + TWINT)
7. **Instant download** (signed URL after payment confirmation)
8. **Email receipt with download link** (CRITICAL -- not in current plan, must add)
9. **48-hour re-download window** (via email link, no account needed)
10. **Basic creator dashboard** (total earnings, sales count, list of links)
11. **Stripe Connect Express onboarding** (can start after first sale)
12. **KYC via Stripe Identity** (gate payouts, not uploads)
13. **Payout requests** (manual trigger, via Connect)
14. **Secure file delivery** (signed URLs, 60s expiry, private bucket)
15. **Creator profile page** (/[username] with avatar, bio, social links, published files)
16. **Landing page** (what it is, how it works, CTA to sign up)
17. **Webhook handling** (payment success, payment failure, disputes/chargebacks)

**What's NOT in v1 but is in the current plan:** Everything listed is already planned except email receipt (#8) and dispute webhook handling (#17). Both are critical.

### Add After Validation (v1.x) -- "Creator Retention"

Ship these once v1 has real users and you've confirmed product-market fit.

| Feature | Why Now | Complexity |
|---------|---------|------------|
| **Discount codes** | Creators need promotional tools once they have an audience. Most requested feature on every platform. | Medium |
| **Post-purchase message / custom thank-you** | Low effort, high value. Creators want to redirect buyers to Discord, email list, etc. | Low |
| **Download analytics** (per-link: views, conversions, downloads, referrer) | Creators optimize based on data. Table stakes for retention. | Medium |
| **Webhook/API on purchase** | Power creators want to automate. Connect to Zapier, email tools, Discord bots. | Medium |
| **Pay-what-you-want** (with minimum price) | Beloved by creator community. Increases average transaction value by ~30% (Gumroad data). | Low-Medium |
| **Multi-file bundles** | Sell template packs, font families, course materials as one purchase. | Medium |
| **Embeddable buy button / widget** | Sell from creator's own website. Gumroad overlay was their #1 growth driver. | Medium |
| **Configurable download expiry** | Let creators choose 24h/48h/72h/permanent per link. | Low |
| **Social proof on link page** ("X people bought this") | Increases conversion. Simple counter display. | Low |

### Future Consideration (v2+) -- "Platform Scale"

Only build if validated demand exists and the business supports the investment.

| Feature | Why v2+ | Complexity |
|---------|---------|------------|
| **PDF watermarking/stamping** | High value for ebook sellers, but requires file processing pipeline | High |
| **Custom domains** | Requires DNS management, SSL provisioning, verification flow | High |
| **Affiliate system** | Requires tracking, attribution, split payouts, affiliate dashboard | Very High |
| **i18n (multi-language)** | Only if Swiss market demands non-English UI | High (ongoing) |
| **Team accounts** | Multiple creators managing one account | Medium |
| **Advanced analytics** (cohorts, LTV, geographic) | Only worthwhile at scale | High |
| **API for third-party integrations** | Full REST/GraphQL API for developer creators | High |
| **Gift purchases** ("Buy this for someone else") | Niche but requested on every platform | Medium |

---

## Feature Prioritization Matrix

Scoring: Impact (1-5) x Feasibility (1-5) / Complexity (1-5)

| Feature | Impact | Feasibility | Complexity | Score | Phase |
|---------|--------|-------------|------------|-------|-------|
| File upload + secure delivery | 5 | 4 | 3 | 6.7 | v1 |
| Stripe Checkout + TWINT | 5 | 5 | 3 | 8.3 | v1 |
| Payment link generation | 5 | 5 | 2 | 12.5 | v1 |
| Email receipt with download | 5 | 5 | 2 | 12.5 | v1 |
| Creator dashboard | 4 | 5 | 3 | 6.7 | v1 |
| Stripe Connect + payouts | 5 | 4 | 4 | 5.0 | v1 |
| Creator profile page | 3 | 5 | 2 | 7.5 | v1 |
| Discount codes | 4 | 5 | 2 | 10.0 | v1.x |
| Post-purchase message | 3 | 5 | 1 | 15.0 | v1.x |
| Download analytics | 3 | 4 | 3 | 4.0 | v1.x |
| PWYW pricing | 3 | 4 | 2 | 6.0 | v1.x |
| Embeddable widget | 4 | 3 | 3 | 4.0 | v1.x |
| Purchase webhook/API | 3 | 4 | 3 | 4.0 | v1.x |
| Multi-file bundles | 3 | 4 | 3 | 4.0 | v1.x |
| PDF watermarking | 3 | 2 | 4 | 1.5 | v2+ |
| Custom domains | 2 | 3 | 4 | 1.5 | v2+ |
| Affiliate system | 2 | 2 | 5 | 0.8 | v2+ |

---

## Competitor Feature Analysis

**Confidence note:** This reflects training data (pre-May 2025). Competitors may have added or removed features since. Verify against current competitor sites before making final decisions.

### Feature Matrix

| Feature | Gumroad | Payhip | Lemon Squeezy | Ko-fi Shop | Sellix | SendOwl | **Unlockt (Planned)** |
|---------|---------|--------|----------------|------------|--------|---------|----------------------|
| Digital file sales | Yes | Yes | Yes | Yes | Yes | Yes | **Yes** |
| Physical product sales | Yes | No | Yes | No | Yes | No | **No** |
| Subscriptions/memberships | Yes | Yes | Yes | Yes | Yes | Yes | **No (by design)** |
| Courses | Yes | Yes | No | No | No | No | **No (by design)** |
| Marketplace/discovery | Yes | No | No | Yes | Yes | No | **No (by design)** |
| Buyer account required | Yes | Sort of (email) | Yes | Optional | No | No | **No** |
| Custom pricing (multi-currency) | USD only (auto-convert) | Limited | Multi-currency | Limited | Multi-currency | Limited | **Yes (per-link)** |
| TWINT | No | No | No | No | No | No | **Yes** |
| Stripe Checkout | Custom checkout | Custom checkout | Custom checkout | PayPal+Stripe | Multi-gateway | Stripe/PayPal | **Yes (native)** |
| Email receipt | Yes | Yes | Yes | Yes | Yes | Yes | **Must add** |
| Download link expiry | Permanent | Permanent | Configurable | Permanent | Configurable | Configurable | **48h (configurable v1.x)** |
| Max purchase limit | No | No | No | No | No | No | **Yes** |
| Discount codes | Yes | Yes | Yes | Yes | Yes | Yes | **v1.x** |
| PWYW | Yes | Yes | Yes | Yes | No | No | **v1.x** |
| Affiliate system | Yes | Yes | Yes | No | Yes | No | **v2+** |
| Embeddable widget | Yes | Yes | Yes | No | No | Yes | **v1.x** |
| API/webhooks | Yes | Yes | Yes | No | Yes | Yes | **v1.x** |
| Watermarking/stamping | No | No | No | No | No | Yes | **v2+** |
| Creator profiles | Yes (marketplace) | Basic | Basic | Yes | Yes (marketplace) | No | **Yes (styled)** |
| Analytics | Advanced | Basic | Advanced | Basic | Basic | Basic | **Basic v1, enhanced v1.x** |
| Platform fee | 10% | 5% (free) / 0% (paid plan) | 5% + payment fees | 0% (on paid plan) | 5% | $9/mo (0%) | **~25% total** |

### Competitive Positioning Insights

1. **Unlockt's fee is HIGH.** At ~25% total take (15% buyer surcharge + 10% creator deduction), Unlockt is significantly more expensive than every competitor. Gumroad is 10%. Payhip free tier is 5%. Lemon Squeezy is 5% + Stripe fees. This will be the #1 objection from creators.

   **Mitigation options:**
   - Justify with simplicity, TWINT, and Swiss-market focus
   - Consider reducing to 15% total (e.g., 10% buyer + 5% creator) if early feedback shows fee resistance
   - Position as "all-inclusive" (no hidden fees, no monthly subscription, no per-transaction Stripe fee visible to creator)

2. **No buyer account required is a REAL differentiator.** Gumroad now requires accounts. Lemon Squeezy requires email. The friction-free flow is genuinely unique and should be marketed aggressively.

3. **TWINT is an untouchable moat in Switzerland.** No competitor offers it. For Swiss creators selling to Swiss audiences, this is the reason to choose Unlockt.

4. **Max unlock count is unique.** No major competitor offers purchase limits for digital goods. This enables "limited edition digital" which is a growing trend in creator economy.

5. **Simplicity is the main positioning lever.** Gumroad has become a complex product (courses, memberships, workflows, email, analytics). Payhip is also growing complex. "Upload, price, share, get paid -- in under 2 minutes" is a clear position.

---

## Critical Gaps in Current Plan

Features that are NOT in the current requirements but should be addressed before or at launch:

### 1. Email Receipt with Download Link (CRITICAL)

**Status:** Missing from current requirements
**Why critical:** Every competitor sends email receipts. Without this, buyers who close their browser lose access. The 48-hour re-download window is useless if the buyer has no way to get back to the download page.
**Implementation:** Send email via a transactional email service (Resend, Postmark, or Supabase built-in) after payment webhook confirmation. Include: file name, download link (with 48h token), receipt details, creator info.
**Complexity:** Low-Medium
**Dependency:** Must ship with download delivery. Same phase, non-negotiable.

### 2. Chargeback/Dispute Handling (IMPORTANT)

**Status:** Partially implied by Stripe integration but not explicitly planned
**Why important:** Digital goods have high chargeback rates (3-5x physical goods). Platform needs webhook handlers for `charge.disputed` events to: revoke download access, notify creator, track dispute rate per creator (to identify fraud patterns).
**Complexity:** Medium
**Dependency:** Ships with payment webhook handling

### 3. Rate Limiting / Abuse Prevention (IMPORTANT)

**Status:** Not in current requirements
**Why important:** Free registration + file upload = potential abuse vector (hosting malware, illegal content). Need: upload rate limits, file type validation (beyond extension checking), basic content moderation workflow (report button, manual review queue).
**Complexity:** Medium
**Dependency:** Ships with file upload

---

## Sources

- Competitor feature knowledge based on pre-May 2025 training data for: Gumroad, Payhip, Lemon Squeezy, Ko-fi, Sellix, SendOwl, E-Junkie, Sellfy
- Stripe Checkout and Connect capabilities based on training data (HIGH confidence -- Stripe's API is stable and well-documented)
- Creator economy pricing norms based on training data (MEDIUM confidence -- pricing changes frequently)
- Conversion rate impacts (no-account-required, friction reduction) based on general e-commerce research in training data (MEDIUM confidence)
- Feature prioritization scoring is subjective and based on domain experience synthesis

**Verification recommended for:**
- Current competitor pricing tiers (may have changed)
- Gumroad's current account requirements for buyers
- Lemon Squeezy's current feature set (they iterate quickly)
- Stripe Checkout's current support for TWINT (verify this is still available via Checkout)

---
*Feature research for: File Monetization SaaS (Unlockt)*
*Researched: 2026-03-05*
*Confidence: MEDIUM (training data only; web verification unavailable)*
