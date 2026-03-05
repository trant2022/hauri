# Phase 3: Purchase + Download - Research

**Researched:** 2026-03-05
**Domain:** Stripe Checkout, Webhooks, Supabase Storage Signed URLs, Transactional Email, Download Tokens
**Confidence:** HIGH

## Summary

This phase implements the buyer-facing purchase and download flow: a buyer visits a link page, pays via Stripe Checkout, and receives instant file access plus an email receipt with a 48-hour re-download link. The platform collects the full payment (no Stripe Connect needed yet) and records transactions with fee breakdowns for later payout in Phase 4.

The critical architectural decisions are: (1) use standard Stripe Checkout (platform collects, no Connect) since Connect isn't set up until Phase 4 -- this aligns with Stripe's "collect then transfer" pattern; (2) use Stripe's hosted Checkout page (not embedded) for simplicity and automatic TWINT/card support; (3) handle the success-page race condition by retrieving the Checkout session directly from Stripe API on the success page, with webhook as the authoritative fulfillment path; (4) use HMAC-signed tokens (Node.js built-in crypto) for 48-hour re-download links, avoiding external JWT dependencies.

**Primary recommendation:** Use standard Stripe Checkout (mode: "payment") with the platform's own Stripe account. Record transactions in the webhook handler with idempotency via the stripe_session_id unique constraint. Serve files exclusively via Supabase Storage signed URLs (60s expiry) generated server-side with the admin client.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| stripe | ^20.4.0 | Server-side Stripe SDK | Official Stripe Node.js library, latest API version |
| resend | ^4.x | Transactional email sending | Developer-friendly, React Email support, 3k free emails/month |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @supabase/supabase-js | ^2.98.0 (already installed) | Storage signed URLs, DB operations | All server-side file access and transaction recording |
| Node.js crypto (built-in) | N/A | HMAC download tokens | 48-hour re-download token generation and verification |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| resend | nodemailer + SMTP | Resend is simpler (no SMTP config), has React Email support, free tier sufficient |
| resend | Supabase Edge Functions + email | Adds complexity, separate runtime, harder to test locally |
| HMAC tokens | jsonwebtoken (JWT) | HMAC with built-in crypto is lighter, no external dependency, sufficient for this use case |
| Hosted Checkout | Embedded Checkout | Hosted is simpler (no client-side SDK), handles TWINT QR codes natively, less code |

**Installation:**
```bash
npm install stripe resend
```

**Environment variables needed:**
```
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
RESEND_API_KEY=re_...
NEXT_PUBLIC_APP_URL=http://localhost:3000
DOWNLOAD_TOKEN_SECRET=<random 32-byte hex string>
```

## Architecture Patterns

### Recommended Project Structure
```
src/
  lib/
    stripe/
      client.ts           # Stripe SDK initialization
      checkout.ts          # createCheckoutSession() function
      webhooks.ts          # Event handler dispatch + fulfillment logic
    download-token.ts      # HMAC token creation and verification
    email/
      send-receipt.ts      # Resend email sending logic
      templates/
        purchase-receipt.tsx  # React Email receipt template
  app/
    api/
      checkout/
        route.ts           # POST: create Checkout session, redirect to Stripe
      webhooks/
        stripe/
          route.ts         # POST: webhook handler (signature verification + dispatch)
      download/
        [token]/
          route.ts         # GET: verify token, serve signed URL redirect
    l/
      [slug]/
        success/
          page.tsx         # Post-payment success page with download
```

### Pattern 1: Platform-Collects Checkout (No Connect)
**What:** The platform's own Stripe account collects the full buyer amount. Fee breakdowns are recorded in the transactions table for later payout via Connect in Phase 4.
**When to use:** Phase 3 -- before Connect is configured.
**Why:** Stripe's "collect then transfer" model explicitly supports collecting payments first and transferring to connected accounts later. No connected account is needed at checkout time.
**Example:**
```typescript
// src/lib/stripe/checkout.ts
import Stripe from "stripe"
import { stripe } from "./client"
import { calculateFees } from "@/lib/fees"

interface CreateCheckoutParams {
  linkId: string
  linkTitle: string
  priceAmountCents: number
  currency: string
  buyerEmail?: string
}

export async function createCheckoutSession({
  linkId,
  linkTitle,
  priceAmountCents,
  currency,
}: CreateCheckoutParams) {
  const fees = calculateFees(priceAmountCents)
  const appUrl = process.env.NEXT_PUBLIC_APP_URL!

  // Determine payment methods based on currency
  const paymentMethodTypes: Stripe.Checkout.SessionCreateParams.PaymentMethodType[] =
    currency.toLowerCase() === "chf"
      ? ["card", "twint"]
      : ["card"]

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    payment_method_types: paymentMethodTypes,
    line_items: [
      {
        price_data: {
          currency: currency.toLowerCase(),
          unit_amount: fees.totalBuyerPays, // buyer pays base + 15%
          product_data: {
            name: linkTitle,
          },
        },
        quantity: 1,
      },
    ],
    metadata: {
      link_id: linkId,
      base_price: String(priceAmountCents),
      platform_fee: String(fees.platformFee),
      creator_amount: String(fees.creatorReceives),
    },
    success_url: `${appUrl}/l/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${appUrl}/l/${linkId}`, // will need slug, not id
  })

  return session
}
```

### Pattern 2: Webhook Handler with Idempotent Fulfillment
**What:** Stripe webhook endpoint verifies signatures, dispatches events, and records transactions idempotently.
**When to use:** Always -- this is the authoritative fulfillment path.
**Example:**
```typescript
// src/app/api/webhooks/stripe/route.ts
import { headers } from "next/headers"
import { NextResponse } from "next/server"
import Stripe from "stripe"
import { stripe } from "@/lib/stripe/client"

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!

export async function POST(req: Request) {
  const body = await req.text()  // MUST be raw text, not JSON
  const headersList = await headers()
  const signature = headersList.get("stripe-signature")!

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
  } catch (err) {
    console.error("Webhook signature verification failed:", err)
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 })
  }

  // Dispatch by event type
  switch (event.type) {
    case "checkout.session.completed":
      await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session)
      break
    case "charge.dispute.created":
      await handleDisputeCreated(event.data.object as Stripe.Dispute)
      break
  }

  // Return 200 quickly -- Stripe retries on non-2xx
  return NextResponse.json({ received: true })
}
```

### Pattern 3: Idempotent Transaction Recording
**What:** Use the stripe_session_id unique constraint to prevent duplicate transactions from duplicate webhook deliveries.
**When to use:** In the checkout.session.completed handler.
**Example:**
```typescript
async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const { link_id, base_price, platform_fee, creator_amount } = session.metadata!

  // Idempotent insert -- unique constraint on stripe_session_id
  // If duplicate webhook fires, this INSERT fails silently
  const { error } = await supabaseAdmin
    .from("transactions")
    .insert({
      link_id,
      buyer_email: session.customer_details?.email ?? session.customer_email ?? "",
      amount_paid: session.amount_total!,
      platform_fee: Number(platform_fee),
      creator_amount: Number(creator_amount),
      currency: session.currency!.toUpperCase(),
      stripe_session_id: session.id,
      status: "completed",
    })

  if (error) {
    // Check if it's a unique violation (duplicate webhook) -- that's OK
    if (error.code === "23505") {
      console.log("Duplicate webhook, transaction already recorded:", session.id)
      return
    }
    throw error
  }

  // Increment unlock_count on the link
  await supabaseAdmin.rpc("increment_unlock_count", { link_id_param: link_id })

  // Send receipt email (fire-and-forget, don't block webhook response)
  await sendPurchaseReceipt({
    buyerEmail: session.customer_details?.email ?? session.customer_email!,
    linkId: link_id,
    amountPaid: session.amount_total!,
    currency: session.currency!,
  }).catch(console.error)
}
```

### Pattern 4: Success Page with Stripe API Verification
**What:** The success page retrieves the Checkout session directly from Stripe to verify payment, instead of relying on the webhook having already fired.
**When to use:** On the /l/success page to handle the race condition.
**Example:**
```typescript
// src/app/l/success/page.tsx (server component)
import { stripe } from "@/lib/stripe/client"
import { supabaseAdmin } from "@/lib/supabase/admin"

export default async function SuccessPage({ searchParams }: {
  searchParams: Promise<{ session_id?: string }>
}) {
  const { session_id } = await searchParams
  if (!session_id) { notFound() }

  // Verify payment directly with Stripe API -- no race condition
  const session = await stripe.checkout.sessions.retrieve(session_id)

  if (session.payment_status !== "paid") {
    // Payment not confirmed yet -- show pending state
    return <PendingPayment />
  }

  const linkId = session.metadata!.link_id

  // Get file storage_path via link -> file join
  const { data: link } = await supabaseAdmin
    .from("links")
    .select("files(storage_path, name)")
    .eq("id", linkId)
    .single()

  // Generate short-lived signed URL for immediate download
  const { data: signedUrl } = await supabaseAdmin.storage
    .from("files")
    .createSignedUrl(link!.files!.storage_path, 60) // 60 seconds

  return <SuccessPageUI downloadUrl={signedUrl!.signedUrl} fileName={link!.files!.name} />
}
```

### Pattern 5: HMAC Download Token (48-hour re-download)
**What:** Stateless, URL-safe tokens using Node.js built-in crypto for time-limited download access.
**When to use:** In email receipts for 48-hour re-download links.
**Example:**
```typescript
// src/lib/download-token.ts
import { createHmac, timingSafeEqual } from "crypto"

const SECRET = process.env.DOWNLOAD_TOKEN_SECRET!
const TOKEN_TTL_MS = 48 * 60 * 60 * 1000 // 48 hours

interface TokenPayload {
  transactionId: string
  linkId: string
  exp: number
}

export function createDownloadToken(transactionId: string, linkId: string): string {
  const payload: TokenPayload = {
    transactionId,
    linkId,
    exp: Date.now() + TOKEN_TTL_MS,
  }

  const data = Buffer.from(JSON.stringify(payload)).toString("base64url")
  const signature = createHmac("sha256", SECRET).update(data).digest("base64url")

  return `${data}.${signature}`
}

export function verifyDownloadToken(token: string): TokenPayload | null {
  const [data, signature] = token.split(".")
  if (!data || !signature) return null

  const expectedSig = createHmac("sha256", SECRET).update(data).digest("base64url")

  // Constant-time comparison to prevent timing attacks
  const sigBuffer = Buffer.from(signature, "base64url")
  const expectedBuffer = Buffer.from(expectedSig, "base64url")
  if (sigBuffer.length !== expectedBuffer.length) return null
  if (!timingSafeEqual(sigBuffer, expectedBuffer)) return null

  const payload: TokenPayload = JSON.parse(Buffer.from(data, "base64url").toString())

  // Check expiration
  if (Date.now() > payload.exp) return null

  return payload
}
```

### Anti-Patterns to Avoid
- **Storing files in public buckets:** Files must ONLY be in the private "files" bucket. Never make them publicly accessible.
- **Using req.json() in webhook handler:** Always use req.text() -- JSON parsing breaks Stripe signature verification.
- **Relying solely on success page for fulfillment:** Stripe explicitly warns: "You cannot rely on fulfillment being triggered only from your Checkout success page, since your customers aren't guaranteed to visit it." The webhook is the authoritative path.
- **Using floating-point for fee math:** The existing calculateFees() correctly uses integer arithmetic. Never introduce floating-point division for currency amounts.
- **Creating Stripe Price objects in advance:** Use price_data for ad-hoc pricing since each link has a unique price. Pre-creating Price objects would be wasteful.
- **Adding @stripe/stripe-js or @stripe/react-stripe-js:** These are frontend SDKs for embedded checkout or Elements. With hosted Checkout (redirect), they are not needed. The only Stripe package needed is the server-side `stripe` SDK.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Payment processing | Custom payment form | Stripe Hosted Checkout | PCI compliance, TWINT support, card handling, 3D Secure -- all handled by Stripe |
| Webhook signature verification | Manual HMAC verification | stripe.webhooks.constructEvent() | Handles timestamp validation, replay attack prevention, signature comparison |
| Signed file URLs | Custom URL signing | supabaseAdmin.storage.createSignedUrl() | Built into Supabase, handles token generation, expiry, and access control |
| Email rendering | HTML string templates | React Email components + Resend | Type-safe, previewable, responsive email templates |
| Idempotency | Custom dedup tracking table | PostgreSQL unique constraint on stripe_session_id | Database-level guarantee, no application-level race conditions |
| Fee calculation | New fee logic | Existing calculateFees() in src/lib/fees.ts | Already implemented and tested with integer arithmetic |

**Key insight:** Every complex piece of this phase has an existing solution. The download token is the only custom crypto code needed, and it uses Node.js built-ins (no external library).

## Common Pitfalls

### Pitfall 1: Webhook Raw Body Parsing
**What goes wrong:** Stripe webhook signature verification fails with "No signatures found matching the expected signature for payload."
**Why it happens:** Next.js App Router's Request object defaults to parsing JSON. Using `req.json()` or any middleware that parses the body before you call `constructEvent()` will alter the raw bytes, breaking signature verification.
**How to avoid:** Always use `await req.text()` to get the raw body string. Never use middleware that auto-parses JSON on the webhook route.
**Warning signs:** Webhook verification works in Stripe CLI testing but fails in production (different body encoding).

### Pitfall 2: Success Page Race Condition
**What goes wrong:** Buyer lands on success page, but the webhook hasn't fired yet, so the transaction isn't in the database and no download is available.
**Why it happens:** Stripe redirects the buyer to success_url immediately after payment confirmation. The webhook is sent asynchronously and may arrive 1-10 seconds later.
**How to avoid:** On the success page, retrieve the Checkout session directly from Stripe API using the session_id from the URL. Verify payment_status === "paid" from Stripe, not from the database. Generate the signed download URL server-side based on the Stripe verification.
**Warning signs:** Intermittent "file not found" or "payment not confirmed" errors on the success page.

### Pitfall 3: Duplicate Webhook Processing
**What goes wrong:** Same transaction recorded twice, revenue numbers inflated, unlock_count double-incremented.
**Why it happens:** Stripe retries webhook delivery on timeouts or non-2xx responses. Network issues can cause duplicate deliveries.
**How to avoid:** The stripe_session_id unique constraint prevents duplicate INSERT. Check for PostgreSQL error code 23505 (unique_violation) and treat it as success, not error. Also, return 200 quickly from the webhook handler before doing heavy processing.
**Warning signs:** Duplicate transaction rows, unlock_count higher than actual purchases.

### Pitfall 4: TWINT Currency Mismatch
**What goes wrong:** Stripe rejects the Checkout session creation or TWINT doesn't appear as a payment option.
**Why it happens:** TWINT requires ALL line items to use CHF currency. If the link uses EUR or USD, including "twint" in payment_method_types will fail.
**How to avoid:** Conditionally include "twint" in payment_method_types only when the link's currency is CHF.
**Warning signs:** Stripe API error: "The payment method type 'twint' does not support currency 'eur'."

### Pitfall 5: Signed URL Expiry Too Short or Too Long
**What goes wrong:** Download link expires before the buyer clicks it (too short) or remains accessible indefinitely (too long).
**Why it happens:** Misconfigured expiry parameter in createSignedUrl().
**How to avoid:** Use 60 seconds for immediate download on the success page (buyer is actively on the page). Use a fresh 60-second signed URL generated at the time of the re-download request (not stored in the email -- the email contains the HMAC token, which is verified server-side before generating a fresh signed URL).
**Warning signs:** "URL expired" errors on download attempts.

### Pitfall 6: Chargeback Handler Missing Payment Intent Link
**What goes wrong:** A charge.dispute.created event arrives but you can't find the original transaction.
**Why it happens:** The dispute object contains a `charge` and `payment_intent` field, but you stored `stripe_session_id` in the transactions table, not the payment_intent ID.
**How to avoid:** When recording the transaction in the webhook, also store the payment_intent from the Checkout session. Or, when handling a dispute, retrieve the charge, expand the payment_intent, then look up the session via Stripe API. Simpler: add a `stripe_payment_intent_id` column to the transactions table.
**Warning signs:** Disputes arrive but you cannot match them to transactions.

### Pitfall 7: Forgetting to Increment unlock_count Atomically
**What goes wrong:** Race conditions when two purchases happen simultaneously, causing lost count increments.
**Why it happens:** Read-modify-write (SELECT count, UPDATE count+1) is not atomic.
**How to avoid:** Use a PostgreSQL function with `UPDATE links SET unlock_count = unlock_count + 1 WHERE id = $1` to do an atomic increment. Create an RPC function for this.
**Warning signs:** unlock_count doesn't match the number of transactions.

## Code Examples

### Stripe Client Initialization
```typescript
// src/lib/stripe/client.ts
import Stripe from "stripe"

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  typescript: true,
})
```

### Supabase Signed URL for Download
```typescript
// Server-side only -- uses admin client to bypass RLS
import { supabaseAdmin } from "@/lib/supabase/admin"

export async function createDownloadUrl(storagePath: string): Promise<string> {
  const { data, error } = await supabaseAdmin.storage
    .from("files")
    .createSignedUrl(storagePath, 60) // 60-second expiry

  if (error) throw new Error(`Failed to create signed URL: ${error.message}`)
  return data.signedUrl
}
```

### Resend Email with React Template
```typescript
// src/lib/email/send-receipt.ts
import { Resend } from "resend"
import { PurchaseReceiptEmail } from "./templates/purchase-receipt"

const resend = new Resend(process.env.RESEND_API_KEY)

interface SendReceiptParams {
  buyerEmail: string
  linkTitle: string
  amountPaid: number
  currency: string
  downloadToken: string
}

export async function sendPurchaseReceipt(params: SendReceiptParams) {
  const downloadUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/download/${params.downloadToken}`

  const { error } = await resend.emails.send({
    from: "Unlockt <receipts@yourdomain.com>",
    to: params.buyerEmail,
    subject: `Your purchase: ${params.linkTitle}`,
    react: PurchaseReceiptEmail({
      linkTitle: params.linkTitle,
      amountPaid: params.amountPaid,
      currency: params.currency,
      downloadUrl,
    }),
  })

  if (error) throw error
}
```

### Download Token Route Handler
```typescript
// src/app/api/download/[token]/route.ts
import { NextResponse } from "next/server"
import { verifyDownloadToken } from "@/lib/download-token"
import { supabaseAdmin } from "@/lib/supabase/admin"

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params
  const payload = verifyDownloadToken(token)

  if (!payload) {
    return NextResponse.json(
      { error: "Invalid or expired download link" },
      { status: 403 }
    )
  }

  // Verify transaction exists and is not revoked
  const { data: transaction } = await supabaseAdmin
    .from("transactions")
    .select("link_id, status")
    .eq("id", payload.transactionId)
    .single()

  if (!transaction || transaction.status === "disputed") {
    return NextResponse.json(
      { error: "Download access revoked" },
      { status: 403 }
    )
  }

  // Get file path from link
  const { data: link } = await supabaseAdmin
    .from("links")
    .select("files(storage_path, name)")
    .eq("id", payload.linkId)
    .single()

  if (!link?.files) {
    return NextResponse.json({ error: "File not found" }, { status: 404 })
  }

  // Generate fresh signed URL (60s)
  const { data: signedUrl } = await supabaseAdmin.storage
    .from("files")
    .createSignedUrl(link.files.storage_path, 60)

  // Redirect to signed URL for download
  return NextResponse.redirect(signedUrl!.signedUrl)
}
```

### Chargeback Dispute Handler
```typescript
async function handleDisputeCreated(dispute: Stripe.Dispute) {
  // Get the payment intent from the dispute
  const paymentIntentId = typeof dispute.payment_intent === "string"
    ? dispute.payment_intent
    : dispute.payment_intent?.id

  if (!paymentIntentId) return

  // Find transaction by payment_intent_id
  const { data: transaction } = await supabaseAdmin
    .from("transactions")
    .update({ status: "disputed" })
    .eq("stripe_payment_intent_id", paymentIntentId)
    .select("id, link_id")
    .single()

  if (!transaction) {
    console.error("Dispute for unknown transaction, payment_intent:", paymentIntentId)
    return
  }

  // Decrement unlock_count
  await supabaseAdmin.rpc("decrement_unlock_count", {
    link_id_param: transaction.link_id,
  })

  // TODO: Notify creator (Phase 5 or later)
}
```

### Atomic Increment/Decrement RPC Functions (Migration)
```sql
-- Migration: add increment/decrement functions for unlock_count
CREATE OR REPLACE FUNCTION increment_unlock_count(link_id_param uuid)
RETURNS void
LANGUAGE sql
AS $$
  UPDATE public.links
  SET unlock_count = unlock_count + 1
  WHERE id = link_id_param;
$$;

CREATE OR REPLACE FUNCTION decrement_unlock_count(link_id_param uuid)
RETURNS void
LANGUAGE sql
AS $$
  UPDATE public.links
  SET unlock_count = GREATEST(unlock_count - 1, 0)
  WHERE id = link_id_param;
$$;
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Pages Router API routes with custom body parsing config | App Router route.ts with req.text() for raw body | Next.js 13+ (2023) | No need for `export const config = { api: { bodyParser: false } }` |
| @stripe/stripe-js for all Checkout | Hosted Checkout with server-side redirect | Still valid, but hosted is simpler | No frontend Stripe SDK needed for redirect-based Checkout |
| Manual payment_method_types listing | Dynamic payment methods (Dashboard-controlled) | 2024+ | Can omit payment_method_types to let Stripe auto-select, but explicit is better for TWINT control |
| jsonwebtoken for download tokens | Node.js built-in crypto (base64url encoding) | Node 16+ | No external dependency, base64url is natively supported |
| stripe v14-16 with callback patterns | stripe v20.x with TypeScript-first API | 2024-2025 | Full TypeScript types, promise-based API, API version 2026-02-25 |

**Deprecated/outdated:**
- `export const config = { api: { bodyParser: false } }` -- this was for Pages Router, not needed in App Router
- `@stripe/stripe-js` for hosted Checkout -- not needed when using server-side redirect to Stripe-hosted page
- Stripe `charges.create()` for one-off payments -- superseded by Checkout Sessions / Payment Intents

## Database Schema Changes Needed

The existing transactions table needs one additional column for dispute handling:

```sql
-- Add payment_intent_id for dispute linking
ALTER TABLE public.transactions
ADD COLUMN stripe_payment_intent_id text;

-- Index for dispute lookups
CREATE INDEX idx_transactions_payment_intent
ON public.transactions (stripe_payment_intent_id);

-- RLS policy: creators can read their own transactions
CREATE POLICY "Users can read own transactions"
ON public.transactions
FOR SELECT
TO authenticated
USING (
  link_id IN (
    SELECT id FROM public.links WHERE user_id = auth.uid()
  )
);
```

The `download_tokens` table is NOT needed because the HMAC token approach is stateless -- the token contains all necessary data (transaction ID, link ID, expiry) and is cryptographically signed. Verification happens by recomputing the HMAC, not by database lookup.

## TWINT-Specific Requirements

- TWINT is ONLY available for CHF currency -- conditionally add to payment_method_types
- TWINT maximum transaction amount: 5,000 CHF
- TWINT is single-use only (no subscriptions, no saved payment methods)
- Payment flow: mobile redirect or QR code scan (handled entirely by Stripe Checkout)
- TWINT must be enabled in the Stripe Dashboard payment methods settings
- Business location must be in Europe or UK

## Open Questions

1. **Cancel URL routing:**
   - What we know: The cancel_url needs the link's slug, but the checkout creation receives the link ID
   - What's unclear: Should we pass the slug to the checkout API, or look it up?
   - Recommendation: Pass the slug as a parameter to createCheckoutSession since it's already available on the link page

2. **Email domain for Resend:**
   - What we know: Resend requires a verified domain to send from (not @gmail.com etc.)
   - What's unclear: What domain will Unlockt use for transactional emails?
   - Recommendation: Use `onboarding@resend.dev` for development/testing, configure actual domain before production

3. **Download content-disposition:**
   - What we know: Supabase signed URLs serve the file, but the download filename may be the storage path UUID
   - What's unclear: Whether Supabase signed URLs preserve the original filename
   - Recommendation: Supabase createSignedUrl supports a `download` option to set the filename -- use `createSignedUrl(path, 60, { download: originalFileName })`

4. **Webhook endpoint URL for production:**
   - What we know: Local development uses Stripe CLI forwarding; production needs a public HTTPS endpoint registered in Stripe Dashboard
   - What's unclear: Whether to use Stripe Dashboard or API for webhook endpoint registration
   - Recommendation: Register via Stripe Dashboard for now; automate in deployment pipeline later

## Sources

### Primary (HIGH confidence)
- Stripe official docs: Checkout Sessions API (https://docs.stripe.com/api/checkout/sessions/create)
- Stripe official docs: TWINT payments (https://docs.stripe.com/payments/twint/accept-a-payment)
- Stripe official docs: Webhook signature verification (https://docs.stripe.com/webhooks/signature)
- Stripe official docs: Order fulfillment (https://docs.stripe.com/checkout/fulfillment)
- Stripe official docs: Dispute events (https://docs.stripe.com/api/events/types)
- Stripe official docs: Dispute object (https://docs.stripe.com/api/disputes/object)
- Supabase official docs: createSignedUrl (https://supabase.com/docs/reference/javascript/storage-from-createsignedurl)
- Supabase official docs: Storage access control (https://supabase.com/docs/guides/storage/security/access-control)
- Resend official docs: Send with Next.js (https://resend.com/docs/send-with-nextjs)
- npm: stripe v20.4.0 (https://www.npmjs.com/package/stripe)

### Secondary (MEDIUM confidence)
- Stripe + Next.js 15 Complete Guide 2025 (https://www.pedroalonso.net/blog/stripe-nextjs-complete-guide-2025/)
- Billing webhook race condition solution (https://excessivecoding.com/blog/billing-webhook-race-condition-solution-guide)
- Stripe collect-then-transfer guide (https://docs.stripe.com/connect/collect-then-transfer-guide)

### Tertiary (LOW confidence)
- Node.js crypto HMAC patterns for download tokens (community patterns, verified against Node.js official crypto docs)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All libraries verified via official docs and npm
- Architecture: HIGH - Patterns verified against Stripe official fulfillment guide and Next.js App Router conventions
- Pitfalls: HIGH - Most pitfalls documented in official Stripe docs (especially raw body parsing, race conditions, idempotency)
- TWINT: HIGH - Verified in Stripe official TWINT documentation
- Download tokens: MEDIUM - Pattern is sound (Node.js crypto built-ins) but custom implementation needs testing
- Email (Resend): HIGH - Verified via official Resend docs, straightforward integration

**Research date:** 2026-03-05
**Valid until:** 2026-04-05 (30 days - stable domain, Stripe SDK may release minor updates)
