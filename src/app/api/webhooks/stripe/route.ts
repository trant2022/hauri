import { headers } from "next/headers"
import { NextResponse } from "next/server"
import Stripe from "stripe"

import { stripe } from "@/lib/stripe/client"
import {
  handleCheckoutCompleted,
  handleDisputeCreated,
  handleAccountUpdated,
} from "@/lib/stripe/webhooks"

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!
const connectWebhookSecret = process.env.STRIPE_CONNECT_WEBHOOK_SECRET

export async function POST(req: Request) {
  const body = await req.text()
  const signature = (await headers()).get("stripe-signature")

  if (!signature) {
    return NextResponse.json(
      { error: "Missing stripe-signature header" },
      { status: 400 }
    )
  }

  let event: Stripe.Event

  // Dual-secret verification: try primary secret first, then Connect secret
  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
  } catch (primaryErr) {
    if (
      connectWebhookSecret &&
      connectWebhookSecret !== webhookSecret
    ) {
      try {
        event = stripe.webhooks.constructEvent(
          body,
          signature,
          connectWebhookSecret
        )
      } catch {
        console.error("Webhook signature verification failed (both secrets):", primaryErr)
        return NextResponse.json(
          { error: "Invalid signature" },
          { status: 400 }
        )
      }
    } else {
      console.error("Webhook signature verification failed:", primaryErr)
      return NextResponse.json(
        { error: "Invalid signature" },
        { status: 400 }
      )
    }
  }

  try {
    switch (event.type) {
      case "checkout.session.completed":
        await handleCheckoutCompleted(
          event.data.object as Stripe.Checkout.Session
        )
        break
      case "charge.dispute.created":
        await handleDisputeCreated(event.data.object as Stripe.Dispute)
        break
      case "account.updated":
        await handleAccountUpdated(event.data.object as Stripe.Account)
        break
      default:
        console.log(`Unhandled webhook event type: ${event.type}`)
    }
  } catch (err) {
    console.error(`Error handling webhook event ${event.type}:`, err)
    // Return 200 even on handler errors to prevent Stripe retries
    // for application errors. Only signature failures should return non-200.
  }

  return NextResponse.json({ received: true })
}
