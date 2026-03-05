import { cache } from "react"
import type { Metadata } from "next"
import { notFound } from "next/navigation"
import Link from "next/link"

import { supabaseAdmin } from "@/lib/supabase/admin"
import { getPublicLinkBySlug } from "@/lib/supabase/queries"
import { LinkPageCard } from "@/components/link-page-card"

const getLink = cache(async (slug: string) => {
  const { data } = await getPublicLinkBySlug(supabaseAdmin, slug)
  return data
})

interface PageProps {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params
  const link = await getLink(slug)

  if (!link || !link.is_active) {
    return { title: "Not Found" }
  }

  const description = link.description || "Get this file on Unlockt"
  const hasPreview = !!link.preview_url

  return {
    title: link.title,
    description,
    openGraph: {
      title: link.title,
      description,
      type: "website",
      ...(hasPreview && link.preview_url
        ? { images: [{ url: link.preview_url }] }
        : {}),
    },
    twitter: {
      card: hasPreview ? "summary_large_image" : "summary",
    },
  }
}

export default async function PublicLinkPage({ params }: PageProps) {
  const { slug } = await params
  const link = await getLink(slug)

  if (!link || !link.is_active) {
    notFound()
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="flex w-full flex-col items-center gap-8">
        <LinkPageCard
          link={{
            id: link.id,
            title: link.title,
            description: link.description,
            preview_url: link.preview_url,
            price_amount: link.price_amount,
            price_currency: link.price_currency,
            files: link.files as {
              name: string
              mime_type: string
              size_bytes: number
            },
          }}
        />
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
