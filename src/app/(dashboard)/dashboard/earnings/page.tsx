import Link from "next/link"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import {
  getCreatorEarnings,
  getCreatorConnectStatus,
} from "@/lib/supabase/queries"
import { formatPrice } from "@/lib/fees"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

function transferStatusBadge(status: string) {
  switch (status) {
    case "completed":
      return (
        <Badge className="bg-green-500/15 text-green-400 border-green-500/30">
          Completed
        </Badge>
      )
    case "pending":
      return (
        <Badge className="bg-yellow-500/15 text-yellow-400 border-yellow-500/30">
          Pending
        </Badge>
      )
    case "failed":
      return (
        <Badge className="bg-red-500/15 text-red-400 border-red-500/30">
          Failed
        </Badge>
      )
    default:
      return (
        <Badge variant="secondary">N/A</Badge>
      )
  }
}

export default async function EarningsPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login")
  }

  const [earningsResult, connectResult] = await Promise.all([
    getCreatorEarnings(supabase, user.id),
    getCreatorConnectStatus(supabase, user.id),
  ])

  const transactions = earningsResult.data ?? []
  const connectStatus = connectResult.data

  // Aggregate by currency
  const aggregation = new Map<
    string,
    { totalEarned: number; totalTransferred: number; totalPending: number }
  >()

  for (const tx of transactions) {
    const currency = tx.currency
    if (!aggregation.has(currency)) {
      aggregation.set(currency, {
        totalEarned: 0,
        totalTransferred: 0,
        totalPending: 0,
      })
    }
    const agg = aggregation.get(currency)!
    agg.totalEarned += tx.creator_amount

    if (tx.transfer_status === "completed") {
      agg.totalTransferred += tx.creator_amount
    } else if (tx.transfer_status === "pending") {
      agg.totalPending += tx.creator_amount
    }
  }

  // Use first currency for display, or default to CHF
  const primaryCurrency =
    aggregation.size > 0
      ? Array.from(aggregation.keys())[0]
      : "CHF"

  const totals = aggregation.get(primaryCurrency) ?? {
    totalEarned: 0,
    totalTransferred: 0,
    totalPending: 0,
  }

  // Sum pending across all currencies for re-engagement check
  let totalPendingAllCurrencies = 0
  for (const [, agg] of aggregation) {
    totalPendingAllCurrencies += agg.totalPending
  }

  const showReengagement =
    totalPendingAllCurrencies > 0 &&
    connectStatus?.onboarding_complete !== true

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Earnings</h1>
        <p className="mt-1 text-muted-foreground">
          Track your sales and payout status.
        </p>
      </div>

      {/* Re-engagement banner */}
      {showReengagement && (
        <div className="rounded-lg border-l-4 border-yellow-500 bg-yellow-500/10 p-4">
          <p className="text-sm font-medium text-yellow-400">
            You have pending earnings of{" "}
            {Array.from(aggregation.entries())
              .filter(([, a]) => a.totalPending > 0)
              .map(([cur, a]) => formatPrice(a.totalPending, cur))
              .join(", ")}
            . Complete Stripe Connect onboarding to receive your payouts.
          </p>
          <Link
            href="/dashboard/settings"
            className="mt-2 inline-block text-sm font-medium text-yellow-400 underline underline-offset-4 hover:text-yellow-300"
          >
            Complete onboarding
          </Link>
        </div>
      )}

      {transactions.length === 0 ? (
        <div className="rounded-lg border border-border bg-card p-12 text-center">
          <p className="text-muted-foreground">
            No earnings yet. Share your payment links to start earning.
          </p>
        </div>
      ) : (
        <>
          {/* Stats cards */}
          <div className="grid gap-4 sm:grid-cols-3">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total Earned
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">
                  {formatPrice(totals.totalEarned, primaryCurrency)}
                </p>
                {aggregation.size > 1 &&
                  Array.from(aggregation.entries())
                    .filter(([cur]) => cur !== primaryCurrency)
                    .map(([cur, agg]) => (
                      <p
                        key={cur}
                        className="text-sm text-muted-foreground"
                      >
                        + {formatPrice(agg.totalEarned, cur)}
                      </p>
                    ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Transferred
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">
                  {formatPrice(totals.totalTransferred, primaryCurrency)}
                </p>
                {aggregation.size > 1 &&
                  Array.from(aggregation.entries())
                    .filter(([cur]) => cur !== primaryCurrency)
                    .map(([cur, agg]) => (
                      <p
                        key={cur}
                        className="text-sm text-muted-foreground"
                      >
                        + {formatPrice(agg.totalTransferred, cur)}
                      </p>
                    ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Pending
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">
                  {formatPrice(totals.totalPending, primaryCurrency)}
                </p>
                {aggregation.size > 1 &&
                  Array.from(aggregation.entries())
                    .filter(([cur]) => cur !== primaryCurrency)
                    .map(([cur, agg]) => (
                      <p
                        key={cur}
                        className="text-sm text-muted-foreground"
                      >
                        + {formatPrice(agg.totalPending, cur)}
                      </p>
                    ))}
              </CardContent>
            </Card>
          </div>

          {/* Transaction history table */}
          <div className="rounded-lg border border-border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                    Date
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                    Amount
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                    Currency
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                    Transfer Status
                  </th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((tx, i) => (
                  <tr
                    key={i}
                    className="border-b border-border last:border-0"
                  >
                    <td className="px-4 py-3">
                      {new Date(tx.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 font-medium">
                      {formatPrice(tx.creator_amount, tx.currency)}
                    </td>
                    <td className="px-4 py-3 uppercase">
                      {tx.currency}
                    </td>
                    <td className="px-4 py-3">
                      {transferStatusBadge(tx.transfer_status)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}
