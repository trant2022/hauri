import Stripe from "stripe"
import { supabaseAdmin } from "@/lib/supabase/admin"
import { sendPurchaseReceipt } from "@/lib/email/send-receipt"
import { createTransferToCreator, processPendingTransfers } from "./transfers"

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

  // Attempt transfer to creator's connected account
  try {
    const { data: linkWithCreator } = await supabaseAdmin
      .from("links")
      .select("user_id, users!inner(stripe_account_id, charges_enabled)")
      .eq("id", link_id)
      .single()

    const creator = linkWithCreator?.users as unknown as {
      stripe_account_id: string | null
      charges_enabled: boolean
    } | null

    if (
      creator?.stripe_account_id &&
      creator.charges_enabled === true &&
      paymentIntentId
    ) {
      const transferId = await createTransferToCreator({
        amount: Number(creator_amount),
        currency: session.currency!.toLowerCase(),
        destinationAccountId: creator.stripe_account_id,
        sourceTransaction: paymentIntentId,
        transferGroup: `link_${link_id}`,
      })

      await supabaseAdmin
        .from("transactions")
        .update({
          stripe_transfer_id: transferId,
          transfer_status: "completed",
        })
        .eq("id", transaction.id)

      console.log(`Transfer ${transferId} created for transaction ${transaction.id}`)
    } else {
      // Creator hasn't onboarded yet -- mark for later processing
      await supabaseAdmin
        .from("transactions")
        .update({ transfer_status: "pending" })
        .eq("id", transaction.id)

      console.log(
        `Transfer pending for transaction ${transaction.id} (creator not onboarded)`
      )
    }
  } catch (transferErr) {
    console.error(
      `Transfer failed for transaction ${transaction.id}:`,
      transferErr
    )

    await supabaseAdmin
      .from("transactions")
      .update({ transfer_status: "failed" })
      .eq("id", transaction.id)
  }

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

/**
 * Handles account.updated webhook events from Stripe Connect.
 * Updates the creator's Connect onboarding state and processes
 * any pending transfers when charges become enabled.
 */
export async function handleAccountUpdated(
  account: Stripe.Account
): Promise<void> {
  // Look up user by their connected account ID
  const { data: user, error: userError } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("stripe_account_id", account.id)
    .single()

  if (userError || !user) {
    console.warn(
      `Received account.updated for unknown account: ${account.id}`
    )
    return
  }

  const chargesEnabled = account.charges_enabled ?? false
  const payoutsEnabled = account.payouts_enabled ?? false
  const detailsSubmitted = account.details_submitted ?? false
  const onboardingComplete = chargesEnabled && payoutsEnabled

  await supabaseAdmin
    .from("users")
    .update({
      charges_enabled: chargesEnabled,
      payouts_enabled: payoutsEnabled,
      details_submitted: detailsSubmitted,
      onboarding_complete: onboardingComplete,
    })
    .eq("id", user.id)

  console.log(
    `Account ${account.id} updated: charges=${chargesEnabled}, payouts=${payoutsEnabled}, details=${detailsSubmitted}`
  )

  // Process pending transfers if creator just became active
  if (chargesEnabled) {
    try {
      await processPendingTransfers(user.id, account.id)
    } catch (err) {
      console.error(
        `Failed to process pending transfers for account ${account.id}:`,
        err
      )
    }
  }
}
