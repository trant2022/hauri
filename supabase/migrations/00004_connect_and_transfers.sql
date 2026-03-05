-- Phase 4: Stripe Connect onboarding state + transfer tracking

-- Add Connect onboarding status columns to users
ALTER TABLE public.users
ADD COLUMN charges_enabled boolean DEFAULT false,
ADD COLUMN payouts_enabled boolean DEFAULT false,
ADD COLUMN details_submitted boolean DEFAULT false,
ADD COLUMN onboarding_complete boolean DEFAULT false;

-- Index on stripe_account_id for webhook lookups
CREATE INDEX idx_users_stripe_account_id
ON public.users (stripe_account_id) WHERE stripe_account_id IS NOT NULL;

-- Add transfer tracking columns to transactions
ALTER TABLE public.transactions
ADD COLUMN stripe_transfer_id text,
ADD COLUMN transfer_status text DEFAULT 'not_applicable';

-- Partial index for pending transfer queries
CREATE INDEX idx_transactions_transfer_pending
ON public.transactions (transfer_status) WHERE transfer_status = 'pending';
