import { NextResponse } from "next/server"

import { supabaseAdmin } from "@/lib/supabase/admin"
import { createCheckoutSession } from "@/lib/stripe/checkout"

export async function POST(req: Request) {
  try {
    const { linkId } = (await req.json()) as { linkId: string }

    if (!linkId) {
      return NextResponse.json(
        { error: "Missing linkId" },
        { status: 400 }
      )
    }

    // Fetch the link with availability checks
    const { data: link, error: linkError } = await supabaseAdmin
      .from("links")
      .select(
        "id, slug, title, price_amount, price_currency, is_active, max_unlocks, unlock_count"
      )
      .eq("id", linkId)
      .single()

    if (linkError || !link) {
      return NextResponse.json(
        { error: "Link not available" },
        { status: 400 }
      )
    }

    // Validate link is active and not sold out
    if (!link.is_active) {
      return NextResponse.json(
        { error: "Link not available" },
        { status: 400 }
      )
    }

    if (link.max_unlocks !== null && link.unlock_count >= link.max_unlocks) {
      return NextResponse.json(
        { error: "Link not available" },
        { status: 400 }
      )
    }

    // Create Stripe Checkout session
    const checkoutUrl = await createCheckoutSession({
      linkId: link.id,
      slug: link.slug,
      linkTitle: link.title,
      priceAmountCents: link.price_amount,
      currency: link.price_currency,
    })

    if (!checkoutUrl) {
      return NextResponse.json(
        { error: "Failed to create checkout session" },
        { status: 500 }
      )
    }

    return NextResponse.json({ url: checkoutUrl })
  } catch (error) {
    console.error("Checkout error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
