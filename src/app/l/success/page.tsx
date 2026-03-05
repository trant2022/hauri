import Link from "next/link"
import { notFound } from "next/navigation"
import { CheckCircle2, Download, Clock } from "lucide-react"

import { stripe } from "@/lib/stripe/client"
import { supabaseAdmin } from "@/lib/supabase/admin"
import { formatPrice } from "@/lib/fees"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"

interface SuccessPageProps {
  searchParams: Promise<{ session_id?: string }>
}

export default async function SuccessPage({ searchParams }: SuccessPageProps) {
  const { session_id } = await searchParams

  if (!session_id) {
    notFound()
  }

  let session
  try {
    session = await stripe.checkout.sessions.retrieve(session_id)
  } catch {
    notFound()
  }

  // Payment not yet confirmed -- show pending state
  if (session.payment_status !== "paid") {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="flex w-full flex-col items-center gap-8">
          <Card className="w-full max-w-lg border-border/50 shadow-lg">
            <CardContent className="flex flex-col items-center gap-6 pt-6 text-center">
              <div className="flex size-16 items-center justify-center rounded-full bg-amber-500/10">
                <Clock className="size-8 text-amber-500" />
              </div>

              <div className="space-y-2">
                <h1 className="text-2xl font-bold tracking-tight">
                  Payment Pending
                </h1>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  Your payment is being processed. You will receive an email
                  with your download link shortly.
                </p>
              </div>
            </CardContent>
          </Card>

          <Link
            href="/"
            className="text-xs text-muted-foreground transition-colors hover:text-foreground"
          >
            Powered by Unlockt
          </Link>
        </div>
      </div>
    )
  }

  // Payment confirmed -- retrieve link and file info
  const linkId = session.metadata?.link_id
  if (!linkId) {
    notFound()
  }

  const { data: link } = await supabaseAdmin
    .from("links")
    .select("title, files(storage_path, name, size_bytes)")
    .eq("id", linkId)
    .single()

  if (!link?.files) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="flex w-full flex-col items-center gap-8">
          <Card className="w-full max-w-lg border-border/50 shadow-lg">
            <CardContent className="flex flex-col items-center gap-6 pt-6 text-center">
              <h1 className="text-2xl font-bold tracking-tight">
                File Not Found
              </h1>
              <p className="text-sm text-muted-foreground">
                We could not locate the file for this purchase. Please contact
                support.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  // Handle Supabase join result -- files is a single object (one-to-one via file_id)
  const fileData = link.files as unknown as {
    storage_path: string
    name: string
    size_bytes: number
  }

  // Generate signed URL for immediate download (60s expiry)
  const { data: signedUrlData } = await supabaseAdmin.storage
    .from("files")
    .createSignedUrl(fileData.storage_path, 60, { download: fileData.name })

  const signedUrl = signedUrlData?.signedUrl
  const amountPaid = session.amount_total ?? 0
  const currency = session.currency ?? "usd"

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="flex w-full flex-col items-center gap-8">
        <Card className="w-full max-w-lg border-border/50 shadow-lg">
          <CardContent className="flex flex-col items-center gap-6 pt-6 text-center">
            {/* Success icon */}
            <div className="flex size-16 items-center justify-center rounded-full bg-emerald-500/10">
              <CheckCircle2 className="size-8 text-emerald-500" />
            </div>

            {/* Heading */}
            <div className="space-y-2">
              <h1 className="text-2xl font-bold tracking-tight">
                Payment Successful!
              </h1>
              <p className="text-sm text-muted-foreground">
                Thank you for your purchase
              </p>
            </div>

            {/* Purchase details */}
            <div className="w-full rounded-lg border bg-muted/30 p-4">
              <div className="flex items-center justify-between">
                <div className="text-left">
                  <p className="font-medium">{fileData.name}</p>
                  <p className="text-sm text-muted-foreground">{link.title}</p>
                </div>
                <p className="font-semibold">
                  {formatPrice(amountPaid, currency)}
                </p>
              </div>
            </div>

            {/* Download button */}
            {signedUrl ? (
              <Button size="lg" className="w-full text-base" asChild>
                <a href={signedUrl} download={fileData.name}>
                  <Download className="mr-2 size-4" />
                  Download File
                </a>
              </Button>
            ) : (
              <p className="text-sm text-destructive">
                Could not generate download link. Please use the link in your
                email.
              </p>
            )}

            {/* Note about expiry */}
            <p className="text-xs leading-relaxed text-muted-foreground">
              This download link expires in 60 seconds. Check your email for a
              link that works for 48 hours.
            </p>
          </CardContent>
        </Card>

        <Link
          href="/"
          className="text-xs text-muted-foreground transition-colors hover:text-foreground"
        >
          Powered by Unlockt
        </Link>
      </div>
    </div>
  )
}
