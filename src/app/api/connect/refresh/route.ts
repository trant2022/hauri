import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAccountLink } from "@/lib/stripe/connect"

export async function GET() {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.redirect(
        new URL("/login", process.env.NEXT_PUBLIC_APP_URL!)
      )
    }

    const { data: profile } = await supabase
      .from("users")
      .select("stripe_account_id")
      .eq("id", user.id)
      .single()

    if (!profile?.stripe_account_id) {
      return NextResponse.redirect(
        new URL("/dashboard/settings", process.env.NEXT_PUBLIC_APP_URL!)
      )
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL!
    const refreshUrl = `${appUrl}/api/connect/refresh`
    const returnUrl = `${appUrl}/dashboard/settings?connect=return`

    const url = await createAccountLink(
      profile.stripe_account_id,
      refreshUrl,
      returnUrl
    )

    return NextResponse.redirect(url)
  } catch (error) {
    console.error("[connect/refresh] Error:", error)
    return NextResponse.redirect(
      new URL(
        "/dashboard/settings?connect=error",
        process.env.NEXT_PUBLIC_APP_URL!
      )
    )
  }
}
