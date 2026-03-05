# Architecture Research

**Domain:** File Monetization SaaS
**Researched:** 2026-03-05
**Confidence:** MEDIUM (based on training data for Next.js 14, Supabase, Stripe -- WebSearch/WebFetch unavailable for live verification)

## Standard Architecture

### System Overview

```
+------------------------------------------------------------------+
|                         VERCEL (Edge + Serverless)                |
|                                                                   |
|  +------------------------------------------------------------+  |
|  |                    NEXT.JS 14 APP ROUTER                    |  |
|  |                                                              |  |
|  |  /app                                                        |  |
|  |    /(marketing)        Landing page, public pages            |  |
|  |    /(auth)             Login, register, verify               |  |
|  |    /(creator)          Dashboard, upload, links, payouts     |  |
|  |    /[username]         Public creator profile                |  |
|  |    /l/[linkId]         Public payment link page              |  |
|  |    /l/[linkId]/success Post-payment download page            |  |
|  |    /api/               API routes (webhooks, signed URLs)    |  |
|  +------------------------------------------------------------+  |
|                                                                   |
+--------+----------------+----------------+-----------------------+
         |                |                |
         v                v                v
+----------------+ +-------------+ +------------------+
|   SUPABASE     | |   STRIPE    | |  SUPABASE        |
|   PostgreSQL   | |             | |  STORAGE          |
|   + Auth       | |  Checkout   | |  (private bucket) |
|   + RLS        | |  Connect    | |                    |
|                | |  Identity   | |  files/{userId}/   |
|  users         | |  Webhooks   | |    {fileId}/{name} |
|  files         | |             | |                    |
|  links         | +------+------+ +--------+-----------+
|  transactions  |        |                 |
|  payouts       |        |                 |
+----------------+        |                 |
                          v                 v
                   +-----------+    +--------------+
                   | Buyer's   |    | Signed URL   |
                   | Bank/Card |    | (60s expiry) |
                   +-----------+    +--------------+
```

### Request Flow Overview

```
CREATOR FLOW:
  Browser --> Next.js Server Components --> Supabase (Auth + DB)
  Browser --> Supabase Storage (direct upload, signed upload URL)
  Browser --> Stripe (Connect onboarding redirect)

BUYER FLOW:
  Browser --> /l/[linkId] (Server Component, fetches file info)
  Browser --> Stripe Checkout (redirect)
  Stripe  --> /api/webhooks/stripe (checkout.session.completed)
  Browser --> /l/[linkId]/success (Server Component, generates signed URL)

PAYOUT FLOW:
  Creator Dashboard --> /api/stripe/payout (triggers transfer)
  Stripe --> /api/webhooks/stripe (payout events)
```

### Component Responsibilities

| Component | Responsibility | Talks To | Auth Boundary |
|-----------|---------------|----------|---------------|
| **Next.js Server Components** | Page rendering, data fetching, SSR | Supabase (server client) | Server-side session check |
| **Next.js Route Handlers** | Webhooks, signed URL generation, Stripe session creation | Supabase (service role), Stripe API | Varies: webhooks are public + signature-verified; others require auth |
| **Supabase Auth** | User registration, login, session management | PostgreSQL (auth.users) | JWT-based, cookie sessions |
| **Supabase PostgreSQL + RLS** | All application data, row-level security | N/A (data layer) | RLS policies per table |
| **Supabase Storage** | File storage in private bucket | PostgreSQL (storage.objects) | RLS on bucket, signed URLs for downloads |
| **Stripe Checkout** | Payment collection from buyers | Stripe backend | Session-based, no Supabase auth needed |
| **Stripe Connect Express** | Creator payouts, onboarding | Stripe backend | Account links for onboarding |
| **Stripe Identity** | KYC verification for creators | Stripe backend | Verification sessions |
| **Stripe Webhooks** | Event notifications (payment success, payout status) | Next.js Route Handler | Signature verification |

## Recommended Project Structure

```
/src
  /app
    /(marketing)
      page.tsx                    # Landing page
      layout.tsx                  # Marketing layout (no sidebar)
      /pricing
        page.tsx
    /(auth)
      layout.tsx                  # Centered card layout
      /login
        page.tsx
      /register
        page.tsx
      /verify
        page.tsx                  # Email verification
    /(creator)
      layout.tsx                  # Dashboard layout (sidebar + nav)
      /dashboard
        page.tsx                  # Overview: earnings, sales, links
      /files
        page.tsx                  # File management list
        /upload
          page.tsx                # Upload flow
      /links
        page.tsx                  # Link management list
        /new
          page.tsx                # Create new link (select file, set price)
        /[linkId]
          page.tsx                # Link detail + stats
      /payouts
        page.tsx                  # Payout history + request payout
      /settings
        page.tsx                  # Profile, identity verification, Stripe Connect
    /[username]
      page.tsx                    # Public creator profile
    /l
      /[linkId]
        page.tsx                  # Public payment link page (preview + buy)
        /success
          page.tsx                # Post-payment download page
    /api
      /webhooks
        /stripe
          route.ts                # Stripe webhook handler (ALL events)
      /stripe
        /checkout
          route.ts                # Create Checkout session
        /connect
          /onboard
            route.ts              # Create Connect account link
          /refresh
            route.ts              # Refresh Connect onboarding link
        /identity
          route.ts                # Create Identity verification session
      /download
        /[transactionId]
          route.ts                # Generate signed download URL

  /components
    /ui                           # shadcn/ui primitives (button, input, card, etc.)
    /layout
      sidebar.tsx
      nav-bar.tsx
      footer.tsx
    /creator
      file-upload-form.tsx        # Direct upload to Supabase
      link-create-form.tsx
      earnings-chart.tsx
      payout-request-button.tsx
      connect-status.tsx          # Stripe Connect onboarding status
      identity-status.tsx         # Identity verification status
    /buyer
      file-preview-card.tsx       # Preview image + description + price
      download-button.tsx         # Signed URL download trigger
    /shared
      price-display.tsx           # Multi-currency price formatting
      file-type-icon.tsx
      loading-skeleton.tsx
      toast-provider.tsx

  /lib
    /supabase
      server.ts                   # createServerClient (for Server Components)
      client.ts                   # createBrowserClient (for Client Components)
      admin.ts                    # createClient with service_role key (for webhooks/API routes)
      queries.ts                  # All DB query functions
      storage.ts                  # Upload/download/signed URL helpers
    /stripe
      server.ts                   # Stripe instance (server-side only)
      checkout.ts                 # Checkout session creation
      connect.ts                  # Connect account management
      identity.ts                 # Identity verification
      webhooks.ts                 # Webhook event handlers (dispatched by type)
    /utils
      currency.ts                 # Currency formatting, conversion
      fees.ts                     # Fee calculation (buyer surcharge, creator deduction)
      validation.ts               # Shared Zod schemas
      errors.ts                   # Error handling utilities

  /types
    database.ts                   # Supabase generated types (supabase gen types)
    stripe.ts                     # Stripe-related type extensions
    index.ts                      # Shared app types

  /middleware.ts                  # Auth middleware: protect /(creator) routes

  /supabase
    /migrations                   # SQL migration files
      001_create_users.sql
      002_create_files.sql
      003_create_links.sql
      004_create_transactions.sql
      005_create_payouts.sql
      006_rls_policies.sql
```

### Key Structural Decisions

**Route Groups for Layout Isolation.** `(marketing)`, `(auth)`, and `(creator)` each get their own layout. The marketing layout has no sidebar. The auth layout centers content. The creator layout has the full dashboard chrome. This is a native App Router pattern -- route groups with parentheses share a layout without affecting the URL.

**Public routes outside groups.** `/[username]` and `/l/[linkId]` sit at the app root because they are public-facing and need clean URLs. The `[username]` route must be careful to not collide with other routes -- Next.js resolves static routes before dynamic ones, so this works as long as no static route conflicts.

**Single webhook endpoint.** `/api/webhooks/stripe/route.ts` handles ALL Stripe events and dispatches internally by `event.type`. This is intentional -- Stripe recommends a single endpoint, and it simplifies signature verification and secret management. The handler imports per-event functions from `/lib/stripe/webhooks.ts`.

**Separate API routes for Stripe operations.** Each Stripe operation (checkout creation, connect onboarding, identity verification) gets its own route handler. This keeps them independently testable and follows single-responsibility.

## Architectural Patterns

### Pattern 1: Server Components for Data, Client Components for Interaction

**What:** Default to React Server Components for pages. Only add `"use client"` for interactive UI (forms, buttons with onClick, state).

**Why:** Server Components can directly call Supabase with the server client, reducing client bundle size and eliminating unnecessary API routes for reads. The App Router makes this the default.

**Boundary rule:**
- Pages (`page.tsx`) are Server Components -- they fetch data
- Interactive widgets within pages are Client Components -- imported as children
- Forms use Client Components with React Hook Form + Server Actions or API routes for mutations

```typescript
// app/(creator)/dashboard/page.tsx -- SERVER COMPONENT
import { createServerClient } from "@/lib/supabase/server";
import { EarningsChart } from "@/components/creator/earnings-chart"; // client

export default async function DashboardPage() {
  const supabase = await createServerClient();
  const { data: stats } = await supabase
    .from("transactions")
    .select("amount, currency, created_at")
    .order("created_at", { ascending: false });

  return (
    <div>
      <h1>Dashboard</h1>
      {/* Pass serializable data to client component */}
      <EarningsChart data={stats ?? []} />
    </div>
  );
}
```

### Pattern 2: Supabase Client Tiers

**What:** Three Supabase client instances for different security contexts.

| Client | File | Used In | Auth Level |
|--------|------|---------|------------|
| `server` | `lib/supabase/server.ts` | Server Components, Server Actions | User's session (RLS applies) |
| `client` | `lib/supabase/client.ts` | Client Components | User's session (RLS applies) |
| `admin` | `lib/supabase/admin.ts` | API Route Handlers (webhooks) | Service role (bypasses RLS) |

**Why:** Webhooks arrive from Stripe with no user session. They must use the admin client (service_role key) to write transaction records. Regular user flows should always use the session-aware clients so RLS enforces data isolation.

**Critical rule:** The `admin` client must NEVER be imported in Client Components or exposed to the browser. It uses `SUPABASE_SERVICE_ROLE_KEY` which must remain server-side only.

```typescript
// lib/supabase/admin.ts
import { createClient } from "@supabase/supabase-js";
import { Database } from "@/types/database";

// ONLY for use in API route handlers / server-side code
// NEVER import this in components
export const supabaseAdmin = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);
```

### Pattern 3: Webhook Event Dispatcher

**What:** Single webhook route that verifies signature, then dispatches to per-event handler functions.

**Why:** Centralizes signature verification. Each event handler is a pure function that receives the verified event object, making them independently testable.

```typescript
// app/api/webhooks/stripe/route.ts
import { headers } from "next/headers";
import Stripe from "stripe";
import { stripe } from "@/lib/stripe/server";
import {
  handleCheckoutCompleted,
  handleAccountUpdated,
  handlePayoutPaid,
  handleIdentityVerified,
} from "@/lib/stripe/webhooks";

export async function POST(req: Request) {
  const body = await req.text(); // Must read as text, not json
  const headersList = await headers();
  const signature = headersList.get("stripe-signature")!;

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    return new Response("Webhook signature verification failed", { status: 400 });
  }

  // Dispatch by event type
  switch (event.type) {
    case "checkout.session.completed":
      await handleCheckoutCompleted(event);
      break;
    case "account.updated":
      await handleAccountUpdated(event);
      break;
    case "payout.paid":
      await handlePayoutPaid(event);
      break;
    case "identity.verification_session.verified":
      await handleIdentityVerified(event);
      break;
    default:
      console.log(`Unhandled event type: ${event.type}`);
  }

  // Always return 200 to Stripe -- even if handler fails
  // (handle errors internally, Stripe retries on non-2xx)
  return new Response("OK", { status: 200 });
}
```

**Important:** `req.text()` not `req.json()`. Stripe signature verification requires the raw body string. Parsing to JSON first changes the string and breaks verification. This is the single most common Stripe webhook bug.

### Pattern 4: Fee Calculation Centralization

**What:** All fee math lives in one module: `/lib/utils/fees.ts`. Both the frontend display and backend Checkout session creation use the same function.

**Why:** The fee structure (buyer pays base + 15%, creator receives base - 10%) is business-critical. Having it in two places guarantees drift.

```typescript
// lib/utils/fees.ts
export interface FeeBreakdown {
  basePrice: number;        // Creator's set price in smallest unit (cents/rappen)
  buyerTotal: number;       // What buyer pays
  buyerFee: number;         // 15% surcharge
  creatorPayout: number;    // What creator receives
  creatorFee: number;       // 10% deduction
  platformRevenue: number;  // What platform keeps
  stripeFee: number;        // Estimated Stripe processing fee
}

export function calculateFees(basePriceInCents: number): FeeBreakdown {
  const buyerFee = Math.round(basePriceInCents * 0.15);
  const buyerTotal = basePriceInCents + buyerFee;
  const creatorFee = Math.round(basePriceInCents * 0.10);
  const creatorPayout = basePriceInCents - creatorFee;
  // Stripe takes ~2.9% + 30c (varies by country/method)
  const stripeFee = Math.round(buyerTotal * 0.029) + 30;
  const platformRevenue = buyerTotal - creatorPayout - stripeFee;

  return {
    basePrice: basePriceInCents,
    buyerTotal,
    buyerFee,
    creatorPayout,
    creatorFee,
    platformRevenue,
    stripeFee,
  };
}
```

### Pattern 5: Middleware for Auth Gating

**What:** Next.js middleware intercepts all `/(creator)/*` requests and redirects unauthenticated users to login.

**Why:** Prevents unauthorized access at the edge before Server Components even execute. Supabase Auth provides middleware helpers for this.

```typescript
// middleware.ts
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();

  // Protect creator routes
  if (request.nextUrl.pathname.startsWith("/dashboard") ||
      request.nextUrl.pathname.startsWith("/files") ||
      request.nextUrl.pathname.startsWith("/links") ||
      request.nextUrl.pathname.startsWith("/payouts") ||
      request.nextUrl.pathname.startsWith("/settings")) {
    if (!user) {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      url.searchParams.set("redirect", request.nextUrl.pathname);
      return NextResponse.redirect(url);
    }
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|api/webhooks).*)",
  ],
};
```

**Note on matcher:** Exclude `_next`, static files, and `/api/webhooks` from middleware. Webhook routes must not be auth-gated -- they come from Stripe, not users.

## Data Flow

### Flow 1: Creator Uploads File (Direct to Supabase Storage)

This is the most architecturally significant flow because of the 500MB file size constraint and Vercel's serverless function limits.

```
1. Creator selects file in browser
2. Client Component calls Supabase Storage upload directly
   - supabase.storage.from('files').upload(path, file, { upsert: false })
   - Path: files/{userId}/{fileId}/{originalFileName}
   - The Supabase client uses the user's JWT for auth
   - RLS policy on storage.objects allows INSERT where auth.uid() = userId in path
3. On upload success, Client Component calls Server Action or API route
   - Inserts row into 'files' table (name, size, type, storage_path, user_id)
4. Creator sees file in their files list

CRITICAL: For files approaching 500MB, use resumable uploads:
   supabase.storage.from('files').uploadToSignedUrl(path, token, file)
   or the TUS protocol-based resumable upload.
   Standard upload has ~6MB default limit in many Supabase client versions.
   Resumable upload supports files up to 5GB.
```

**Why direct upload:** Vercel serverless functions have a ~4.5MB request body limit and 10-second timeout (on Hobby) / 60-second (on Pro). Routing a 500MB file through a serverless function is impossible. The file must go directly from browser to Supabase Storage.

**Resumable uploads (TUS protocol):** For large files, Supabase supports the TUS resumable upload protocol. This is the recommended approach for files over 6MB. The flow:

```typescript
// Client Component - large file upload
import { createBrowserClient } from "@/lib/supabase/client";

async function uploadLargeFile(file: File, userId: string, fileId: string) {
  const supabase = createBrowserClient();
  const filePath = `${userId}/${fileId}/${file.name}`;

  const { data, error } = await supabase.storage
    .from("files")
    .upload(filePath, file, {
      cacheControl: "3600",
      upsert: false,
      // For large files, the JS client automatically uses
      // resumable upload when file exceeds chunkSize threshold
    });

  if (error) throw error;
  return data.path;
}
```

**Storage bucket configuration:**
- Bucket name: `files`
- Public: `false` (private bucket -- no public URLs ever)
- File size limit: 524288000 bytes (500MB)
- Allowed MIME types: configure per business requirements (images, PDFs, videos, ZIPs)

**RLS policy on storage.objects:**
```sql
-- Creators can upload to their own folder
CREATE POLICY "creators_upload_own_files" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'files' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

-- Creators can read their own files (for management)
CREATE POLICY "creators_read_own_files" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'files' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

-- Creators can delete their own files
CREATE POLICY "creators_delete_own_files" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'files' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

-- Service role (admin client) can read any file (for signed URL generation)
-- This is handled automatically -- service_role bypasses RLS
```

### Flow 2: Payment --> Download (The Critical Path)

This is the most important flow in the entire system. It involves multiple services and must be reliable.

```
STEP 1: Buyer lands on /l/[linkId]
  - Server Component fetches link + file metadata from Supabase
  - Renders: preview image, file name, description, price with fees
  - "Buy Now" button (Client Component)

STEP 2: Buyer clicks "Buy Now"
  - Client sends POST to /api/stripe/checkout
  - Route handler:
    a. Fetches link data (price, currency, file info, creator's Stripe account ID)
    b. Validates link is active (not expired, not max-unlocked)
    c. Calculates fees using shared fees.ts
    d. Creates Stripe Checkout Session:
       {
         mode: "payment",
         line_items: [{
           price_data: {
             currency: link.currency,
             product_data: { name: file.name, description: link.description },
             unit_amount: buyerTotal,  // base + 15% fee
           },
           quantity: 1,
         }],
         payment_intent_data: {
           application_fee_amount: platformRevenue, // platform's cut
           transfer_data: {
             destination: creator.stripe_account_id, // creator gets the rest
           },
         },
         success_url: `${origin}/l/${linkId}/success?session_id={CHECKOUT_SESSION_ID}`,
         cancel_url: `${origin}/l/${linkId}`,
         metadata: {
           link_id: linkId,
           file_id: fileId,
           buyer_email: "collected_during_checkout",
         },
       }
    e. Returns checkout session URL
  - Client redirects to Stripe Checkout

STEP 3: Buyer completes payment on Stripe
  - Stripe sends checkout.session.completed webhook to /api/webhooks/stripe
  - Webhook handler (handleCheckoutCompleted):
    a. Extracts link_id, file_id from session.metadata
    b. Gets buyer email from session.customer_details.email
    c. Using admin client (bypasses RLS):
       - INSERT into transactions:
         { link_id, file_id, buyer_email, amount, currency, stripe_session_id,
           stripe_payment_intent_id, download_expires_at: now() + 48 hours }
       - UPDATE links: increment unlock_count
       - If link.max_unlocks reached, UPDATE link status to 'exhausted'
    d. Returns 200 to Stripe

STEP 4: Buyer redirected to /l/[linkId]/success?session_id=xxx
  - Server Component:
    a. Retrieves session_id from searchParams
    b. Looks up transaction by stripe_session_id
    c. If found and download_expires_at > now():
       - Renders download UI with "Download" button
    d. If not found (webhook hasn't arrived yet):
       - Renders "Processing payment..." with polling/retry
       - Client Component polls /api/download/[transactionId] every 2 seconds

STEP 5: Buyer clicks "Download"
  - Client sends GET to /api/download/[transactionId]
  - Route handler:
    a. Validates transaction exists and download_expires_at > now()
    b. Using admin client, creates signed URL:
       supabase.storage.from('files').createSignedUrl(storagePath, 60)
       (60 seconds expiry)
    c. Returns signed URL
  - Client redirects to signed URL (browser downloads file)
  - Signed URL expires after 60 seconds

RE-DOWNLOAD (within 48 hours):
  - Buyer returns to /l/[linkId]/success?session_id=xxx
  - Same flow as Step 4-5, as long as download_expires_at hasn't passed
  - Each click generates a FRESH signed URL (60s expiry each time)
```

**Race condition: Webhook vs. Redirect.** The buyer may arrive at the success page before the webhook has been processed. This is common -- Stripe redirects the buyer immediately after payment, but webhooks can take seconds. Solutions:

1. **Primary: Poll from client.** The success page Client Component polls for the transaction record every 2 seconds for up to 30 seconds.
2. **Fallback: Verify with Stripe directly.** If polling times out, the success page API route can call `stripe.checkout.sessions.retrieve(sessionId)` to verify payment status and create the transaction record inline (idempotent, using stripe_session_id as unique key).
3. **Never trust the redirect alone.** The session_id in the URL is not proof of payment. Always verify via webhook OR Stripe API.

### Flow 3: Stripe Connect Onboarding

```
1. Creator navigates to /settings, sees "Connect Bank Account" button
2. Client sends POST to /api/stripe/connect/onboard
3. Route handler:
   a. Checks if creator already has a Stripe Connect account ID in DB
   b. If not: stripe.accounts.create({ type: "express", ... })
      - Stores account ID in users table
   c. Creates account link:
      stripe.accountLinks.create({
        account: stripeAccountId,
        refresh_url: `${origin}/settings?stripe_refresh=true`,
        return_url: `${origin}/settings?stripe_onboard=complete`,
        type: "account_onboarding",
      })
   d. Returns account link URL
4. Client redirects creator to Stripe-hosted onboarding flow
5. Creator completes onboarding, redirected to /settings
6. Stripe sends account.updated webhook
7. Webhook handler checks account.details_submitted and account.charges_enabled
8. Updates user record: stripe_onboarding_complete = true
```

**Key architectural point:** The creator's `stripe_account_id` is stored in the `users` table. When creating Checkout sessions, the platform uses `transfer_data.destination` to route funds to the creator's connected account. The platform never holds funds -- Stripe splits the payment at the point of capture.

### Flow 4: Creator Requests Payout

```
NOTE: With Stripe Connect Express, payouts are largely automatic.
Once a connected account has charges_enabled = true, Stripe
automatically pays out to the creator's bank on a rolling schedule
(usually 2-day rolling for most countries).

The "request payout" feature in the creator dashboard is primarily
informational -- showing payout schedule and history.

For manual/instant payouts (if implemented):
1. Creator clicks "Request Payout" in dashboard
2. POST to /api/stripe/payout
3. Route handler calls stripe.payouts.create() on the connected account
4. Records payout request in payouts table
5. Stripe sends payout.paid webhook when funds settle
6. Webhook handler updates payout status in DB
```

### State Management

**Server-first, minimal client state.** With Next.js 14 App Router, most data is fetched in Server Components. Client state is limited to:

- **Form state:** React Hook Form manages form inputs (file upload, link creation)
- **UI state:** Modal open/close, sidebar collapse, tab selection
- **Optimistic updates:** After mutations, use `router.refresh()` to revalidate Server Components
- **No global state store needed.** No Redux, no Zustand. Supabase + Server Components handle it.

```
Data fetching hierarchy:
  Server Components --> Supabase server client (with user session)
  Client Components --> Only for mutations (forms, buttons)
  API Routes       --> Supabase admin client (webhooks), Stripe API

Mutation patterns:
  Option A: Server Actions (preferred for form submissions)
    Client Component --> "use server" action --> Supabase write --> revalidatePath()

  Option B: API Route Handlers (for Stripe operations)
    Client Component --> fetch("/api/stripe/...") --> Stripe API --> Response

  Option C: Direct Supabase (for storage uploads)
    Client Component --> supabase.storage.from().upload() --> Storage
```

## Database Schema Architecture

```sql
-- users: extends Supabase auth.users
CREATE TABLE public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE NOT NULL,
  display_name TEXT,
  avatar_url TEXT,
  bio TEXT,
  social_links JSONB DEFAULT '{}',
  stripe_account_id TEXT,                    -- Stripe Connect account
  stripe_onboarding_complete BOOLEAN DEFAULT FALSE,
  identity_verified BOOLEAN DEFAULT FALSE,    -- Stripe Identity
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- files: uploaded files metadata
CREATE TABLE public.files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  original_name TEXT NOT NULL,
  size_bytes BIGINT NOT NULL,
  mime_type TEXT NOT NULL,
  storage_path TEXT NOT NULL,                 -- path in Supabase Storage
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- links: payment links for files
CREATE TABLE public.links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  file_id UUID NOT NULL REFERENCES public.files(id) ON DELETE CASCADE,
  slug TEXT UNIQUE NOT NULL,                  -- URL-friendly identifier
  price_amount INTEGER NOT NULL,              -- in smallest currency unit
  currency TEXT NOT NULL CHECK (currency IN ('chf', 'eur', 'usd', 'gbp')),
  description TEXT,
  preview_image_url TEXT,                     -- optional preview
  max_unlocks INTEGER,                        -- NULL = unlimited
  unlock_count INTEGER DEFAULT 0,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'paused', 'exhausted')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- transactions: completed purchases
CREATE TABLE public.transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  link_id UUID NOT NULL REFERENCES public.links(id),
  file_id UUID NOT NULL REFERENCES public.files(id),
  buyer_email TEXT NOT NULL,
  amount INTEGER NOT NULL,                    -- buyer total (base + fee)
  creator_amount INTEGER NOT NULL,            -- what creator receives
  platform_amount INTEGER NOT NULL,           -- what platform keeps
  currency TEXT NOT NULL,
  stripe_session_id TEXT UNIQUE NOT NULL,      -- idempotency key
  stripe_payment_intent_id TEXT,
  download_expires_at TIMESTAMPTZ NOT NULL,    -- 48 hours from purchase
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- payouts: payout tracking (informational, Stripe is source of truth)
CREATE TABLE public.payouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id),
  amount INTEGER NOT NULL,
  currency TEXT NOT NULL,
  stripe_payout_id TEXT UNIQUE,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_transit', 'paid', 'failed')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**RLS Policy Architecture:**

```sql
-- Users: can read own row, anyone can read public profile fields
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_read_own" ON public.users
  FOR SELECT TO authenticated USING (id = auth.uid());

CREATE POLICY "users_read_public_profile" ON public.users
  FOR SELECT TO anon
  USING (true);  -- Public profiles are readable, but only expose safe columns via queries

CREATE POLICY "users_update_own" ON public.users
  FOR UPDATE TO authenticated USING (id = auth.uid());

-- Files: creators see only their own
ALTER TABLE public.files ENABLE ROW LEVEL SECURITY;

CREATE POLICY "files_crud_own" ON public.files
  FOR ALL TO authenticated USING (user_id = auth.uid());

-- Links: creators manage their own; anyone can read active links
ALTER TABLE public.links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "links_manage_own" ON public.links
  FOR ALL TO authenticated USING (user_id = auth.uid());

CREATE POLICY "links_read_active" ON public.links
  FOR SELECT TO anon
  USING (status = 'active');

-- Transactions: creators see transactions for their links
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "transactions_read_own" ON public.transactions
  FOR SELECT TO authenticated
  USING (
    link_id IN (SELECT id FROM public.links WHERE user_id = auth.uid())
  );
-- Note: INSERT on transactions done via service_role (webhooks), not through RLS
```

## Scaling Considerations

| Concern | At 100 Creators | At 10K Creators | At 100K Creators |
|---------|----------------|-----------------|-------------------|
| **Storage** | ~50GB, single Supabase bucket fine | ~5TB, monitor Supabase Storage limits | May need S3 directly or CDN for signed URLs |
| **Database** | Supabase free/pro tier sufficient | Add indexes on transactions(link_id), links(user_id, status) | Consider read replicas, partitioning transactions by date |
| **Webhooks** | Low volume, single serverless function | Hundreds/day, still fine on Vercel serverless | Thousands/day, consider webhook queue (but Vercel handles concurrency) |
| **Signed URLs** | Negligible | Monitor Supabase API rate limits | Consider caching or pre-generating URLs |
| **Stripe Connect** | Manual review possible | Automated onboarding essential (already is with Express) | Platform-level Stripe relationship matters |
| **File Uploads** | Direct to Supabase, no issues | Monitor Supabase concurrent upload limits | May need upload queue or chunking UI |

**Key scaling insight:** The architecture bottleneck will be Supabase Storage, not the app code. Supabase Storage is backed by S3 (on hosted Supabase), so raw storage scales well. The concern is API rate limits for signed URL generation and concurrent uploads. At 100K creators, consider:
- Caching signed URLs in a short-lived Redis/KV store (but 60s expiry makes this marginal)
- Moving to direct S3 with presigned URLs if Supabase becomes a bottleneck

## Anti-Patterns to Avoid

### Anti-Pattern 1: Routing File Uploads Through Serverless Functions
**What:** Sending file upload data through Next.js API routes instead of direct to Supabase.
**Why bad:** Vercel serverless functions have ~4.5MB body limit (hobby) and 10-60 second timeouts. A 500MB file will fail instantly.
**Instead:** Upload directly from browser to Supabase Storage using the client SDK. The Supabase client handles auth via the user's JWT.

### Anti-Pattern 2: Trusting the Success Redirect as Payment Proof
**What:** Treating the buyer's arrival at `/success?session_id=xxx` as proof of payment and immediately granting access.
**Why bad:** Anyone can craft a URL with a session_id parameter. The redirect happens before the webhook confirms payment. The session_id alone does not prove payment succeeded.
**Instead:** Always verify payment through webhook (primary) or Stripe API call (fallback). The success page should poll for the transaction record or verify the session status server-side.

### Anti-Pattern 3: Storing Stripe Secrets in NEXT_PUBLIC_ Environment Variables
**What:** Putting `STRIPE_SECRET_KEY` or `SUPABASE_SERVICE_ROLE_KEY` in variables prefixed with `NEXT_PUBLIC_`.
**Why bad:** `NEXT_PUBLIC_` variables are bundled into client-side JavaScript. This exposes secrets to every visitor.
**Instead:** Only `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` should be public. All other keys stay server-side only.

### Anti-Pattern 4: Using a Single Supabase Client Everywhere
**What:** Using the service_role admin client in Server Components because "it's simpler."
**Why bad:** Bypasses RLS entirely. One bug and any user can see any other user's data. You lose the security benefit of Supabase's row-level security.
**Instead:** Use the session-aware server client in Server Components (RLS applies). Reserve admin client strictly for webhooks and background operations.

### Anti-Pattern 5: Putting Fee Calculation Only on the Frontend
**What:** Calculating the buyer's total and platform fee only in the React component displaying the price.
**Why bad:** Anyone can modify the frontend. If the actual Checkout session is created with different amounts, you have a mismatch.
**Instead:** Centralize fee calculation in a shared module (`lib/utils/fees.ts`). Use it in both the display component AND the Checkout session creation route handler. The server-side calculation is the source of truth.

### Anti-Pattern 6: Generating Signed URLs in Server Components
**What:** Creating signed download URLs during page render in Server Components and embedding them in HTML.
**Why bad:** The signed URL (60s expiry) is generated at render time. If the page is cached, statically generated, or the user waits before clicking, the URL will have expired. Also exposes the URL in page source.
**Instead:** Generate signed URLs on-demand via an API route (`/api/download/[transactionId]`). The client calls this endpoint only when the user clicks "Download," ensuring a fresh 60-second window.

### Anti-Pattern 7: Not Making Webhook Handlers Idempotent
**What:** Inserting a transaction record on every webhook call without checking for duplicates.
**Why bad:** Stripe retries webhooks on timeout or non-2xx response. If the handler is not idempotent, you get duplicate transaction records, double-counted revenue, and confused users.
**Instead:** Use `stripe_session_id` as a UNIQUE constraint on the transactions table. Use `INSERT ... ON CONFLICT DO NOTHING` or check before inserting. The handler should be safe to call multiple times with the same event.

## Integration Points

### External Services

| Service | Integration Method | Auth Mechanism | Failure Mode |
|---------|-------------------|----------------|--------------|
| **Supabase Auth** | `@supabase/ssr` (server), `@supabase/supabase-js` (client) | JWT cookies, refreshed via middleware | User logged out, redirect to login |
| **Supabase DB** | Supabase client `.from().select/insert/update/delete()` | RLS via JWT (user) or service_role (admin) | Query error, show toast |
| **Supabase Storage** | Supabase client `.storage.from().upload/createSignedUrl()` | RLS via JWT (upload) or service_role (signed URLs) | Upload error, retry UI |
| **Stripe Checkout** | `stripe.checkout.sessions.create()` from route handler | `STRIPE_SECRET_KEY` | Session creation failure, show error |
| **Stripe Connect** | `stripe.accounts.create()`, `stripe.accountLinks.create()` | `STRIPE_SECRET_KEY` | Onboarding failure, retry link |
| **Stripe Identity** | `stripe.identity.verificationSessions.create()` | `STRIPE_SECRET_KEY` | Verification failure, manual review |
| **Stripe Webhooks** | POST to `/api/webhooks/stripe` | Webhook signature verification | Return 200, log error, Stripe retries |

### Internal Boundaries

```
BOUNDARY 1: Auth Boundary (Middleware)
  /(creator)/* routes require authenticated session
  /[username] and /l/[linkId] are public
  /api/webhooks/* are public + signature-verified

BOUNDARY 2: Data Access Boundary (Supabase Client Tier)
  Server Components --> server client (user session, RLS)
  Client Components --> browser client (user session, RLS)
  API Route Handlers --> admin client (service_role, bypasses RLS)
  NEVER cross these boundaries.

BOUNDARY 3: Money Boundary (Stripe)
  All money operations go through Stripe API.
  Platform NEVER stores card numbers.
  Platform NEVER holds funds (Stripe Connect handles this).
  Fee calculation is deterministic and server-verified.

BOUNDARY 4: File Access Boundary (Supabase Storage)
  Files NEVER served via public URL.
  All access via signed URLs with 60s expiry.
  Signed URLs generated ONLY after payment verification.
  Upload access controlled by Storage RLS + user JWT.
```

### Environment Variables Architecture

```
# PUBLIC (bundled into client JS -- safe to expose)
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
NEXT_PUBLIC_APP_URL=https://unlockt.com

# SECRET (server-side only -- NEVER prefix with NEXT_PUBLIC_)
SUPABASE_SERVICE_ROLE_KEY=eyJ...
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

## Build Order Implications

The architecture creates natural dependency chains that inform phase ordering:

```
LAYER 0: Foundation (no dependencies)
  - Next.js project setup + TypeScript config
  - Supabase project + database schema + RLS policies
  - Stripe account setup (platform account)
  - Tailwind + shadcn/ui setup
  - Environment variables
  - Supabase client tier setup (server, client, admin)

LAYER 1: Auth (depends on Layer 0)
  - Supabase Auth integration
  - Middleware for route protection
  - Login/register pages
  - User profile in public.users (created via trigger on auth.users insert)

LAYER 2: File Management (depends on Layer 1)
  - Supabase Storage bucket creation + RLS
  - File upload component (direct to Supabase)
  - Files table + CRUD
  - File list in creator dashboard

LAYER 3: Payment Links (depends on Layer 2)
  - Links table + CRUD
  - Link creation form (select file, set price, currency)
  - Public link page (/l/[linkId]) with preview
  - Fee calculation module

LAYER 4: Payments (depends on Layer 3)
  - Stripe Checkout session creation
  - Webhook endpoint + signature verification
  - Transaction recording (handleCheckoutCompleted)
  - Success page with download
  - Signed URL generation for downloads
  - 48-hour re-download window

LAYER 5: Stripe Connect (depends on Layer 1, integrates with Layer 4)
  - Connect Express account creation
  - Onboarding flow
  - application_fee_amount + transfer_data in Checkout sessions
  - Payout tracking

LAYER 6: Identity + Polish (depends on Layer 5)
  - Stripe Identity verification
  - Creator public profile (/[username])
  - Dashboard stats + earnings
  - Landing page
```

**Critical path:** Layers 0-4 form the critical path for an MVP. A creator must be able to upload, create a link, accept payment, and deliver the file. Connect (Layer 5) can be deferred slightly by having the platform collect all funds initially and adding Connect later -- but this changes the financial architecture and may have FINMA implications for a Swiss company, so it is better to build Connect early.

**Recommended phase structure:**
1. **Foundation + Auth** (Layers 0-1): Get the project running with login
2. **Upload + Links** (Layers 2-3): Core creator workflow minus payments
3. **Payments + Download** (Layer 4): The money flow
4. **Connect + Payouts** (Layer 5): Creator payouts
5. **Identity + Profiles + Polish** (Layer 6): KYC, public pages, dashboard

## Sources

- Next.js 14 App Router documentation (training data, May 2025 -- MEDIUM confidence for API specifics)
- Supabase Storage documentation (training data -- MEDIUM confidence, verify Storage RLS syntax and resumable upload API)
- Supabase Auth SSR documentation including `@supabase/ssr` (training data -- MEDIUM confidence)
- Stripe Checkout, Connect Express, and Webhooks documentation (training data -- HIGH confidence for core patterns, these APIs are stable)
- Stripe Connect destination charges model (training data -- HIGH confidence, well-established pattern)

**Verification needed:**
- Supabase Storage resumable upload API: confirm exact client API for TUS protocol uploads (may have changed)
- `@supabase/ssr` middleware pattern: confirm cookie handling API matches latest version
- Next.js 14 `headers()` in route handlers: confirm if `await headers()` or just `headers()` in current version
- Stripe Connect Express: confirm `application_fee_amount` + `transfer_data` still the recommended pattern for destination charges

---
*Architecture research for: File Monetization SaaS (Unlockt)*
*Researched: 2026-03-05*
*Confidence: MEDIUM -- All findings based on training data (WebSearch/WebFetch unavailable). Core patterns are stable and well-established, but API specifics for Supabase SSR and Storage should be verified against current docs before implementation.*
