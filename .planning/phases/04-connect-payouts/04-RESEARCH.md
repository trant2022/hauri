# Phase 4: Connect + Payouts - Research

**Researched:** 2026-03-05
**Domain:** Stripe Connect Express onboarding, transfers, payouts
**Confidence:** HIGH

## Summary

This phase integrates Stripe Connect Express so creators can receive their earnings. The platform currently collects the full buyer payment via Checkout (Phase 3) and records `creator_amount` per transaction in the database. Phase 4 adds: (1) Express account onboarding for creators, (2) webhook-driven account state tracking, (3) transfers of creator earnings to their connected accounts after each sale, and (4) a payout mechanism for creators to receive funds in their bank accounts.

The critical architectural decision is the **charge type**. Since the platform already collects payments via Checkout without Connect, and each transaction involves exactly one creator, **separate charges and transfers** is the correct approach. This preserves the existing Checkout flow unchanged and adds transfers as a post-payment step. Destination charges would require restructuring the entire Checkout flow and are designed for cases where payment and transfer happen atomically -- which doesn't fit our model where creators may not have completed onboarding yet.

**Primary recommendation:** Use separate charges and transfers with `source_transaction` to move `creator_amount` to connected accounts after successful payment, and let Stripe handle automatic daily payouts from connected accounts to creator bank accounts.

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| stripe | ^20.4.0 | Stripe API (accounts, transfers, account links, payouts) | Already installed; covers all Connect APIs |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| stripe CLI | latest | Local webhook testing for Connect events | Development: `stripe listen --forward-connect-to` |

### No New Dependencies Required

The existing `stripe` package (v20.4.0) includes full TypeScript types for all Connect APIs: `stripe.accounts.create()`, `stripe.accountLinks.create()`, `stripe.transfers.create()`, `stripe.payouts.create()`. No additional packages needed.

## Architecture Patterns

### Recommended Project Structure

```
src/
  lib/stripe/
    client.ts            # Existing - lazy Proxy singleton
    checkout.ts          # Existing - modify to add transfer_group
    webhooks.ts          # Existing - add handleAccountUpdated
    connect.ts           # NEW - account creation, account links, re-engagement
    transfers.ts         # NEW - create transfers after payment
  app/
    api/
      webhooks/stripe/
        route.ts         # Existing - add account.updated handler
      connect/
        onboard/route.ts # NEW - creates Express account + redirects to Account Link
        refresh/route.ts # NEW - re-engagement: creates fresh Account Link
        return/route.ts  # NEW - return URL handler after onboarding
    (dashboard)/
      settings/
        page.tsx         # NEW or modify - Connect onboarding UI
      payouts/
        page.tsx         # NEW - payout history + request payout
  types/
    database.ts          # Modify - add connect_status fields, transfer tracking
```

### Pattern 1: Separate Charges and Transfers (The Core Pattern)

**What:** Platform collects payment via Checkout (existing), then creates a Transfer to the creator's connected account as a separate API call.

**When to use:** Every successful sale where the creator has a connected account with `charges_enabled: true`.

**Why this pattern (not destination charges):**
- The existing Checkout flow does NOT reference a connected account -- changing to destination charges would require restructuring `createCheckoutSession()` to include `payment_intent_data.transfer_data.destination`
- Creators may not have completed Connect onboarding when buyers purchase -- separate charges and transfers gracefully handle this (record the transaction, transfer later when creator onboards)
- Each transaction involves exactly one creator, so the "one-to-many" complexity argument doesn't apply, but the decoupled timing is the key benefit

**Flow:**
```
1. Buyer pays via Checkout (existing, unchanged)
2. checkout.session.completed webhook fires
3. handleCheckoutCompleted records transaction (existing)
4. NEW: After recording transaction, create Transfer to creator's connected account
5. Stripe automatically pays out from connected account to creator's bank (daily)
```

**Example (transfer creation in webhook handler):**
```typescript
// src/lib/stripe/transfers.ts
import { stripe } from "./client"

interface CreateTransferParams {
  amount: number           // creator_amount in cents
  currency: string
  destinationAccountId: string  // creator's stripe_account_id
  sourceTransaction: string     // payment_intent_id from the charge
  transferGroup: string         // unique ID linking charge to transfer
  metadata?: Record<string, string>
}

export async function createTransferToCreator({
  amount,
  currency,
  destinationAccountId,
  sourceTransaction,
  transferGroup,
  metadata,
}: CreateTransferParams): Promise<string> {
  const transfer = await stripe.transfers.create({
    amount,
    currency: currency.toLowerCase(),
    destination: destinationAccountId,
    source_transaction: sourceTransaction,
    transfer_group: transferGroup,
    metadata,
  })
  return transfer.id
}
```

### Pattern 2: Express Account Onboarding via Account Links

**What:** Creator clicks "Connect with Stripe" -> platform creates an Express connected account -> creates an Account Link -> redirects creator to Stripe-hosted onboarding form.

**When to use:** When a creator wants to start receiving payouts.

**Example (account creation + Account Link):**
```typescript
// src/lib/stripe/connect.ts
import { stripe } from "./client"

export async function createExpressAccount(
  email: string,
  country?: string
): Promise<string> {
  const account = await stripe.accounts.create({
    type: "express",
    email,
    capabilities: {
      card_payments: { requested: true },
      transfers: { requested: true },
    },
    ...(country && { country }),
  })
  return account.id
}

export async function createAccountLink(
  accountId: string,
  refreshUrl: string,
  returnUrl: string
): Promise<string> {
  const accountLink = await stripe.accountLinks.create({
    account: accountId,
    refresh_url: refreshUrl,
    return_url: returnUrl,
    type: "account_onboarding",
  })
  return accountLink.url
}
```

**Note on controller properties vs type: 'express':** Stripe is transitioning from `type: 'express'` to controller-property-based account creation. The controller equivalent is:
```typescript
const account = await stripe.accounts.create({
  controller: {
    stripe_dashboard: { type: "express" },
    fees: { payer: "application" },
    losses: { payments: "application" },
  },
  email,
  capabilities: {
    card_payments: { requested: true },
    transfers: { requested: true },
  },
})
```
Both approaches work. The `type: 'express'` API is still fully supported. For a new integration, either approach is valid. The controller property approach is more future-proof but `type: 'express'` is simpler and well-documented. **Recommendation: Use `type: 'express'` for simplicity** -- migrate to controller properties later if Stripe deprecates it.

### Pattern 3: Webhook-Driven Account State Tracking

**What:** Listen for `account.updated` events to track onboarding progress and account status changes.

**When to use:** Always -- this is the authoritative source of account state.

**Key fields to track from `account.updated`:**
```typescript
// Fields from the Stripe Account object
{
  charges_enabled: boolean,    // Can this account accept charges?
  payouts_enabled: boolean,    // Can this account receive payouts?
  details_submitted: boolean,  // Has the user submitted all required info?
  requirements: {
    currently_due: string[],     // Fields needed NOW
    eventually_due: string[],   // Fields needed later
    past_due: string[],          // Overdue fields (functionality may be disabled)
    pending_verification: string[], // Submitted, awaiting Stripe review
    disabled_reason: string | null, // Why account is disabled
    current_deadline: number | null, // Unix timestamp deadline
  }
}
```

**State machine for UI:**
```
NOT_STARTED    -> No stripe_account_id
ONBOARDING     -> stripe_account_id exists, details_submitted=false
PENDING        -> details_submitted=true, charges_enabled=false (under review)
ACTIVE         -> charges_enabled=true AND payouts_enabled=true
RESTRICTED     -> charges_enabled=false OR requirements.past_due.length > 0
```

### Pattern 4: Connect Webhook Endpoint Configuration

**What:** Connect webhooks (`account.updated`) are a DIFFERENT category from regular account webhooks (`checkout.session.completed`). They require a separate webhook endpoint configuration in Stripe Dashboard.

**Critical detail:** In Stripe Dashboard, when creating a webhook endpoint, you must select "Events on Connected accounts" (not "Events on your account") to receive `account.updated` events. However, the same HTTP endpoint URL can handle both -- just configure both webhook subscriptions pointing to the same URL.

**Alternative:** Use the same `/api/webhooks/stripe/route.ts` endpoint but register it for Connect events too. The webhook signature verification works the same way, BUT you need a separate webhook secret for the Connect endpoint (`STRIPE_CONNECT_WEBHOOK_SECRET`).

**Simpler approach (recommended):** Use a SINGLE webhook endpoint for everything. When you register a Connect webhook endpoint pointing to the same URL, Stripe will send events with a different signing secret. To handle this cleanly, try verifying with the primary secret first, then fall back to the Connect secret.

**Actually simplest approach:** Register one webhook endpoint URL for both account events AND Connect events. Stripe allows this -- a single endpoint can listen to both categories. In test mode with `stripe listen`, use `--forward-connect-to` to forward Connect events to the same URL.

### Anti-Patterns to Avoid

- **Polling account status:** Never poll the Stripe API for account status. Use the `account.updated` webhook exclusively.
- **Storing sensitive KYC data:** The platform should NOT store any identity verification data. Stripe handles all KYC. Only store: `stripe_account_id`, `charges_enabled`, `payouts_enabled`, `details_submitted`, `onboarding_complete`.
- **Creating transfers before checking `charges_enabled`:** Always verify the creator's connected account has `charges_enabled: true` before creating transfers.
- **Manual payouts when automatic suffices:** For this use case, Stripe's automatic daily payouts from connected accounts to bank accounts is the right choice. The platform does NOT need to call the Payouts API. Transfers move money to the connected account balance; Stripe's automatic payout schedule moves it to the bank.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Creator identity verification | Custom KYC form | Stripe Express onboarding (Account Links) | Legal compliance, fraud prevention, 30+ country support |
| Onboarding state tracking | Custom state machine with polling | `account.updated` webhook + DB flags | Stripe is the source of truth for account state |
| Payout scheduling | Custom cron job to trigger payouts | Stripe automatic payouts (default daily) | Connected accounts auto-payout; platform just does transfers |
| Bank account management | Custom bank account entry form | Stripe Express Dashboard | Express accounts manage their own bank details |
| Transfer timing | Custom queue to retry transfers | `source_transaction` parameter | Stripe automatically waits for funds availability |

**Key insight:** The platform's job is limited to: (1) creating the connected account, (2) tracking its state via webhooks, (3) creating transfers after sales. Everything else -- KYC, bank account management, payout scheduling, identity verification -- is handled by Stripe.

## Common Pitfalls

### Pitfall 1: Account Link Expiration

**What goes wrong:** Account Links are single-use and expire quickly (a few minutes). If the creator doesn't click immediately, or navigates away and tries to use the same link, it fails.
**Why it happens:** Account Links grant access to sensitive personal information, so Stripe makes them short-lived.
**How to avoid:** Always generate a fresh Account Link when the creator clicks the onboarding button. The `refresh_url` should point to an endpoint that creates a new Account Link and redirects.
**Warning signs:** Creator reports "link expired" or blank page after clicking onboarding link.

### Pitfall 2: Assuming `return_url` Means Onboarding is Complete

**What goes wrong:** The creator is redirected to `return_url` but has NOT finished onboarding. The platform shows "You're all set!" but `charges_enabled` is still false.
**Why it happens:** Stripe redirects to `return_url` after the user exits the flow, regardless of completion. They may have closed partway through.
**How to avoid:** On the return URL page, fetch the account status from the database (populated by `account.updated` webhook) and show appropriate UI. Never assume completion from the redirect alone.
**Warning signs:** Creators see "onboarding complete" but can't receive payments.

### Pitfall 3: Transfers for Creators Without Connected Accounts

**What goes wrong:** A buyer purchases from a creator who hasn't onboarded to Connect. The transfer fails because there's no `stripe_account_id`.
**Why it happens:** Checkout flow doesn't require Connect onboarding.
**How to avoid:** In the `checkout.session.completed` handler, check if the creator has a connected account with `charges_enabled: true`. If not, record the transaction normally (money stays in platform account) and mark it as `transfer_pending`. When the creator later completes onboarding, process pending transfers.
**Warning signs:** Transfer API errors, creator complains about missing earnings.

### Pitfall 4: Missing `source_transaction` on Transfers

**What goes wrong:** Transfer fails with insufficient balance error, even though the payment was just received.
**Why it happens:** Funds from the charge aren't immediately available in the platform's Stripe balance (especially with async payment methods like TWINT or bank transfers).
**How to avoid:** Always use `source_transaction` parameter when creating transfers. This tells Stripe to wait for the charge funds to be available before executing the transfer.
**Warning signs:** Intermittent "insufficient funds" errors on transfers.

### Pitfall 5: Connect Webhook Secret Confusion

**What goes wrong:** `account.updated` events fail signature verification.
**Why it happens:** Connect webhook events use a different signing secret than regular account webhook events, even if they're sent to the same endpoint URL.
**How to avoid:** If using separate webhook registrations (one for account events, one for Connect events), you need two secrets. Alternatively, register a single endpoint for both event types in Stripe Dashboard.
**Warning signs:** 400 errors on `account.updated` webhooks, signature verification failures in logs.

### Pitfall 6: Not Handling the `transfer_group` Correctly

**What goes wrong:** Transfers can't be reconciled with their originating charges.
**Why it happens:** `transfer_group` is just a label -- Stripe doesn't enforce it. If you forget to set it, transfers still work but auditability is lost.
**How to avoid:** Use a consistent `transfer_group` format, like the transaction ID or `txn_{transaction_id}`. Set it on both the Checkout Session's `payment_intent_data.transfer_group` and the subsequent Transfer.
**Warning signs:** Difficulty auditing which transfers correspond to which payments.

## Code Examples

### Creating an Express Account and Onboarding Link (Full Flow)

```typescript
// src/app/api/connect/onboard/route.ts
import { NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { stripe } from "@/lib/stripe/client"

export async function POST() {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  // Check if user already has a Stripe account
  const { data: profile } = await supabase
    .from("users")
    .select("stripe_account_id, email")
    .eq("id", user.id)
    .single()

  let accountId = profile?.stripe_account_id

  if (!accountId) {
    // Create new Express account
    const account = await stripe.accounts.create({
      type: "express",
      email: profile?.email,
      capabilities: {
        card_payments: { requested: true },
        transfers: { requested: true },
      },
    })
    accountId = account.id

    // Save to database
    await supabase
      .from("users")
      .update({ stripe_account_id: accountId })
      .eq("id", user.id)
  }

  // Create Account Link (always fresh)
  const appUrl = process.env.NEXT_PUBLIC_APP_URL!
  const accountLink = await stripe.accountLinks.create({
    account: accountId,
    refresh_url: `${appUrl}/api/connect/refresh`,
    return_url: `${appUrl}/settings?connect=return`,
    type: "account_onboarding",
  })

  return NextResponse.json({ url: accountLink.url })
}
```

### Handling account.updated Webhook

```typescript
// Addition to src/lib/stripe/webhooks.ts
import Stripe from "stripe"
import { supabaseAdmin } from "@/lib/supabase/admin"

export async function handleAccountUpdated(
  account: Stripe.Account
): Promise<void> {
  const { data: user } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("stripe_account_id", account.id)
    .single()

  if (!user) {
    console.warn(`account.updated for unknown account: ${account.id}`)
    return
  }

  await supabaseAdmin
    .from("users")
    .update({
      charges_enabled: account.charges_enabled ?? false,
      payouts_enabled: account.payouts_enabled ?? false,
      details_submitted: account.details_submitted ?? false,
      onboarding_complete:
        (account.charges_enabled ?? false) &&
        (account.payouts_enabled ?? false),
    })
    .eq("stripe_account_id", account.id)

  console.log(
    `Account ${account.id} updated: charges=${account.charges_enabled}, payouts=${account.payouts_enabled}`
  )

  // If account just became active, process any pending transfers
  if (account.charges_enabled) {
    // Process pending transfers for this creator
    // (implementation in transfers.ts)
  }
}
```

### Adding Transfer After Checkout Completion

```typescript
// Modified handleCheckoutCompleted to include transfer
// After recording the transaction, attempt transfer:

const { data: creator } = await supabaseAdmin
  .from("links")
  .select("user_id, users!inner(stripe_account_id, charges_enabled)")
  .eq("id", link_id)
  .single()

if (
  creator?.users?.stripe_account_id &&
  creator?.users?.charges_enabled
) {
  const transfer = await stripe.transfers.create({
    amount: Number(creator_amount),
    currency: session.currency!.toLowerCase(),
    destination: creator.users.stripe_account_id,
    source_transaction: paymentIntentId!,
    transfer_group: `txn_${transaction.id}`,
    metadata: {
      transaction_id: transaction.id,
      link_id,
    },
  })

  await supabaseAdmin
    .from("transactions")
    .update({
      stripe_transfer_id: transfer.id,
      transfer_status: "completed",
    })
    .eq("id", transaction.id)
} else {
  // Creator hasn't onboarded -- mark for later transfer
  await supabaseAdmin
    .from("transactions")
    .update({ transfer_status: "pending" })
    .eq("id", transaction.id)
}
```

### Re-engagement Flow for Abandoned Onboarding

```typescript
// src/app/api/connect/refresh/route.ts
import { NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { stripe } from "@/lib/stripe/client"

export async function GET() {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.redirect(new URL("/login", process.env.NEXT_PUBLIC_APP_URL!))
  }

  const { data: profile } = await supabase
    .from("users")
    .select("stripe_account_id")
    .eq("id", user.id)
    .single()

  if (!profile?.stripe_account_id) {
    return NextResponse.redirect(new URL("/settings", process.env.NEXT_PUBLIC_APP_URL!))
  }

  // Create fresh Account Link for re-engagement
  const appUrl = process.env.NEXT_PUBLIC_APP_URL!
  const accountLink = await stripe.accountLinks.create({
    account: profile.stripe_account_id,
    refresh_url: `${appUrl}/api/connect/refresh`,
    return_url: `${appUrl}/settings?connect=return`,
    type: "account_onboarding",
  })

  return NextResponse.redirect(accountLink.url)
}
```

### Modifying Existing Checkout to Include transfer_group

```typescript
// Modification to src/lib/stripe/checkout.ts
// Add transfer_group to the Checkout Session for traceability

const session = await stripe.checkout.sessions.create({
  mode: "payment",
  payment_method_types: paymentMethodTypes,
  line_items: [/* existing */],
  payment_intent_data: {
    transfer_group: `link_${linkId}`,  // NEW: enables transfer linking
  },
  metadata: {/* existing */},
  success_url: `${appUrl}/l/success?session_id={CHECKOUT_SESSION_ID}`,
  cancel_url: `${appUrl}/l/${slug}`,
})
```

## Database Schema Changes

### Migration: Add Connect Fields to Users Table

```sql
-- Add Connect onboarding status fields
ALTER TABLE public.users
ADD COLUMN charges_enabled boolean DEFAULT false,
ADD COLUMN payouts_enabled boolean DEFAULT false,
ADD COLUMN details_submitted boolean DEFAULT false,
ADD COLUMN onboarding_complete boolean DEFAULT false;

-- Index for looking up users by stripe_account_id (webhook handler)
CREATE INDEX idx_users_stripe_account_id
ON public.users (stripe_account_id)
WHERE stripe_account_id IS NOT NULL;
```

### Migration: Add Transfer Tracking to Transactions Table

```sql
-- Track transfer status per transaction
ALTER TABLE public.transactions
ADD COLUMN stripe_transfer_id text,
ADD COLUMN transfer_status text DEFAULT 'not_applicable';
-- Values: 'not_applicable' (no connect account), 'pending', 'completed', 'failed'

-- Index for finding pending transfers (used when creator completes onboarding)
CREATE INDEX idx_transactions_transfer_pending
ON public.transactions (transfer_status)
WHERE transfer_status = 'pending';
```

### Migration: Add RLS and Payouts Table Enhancements

```sql
-- Payouts table already exists but needs additional fields
ALTER TABLE public.payouts
ADD COLUMN stripe_transfer_group text,
ADD COLUMN completed_at timestamptz;

-- RLS for payouts: creators can read their own
CREATE POLICY "Users can read own payouts"
ON public.payouts
FOR SELECT
TO authenticated
USING (user_id = auth.uid());
```

## Transfers vs. Payouts: Clarification

This is a critical distinction that is often confused:

| Concept | What It Does | Who Controls It | API |
|---------|-------------|-----------------|-----|
| **Transfer** | Moves money from platform Stripe balance to connected account Stripe balance | Platform (via `stripe.transfers.create()`) | Transfers API |
| **Payout** | Moves money from a Stripe balance to an external bank account | Stripe (automatic) or platform (manual) | Payouts API |

**For this platform:**
1. **Transfers:** Platform creates a Transfer after each sale, moving `creator_amount` to the creator's connected account balance. The platform controls this.
2. **Payouts:** Stripe automatically pays out the connected account balance to the creator's bank account on a daily schedule. The platform does NOT need to manage this. Express accounts come with automatic daily payouts by default.

**The "creator requests payout" requirement (CONN-04):**
This is actually about the creator viewing their transfer history and earned balance -- NOT about manually triggering Stripe payouts. The platform shows: total earned, total transferred, pending transfers. The actual bank payout happens automatically via Stripe.

If the requirement truly means "manual payout control," the platform would need to:
1. Create connected accounts with `settings.payouts.schedule.interval: 'manual'`
2. Use `stripe.payouts.create()` with `Stripe-Account` header when creator requests
3. This adds significant complexity and is not recommended for v1

**Recommendation:** Let Stripe handle automatic payouts. The "payout request" UI should show creators their earnings dashboard, not trigger manual payouts.

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `type: 'express'` account creation | Controller properties (`controller.stripe_dashboard.type: 'express'`) | 2025 | Both work; controller is future-proof |
| OAuth-based onboarding | Account Links API | Deprecated years ago | Use Account Links exclusively |
| `collect: 'eventually_due'` param | `collection_options.fields` + `collection_options.future_requirements` | Recent | `collect` param deprecated |
| Separate Connect webhook endpoint | Same endpoint can handle both event types | Current | Simplifies webhook architecture |

**Deprecated/outdated:**
- OAuth Connect onboarding: Fully deprecated for new integrations. Use Account Links.
- `collect` parameter on Account Links: Use `collection_options` object instead.

## Testing Strategy

### Local Development with Stripe CLI

```bash
# Terminal 1: Forward regular account events
stripe listen --forward-to localhost:3000/api/webhooks/stripe

# Terminal 2: Forward Connect events (account.updated)
stripe listen --forward-connect-to localhost:3000/api/webhooks/stripe

# Trigger test events
stripe trigger account.updated
```

### Test Mode Express Onboarding

In Stripe test mode, Express onboarding is simplified:
- Use SMS code `000-000` for phone verification
- Use birth date `1901-01-01` for successful identity match
- Use ID number `000000000` for successful verification
- Use `address_full_match` in address line1 for successful address verification
- Test accounts with Dashboard access always have payouts enabled regardless of verification status

### Test Transfers

```bash
# After creating a test connected account and completing onboarding:
stripe transfers create --amount 1000 --currency usd --destination acct_test_xxx
```

## Open Questions

1. **CONN-04 Interpretation: "Creator can request payout"**
   - What we know: With separate charges + transfers and automatic Stripe payouts, money flows automatically: sale -> transfer to connected account -> auto-payout to bank.
   - What's unclear: Does "request payout" mean (a) view earnings dashboard, (b) manually trigger a Stripe payout, or (c) request the platform process pending transfers?
   - Recommendation: Implement as an earnings dashboard showing total earned, transferred, and pending amounts. Auto-payouts handle the rest. If manual control is truly needed, it can be added later.

2. **Existing Transactions Without Transfers**
   - What we know: Phase 3 already records transactions with `creator_amount`. These transactions have no connected account or transfer.
   - What's unclear: Should existing transactions retroactively create transfers when a creator onboards?
   - Recommendation: Yes -- when `account.updated` fires with `charges_enabled: true`, query all transactions for that creator's links where `transfer_status = 'pending'` and create transfers.

3. **Connect Webhook Secret Management**
   - What we know: Connect events may use a different webhook signing secret than regular account events.
   - What's unclear: Whether configuring a single endpoint for both event types in Stripe Dashboard results in one or two signing secrets.
   - Recommendation: Test during implementation. If two secrets are needed, try both in sequence during verification.

4. **TWINT Compatibility with Transfers**
   - What we know: TWINT is an async payment method used for CHF payments. Separate charges and transfers require waiting for `charge.succeeded` before transferring for async methods.
   - What's unclear: Whether `source_transaction` fully handles TWINT timing, or if additional `charge.succeeded` handling is needed.
   - Recommendation: Use `source_transaction` which should handle timing automatically. Add `charge.succeeded` handler as a safety net if needed.

## Sources

### Primary (HIGH confidence)
- [Stripe Express Accounts](https://docs.stripe.com/connect/express-accounts) - Account creation, Account Links, onboarding flow
- [Stripe Account Links API](https://docs.stripe.com/api/account_links/create) - API reference for creating onboarding links
- [Stripe Separate Charges and Transfers](https://docs.stripe.com/connect/separate-charges-and-transfers) - Transfer creation, source_transaction, transfer_group
- [Stripe Destination Charges](https://docs.stripe.com/connect/destination-charges) - Compared and rejected for this use case
- [Stripe Handle Verification Updates](https://docs.stripe.com/connect/handle-verification-updates) - account.updated webhook fields
- [Stripe Connect Webhooks](https://docs.stripe.com/connect/webhooks) - Connect vs Account webhook configuration
- [Stripe Manual Payouts](https://docs.stripe.com/connect/manual-payouts) - Manual payout API and Stripe-Account header
- [Stripe Manage Payout Schedule](https://docs.stripe.com/connect/manage-payout-schedule) - Automatic vs manual schedule configuration
- [Stripe Connect Testing](https://docs.stripe.com/connect/testing) - Test tokens, magic values, CLI commands
- [Stripe Integration Recommendations](https://docs.stripe.com/connect/integration-recommendations) - Charge type guidance
- [Stripe Migrate to Controller Properties](https://docs.stripe.com/connect/migrate-to-controller-properties) - type: 'express' vs controller object

### Secondary (MEDIUM confidence)
- [Stripe Marketplace Accept Payment Guide](https://docs.stripe.com/connect/marketplace/tasks/accept-payment/separate-charges-and-transfers) - Node.js examples for SCT flow
- [Stripe Payouts to Connected Accounts](https://docs.stripe.com/connect/payouts-connected-accounts) - Auto vs manual payout behavior
- [Stripe Hosted Onboarding](https://docs.stripe.com/connect/hosted-onboarding) - Account Links as hosted onboarding mechanism
- [Stripe Accounts v2](https://docs.stripe.com/connect/accounts-v2) - Future API direction, backward compatibility

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Using already-installed stripe SDK, no new deps
- Architecture (separate charges + transfers): HIGH - Verified against official docs, fits existing Checkout pattern
- Account Links onboarding: HIGH - Official API reference verified
- Webhook handling (account.updated): HIGH - Official docs with field-level detail
- Payout mechanics: HIGH - Official docs confirm auto-payout default for Express
- Testing approach: HIGH - Official testing guide with magic values
- Database schema: MEDIUM - Based on analysis of existing schema + Stripe API fields; exact column names are recommendations

**Research date:** 2026-03-05
**Valid until:** 2026-04-05 (Stripe APIs are stable; 30-day validity)
