# Pitfalls Research

**Domain:** File Monetization SaaS (Stripe Connect Express + Supabase Storage + Next.js)
**Researched:** 2026-03-05
**Confidence:** MEDIUM (based on training data for Stripe/Supabase APIs; no live doc verification available -- flag for validation against current docs before implementation)

---

## Critical Pitfalls

These cause data loss, revenue loss, or require rewrites if not addressed early.

---

### Pitfall 1: Webhook-Gated Download Access Without Idempotency

**What goes wrong:** The entire business model depends on: buyer pays via Stripe Checkout -> webhook fires `checkout.session.completed` -> system grants download access. If the webhook handler is not idempotent, duplicate webhook deliveries (Stripe retries on 5xx, network issues, or slow responses) create duplicate purchase records, double-counted revenue, or worse -- granting access without payment if you rely on webhook order rather than payment status verification.

**Why it happens:** Developers treat webhooks as reliable single-delivery events. Stripe explicitly does NOT guarantee exactly-once delivery. They guarantee at-least-once. Webhook endpoints that return 5xx or timeout (Vercel serverless has a 10s default on hobby, 60s on pro) trigger retries. Stripe retries up to ~15 times over 3 days with exponential backoff.

**How to avoid:**
1. Store the Stripe `checkout.session.id` or `payment_intent.id` as a unique key in your purchases table (add a UNIQUE constraint on `stripe_session_id`).
2. Use an upsert pattern: `INSERT ... ON CONFLICT (stripe_session_id) DO NOTHING`. If the row already exists, the webhook is a duplicate -- return 200 immediately.
3. Always verify payment status inside the webhook handler by calling `stripe.checkout.sessions.retrieve(sessionId)` and checking `payment_status === 'paid'` before granting access. Never trust the webhook payload alone for the payment state.
4. Return 200 to Stripe as fast as possible. Do heavy processing (email notifications, analytics) asynchronously via a queue or background job, not in the webhook handler itself.
5. On Vercel, set the webhook route's `maxDuration` to at least 30s if on Pro plan.

**Warning signs:** Duplicate rows in purchases table. Revenue dashboard showing inflated numbers. Buyers reporting they got two confirmation emails.

**Phase to address:** Phase 1 (payment flow). This is foundational -- get it wrong and every subsequent feature built on purchase data is broken.

---

### Pitfall 2: Signed URL Leakage and Download Link Sharing

**What goes wrong:** After payment, you generate a Supabase Storage signed URL with 60s expiry. The buyer copies the URL and shares it. Even with 60s expiry, the file downloads immediately on click -- so anyone who gets the URL within 60s gets the file free. Worse: if you accidentally generate long-lived signed URLs, the file is effectively public.

**Why it happens:** Signed URLs are bearer tokens. Anyone with the URL can access the file. The 60s window feels short but is plenty of time to paste into a group chat. Additionally, browser download managers and extensions can capture and redistribute URLs.

**How to avoid:**
1. 60s expiry is correct -- do NOT increase it. Generate the signed URL on demand only when the buyer clicks "Download" on the post-purchase page.
2. Implement a download token system: after payment confirmation, generate a one-time-use or limited-use token stored in your database. The download endpoint validates the token, checks it hasn't been used/expired, then generates a fresh signed URL and redirects. Mark the token as used.
3. For the 48-hour re-download window: store purchase records with `purchased_at` timestamp. Each time the buyer requests a download, verify `NOW() - purchased_at < 48 hours` AND generate a fresh signed URL. Do not pre-generate and store signed URLs.
4. Rate-limit download requests per purchase (e.g., max 5 downloads per purchase within the 48-hour window). This prevents automated scraping via the download endpoint.
5. Never return the signed URL in JSON responses. Instead, have the API route generate the signed URL and return a 302 redirect to it. This way the URL never appears in browser DevTools network tab as a copyable string (it appears as a redirect location which is harder to extract).

**Warning signs:** High download counts relative to purchase counts. Single purchases generating dozens of download requests. Files appearing on piracy sites.

**Phase to address:** Phase 1 (file delivery). The download endpoint design must be correct from day one. Retrofitting token-based access is painful.

---

### Pitfall 3: Stripe Connect Express Account State Machine Complexity

**What goes wrong:** Express accounts go through multiple states: created -> onboarding started -> details submitted -> charges enabled -> payouts enabled. Developers assume a linear happy path and don't handle: incomplete onboarding (user abandons Stripe's hosted flow), accounts that have `charges_enabled: true` but `payouts_enabled: false` (can accept payments but can't receive payouts), accounts that get disabled due to Stripe risk review, and accounts requiring additional verification (KYC changes).

**Why it happens:** The Stripe Connect onboarding flow is hosted by Stripe (for Express accounts), so developers feel they don't need to manage state. But Stripe sends you back to your `return_url` whether onboarding is complete or not. The user might close the tab, fail verification, or need additional documents.

**How to avoid:**
1. Store account state in your database: `stripe_account_id`, `onboarding_complete`, `charges_enabled`, `payouts_enabled`, `details_submitted`. Update via webhooks.
2. Listen to these webhook events: `account.updated` (primary -- fires whenever account state changes), `account.application.authorized`, `account.application.deauthorized`.
3. On `return_url` redirect, always re-fetch the account via `stripe.accounts.retrieve(accountId)` and check `charges_enabled` and `details_submitted`. Do NOT assume onboarding succeeded just because the user returned to your site.
4. Build a "complete your setup" banner/flow for creators whose accounts are incomplete. Generate a new Account Link (`stripe.accountLinks.create`) to resume onboarding.
5. Block payment link creation for creators without `charges_enabled: true`. Block payout requests without `payouts_enabled: true`. Show clear status indicators on the creator dashboard.
6. Handle the `account.application.deauthorized` event -- the creator disconnected your platform from their Stripe account. Disable their payment links immediately.

**Warning signs:** Creators complaining they can't receive payouts despite completing onboarding. Payment links created by creators with incomplete accounts (buyers pay but money has nowhere to go). Abandoned onboarding funnels with no re-engagement path.

**Phase to address:** Phase 1 (creator onboarding). This is the entire creator experience foundation.

---

### Pitfall 4: Destination Charges Currency Mismatch Causing Silent Failures

**What goes wrong:** With Stripe Connect destination charges, you create a Checkout Session with an `application_fee_amount` and transfer the rest to the connected account. If the connected account's default currency doesn't match the Checkout Session currency, Stripe performs automatic currency conversion with their FX spread (currently ~2%). This means a creator who sets their link to USD but has a EUR-denominated Stripe account loses ~2% on top of your platform fees -- and neither you nor the creator explicitly consented to this conversion. Worse: if the connected account hasn't enabled the payment currency, the charge can fail entirely.

**Why it happens:** Stripe Connect Express accounts are created with a default currency based on the creator's country. Swiss creators get CHF, German creators get EUR, US creators get USD. Your platform lets creators set any of CHF/EUR/USD/GBP per link, but doesn't check whether their Stripe account can receive that currency without conversion.

**How to avoid:**
1. When creating payment links, show the creator what their Stripe account's default currency is. If the link currency differs, show a warning: "Your Stripe account uses EUR. Setting price in USD means Stripe will convert at their exchange rate (~2% fee)."
2. For destination charges, set `transfer_data[amount]` explicitly rather than relying on `application_fee_amount` alone. This gives you precise control over what the connected account receives.
3. Consider using `on_behalf_of` in the Checkout Session to make the charge appear on the connected account's statement. This also affects which currency is used.
4. Store the creator's Stripe account default currency when they complete onboarding (`stripe.accounts.retrieve` -> `default_currency`). Use this for UI guidance.
5. For your fee calculation: base your 10% creator deduction and 15% buyer surcharge calculations BEFORE any FX conversion. Document clearly that Stripe FX fees are separate from platform fees.

**Warning signs:** Creator complaints about receiving less than expected. Discrepancies between displayed earnings and actual Stripe payouts. Chargebacks citing "amount different from advertised."

**Phase to address:** Phase 1 (payment flow) for correct charge creation. Phase 2 (dashboard) for currency transparency.

---

### Pitfall 5: Platform Holding Funds Accidentally (FINMA Risk)

**What goes wrong:** The PROJECT.md explicitly states "Stripe holds all funds -- platform never holds money directly" to avoid FINMA licensing. But this is easy to violate accidentally. If you use `transfer_data[destination]` charges (destination charges), Stripe first collects the full amount into YOUR platform's Stripe balance, THEN transfers to the connected account. During that window (which can be days if there's a dispute), your platform's Stripe account technically holds the funds. If Swiss regulators interpret this as fund-holding, you may need a financial intermediary license.

**Why it happens:** Destination charges are the simplest Connect integration, and Stripe's docs recommend them for platforms. But the flow is: buyer pays -> funds land in platform account -> platform transfers to connected account. Stripe's "automatic transfers" obscure this, but the platform balance sheet shows the funds.

**How to avoid:**
1. Use `payment_intent_data.transfer_data` with `destination` in Checkout Sessions. This is still destination charges, but the key is to NOT enable manual payouts or hold funds intentionally.
2. Consider whether "Separate Charges and Transfers" or "Direct Charges" better fit the FINMA avoidance goal. Direct charges (where the charge is created directly on the connected account) mean funds go straight to the creator's Stripe account, and you collect your fee via `application_fee_amount`. The platform never touches the principal. This is the safest model for FINMA compliance.
3. **Strong recommendation: use Direct Charges**, not Destination Charges, for this Swiss platform. With direct charges: the buyer pays the connected account directly. Stripe deducts your `application_fee_amount` and deposits it in your platform account. The principal funds NEVER enter your platform's Stripe balance.
4. Consult a Swiss fintech lawyer specifically about the Stripe Connect charge model you choose. This is not something to guess on.
5. Document your charge flow explicitly for compliance: "At no point does the platform's Stripe account balance include buyer payment principal. Only application fees (our revenue) enter the platform account."

**Warning signs:** Your Stripe platform dashboard showing a large balance. Funds sitting in your platform account between charge and transfer. Any manual transfer logic.

**Phase to address:** Phase 0 / Pre-development. This architectural decision affects every payment-related feature. Choose Direct Charges vs Destination Charges BEFORE writing any Stripe code.

---

### Pitfall 6: Supabase Storage Upload Failures on Large Files (500MB)

**What goes wrong:** Uploading 500MB files directly from the browser to Supabase Storage sounds straightforward, but: (a) Supabase Storage has a default upload size limit that must be configured (self-hosted: configurable; hosted: check current plan limits -- Pro plan historically allowed up to 5GB per file), (b) browser uploads of 500MB over flaky connections fail silently or timeout, (c) Supabase Storage standard upload (`storage.from('bucket').upload()`) loads the entire file into memory before uploading, which crashes mobile browsers, and (d) Vercel serverless functions cannot proxy 500MB uploads (10MB body limit on hobby, 4.5MB on streaming).

**Why it happens:** Most developers test with small files (< 10MB). Everything works. Then a creator tries to upload a 300MB video and the upload silently fails, or the browser tab crashes on mobile.

**How to avoid:**
1. Use Supabase Storage resumable uploads (TUS protocol). Supabase supports the TUS resumable upload protocol, which breaks the file into chunks, uploads them sequentially, and can resume after interruption. This is essential for anything over ~50MB.
2. Upload directly from the browser to Supabase Storage -- never through a Vercel serverless function. Create a signed upload URL server-side, return it to the client, and upload directly.
3. Implement upload progress UI: progress bar, estimated time, cancel button. Without this, users think the app is frozen on large uploads.
4. Set explicit file size validation client-side BEFORE upload begins. Check `file.size <= 500 * 1024 * 1024`. Show a clear error if exceeded.
5. Implement upload retry logic client-side. If a chunk fails, retry that chunk (TUS handles this automatically).
6. Verify the Supabase project's file size limit in the dashboard (Settings -> Storage). The default may be lower than 500MB.
7. After upload completes, verify the file exists and matches expected size by querying Supabase Storage metadata before marking the upload as complete in your database.

**Warning signs:** Creators reporting "upload stuck at X%." Failed uploads with no error message. Files in storage that are 0 bytes or truncated. Mobile users unable to upload.

**Phase to address:** Phase 1 (file upload). This must be robust from day one -- it's the first thing creators do.

---

### Pitfall 7: Checkout Session Expiry and Orphaned Purchase Attempts

**What goes wrong:** Stripe Checkout Sessions expire after 24 hours by default (configurable, min 30 min, max 24 hours). If a buyer opens a payment link, clicks pay, gets distracted, and comes back later, the session has expired. The buyer sees a Stripe error page. They may try again, creating a new session. But if your system created a "pending purchase" record tied to the first session, you now have orphaned records. Multiply by thousands of buyers and your purchase table is full of ghosts.

**Why it happens:** Developers create purchase records when generating the Checkout Session (optimistic creation) to have a record to update when the webhook fires. But most Checkout Sessions are never completed -- conversion rates are typically 30-60%.

**How to avoid:**
1. Do NOT create purchase records when creating Checkout Sessions. Only create purchase records inside the `checkout.session.completed` webhook handler. This means you never have orphaned records.
2. Pass all needed metadata in the Checkout Session's `metadata` field: `file_id`, `creator_id`, `buyer_email`, etc. When the webhook fires, you have everything needed to create the purchase record.
3. If you want to track conversion analytics, use a separate `checkout_attempts` table that you explicitly clean up with a cron job (delete attempts older than 48 hours with no matching purchase).
4. Set `expires_at` on Checkout Sessions to something reasonable for impulse purchases (1-2 hours, not 24). File purchases are impulse buys -- if they don't pay in 2 hours, they're not going to.
5. Listen to `checkout.session.expired` webhook to clean up any tracking records.

**Warning signs:** Growing count of "pending" purchases that never complete. Database bloat. Inaccurate conversion metrics.

**Phase to address:** Phase 1 (payment flow).

---

### Pitfall 8: Application Fee Calculation Rounding Errors

**What goes wrong:** Your fee structure is: buyer pays `base_price + 15%`, creator receives `base_price - 10%`. Stripe's `application_fee_amount` must be in the smallest currency unit (cents/centimes) and must be an integer. With multi-currency support, rounding errors accumulate. Example: a file priced at CHF 7.00. Buyer pays CHF 8.05 (7.00 * 1.15). Creator should receive CHF 6.30 (7.00 * 0.90). Platform fee: CHF 1.75 (8.05 - 6.30). In cents: 175. But what about CHF 3.33? Buyer: 3.33 * 1.15 = 3.8295 -> rounded to 3.83. Creator: 3.33 * 0.90 = 2.997 -> rounded to 3.00. Platform: 3.83 - 3.00 = 0.83. But 3.33 * 0.25 = 0.8325. You're off by half a cent. Over thousands of transactions, these rounding errors either cost you money or shortchange creators.

**Why it happens:** Floating-point arithmetic in JavaScript. Using `Math.round()` inconsistently. Not having a single canonical fee calculation function. Different rounding in display vs actual charge.

**How to avoid:**
1. All monetary calculations in CENTS (integers). Never use floating-point for money. Price stored as integer cents in the database.
2. Create ONE canonical fee calculation function used everywhere:
   ```typescript
   function calculateFees(basePriceCents: number): {
     buyerTotalCents: number;
     creatorPayoutCents: number;
     platformFeeCents: number;
   }
   ```
3. Define rounding rules explicitly and consistently: always round the buyer total UP (in their favor = your favor), always round the creator payout DOWN (conservative for platform). This ensures the platform never loses money on rounding.
4. The `application_fee_amount` in Stripe is what goes to YOUR platform. Calculate it as: `buyerTotalCents - creatorPayoutCents`. This captures the full 25% minus rounding.
5. Write unit tests for fee calculation with every currency and edge-case prices (0.01, 0.99, 1.00, 3.33, 999.99).
6. TWINT has minimum transaction amounts (historically CHF 0.10). Ensure your minimum price covers this.

**Warning signs:** Creators reporting payout amounts that don't match dashboard. Your Stripe balance not matching expected platform revenue. Off-by-one-cent errors in receipts.

**Phase to address:** Phase 1 (payment flow). The fee function must be correct and centralized before any charge is created.

---

### Pitfall 9: TWINT Payment Method Limitations via Stripe

**What goes wrong:** TWINT support via Stripe Checkout is limited compared to card payments. TWINT is a redirect-based payment method (like iDEAL or Bancontact). This means: (a) the buyer is redirected away from Checkout to the TWINT app/page, then back, (b) TWINT payments can have delayed confirmation -- the webhook may not fire immediately, (c) TWINT only supports CHF, not EUR/USD/GBP, (d) TWINT has its own refund and dispute rules that differ from card chargebacks, and (e) TWINT availability in Stripe Checkout depends on the connected account's country and configuration.

**Why it happens:** Developers test with cards (instant confirmation, well-documented) and assume TWINT works the same way. It doesn't -- it's a different payment rail with different behavior.

**How to avoid:**
1. Only offer TWINT as a payment method when the currency is CHF. For EUR/USD/GBP links, exclude TWINT from `payment_method_types` in the Checkout Session.
2. Handle the async nature: after Checkout redirect back to your success page, don't assume payment is complete. Check the session status. If `payment_status` is `unpaid` or `processing`, show "Payment processing..." and rely on the webhook to confirm.
3. For TWINT, you may need to enable it explicitly in Stripe Dashboard -> Settings -> Payment Methods. It's not enabled by default.
4. Test the full TWINT flow in Stripe test mode (Stripe provides test payment method IDs for redirect-based methods).
5. The `success_url` must handle the case where the buyer arrives but payment hasn't confirmed yet. Use `{CHECKOUT_SESSION_ID}` template in the URL and fetch status server-side.

**Warning signs:** Swiss buyers reporting "paid but no download." TWINT transactions stuck in "processing" state. TWINT not appearing as option for CHF payments.

**Phase to address:** Phase 1 (payment methods). But can be added after card payments work -- TWINT is additive.

---

### Pitfall 10: 48-Hour Re-Download Window Without Buyer Accounts

**What goes wrong:** Buyers don't create accounts. So how do they re-download within 48 hours? You need to identify them. Options: (a) magic link to email, (b) session cookie, (c) unique download URL sent via email. Each has problems. Cookies clear when browser closes. Email requires collecting email at purchase. Unique URLs can be shared. If you rely on Stripe Checkout's `customer_email`, the buyer might use a different email or typo it.

**Why it happens:** "No account required for buyers" conflicts with "48-hour re-download window." Without persistent identity, you can't re-authenticate the buyer.

**How to avoid:**
1. Require email at Checkout (Stripe Checkout can collect this via `customer_email` or let the buyer enter it). Store the email with the purchase record.
2. After purchase, send a confirmation email with a unique, time-limited download link (e.g., `/download/[purchase_token]`). This purchase token is a random UUID stored with the purchase, valid for 48 hours.
3. The download page at that URL verifies: token exists, purchase is valid, 48 hours haven't elapsed, download count hasn't exceeded limit.
4. Also show the download link on the Stripe Checkout success redirect page. Include clear messaging: "Check your email for the download link. This link expires in 48 hours."
5. Do NOT rely on browser cookies or session storage as the primary mechanism. Buyers switch devices, clear cookies, use incognito.
6. Consider a "resend download link" page where buyers enter their email and get a fresh download link for any purchases associated with that email in the last 48 hours.

**Warning signs:** Support requests saying "I paid but can't download." High ratio of single-download purchases (people can't find re-download mechanism). Buyer chargeback rate increasing because they feel they didn't receive the product.

**Phase to address:** Phase 1 (post-purchase experience). This is core to buyer satisfaction and chargeback prevention.

---

## Technical Debt Patterns

### Pattern 1: Webhook Handler Monolith

**What happens:** All Stripe webhook events handled in a single `/api/webhooks/stripe` route with a giant switch statement. As you add events (`checkout.session.completed`, `account.updated`, `identity.verification_session.verified`, `charge.dispute.created`, `payout.failed`), this file becomes 500+ lines and impossible to test.

**Prevention:** From the start, create a webhook router pattern:
```
/api/webhooks/stripe -> verifies signature, parses event
  -> dispatches to /lib/stripe/handlers/checkout-completed.ts
  -> dispatches to /lib/stripe/handlers/account-updated.ts
  -> etc.
```
Each handler is independently testable.

### Pattern 2: Stripe API Keys in Multiple Places

**What happens:** `stripe` client instantiated in multiple files, each pulling from `process.env.STRIPE_SECRET_KEY`. Some use the platform key, some accidentally use the connected account key context. Mixing these up causes charges on wrong accounts.

**Prevention:** Single `stripe` client instance exported from `/lib/stripe/client.ts`. All Stripe operations import from there.

### Pattern 3: Supabase Client Confusion (Server vs Client)

**What happens:** Using the browser Supabase client (`createBrowserClient`) in server components or API routes. This leaks the anon key and bypasses RLS in confusing ways. Or using the service role client where the anon client with RLS should be used, granting too-broad access.

**Prevention:** Maintain strict separation:
- `/lib/supabase/client.ts` -- browser client (anon key, RLS enforced)
- `/lib/supabase/server.ts` -- server client (service role, for API routes/webhooks only)
- Never import the wrong one. ESLint rule or file naming convention to enforce.

---

## Integration Gotchas

### Gotcha 1: Stripe Webhook Signature Verification Requires Raw Body

**Detail:** Stripe's webhook signature verification requires the raw request body (as a string or Buffer). Next.js App Router API routes (`route.ts`) parse the body as JSON by default. If you `await request.json()` before verifying the signature, verification will fail because the body has been parsed and re-stringified (whitespace/ordering changes).

**Fix:** Read the body as text first: `const body = await request.text()`. Then pass `body` to `stripe.webhooks.constructEvent(body, signature, secret)`. Parse JSON after verification: `const event = JSON.parse(body)` (or use the event returned by `constructEvent`).

### Gotcha 2: Supabase Storage Private Bucket RLS

**Detail:** Private Supabase Storage buckets enforce RLS policies on the `storage.objects` table. But signed URLs generated with the service role key bypass RLS entirely. This means your API route can generate a signed URL for ANY file in the bucket, regardless of who owns it. If your download endpoint doesn't verify ownership/purchase status before generating the signed URL, any authenticated request could download any file.

**Fix:** Always check purchase validity in your application logic BEFORE generating the signed URL. Don't rely on Supabase RLS for download authorization -- it's your API route's job.

### Gotcha 3: Stripe Connect Onboarding Return URL vs Refresh URL

**Detail:** When creating an Account Link for Express onboarding, you provide `return_url` and `refresh_url`. `return_url` is where the user goes after completing (or abandoning) onboarding. `refresh_url` is where the user goes if the link expires (Account Links expire after a few minutes) or if there's an error. Developers often set both to the same URL. Problem: `refresh_url` should regenerate a fresh Account Link and redirect the user back to Stripe, not show them your dashboard.

**Fix:** `return_url` -> your creator dashboard (which then checks account status). `refresh_url` -> an API route that creates a new Account Link and redirects to it.

### Gotcha 4: Stripe Identity Verification Sessions and Connect

**Detail:** Stripe Identity (for KYC) and Stripe Connect Express have overlapping but separate verification. Express accounts include their own KYC during onboarding. If you ALSO require Stripe Identity verification separately, the creator goes through two verification flows, which is confusing and unnecessary. Stripe Identity is meant for platforms doing their own verification, NOT for duplicating Connect's built-in KYC.

**Fix:** For Express accounts, rely on Stripe Connect's built-in KYC (handled during onboarding). Only use Stripe Identity if you need verification BEYOND what Connect provides (e.g., age verification, additional identity checks specific to your platform). Don't make creators verify twice.

### Gotcha 5: Checkout Session `success_url` Timing Race

**Detail:** When Checkout completes, two things happen simultaneously: (a) the buyer is redirected to your `success_url`, and (b) Stripe sends the `checkout.session.completed` webhook. The redirect often arrives BEFORE the webhook. If your success page tries to look up the purchase record (which is created by the webhook handler), it won't exist yet.

**Fix:** On the success page, use the `{CHECKOUT_SESSION_ID}` template parameter. Fetch the Checkout Session server-side via Stripe API to verify payment status. If the purchase record doesn't exist yet in your DB, either: (a) create it on the success page load (making the success page handler also idempotent), or (b) show "confirming payment..." and poll for the purchase record to appear (worse UX). Option (a) is better -- make BOTH the success page and webhook handler idempotent creators of the purchase record.

---

## Performance Traps

### Trap 1: Generating Signed URLs on Every Page Load

**Problem:** If the post-purchase page re-generates a Supabase signed URL every time the buyer refreshes, you're making a Supabase API call per page load. Under load, this hammers the Supabase API.

**Fix:** Generate the signed URL only when the buyer clicks "Download," not on page load. The page shows a "Download" button; clicking it hits your API which generates the signed URL and redirects.

### Trap 2: Unoptimized Creator Dashboard Queries

**Problem:** Creator dashboard shows earnings, sales count, active links, payout history. Naive implementation: query purchases table for each stat, scan all rows for that creator. With successful creators having thousands of sales, this becomes slow.

**Fix:** Maintain materialized/cached aggregates. Use Supabase database functions or views for dashboard stats. Consider a `creator_stats` table updated by triggers or on write.

### Trap 3: File Preview Image Storage

**Problem:** Creators upload a preview image for their payment link page. If stored in the same private bucket as the files, you need signed URLs for previews too -- but previews must be publicly accessible (they're on the payment link page that anyone can visit).

**Fix:** Use TWO Supabase Storage buckets: `files` (private, for purchased content) and `previews` (public, for preview images/thumbnails). This is a simple architectural decision that avoids a class of signed-URL complexity.

---

## Security Mistakes

### Mistake 1: Exposing File IDs in Payment Links

**Problem:** If payment link URLs are `/pay/[file_id]` where `file_id` is a sequential integer or the Supabase storage path, attackers can enumerate files, discover pricing, and map your entire catalog.

**Fix:** Use a random slug or UUID for payment links, not the database ID. Store the slug in a `payment_links` table that references the file. The slug reveals nothing about the file or its storage location.

### Mistake 2: Not Validating File Types on Upload

**Problem:** Creator "uploads a PDF" but actually uploads an executable, a PHP shell, or an HTML file with embedded JavaScript. If a buyer opens it, they could be attacked. While you're not serving files through a web server (signed URL downloads), the file name and type still matter for buyer trust.

**Fix:** Validate file MIME type on the server side (not just client-side extension check). Reject dangerous types (`.exe`, `.bat`, `.sh`, `.html`, `.php`, `.js`). Scan files with ClamAV or similar if budget allows. At minimum, set `Content-Disposition: attachment` on the storage objects so browsers download rather than render.

### Mistake 3: Webhook Endpoint Without Signature Verification

**Problem:** Anyone who discovers your webhook URL can POST fake events to it. Without signature verification, they could forge `checkout.session.completed` events and get free downloads.

**Fix:** ALWAYS verify the Stripe webhook signature using `stripe.webhooks.constructEvent()`. This is non-negotiable. Additionally, restrict the webhook endpoint to not require authentication (it can't -- Stripe calls it), but verify every request's signature.

### Mistake 4: Supabase Service Role Key in Client Bundle

**Problem:** The Supabase service role key has full access to all data, bypassing RLS. If it's accidentally included in client-side code (wrong environment variable, imported in a client component), anyone can read/write/delete all data.

**Fix:** Prefix server-only environment variables with convention (e.g., `SUPABASE_SERVICE_ROLE_KEY` never in `NEXT_PUBLIC_*`). Use Next.js server-only imports. Add a build-time check that service role key never appears in client bundles.

---

## UX Pitfalls

### UX Pitfall 1: Creator Onboarding Abandonment

**Problem:** Creator signs up, then hits the Stripe Connect onboarding wall -- bank details, ID verification, business info. This is a 5-10 minute process that requires documents. Most creators will bounce.

**Fix:** Let creators upload files and create (draft) payment links BEFORE completing Stripe onboarding. Gate only the "publish link" or "enable payments" action on Stripe onboarding completion. This way creators invest in the platform before hitting the onboarding friction.

### UX Pitfall 2: Buyer Confusion About Fees

**Problem:** Creator sets price at CHF 10. Buyer sees CHF 11.50 (with 15% surcharge). Buyer feels bait-and-switched. This is the #1 source of complaints on fee-based platforms.

**Fix:** Show the total price (including fees) prominently on the payment link page. Show fee breakdown clearly: "Price: CHF 10.00 + CHF 1.50 service fee = CHF 11.50 total." Never hide the fee until Checkout. Consider letting creators choose whether the fee is added on top (buyer pays more) or absorbed (creator receives less).

### UX Pitfall 3: No Download Confirmation State

**Problem:** Buyer pays, lands on success page, clicks download. Large file (200MB) starts downloading. No progress indicator from your app (browser handles it). Buyer isn't sure if it's working. Clicks download again. Now downloading twice.

**Fix:** After clicking download, show a clear "Download started -- check your browser's download bar" message. Disable the download button for 10 seconds after click to prevent double-downloads. Show file size prominently so buyer knows what to expect.

---

## "Looks Done But Isn't" Checklist

These features appear complete in demo but break in production:

- [ ] **Webhook handling** -- works in Stripe CLI test mode, fails in production because raw body parsing differs, or endpoint URL has a typo, or webhook secret is for test mode
- [ ] **File upload** -- works for 5MB test file, fails at 200MB due to timeout/memory/chunk size
- [ ] **Stripe Connect onboarding** -- works when you complete it perfectly, breaks when user abandons mid-flow and returns later
- [ ] **Fee calculation** -- works for round numbers (CHF 10.00), breaks for CHF 3.33 or CHF 0.50
- [ ] **Signed URL downloads** -- works in dev (same origin), fails in production (CORS, redirect chain issues)
- [ ] **TWINT payments** -- works in test mode with test payment method, has different behavior in production (redirect flow, delayed confirmation)
- [ ] **Multi-currency** -- works when all creators use CHF, breaks when a CHF-account creator sets a USD price and wonders why payout is less than expected
- [ ] **48-hour re-download** -- works when buyer clicks link immediately, breaks when email is delayed or buyer tries from different device
- [ ] **Creator dashboard stats** -- works with 10 sales, becomes slow with 10,000 sales
- [ ] **Payment link page** -- works with title + price, looks terrible when creator adds a 500-character description or a very wide preview image

---

## Recovery Strategies

### When Webhooks Were Missed

**Symptom:** Buyer paid but purchase record not created. Download not available.
**Recovery:** Build an admin reconciliation tool that calls `stripe.checkout.sessions.list()` for your account, compares against purchase records, and creates missing records. Run periodically or on-demand. Also: Stripe Dashboard -> Webhooks -> Event Logs lets you manually resend events.

### When Files Are Orphaned in Storage

**Symptom:** Files in Supabase Storage with no corresponding database record (upload succeeded but DB write failed, or creator deleted their account).
**Recovery:** Cron job that lists storage objects, cross-references with `files` table, and flags/deletes orphans older than 24 hours.

### When Stripe Account Gets Restricted

**Symptom:** Creator's Stripe account restricted due to risk review. Payments fail.
**Recovery:** Detect via `account.updated` webhook where `requirements.disabled_reason` is set. Notify creator immediately with link to Stripe Express Dashboard where they can resolve. Temporarily disable their payment links. Do NOT try to handle this programmatically -- Stripe's risk team handles it.

### When Currency Conversion Causes Disputes

**Symptom:** Buyer in country A pays in currency B, their bank adds conversion fee, they dispute the charge.
**Recovery:** Ensure Checkout shows the final amount clearly. Consider enabling Stripe Adaptive Pricing (if available) to show local currency to buyers. For disputes, respond with proof of delivery (signed URL access logs).

---

## Pitfall-to-Phase Mapping

| Phase | Topic | Likely Pitfall | Priority |
|-------|-------|---------------|----------|
| Pre-dev | Architecture | Direct Charges vs Destination Charges decision (FINMA) | CRITICAL |
| Pre-dev | Architecture | Two-bucket strategy (private files, public previews) | HIGH |
| Phase 1 | Creator onboarding | Connect Express state machine complexity | CRITICAL |
| Phase 1 | Creator onboarding | Stripe Identity vs Connect KYC duplication | HIGH |
| Phase 1 | File upload | Large file upload failures (500MB, TUS protocol) | CRITICAL |
| Phase 1 | Payment flow | Webhook idempotency and raw body parsing | CRITICAL |
| Phase 1 | Payment flow | Application fee rounding errors | HIGH |
| Phase 1 | Payment flow | Checkout Session expiry / orphaned records | MEDIUM |
| Phase 1 | Payment flow | Success URL timing race with webhook | HIGH |
| Phase 1 | File delivery | Signed URL leakage / download token system | CRITICAL |
| Phase 1 | File delivery | 48-hour re-download without buyer accounts | HIGH |
| Phase 1 | Payment methods | TWINT CHF-only limitation and async confirmation | MEDIUM |
| Phase 1 | Security | Webhook signature verification | CRITICAL |
| Phase 1 | Security | Service role key not in client bundle | CRITICAL |
| Phase 1 | Security | File type validation on upload | MEDIUM |
| Phase 1 | Security | Random slugs for payment links (not sequential IDs) | HIGH |
| Phase 2 | Multi-currency | Currency mismatch with connected account default | HIGH |
| Phase 2 | Dashboard | Unoptimized aggregate queries at scale | MEDIUM |
| Phase 2 | UX | Buyer fee transparency / bait-and-switch feeling | HIGH |
| Phase 2 | UX | Creator onboarding abandonment (gate publish, not upload) | HIGH |
| Ongoing | Operations | Webhook miss reconciliation tool | MEDIUM |
| Ongoing | Operations | Orphaned file cleanup | LOW |
| Ongoing | Operations | Connect account restriction monitoring | MEDIUM |

---

## Sources

**Note:** WebSearch and WebFetch were unavailable during this research session. All findings are based on training data knowledge of Stripe Connect, Supabase Storage, and Next.js integration patterns. Confidence is MEDIUM -- specific API behaviors, limits, and features should be verified against current official documentation before implementation.

Key documentation to verify against:
- Stripe Connect Express Accounts: https://docs.stripe.com/connect/express-accounts
- Stripe Destination Charges: https://docs.stripe.com/connect/destination-charges
- Stripe Direct Charges: https://docs.stripe.com/connect/direct-charges
- Stripe Webhook Best Practices: https://docs.stripe.com/webhooks/best-practices
- Stripe Checkout Session API: https://docs.stripe.com/api/checkout/sessions
- Stripe TWINT: https://docs.stripe.com/payments/twint
- Supabase Storage: https://supabase.com/docs/guides/storage
- Supabase TUS Resumable Uploads: https://supabase.com/docs/guides/storage/uploads/resumable-uploads
- FINMA Financial Intermediary regulations: https://www.finma.ch/en/authorisation/financial-intermediaries/
- Next.js Route Handlers: https://nextjs.org/docs/app/building-your-application/routing/route-handlers

---
*Pitfalls research for: File Monetization SaaS (Unlockt)*
*Researched: 2026-03-05*
*Confidence: MEDIUM -- training data only, verify against current docs*
