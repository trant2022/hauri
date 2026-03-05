import Link from "next/link"
import { Plus } from "lucide-react"

import { Button } from "@/components/ui/button"
import { LinkList } from "@/components/link-list"

export default function LinksPage() {
  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Payment Links</h1>
          <p className="mt-1 text-muted-foreground">
            Create and manage your payment links
          </p>
        </div>
        <Button asChild>
          <Link href="/dashboard/links/new">
            <Plus className="mr-2 size-4" />
            New Link
          </Link>
        </Button>
      </div>

      <LinkList />
    </div>
  )
}
