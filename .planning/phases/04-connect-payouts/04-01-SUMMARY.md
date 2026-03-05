---
phase: 04-connect-payouts
plan: 01
subsystem: stripe-connect-backend
tags: [stripe-connect, express-accounts, transfers, webhooks, database-migration]
dependency-graph:
  requires: [03-purchase-download]
  provides: [connect-account-management, transfer-processing, account-updated-webhook, pending-transfer-resolution]
  affects: [04-02-onboarding-ui-earnings]
tech-stack:
  added: []
  patterns: [dual-webhook-secret-verification, transfer-group-traceability, pending-transfer-batch-processing, error-isolated-transfers]
key-files:
  created:
    - supabase/migrations/00004_connect_and_transfers.sql
    - src/lib/stripe/connect.ts
    - src/lib/stripe/transfers.ts
  modified:
    - src/types/database.ts
    - src/lib/stripe/checkout.ts
    - src/lib/stripe/webhooks.ts
    - src/app/api/webhooks/stripe/route.ts
decisions:
  - id: dual-webhook-secret
    summary: "Dual-secret verification tries primary webhook secret first, falls back to Connect webhook secret for account.updated events"
  - id: transfer-error-isolation
    summary: "Transfer failures are caught and logged without breaking checkout flow or email sending; individual pending transfer failures don't block batch processing"
  - id: pending-transfer-pattern
    summary: "Transactions default to transfer_status 'not_applicable'; set to 'pending' when creator hasn't onboarded; batch-processed when account.updated fires with charges_enabled"
metrics:
  duration: ~2.5 min
  completed: 2026-03-05
---

# Phase 4 Plan 1: Stripe Connect Backend Infrastructure Summary

**JWT-free Connect account management with Express accounts, automatic transfers after checkout, and pending transfer resolution on creator onboarding.**

## What Was Built

### Database Migration (00004)
- Added 4 boolean columns to `users`: `charges_enabled`, `payouts_enabled`, `details_submitted`, `onboarding_complete` for tracking Connect onboarding state
- Added 2 columns to `transactions`: `stripe_transfer_id` and `transfer_status` (default: 'not_applicable')
- Created partial index on `stripe_account_id` for webhook lookups
- Created partial index on `transfer_status = 'pending'` for efficient pending transfer queries

### Stripe Connect Library (`connect.ts`)
- `createExpressAccount(email, country?)` -- creates Express connected account with card_payments + transfers capabilities
- `createAccountLink(accountId, refreshUrl, returnUrl)` -- generates single-use onboarding URLs

### Transfer Library (`transfers.ts`)
- `createTransferToCreator(params)` -- creates Stripe Transfer with source_transaction for fund availability timing
- `processPendingTransfers(creatorUserId, stripeAccountId)` -- batch processes all pending transfers for a creator with per-transfer error isolation

### Checkout Modification
- Added `payment_intent_data.transfer_group: link_{linkId}` for charge-transfer traceability

### Webhook Enhancements
- **Transfer-after-checkout:** After recording a transaction, checks if creator has active Connect account. If yes, creates immediate transfer. If no, marks transaction as pending.
- **handleAccountUpdated:** Syncs `charges_enabled`, `payouts_enabled`, `details_submitted`, `onboarding_complete` from Stripe account state. Triggers pending transfer processing when charges become enabled.
- **Dual-secret verification:** Webhook route tries primary secret, falls back to Connect webhook secret for account.updated events from connected accounts.

## Decisions Made

| Decision | Rationale |
|----------|-----------|
| Dual webhook secret verification | Connect account.updated events may arrive with a different signing secret than regular events; fallback pattern handles both |
| Transfer error isolation | Transfer failure must never break the checkout webhook response or prevent receipt emails; each pending transfer processes independently |
| Pending transfer pattern | Transactions start as 'not_applicable'; become 'pending' if creator hasn't onboarded; batch-processed when account.updated with charges_enabled fires |
| source_transaction on transfers | Uses source_transaction instead of direct transfer to handle Stripe fund availability timing automatically |

## Deviations from Plan

None -- plan executed exactly as written.

## Commits

| Hash | Message |
|------|---------|
| bbe9d4a | feat(04-01): database migration + Connect/Transfer Stripe libraries |
| ee8c341 | feat(04-01): checkout transfer_group + webhook account.updated + transfer logic |

## Next Phase Readiness

Plan 04-02 (onboarding UI + earnings display) can now:
- Use `createExpressAccount` and `createAccountLink` to build the onboarding flow
- Read `charges_enabled`, `onboarding_complete` from user record for UI state
- Trust that transfers happen automatically after checkout or upon onboarding completion
- Display transfer_status on transaction records for earnings visibility
