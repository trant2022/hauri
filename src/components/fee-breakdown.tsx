import { calculateFees, formatPrice } from "@/lib/fees"
import { Separator } from "@/components/ui/separator"

interface FeeBreakdownProps {
  basePriceInCents: number
  currency: string
}

export function FeeBreakdown({ basePriceInCents, currency }: FeeBreakdownProps) {
  const fees = calculateFees(basePriceInCents)

  return (
    <div className="w-full space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">Price</span>
        <span className="text-sm text-muted-foreground">
          {formatPrice(fees.basePriceInCents, currency)}
        </span>
      </div>
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">Service fee</span>
        <span className="text-sm text-muted-foreground">
          {formatPrice(fees.buyerSurcharge, currency)}
        </span>
      </div>
      <Separator />
      <div className="flex items-center justify-between">
        <span className="text-base font-semibold text-foreground">Total</span>
        <span className="text-base font-semibold text-foreground">
          {formatPrice(fees.totalBuyerPays, currency)}
        </span>
      </div>
    </div>
  )
}
