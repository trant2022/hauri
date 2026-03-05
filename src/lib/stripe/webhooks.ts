import Stripe from "stripe"
import { supabaseAdmin } from "@/lib/supabase/admin"

export async function handleCheckoutCompleted(
  session: Stripe.Checkout.Session
): Promise<void> {
  // Implementation in Task 2
  void session
  void supabaseAdmin
}

export async function handleDisputeCreated(
  dispute: Stripe.Dispute
): Promise<void> {
  // Implementation in Task 2
  void dispute
}
