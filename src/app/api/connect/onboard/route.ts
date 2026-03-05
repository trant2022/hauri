import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import {
  createExpressAccount,
  createAccountLink,
} from "@/lib/stripe/connect"

export async function POST() {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { data: profile, error: profileError } = await supabase
      .from("users")
      .select("stripe_account_id, email")
      .eq("id", user.id)
      .single()

    if (profileError || !profile) {
      return NextResponse.json(
        { error: "User profile not found" },
        { status: 404 }
      )
    }

    let accountId = profile.stripe_account_id

    // Create Express account if creator doesn't have one yet
    if (!accountId) {
      accountId = await createExpressAccount(profile.email)
      await supabase
        .from("users")
        .update({ stripe_account_id: accountId })
        .eq("id", user.id)
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL!
    const refreshUrl = `${appUrl}/api/connect/refresh`
    const returnUrl = `${appUrl}/dashboard/settings?connect=return`

    const url = await createAccountLink(accountId, refreshUrl, returnUrl)

    return NextResponse.json({ url })
  } catch (error) {
    console.error("[connect/onboard] Error:", error)
    return NextResponse.json(
      { error: "Failed to start Connect onboarding" },
      { status: 500 }
    )
  }
}
