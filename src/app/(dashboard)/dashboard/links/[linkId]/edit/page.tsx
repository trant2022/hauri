"use client"

import { use } from "react"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"

import { Button } from "@/components/ui/button"
import { LinkForm } from "@/components/link-form"

interface EditLinkPageProps {
  params: Promise<{ linkId: string }>
}

export default function EditLinkPage({ params }: EditLinkPageProps) {
  const { linkId } = use(params)

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <Button variant="ghost" size="sm" asChild className="mb-2">
          <Link href="/dashboard/links">
            <ArrowLeft className="mr-2 size-4" />
            Back to links
          </Link>
        </Button>
        <h1 className="text-2xl font-bold tracking-tight">
          Edit Payment Link
        </h1>
        <p className="mt-1 text-muted-foreground">
          Update your payment link details
        </p>
      </div>

      <LinkForm mode="edit" linkId={linkId} />
    </div>
  )
}
