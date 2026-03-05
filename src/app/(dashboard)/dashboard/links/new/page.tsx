import Link from "next/link"
import { ArrowLeft } from "lucide-react"

import { Button } from "@/components/ui/button"
import { LinkForm } from "@/components/link-form"

export default function NewLinkPage() {
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
          Create Payment Link
        </h1>
        <p className="mt-1 text-muted-foreground">
          Set up a payment link for one of your uploaded files
        </p>
      </div>

      <LinkForm mode="create" />
    </div>
  )
}
