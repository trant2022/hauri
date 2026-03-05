import Stripe from "stripe"
import { stripe } from "./client"
import { calculateFees } from "@/lib/fees"

interface CreateCheckoutParams {
  linkId: string
  slug: string
  linkTitle: string
  priceAmountCents: number
  currency: string
}

export async function createCheckoutSession({
  linkId,
  slug,
  linkTitle,
  priceAmountCents,
  currency,
}: CreateCheckoutParams): Promise<string | null> {
  const fees = calculateFees(priceAmountCents)
  const appUrl = process.env.NEXT_PUBLIC_APP_URL!

  // TWINT is only available for CHF currency
  const paymentMethodTypes: Stripe.Checkout.SessionCreateParams.PaymentMethodType[] =
    currency.toLowerCase() === "chf" ? ["card", "twint"] : ["card"]

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    payment_method_types: paymentMethodTypes,
    line_items: [
      {
        price_data: {
          currency: currency.toLowerCase(),
          unit_amount: fees.totalBuyerPays,
          product_data: {
            name: linkTitle,
          },
        },
        quantity: 1,
      },
    ],
    metadata: {
      link_id: linkId,
      base_price: String(priceAmountCents),
      platform_fee: String(fees.platformFee),
      creator_amount: String(fees.creatorReceives),
    },
    success_url: `${appUrl}/l/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${appUrl}/l/${slug}`,
  })

  return session.url
}
