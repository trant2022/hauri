"use client"

import { useState } from "react"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

type ConnectState = "NOT_STARTED" | "ONBOARDING" | "PENDING" | "ACTIVE"

const STATUS_CONFIG = {
  NOT_STARTED: {
    description:
      "Connect your bank account to receive payouts from your sales.",
    dotColor: "bg-muted-foreground",
    label: "Not connected",
    buttonText: "Connect with Stripe",
    showButton: true,
  },
  ONBOARDING: {
    description:
      "You started onboarding but haven't finished. Resume to start receiving payouts.",
    dotColor: "bg-yellow-500",
    label: "Incomplete",
    buttonText: "Resume onboarding",
    showButton: true,
  },
  PENDING: {
    description:
      "Your account is under review by Stripe. This usually takes 1-2 business days.",
    dotColor: "bg-yellow-500",
    label: "Under review",
    buttonText: "",
    showButton: false,
  },
  ACTIVE: {
    description:
      "Your account is active. Payouts are automatically deposited to your bank account.",
    dotColor: "bg-green-500",
    label: "Active",
    buttonText: "",
    showButton: false,
  },
} as const

export function ConnectStatus({
  status,
}: {
  status: ConnectState
  hasStripeAccount: boolean
}) {
  const [loading, setLoading] = useState(false)
  const config = STATUS_CONFIG[status]

  async function handleConnect() {
    setLoading(true)
    try {
      const res = await fetch("/api/connect/onboard", { method: "POST" })
      const data = await res.json()

      if (!res.ok || data.error) {
        toast.error(data.error ?? "Failed to start onboarding")
        return
      }

      // Redirect to Stripe hosted onboarding (leaving the app)
      window.location.href = data.url
    } catch {
      toast.error("Something went wrong. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Payouts</h2>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Stripe Connect</CardTitle>
            <div className="flex items-center gap-2">
              <span
                className={`inline-block size-2 rounded-full ${config.dotColor}`}
              />
              <span className="text-sm text-muted-foreground">
                {config.label}
              </span>
            </div>
          </div>
          <CardDescription>{config.description}</CardDescription>
        </CardHeader>
        <CardContent>
          {config.showButton && (
            <Button onClick={handleConnect} disabled={loading}>
              {loading && <Loader2 className="mr-2 size-4 animate-spin" />}
              {config.buttonText}
            </Button>
          )}
          {status === "ACTIVE" && (
            <p className="text-sm text-muted-foreground">
              Stripe automatically deposits your earnings to your bank account
              daily.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
