import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { ConnectStatus } from "./connect-status"

type ConnectState = "NOT_STARTED" | "ONBOARDING" | "PENDING" | "ACTIVE"

function deriveConnectStatus(profile: {
  stripe_account_id: string | null
  charges_enabled: boolean
  payouts_enabled: boolean
  details_submitted: boolean
}): ConnectState {
  if (!profile.stripe_account_id) return "NOT_STARTED"
  if (!profile.details_submitted) return "ONBOARDING"
  if (profile.charges_enabled && profile.payouts_enabled) return "ACTIVE"
  return "PENDING"
}

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ connect?: string }>
}) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login")
  }

  const { data: profile } = await supabase
    .from("users")
    .select(
      "email, username, stripe_account_id, charges_enabled, payouts_enabled, details_submitted, onboarding_complete"
    )
    .eq("id", user.id)
    .single()

  if (!profile) {
    redirect("/login")
  }

  const connectStatus = deriveConnectStatus(profile)
  const params = await searchParams
  const showReturnNote = params.connect === "return"
  const showErrorNote = params.connect === "error"

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="mt-1 text-muted-foreground">
          Manage your account and payout settings.
        </p>
      </div>

      {showReturnNote && (
        <div className="rounded-lg border border-blue-500/30 bg-blue-500/10 px-4 py-3 text-sm text-blue-400">
          You returned from Stripe Connect. Your account status will update
          shortly as Stripe verifies your details.
        </div>
      )}

      {showErrorNote && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          Something went wrong with Connect onboarding. Please try again.
        </div>
      )}

      {/* Account Info */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Account</h2>
        <div className="rounded-lg border border-border bg-card p-4 space-y-3">
          <div>
            <p className="text-sm text-muted-foreground">Email</p>
            <p className="text-sm font-medium">{profile.email}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Username</p>
            <p className="text-sm font-medium">{profile.username}</p>
          </div>
        </div>
      </div>

      {/* Connect Status */}
      <ConnectStatus
        status={connectStatus}
        hasStripeAccount={!!profile.stripe_account_id}
      />
    </div>
  )
}
