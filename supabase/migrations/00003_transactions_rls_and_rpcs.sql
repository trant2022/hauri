-- Phase 3: Transactions RLS, payment_intent_id column, and atomic RPC functions

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

-- Atomic increment for unlock_count (used after successful payment)
CREATE OR REPLACE FUNCTION increment_unlock_count(link_id_param uuid)
RETURNS void
LANGUAGE sql
AS $$
  UPDATE public.links
  SET unlock_count = unlock_count + 1
  WHERE id = link_id_param;
$$;

-- Atomic decrement for unlock_count (used after dispute/refund)
CREATE OR REPLACE FUNCTION decrement_unlock_count(link_id_param uuid)
RETURNS void
LANGUAGE sql
AS $$
  UPDATE public.links
  SET unlock_count = GREATEST(unlock_count - 1, 0)
  WHERE id = link_id_param;
$$;
