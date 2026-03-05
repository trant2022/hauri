import Image from "next/image"
import { FileIcon, Lock } from "lucide-react"

import { calculateFees, formatPrice, formatFileSize } from "@/lib/fees"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
} from "@/components/ui/card"
import { FeeBreakdown } from "@/components/fee-breakdown"

export interface LinkPageData {
  id: string
  title: string
  description: string | null
  preview_url: string | null
  price_amount: number
  price_currency: string
  files: {
    name: string
    mime_type: string
    size_bytes: number
  }
}

function getFileTypeLabel(mimeType: string): string {
  if (mimeType.startsWith("image/")) return "Image"
  if (mimeType.startsWith("video/")) return "Video"
  if (mimeType.startsWith("audio/")) return "Audio"
  if (mimeType === "application/pdf") return "PDF"
  if (mimeType.includes("zip") || mimeType.includes("archive")) return "Archive"
  if (mimeType.includes("spreadsheet") || mimeType.includes("excel")) return "Spreadsheet"
  if (mimeType.includes("document") || mimeType.includes("word")) return "Document"
  if (mimeType.includes("presentation") || mimeType.includes("powerpoint")) return "Presentation"
  if (mimeType.startsWith("text/")) return "Text"
  return "File"
}

interface LinkPageCardProps {
  link: LinkPageData
}

export function LinkPageCard({ link }: LinkPageCardProps) {
  const fees = calculateFees(link.price_amount)
  const fileTypeLabel = getFileTypeLabel(link.files.mime_type)

  return (
    <Card className="w-full max-w-lg overflow-hidden border-border/50 shadow-lg">
      {/* Preview image or file type icon fallback */}
      {link.preview_url ? (
        <div className="relative aspect-video w-full overflow-hidden">
          <Image
            src={link.preview_url}
            alt={link.title}
            fill
            className="object-cover"
            sizes="(max-width: 512px) 100vw, 512px"
            priority
          />
        </div>
      ) : (
        <div className="flex items-center justify-center bg-muted/30 py-12">
          <div className="flex size-20 items-center justify-center rounded-2xl bg-muted/50">
            <FileIcon className="size-10 text-muted-foreground" />
          </div>
        </div>
      )}

      <CardContent className="space-y-6">
        {/* Title */}
        <h1 className="text-2xl font-bold tracking-tight">{link.title}</h1>

        {/* Description */}
        {link.description && (
          <p className="text-sm leading-relaxed text-muted-foreground">
            {link.description}
          </p>
        )}

        {/* File info */}
        <div className="flex items-center gap-3">
          <Badge variant="secondary">{fileTypeLabel}</Badge>
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <FileIcon className="size-3.5" />
            <span>{link.files.name}</span>
          </div>
          <span className="text-sm text-muted-foreground">
            {formatFileSize(link.files.size_bytes)}
          </span>
        </div>

        {/* Fee breakdown */}
        <FeeBreakdown
          basePriceInCents={link.price_amount}
          currency={link.price_currency}
        />

        {/* Buy button */}
        <Button
          size="lg"
          className="w-full text-base"
          data-link-id={link.id}
        >
          Buy for {formatPrice(fees.totalBuyerPays, link.price_currency)}
        </Button>

        {/* Footer note */}
        <div className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
          <Lock className="size-3" />
          <span>Secure payment via Stripe</span>
        </div>
      </CardContent>
    </Card>
  )
}
