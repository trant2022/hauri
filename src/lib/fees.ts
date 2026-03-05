/**
 * Fee calculation module.
 *
 * Fee structure:
 * - Buyer pays: base_price + 15% surcharge
 * - Creator receives: base_price - 10% deduction
 * - Platform keeps: 15% surcharge + 10% deduction
 *
 * All amounts in smallest currency unit (cents/rappen).
 * Uses integer arithmetic only -- no floating point.
 */

export interface FeeBreakdown {
  basePriceInCents: number
  buyerSurcharge: number
  totalBuyerPays: number
  creatorDeduction: number
  creatorReceives: number
  platformFee: number
}

export function calculateFees(basePriceInCents: number): FeeBreakdown {
  const buyerSurcharge = Math.round(basePriceInCents * 0.15)
  const totalBuyerPays = basePriceInCents + buyerSurcharge
  const creatorDeduction = Math.round(basePriceInCents * 0.10)
  const creatorReceives = basePriceInCents - creatorDeduction
  const platformFee = buyerSurcharge + creatorDeduction

  return {
    basePriceInCents,
    buyerSurcharge,
    totalBuyerPays,
    creatorDeduction,
    creatorReceives,
    platformFee,
  }
}

/**
 * Formats an amount in cents to a display string using Intl.NumberFormat.
 */
export function formatPrice(
  amountInCents: number,
  currency: string
): string {
  const amount = amountInCents / 100
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: currency,
  }).format(amount)
}

/**
 * Formats a file size in bytes to a human-readable string.
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B"

  const units = ["B", "KB", "MB", "GB", "TB"]
  const k = 1024
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  const size = bytes / Math.pow(k, i)

  return `${size % 1 === 0 ? size : size.toFixed(1)} ${units[i]}`
}

export const SUPPORTED_CURRENCIES = ["CHF", "EUR", "USD", "GBP"] as const
export type SupportedCurrency = (typeof SUPPORTED_CURRENCIES)[number]
