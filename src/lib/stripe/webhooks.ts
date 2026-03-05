import Stripe from "stripe"
import { supabaseAdmin } from "@/lib/supabase/admin"
import { sendPurchaseReceipt } from "@/lib/email/send-receipt"

export async function handleCheckoutCompleted(
  session: Stripe.Checkout.Session
): Promise<void> {
  const { link_id, platform_fee, creator_amount } = session.metadata!

  const buyerEmail =
    session.customer_details?.email ?? session.customer_email ?? ""

  const paymentIntentId =
    typeof session.payment_intent === "string"
      ? session.payment_intent
      : session.payment_intent?.id ?? null

  const { data: transaction, error } = await supabaseAdmin
    .from("transactions")
    .insert({
      link_id,
      buyer_email: buyerEmail,
      amount_paid: session.amount_total!,
      platform_fee: Number(platform_fee),
      creator_amount: Number(creator_amount),
      currency: session.currency!.toUpperCase(),
      stripe_session_id: session.id,
      stripe_payment_intent_id: paymentIntentId,
      status: "completed",
    })
    .select("id")
    .single()

  if (error) {
    // Unique constraint violation on stripe_session_id -- duplicate webhook delivery
    if (error.code === "23505") {
      console.log(
        `Duplicate webhook, transaction already recorded for session: ${session.id}`
      )
      return
    }
    throw error
  }

  await supabaseAdmin.rpc("increment_unlock_count", {
    link_id_param: link_id,
  })

  console.log(`Transaction recorded for session: ${session.id}`)

  // Send purchase receipt email (fire-and-forget)
  const { data: linkData } = await supabaseAdmin
    .from("links")
    .select("title")
    .eq("id", link_id)
    .single()

  if (linkData && buyerEmail) {
    sendPurchaseReceipt({
      buyerEmail,
      transactionId: transaction.id,
      linkId: link_id,
      linkTitle: linkData.title,
      amountPaid: session.amount_total!,
      currency: session.currency!.toUpperCase(),
    }).catch((err) => console.error("Failed to send receipt email:", err))
  }
}

export async function handleDisputeCreated(
  dispute: Stripe.Dispute
): Promise<void> {
  const paymentIntentId =
    typeof dispute.payment_intent === "string"
      ? dispute.payment_intent
      : dispute.payment_intent?.id

  if (!paymentIntentId) {
    console.warn("Dispute received without payment_intent:", dispute.id)
    return
  }

  const { data: transaction, error } = await supabaseAdmin
    .from("transactions")
    .update({ status: "disputed" })
    .eq("stripe_payment_intent_id", paymentIntentId)
    .select("id, link_id")
    .single()

  if (!transaction) {
    console.warn(
      `Dispute for unknown transaction, payment_intent: ${paymentIntentId}`
    )
    return
  }

  if (error) {
    throw error
  }

  await supabaseAdmin.rpc("decrement_unlock_count", {
    link_id_param: transaction.link_id,
  })

  console.log(
    `Dispute recorded, download access revoked for transaction: ${transaction.id}`
  )
}
