# Stack Research

**Domain:** File Monetization SaaS (Unlockt)
**Researched:** 2026-03-05
**Overall Confidence:** MEDIUM - versions verified against training data (May 2025 cutoff); live npm registry and official docs could not be queried due to tool restrictions. All version numbers should be verified with `npm view <package> version` before installation.

---

## Assessment of User's Chosen Stack

The user has pre-selected: Next.js 14 App Router + TypeScript strict, Supabase, Stripe, Tailwind CSS + shadcn/ui, Vercel, React Hook Form + Zod, next-themes.

**Verdict: Solid foundation with one version concern.**

This is a well-aligned stack for a file monetization SaaS. Every choice has clear rationale and they compose well together. The one issue: **Next.js 14 is outdated. Next.js 15 was released October 2024** and by March 2026 is the stable default. The project should use Next.js 15 (or whatever the current stable is) unless there's a specific compatibility reason to pin to 14.

---

## Recommended Stack

### Core Framework

| Technology | Version | Purpose | Why Recommended | Confidence |
|------------|---------|---------|-----------------|------------|
| **Next.js** | **15.x** (latest stable) | Full-stack framework, App Router, server components, API routes | Next.js 15 brought stable Server Actions, improved caching, Turbopack stable. Next.js 14 is a major version behind. The App Router patterns are refined in 15. Use `next@latest` at project init. | MEDIUM - 15 was stable as of Oct 2024; by March 2026 there may be 15.x or even 16.x |
| **TypeScript** | **5.x** (latest) | Type safety | Strict mode is correct. TypeScript 5.x ships with Next.js 15. Use `"strict": true` in tsconfig. | HIGH |
| **React** | **19.x** | UI library | Next.js 15 ships with React 19 which includes use(), improved Suspense, and Server Components improvements. Do NOT pin to React 18. | MEDIUM - React 19 was released Dec 2024 |

### Database and Backend Services

| Technology | Version | Purpose | Why Recommended | Confidence |
|------------|---------|---------|-----------------|------------|
| **Supabase (hosted)** | Latest cloud | PostgreSQL + Auth + Storage + Edge Functions | Correct choice. Supabase provides the entire backend: auth, database, file storage with private buckets, and signed URLs. Eliminates need to manage infrastructure. | HIGH |
| **@supabase/supabase-js** | **2.x** (latest) | Browser and server Supabase client | The core client library. v2 has been stable since 2023. Includes storage upload methods with resumable upload support for large files. | HIGH |
| **@supabase/ssr** | **0.5.x+** (latest) | Server-side Supabase client for Next.js App Router | CRITICAL: This replaces the deprecated `@supabase/auth-helpers-nextjs`. The `@supabase/ssr` package is the official way to use Supabase with Next.js App Router (server components, route handlers, middleware). Do NOT use `@supabase/auth-helpers-nextjs`. | HIGH |

### Payments

| Technology | Version | Purpose | Why Recommended | Confidence |
|------------|---------|---------|-----------------|------------|
| **stripe** (Node.js SDK) | **latest** (v17.x+) | Server-side Stripe API calls | The official Node.js SDK. Used for creating Checkout Sessions, Connect accounts, Identity verification sessions, webhook handling. Pin to latest at install time. | MEDIUM - v14-17 range was active as of May 2025 |
| **@stripe/stripe-js** | **latest** | Client-side Stripe.js loader | Loads Stripe.js safely in the browser. Used for redirecting to Checkout and for Stripe Identity verification UI. | HIGH |

### UI

| Technology | Version | Purpose | Why Recommended | Confidence |
|------------|---------|---------|-----------------|------------|
| **Tailwind CSS** | **v4.x** or **v3.4.x** | Utility-first CSS | Tailwind v4 was released in early 2025 with a new engine. However, shadcn/ui compatibility with v4 should be verified before adopting. If shadcn/ui has not updated for v4, use v3.4.x. Check `npx shadcn@latest init` to see which it targets. | LOW - v4 was announced but shadcn compatibility uncertain |
| **shadcn/ui** | N/A (CLI-based) | Component library | Not a versioned dependency -- it scaffolds component code into your project via `npx shadcn@latest`. This is the correct choice for a premium dark-mode-first UI. Components are yours to customize. | HIGH |
| **next-themes** | **0.4.x** | Dark/light mode theming | Works with Next.js App Router and shadcn/ui. Required for the dark-mode-first approach. Simple `<ThemeProvider>` wrapper. | HIGH |

### Forms and Validation

| Technology | Version | Purpose | Why Recommended | Confidence |
|------------|---------|---------|-----------------|------------|
| **react-hook-form** | **7.x** (latest) | Form state management | Correct choice for forms (creator profile, file upload forms, pricing). Uncontrolled components = great performance. | HIGH |
| **zod** | **3.x** (latest) | Schema validation | Correct choice. Used for both client-side form validation and server-side API input validation. Share schemas between client and server. | HIGH |
| **@hookform/resolvers** | **latest** | Connect Zod to React Hook Form | The bridge library. `zodResolver` adapter lets you use Zod schemas directly with React Hook Form. | HIGH |

### Deployment

| Technology | Version | Purpose | Why Recommended | Confidence |
|------------|---------|---------|-----------------|------------|
| **Vercel** | N/A | Hosting, edge functions, CDN | Natural pairing with Next.js. Note the serverless function limits: 10s default timeout (can be extended to 60s on Pro, 300s on Enterprise), and **4.5MB request body limit**. This is why direct-to-Supabase uploads are mandatory for 500MB files. | HIGH |

---

## Supporting Libraries

| Library | Version | Purpose | When to Use | Confidence |
|---------|---------|---------|-------------|------------|
| **@supabase/storage-js** | Included in supabase-js | Direct storage uploads | Bundled with @supabase/supabase-js. Provides `upload()`, `createSignedUrl()`, and resumable upload via TUS protocol for large files. | HIGH |
| **tus-js-client** | **4.x** | Resumable uploads > 6MB | Supabase Storage supports TUS protocol for resumable uploads. For files up to 500MB, you MUST use resumable uploads -- standard `upload()` has a 6MB limit on Supabase. The tus-js-client handles chunking, resume-on-failure, and progress tracking. | HIGH |
| **sonner** | **latest** | Toast notifications | shadcn/ui integrates with sonner for toasts. Used for upload progress, payment success, error notifications. Better than react-hot-toast for shadcn integration. | HIGH |
| **lucide-react** | **latest** | Icons | shadcn/ui uses Lucide icons by default. Don't install a second icon library. | HIGH |
| **date-fns** | **3.x** or **4.x** | Date formatting | For displaying purchase dates, 48-hour window expiry, dashboard date ranges. Lightweight, tree-shakeable. | MEDIUM |
| **nanoid** | **5.x** | Short unique IDs | For generating unique payment link slugs (e.g., `/p/abc123`). Shorter and URL-safe compared to UUIDs. | HIGH |
| **sharp** | **latest** | Image processing | For generating preview thumbnails from uploaded images. Works in Node.js serverless functions. Next.js already depends on sharp for Image optimization. | HIGH |
| **micro** | **latest** | Raw body parsing for webhooks | Stripe webhooks require the raw request body for signature verification. In App Router route handlers, use `request.text()` or `request.arrayBuffer()` instead -- micro may not be needed with App Router. | LOW - App Router may handle this natively |
| **@stripe/react-stripe-js** | **latest** | React Stripe Elements | Only needed if you embed Stripe Elements directly. For Checkout redirect flow, you only need `@stripe/stripe-js`. Since you're using Stripe Checkout (redirect), you probably do NOT need this. | MEDIUM |

---

## Development Tools

| Tool | Purpose | Notes | Confidence |
|------|---------|-------|------------|
| **eslint** + **eslint-config-next** | Linting | Ships with `create-next-app`. Use Next.js built-in ESLint config. | HIGH |
| **prettier** + **prettier-plugin-tailwindcss** | Code formatting | The Tailwind plugin auto-sorts class names. Essential for consistent Tailwind usage. | HIGH |
| **supabase CLI** | Local development | `npx supabase init` + `npx supabase start` for local Supabase (PostgreSQL, Auth, Storage). Generate TypeScript types with `supabase gen types typescript`. | HIGH |
| **stripe CLI** | Webhook testing | `stripe listen --forward-to localhost:3000/api/webhooks/stripe` for local webhook testing. Essential for payment flow development. | HIGH |
| **@types/node** | Node.js types | Required for TypeScript in API routes and server components. | HIGH |

---

## Critical Stack Patterns

### 1. Direct-to-Supabase Uploads (500MB files)

**The problem:** Vercel serverless functions have a 4.5MB request body limit and 10-60s timeouts. You cannot proxy 500MB uploads through your API.

**The solution:** Upload directly from the browser to Supabase Storage using the TUS resumable upload protocol.

**How it works:**
1. User authenticates via Supabase Auth (creates a session)
2. Client-side code uses `supabase.storage.from('files').upload()` for files < 6MB
3. For larger files, use TUS resumable upload endpoint: `https://<project>.supabase.co/storage/v1/upload/resumable`
4. Supabase Storage bucket is configured as PRIVATE (no public access)
5. RLS policies on the storage bucket ensure only authenticated creators can upload to their own folder path

**Key configuration:**
- Bucket: private, no public access
- File size limit: Set to 500MB (524288000 bytes) in Supabase dashboard
- Upload path pattern: `{user_id}/{file_id}/{filename}` for isolation
- RLS: `auth.uid() = (storage.foldername(name))[1]` pattern

**TUS resumable upload specifics:**
- Supabase exposes a TUS endpoint at `/storage/v1/upload/resumable`
- Set `Authorization: Bearer <access_token>` header
- Set `x-upsert: false` to prevent overwrites
- Chunk size: 6MB default (configurable)
- The upload can be resumed if the browser tab is closed or network drops
- Progress events available for progress bar UI

**Confidence:** HIGH -- this is well-documented Supabase functionality.

### 2. Stripe Connect Express Integration

**The pattern for creator payouts:**

1. **Onboarding:** Create a Connect Express account for the creator via `stripe.accounts.create({ type: 'express', ... })`. Redirect creator to Stripe-hosted onboarding via `stripe.accountLinks.create()`.
2. **Checkout:** When a buyer purchases, create a Checkout Session with `payment_intent_data.transfer_data.destination` set to the creator's Connect account ID. This uses "destination charges" -- Stripe creates the charge on the platform account, then transfers to the connected account.
3. **Fees:** Use `payment_intent_data.application_fee_amount` to specify the platform's cut in the smallest currency unit (cents/rappen).
4. **Payouts:** Stripe handles payouts to the creator's bank account on their payout schedule. The platform never holds funds.

**Destination charges vs. direct charges:**
- **Use destination charges** (recommended for this use case). The platform owns the customer relationship and the charge. Stripe automatically transfers the amount minus application fee to the connected account.
- Do NOT use direct charges (those put the charge on the connected account, which complicates your receipt/refund flow).
- Do NOT use Separate Charges and Transfers (overly complex for this use case).

**Confidence:** HIGH -- destination charges with Connect Express is the standard pattern for marketplace/platform payouts.

### 3. Multi-Currency Support

**How multi-currency works with Stripe Checkout:**

1. Creator sets a price and currency (CHF, EUR, USD, GBP) per file link
2. Store `price_amount` (integer, smallest unit) and `currency` (3-letter ISO code) in the database
3. When creating a Checkout Session, pass `line_items[0].price_data.currency` and `line_items[0].price_data.unit_amount`
4. Stripe Checkout renders in the specified currency
5. Application fee is calculated in the same currency

**Important considerations:**
- Currency is per-link, not per-creator (a creator could have some links in CHF and others in EUR)
- Store amounts in smallest currency unit: CHF/EUR/USD/GBP all use cents (100 = 1.00)
- The Connect Express account receives funds in whatever currency the charge was made in (Stripe handles conversion if the connected account's default currency differs, but this incurs FX fees)
- Consider whether creators should receive payouts in their local currency. If a Swiss creator sells in EUR, Stripe converts EUR to CHF on payout (1% FX fee from Stripe). Document this in creator onboarding.

**TWINT support:**
- TWINT is available as a payment method in Stripe Checkout for CHF-denominated charges
- It is enabled in the Stripe Dashboard under Payment Methods
- It only appears for CHF charges (not EUR/USD/GBP)
- Checkout automatically shows TWINT when: currency is CHF AND the payment method is enabled AND the customer's location is Switzerland
- No additional code needed -- Stripe Checkout handles TWINT UI automatically

**Confidence:** HIGH for multi-currency basics, MEDIUM for TWINT specifics (based on Stripe docs as of 2024).

### 4. Signed URLs for Secure Downloads

**Pattern:**
1. After payment confirmation (webhook `checkout.session.completed`), record the purchase in the database with a `purchased_at` timestamp
2. When buyer requests download, verify: purchase exists AND `purchased_at` is within 48 hours
3. Generate signed URL: `supabase.storage.from('files').createSignedUrl(path, 60)` (60 seconds expiry)
4. Redirect buyer to the signed URL or return it in an API response
5. Signed URL is single-use-ish (it's time-limited but technically usable multiple times within the 60s window)

**Confidence:** HIGH.

### 5. Stripe Identity for KYC

**Pattern:**
1. Create a verification session: `stripe.identity.verificationSessions.create({ type: 'document', ... })`
2. Redirect creator to Stripe-hosted verification UI
3. Listen for `identity.verification_session.verified` webhook
4. Store verification status in the database
5. Gate payout functionality on verification status

**Integration with Connect Express:** Stripe Connect Express onboarding already collects identity information. You may not need a SEPARATE Stripe Identity integration -- Connect Express handles KYC as part of account onboarding. Evaluate whether the built-in Connect Express identity verification meets your requirements before adding Stripe Identity on top.

**Confidence:** MEDIUM -- the overlap between Connect Express KYC and Stripe Identity needs validation.

---

## Installation

```bash
# Project initialization
npx create-next-app@latest unlockt --typescript --tailwind --eslint --app --src-dir --import-alias "@/*"

# Core dependencies
npm install @supabase/supabase-js @supabase/ssr stripe @stripe/stripe-js

# UI
npx shadcn@latest init
npm install next-themes sonner

# Forms and validation
npm install react-hook-form zod @hookform/resolvers

# Utilities
npm install nanoid tus-js-client

# Dev dependencies
npm install -D prettier prettier-plugin-tailwindcss supabase @types/node
```

**Note:** shadcn/ui components are added individually:
```bash
npx shadcn@latest add button card input label dialog dropdown-menu avatar badge separator toast
```

**Stripe CLI (separate install):**
```bash
# macOS
brew install stripe/stripe-cli/stripe

# Then authenticate
stripe login
```

**Supabase CLI:**
```bash
# macOS
brew install supabase/tap/supabase

# Or via npx (no install needed)
npx supabase init
npx supabase start
```

---

## Alternatives Considered

| Category | Recommended | Alternative | When to Use Alternative |
|----------|-------------|-------------|-------------------------|
| Framework | Next.js 15 | Remix / SvelteKit | Only if you need streaming responses or prefer Svelte. Next.js has the best Vercel integration and largest ecosystem. |
| Database | Supabase (PostgreSQL) | PlanetScale (MySQL) / Neon (PostgreSQL) | If you need MySQL compatibility or serverless branching. Supabase wins here because it bundles Auth + Storage + Realtime. |
| Auth | Supabase Auth | Clerk / NextAuth.js | Clerk if you want prebuilt UI components for auth. NextAuth if you need many OAuth providers. Supabase Auth is sufficient and avoids adding another service. |
| Storage | Supabase Storage | AWS S3 + CloudFront / Cloudflare R2 | If files exceed 5GB or you need CDN-level caching. For private files up to 500MB with signed URLs, Supabase Storage is simpler. |
| Payments | Stripe | Paddle / LemonSqueezy | Paddle/LemonSqueezy act as Merchant of Record (handle taxes). Stripe gives more control but you handle tax compliance. For Swiss-based business with Connect Express, Stripe is the right choice. |
| Forms | React Hook Form + Zod | Formik + Yup | Formik is heavier and less performant. React Hook Form + Zod is the modern standard. |
| CSS | Tailwind + shadcn/ui | CSS Modules / Chakra UI / MUI | Chakra/MUI if you want opinionated design. shadcn/ui gives premium aesthetics with full customization. |
| Upload | TUS (resumable) to Supabase | UploadThing / Cloudflare R2 direct | UploadThing simplifies upload UX but adds a service dependency. Direct-to-Supabase is sufficient and keeps the stack simpler. |
| Icons | Lucide React | Heroicons / React Icons | Heroicons if you prefer the Tailwind Labs style. Lucide is the shadcn default. |

---

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| **@supabase/auth-helpers-nextjs** | Deprecated. Replaced by `@supabase/ssr`. Will not receive updates. | `@supabase/ssr` |
| **Next.js 14** | One major version behind. Missing stable Server Actions, improved caching, React 19 support. | Next.js 15 (latest stable) |
| **next/api (Pages Router API routes)** | App Router uses route handlers (`app/api/*/route.ts`). Mixing Pages and App Router causes confusion. | Route Handlers in App Router |
| **Stripe direct charges** | Puts the charge on the connected account. Complicates platform fee collection and customer relationship. | Destination charges via `transfer_data.destination` |
| **Stripe Separate Charges and Transfers** | Overly complex for a simple platform model. Requires manual transfer management. | Destination charges |
| **multer / formidable** | Server-side file upload libraries. Not needed when uploading directly from browser to Supabase Storage. | TUS resumable upload to Supabase |
| **AWS SDK for uploads** | Adds complexity when Supabase Storage provides S3-compatible storage with a simpler client. | @supabase/supabase-js storage methods |
| **Prisma** | Adds an ORM layer on top of Supabase's PostgREST client. Duplicates functionality and adds build complexity. | Supabase client queries + generated TypeScript types |
| **react-dropzone** (alone) | Does not handle large file uploads. You need TUS protocol for resumable uploads. | tus-js-client with a custom dropzone UI (shadcn + native drag-drop) |
| **next-auth / Auth.js** | Adds a second auth system when Supabase Auth already handles authentication. Would create confusing session management. | Supabase Auth via @supabase/ssr |
| **Tailwind v4** (if shadcn incompatible) | Tailwind v4 has breaking changes in configuration format. Only use if shadcn/ui explicitly supports it at time of project init. | Tailwind v3.4.x if shadcn/ui has not migrated |

---

## Stack Patterns by Variant

### Environment Variables

```env
# .env.local (never commit)
NEXT_PUBLIC_SUPABASE_URL=https://<project>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-key>
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>

STRIPE_SECRET_KEY=sk_test_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

NEXT_PUBLIC_APP_URL=http://localhost:3000
```

**Important:** `SUPABASE_SERVICE_ROLE_KEY` and `STRIPE_SECRET_KEY` must NEVER have `NEXT_PUBLIC_` prefix. They are server-only.

### Supabase Client Pattern (App Router)

Three client variants needed:

1. **Browser client** (`lib/supabase/client.ts`): Uses `createBrowserClient()` from `@supabase/ssr`. For client components.
2. **Server client** (`lib/supabase/server.ts`): Uses `createServerClient()` from `@supabase/ssr` with `cookies()`. For server components and route handlers.
3. **Admin client** (`lib/supabase/admin.ts`): Uses `createClient()` from `@supabase/supabase-js` with the service role key. For webhook handlers and admin operations that bypass RLS.

### Stripe Webhook Pattern (App Router)

```
app/api/webhooks/stripe/route.ts
```
- Use `request.text()` to get raw body (needed for signature verification)
- Verify with `stripe.webhooks.constructEvent(body, sig, webhookSecret)`
- Handle events: `checkout.session.completed`, `account.updated`, `identity.verification_session.verified`
- Return `NextResponse.json({ received: true })` with status 200

---

## Version Compatibility Matrix

| Package | Compatible With | Notes |
|---------|-----------------|-------|
| Next.js 15 | React 19, TypeScript 5.x | Ships with React 19. Turbopack stable. |
| @supabase/ssr | Next.js 14+, @supabase/supabase-js 2.x | Replaces auth-helpers. Works with App Router. |
| @supabase/supabase-js 2.x | Any framework | Core client, framework-agnostic. |
| stripe (Node.js) | Node.js 18+ | Next.js 15 requires Node.js 18.17+. Compatible. |
| @stripe/stripe-js | Any frontend framework | Loads Stripe.js from CDN. No framework dependency. |
| shadcn/ui | Tailwind CSS 3.4+ (verify v4 support), React 18/19 | CLI-based, no version lock. |
| react-hook-form 7.x | React 18/19 | Stable, widely used. |
| zod 3.x | Any runtime | Runtime validation, no framework dependency. |
| next-themes | Next.js 13+ (App Router), React 18/19 | Requires ThemeProvider in layout.tsx. |
| tus-js-client | Browser, Node.js | Framework-agnostic. Used client-side for uploads. |

---

## Key Decision: Next.js 14 vs 15

The project CLAUDE.md specifies Next.js 14. Here is the recommendation:

**Use Next.js 15 (latest stable) instead.**

| Aspect | Next.js 14 | Next.js 15 |
|--------|------------|------------|
| Server Actions | Experimental then stable late in lifecycle | Stable from release |
| React version | React 18 | React 19 |
| Caching | Aggressive defaults (confusing) | Opt-in caching (more predictable) |
| Turbopack | Dev only | Stable for dev and build |
| `fetch` caching | Cached by default (surprising) | NOT cached by default (sane) |
| `cookies()`/`headers()` | Synchronous | Async (breaking change but better) |
| Maintenance | Will receive fewer updates | Current stable, active development |

**Migration impact:** The CLAUDE.md says "Next.js 14" but since this is a greenfield project (no existing code), there is zero migration cost. Start with 15.

**Confidence:** MEDIUM -- Next.js 15 was definitely released (Oct 2024), but by March 2026 there may be a newer version. Run `npx create-next-app@latest` and use whatever it gives you.

---

## Swiss-Specific Considerations

| Concern | Recommendation | Confidence |
|---------|---------------|------------|
| TWINT payments | Enable in Stripe Dashboard. Only works for CHF charges. Stripe Checkout handles UI automatically. | MEDIUM |
| FINMA compliance | Stripe holds all funds (Connect Express). Platform never touches money. This avoids requiring a financial intermediary license. | HIGH (business logic, not technical) |
| VAT / MWST | Switzerland charges 8.1% VAT on services. Platform fees may be subject to VAT. This is a business/legal question, not a technical one. Stripe Tax can help automate but adds cost. | LOW - needs legal review |
| Data residency | Supabase projects can be hosted in EU regions (Frankfurt). Swiss data protection law (nDSG) is similar to GDPR. Hosting in EU is acceptable. | MEDIUM |

---

## Sources and Confidence Methodology

This research was conducted using training data with a May 2025 cutoff. The following tools were attempted but unavailable:
- WebSearch: denied
- WebFetch: denied
- Bash (npm view): denied

**All version numbers are based on the latest known versions as of May 2025.** Before running `npm install`, verify current versions with:
```bash
npm view next version
npm view @supabase/supabase-js version
npm view @supabase/ssr version
npm view stripe version
npm view tailwindcss version
npm view react-hook-form version
npm view zod version
```

**Source basis:**
- Next.js 15 release: Official Next.js blog (October 2024) -- HIGH confidence it exists
- Supabase TUS uploads: Supabase official documentation -- HIGH confidence
- Stripe Connect Express destination charges: Stripe official documentation -- HIGH confidence
- Stripe TWINT support: Stripe payment methods documentation -- MEDIUM confidence (feature availability may have changed)
- @supabase/ssr replacing auth-helpers: Supabase official migration guide -- HIGH confidence
- Tailwind CSS v4: Tailwind Labs announcements (early 2025) -- MEDIUM confidence on shadcn compatibility
- shadcn/ui CLI pattern: shadcn.com -- HIGH confidence (fundamental architecture unchanged)

---
*Stack research for: Unlockt -- File Monetization SaaS*
*Researched: 2026-03-05*
*Researcher confidence: MEDIUM overall (versions need live verification)*
