"use client"

import { useCallback, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import {
  MoreHorizontal,
  Pencil,
  Copy,
  Link2,
  ExternalLink,
} from "lucide-react"
import { toast } from "sonner"

import { formatPrice } from "@/lib/fees"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Skeleton } from "@/components/ui/skeleton"

interface LinkRecord {
  id: string
  user_id: string
  file_id: string
  slug: string
  title: string
  description: string | null
  preview_url: string | null
  price_amount: number
  price_currency: string
  max_unlocks: number | null
  unlock_count: number
  is_active: boolean
  created_at: string
  files: {
    name: string
    mime_type: string
    size_bytes: number
  }
}

function formatRelativeDate(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMinutes = Math.floor(diffMs / (1000 * 60))
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffMinutes < 1) return "Just now"
  if (diffMinutes < 60) return `${diffMinutes}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`
  return date.toLocaleDateString()
}

export function LinkList() {
  const router = useRouter()
  const [links, setLinks] = useState<LinkRecord[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [togglingIds, setTogglingIds] = useState<Set<string>>(new Set())

  const fetchLinks = useCallback(async () => {
    try {
      setIsLoading(true)
      const response = await fetch("/api/links")

      if (!response.ok) {
        throw new Error("Failed to fetch links")
      }

      const data = await response.json()
      setLinks(data)
    } catch {
      toast.error("Failed to load links")
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchLinks()
  }, [fetchLinks])

  const handleToggleActive = async (link: LinkRecord) => {
    setTogglingIds((prev) => new Set(prev).add(link.id))

    try {
      const response = await fetch(`/api/links/${link.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !link.is_active }),
      })

      if (!response.ok) {
        throw new Error("Failed to update link")
      }

      // Update local state
      setLinks((prev) =>
        prev.map((l) =>
          l.id === link.id ? { ...l, is_active: !l.is_active } : l
        )
      )

      toast.success(
        link.is_active ? "Link deactivated" : "Link activated"
      )
    } catch {
      toast.error("Failed to update link status")
    } finally {
      setTogglingIds((prev) => {
        const next = new Set(prev)
        next.delete(link.id)
        return next
      })
    }
  }

  const handleCopyLink = (slug: string) => {
    const url = `${window.location.origin}/l/${slug}`
    navigator.clipboard.writeText(url).then(
      () => toast.success("Link copied!"),
      () => toast.error("Failed to copy link")
    )
  }

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 px-4 py-3">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-5 w-20" />
            <Skeleton className="h-5 w-16" />
            <Skeleton className="h-4 w-20" />
          </div>
        ))}
      </div>
    )
  }

  if (links.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-12">
        <Link2 className="mb-3 size-8 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">
          No payment links yet
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          Create your first payment link to start selling
        </p>
        <Button
          variant="outline"
          size="sm"
          className="mt-4"
          onClick={() => router.push("/dashboard/links/new")}
        >
          Create your first link
        </Button>
      </div>
    )
  }

  return (
    <div className="rounded-md border border-border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Title</TableHead>
            <TableHead>File</TableHead>
            <TableHead>Price</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Unlocks</TableHead>
            <TableHead>Created</TableHead>
            <TableHead className="w-10" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {links.map((link) => (
            <TableRow key={link.id}>
              <TableCell className="font-medium">{link.title}</TableCell>
              <TableCell className="max-w-[150px] truncate text-muted-foreground">
                {link.files?.name ?? "Unknown file"}
              </TableCell>
              <TableCell>
                {formatPrice(link.price_amount, link.price_currency)}
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={link.is_active}
                    onCheckedChange={() => handleToggleActive(link)}
                    disabled={togglingIds.has(link.id)}
                    aria-label={
                      link.is_active ? "Deactivate link" : "Activate link"
                    }
                  />
                  <Badge
                    variant={link.is_active ? "default" : "secondary"}
                    className={
                      link.is_active
                        ? "bg-green-500/15 text-green-500 hover:bg-green-500/20"
                        : ""
                    }
                  >
                    {link.is_active ? "Active" : "Inactive"}
                  </Badge>
                </div>
              </TableCell>
              <TableCell className="text-muted-foreground">
                {link.unlock_count}
                {link.max_unlocks !== null ? `/${link.max_unlocks}` : ""}
              </TableCell>
              <TableCell className="text-muted-foreground">
                {formatRelativeDate(link.created_at)}
              </TableCell>
              <TableCell>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="size-8">
                      <MoreHorizontal className="size-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      onClick={() =>
                        router.push(`/dashboard/links/${link.id}/edit`)
                      }
                    >
                      <Pencil className="mr-2 size-4" />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => handleCopyLink(link.slug)}
                    >
                      <Copy className="mr-2 size-4" />
                      Copy Link
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => {
                        window.open(`/l/${link.slug}`, "_blank")
                      }}
                    >
                      <ExternalLink className="mr-2 size-4" />
                      View Page
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
