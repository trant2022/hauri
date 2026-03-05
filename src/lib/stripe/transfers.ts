import { stripe } from "./client"
import { supabaseAdmin } from "@/lib/supabase/admin"

/**
 * Creates a Stripe Transfer to a creator's connected account.
 * Uses source_transaction to handle fund availability timing.
 * Returns the transfer ID.
 */
export async function createTransferToCreator(params: {
  amount: number
  currency: string
  destinationAccountId: string
  sourceTransaction: string
  transferGroup: string
  metadata?: Record<string, string>
}): Promise<string> {
  const transfer = await stripe.transfers.create({
    amount: params.amount,
    currency: params.currency,
    destination: params.destinationAccountId,
    source_transaction: params.sourceTransaction,
    transfer_group: params.transferGroup,
    metadata: params.metadata,
  })

  return transfer.id
}

/**
 * Processes all pending transfers for a creator who just completed onboarding.
 * Finds transactions via the links table (links owned by creator).
 * Each transfer is isolated -- one failure doesn't block the rest.
 */
export async function processPendingTransfers(
  creatorUserId: string,
  stripeAccountId: string
): Promise<void> {
  // Find all links owned by this creator
  const { data: links, error: linksError } = await supabaseAdmin
    .from("links")
    .select("id")
    .eq("user_id", creatorUserId)

  if (linksError || !links || links.length === 0) {
    console.log(
      `No links found for creator ${creatorUserId}, skipping pending transfers`
    )
    return
  }

  const linkIds = links.map((l) => l.id)

  // Find pending transactions for those links
  const { data: pendingTxns, error: txnError } = await supabaseAdmin
    .from("transactions")
    .select("id, creator_amount, currency, stripe_payment_intent_id, link_id")
    .in("link_id", linkIds)
    .eq("transfer_status", "pending")

  if (txnError || !pendingTxns || pendingTxns.length === 0) {
    console.log(
      `No pending transfers for creator ${creatorUserId}`
    )
    return
  }

  console.log(
    `Processing ${pendingTxns.length} pending transfers for creator ${creatorUserId}`
  )

  for (const txn of pendingTxns) {
    try {
      if (!txn.stripe_payment_intent_id) {
        console.warn(
          `Transaction ${txn.id} missing payment_intent_id, skipping transfer`
        )
        continue
      }

      const transferId = await createTransferToCreator({
        amount: txn.creator_amount,
        currency: txn.currency.toLowerCase(),
        destinationAccountId: stripeAccountId,
        sourceTransaction: txn.stripe_payment_intent_id,
        transferGroup: `link_${txn.link_id}`,
      })

      await supabaseAdmin
        .from("transactions")
        .update({
          stripe_transfer_id: transferId,
          transfer_status: "completed",
        })
        .eq("id", txn.id)

      console.log(
        `Transfer ${transferId} completed for transaction ${txn.id}`
      )
    } catch (err) {
      console.error(
        `Failed to process transfer for transaction ${txn.id}:`,
        err
      )

      await supabaseAdmin
        .from("transactions")
        .update({ transfer_status: "failed" })
        .eq("id", txn.id)
    }
  }
}
