import Link from "next/link"
import { redirect } from "next/navigation"
import { DollarSign, ShoppingCart, Link2, Upload, PlusCircle } from "lucide-react"
import { createClient } from "@/lib/supabase/server"
import {
  getCreatorTransactionsWithLinks,
  getUserLinks,
} from "@/lib/supabase/queries"
import { formatPrice } from "@/lib/fees"
import {
  Card,
  CardContent,
  CardDescription,
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
      return <Badge variant="secondary">N/A</Badge>
  }
}

export default async function DashboardPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login")
  }

  const [transactionsResult, linksResult] = await Promise.all([
    getCreatorTransactionsWithLinks(supabase, user.id),
    getUserLinks(supabase, user.id),
  ])

  const transactions = transactionsResult.data ?? []
  const links = linksResult.data ?? []

  // Aggregate total earnings by currency
  const earningsByCurrency = new Map<string, number>()
  for (const tx of transactions) {
    const current = earningsByCurrency.get(tx.currency) ?? 0
    earningsByCurrency.set(tx.currency, current + tx.creator_amount)
  }

  // Total sales count
  const totalSales = transactions.length

  // Active links count
  const activeLinks = links.filter((l) => l.is_active).length

  // Per-link stats
  const perLinkStats = new Map<
    string,
    { title: string; slug: string; sales: number; earnings: number; currency: string }
  >()
  for (const tx of transactions) {
    const link = tx.links
    if (!link) continue
    const linkId = link.id
    if (!perLinkStats.has(linkId)) {
      perLinkStats.set(linkId, {
        title: link.title,
        slug: link.slug,
        sales: 0,
        earnings: 0,
        currency: tx.currency,
      })
    }
    const stats = perLinkStats.get(linkId)!
    stats.sales += 1
    stats.earnings += tx.creator_amount
  }

  // Primary currency for display
  const primaryCurrency =
    earningsByCurrency.size > 0
      ? Array.from(earningsByCurrency.keys())[0]
      : "CHF"
  const primaryEarnings = earningsByCurrency.get(primaryCurrency) ?? 0

  // Transfer history: non-"not_applicable" transfers, most recent 10
  const transferHistory = transactions
    .filter((tx) => tx.transfer_status !== "not_applicable")
    .slice(0, 10)

  // Empty state: no transactions at all
  if (transactions.length === 0 && links.length === 0) {
    return (
      <div className="mx-auto max-w-4xl space-y-8">
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <Card>
          <CardHeader>
            <CardTitle>Welcome to Unlockt</CardTitle>
            <CardDescription>
              Start by uploading a file and creating a payment link.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 sm:flex-row">
            <Link
              href="/dashboard/files"
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              <Upload className="h-4 w-4" />
              Upload a file
            </Link>
            <Link
              href="/dashboard/links"
              className="inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-medium hover:bg-accent"
            >
              <PlusCircle className="h-4 w-4" />
              Create a link
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>

      {/* Summary stat cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Earnings
            </CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {formatPrice(primaryEarnings, primaryCurrency)}
            </p>
            {earningsByCurrency.size > 1 &&
              Array.from(earningsByCurrency.entries())
                .filter(([cur]) => cur !== primaryCurrency)
                .map(([cur, amount]) => (
                  <p
                    key={cur}
                    className="text-sm text-muted-foreground"
                  >
                    + {formatPrice(amount, cur)}
                  </p>
                ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Sales
            </CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{totalSales}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Active Links
            </CardTitle>
            <Link2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{activeLinks}</p>
          </CardContent>
        </Card>
      </div>

      {/* Per-link breakdown table */}
      <div>
        <h2 className="mb-4 text-lg font-semibold">Link Performance</h2>
        {perLinkStats.size === 0 ? (
          <div className="rounded-lg border border-border bg-card p-8 text-center">
            <p className="text-muted-foreground">
              No links yet. Create a payment link to start tracking performance.
            </p>
          </div>
        ) : (
          <div className="rounded-lg border border-border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                    Link
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                    Sales
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                    Earnings
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                    Currency
                  </th>
                </tr>
              </thead>
              <tbody>
                {Array.from(perLinkStats.entries()).map(([linkId, stats]) => (
                  <tr
                    key={linkId}
                    className="border-b border-border last:border-0"
                  >
                    <td className="px-4 py-3">
                      <Link
                        href={`/l/${stats.slug}`}
                        className="font-medium underline underline-offset-4 hover:text-primary"
                      >
                        {stats.title}
                      </Link>
                    </td>
                    <td className="px-4 py-3">{stats.sales}</td>
                    <td className="px-4 py-3 font-medium">
                      {formatPrice(stats.earnings, stats.currency)}
                    </td>
                    <td className="px-4 py-3 uppercase">{stats.currency}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Transfer history */}
      <div>
        <h2 className="mb-4 text-lg font-semibold">Recent Transfers</h2>
        {transferHistory.length === 0 ? (
          <div className="rounded-lg border border-border bg-card p-8 text-center">
            <p className="text-muted-foreground">
              No transfers yet. Transfers will appear here once payouts are processed.
            </p>
          </div>
        ) : (
          <div className="rounded-lg border border-border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                    Date
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                    Link
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                    Amount
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody>
                {transferHistory.map((tx) => (
                  <tr
                    key={tx.id}
                    className="border-b border-border last:border-0"
                  >
                    <td className="px-4 py-3">
                      {new Date(tx.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3">
                      {tx.links ? (
                        <Link
                          href={`/l/${tx.links.slug}`}
                          className="underline underline-offset-4 hover:text-primary"
                        >
                          {tx.links.title}
                        </Link>
                      ) : (
                        <span className="text-muted-foreground">--</span>
                      )}
                    </td>
                    <td className="px-4 py-3 font-medium">
                      {formatPrice(tx.creator_amount, tx.currency)}
                    </td>
                    <td className="px-4 py-3">
                      {transferStatusBadge(tx.transfer_status)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
