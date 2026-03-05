import { Resend } from "resend"
import { PurchaseReceiptEmail } from "./templates/purchase-receipt"
import { createDownloadToken } from "@/lib/download-token"
import { formatPrice } from "@/lib/fees"

let _resend: Resend | null = null

function getResend(): Resend {
  if (!_resend) {
    _resend = new Resend(process.env.RESEND_API_KEY)
  }
  return _resend
}

interface SendReceiptParams {
  buyerEmail: string
  transactionId: string
  linkId: string
  linkTitle: string
  amountPaid: number
  currency: string
}

export async function sendPurchaseReceipt(
  params: SendReceiptParams
): Promise<void> {
  const token = createDownloadToken(params.transactionId, params.linkId)
  const downloadUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/download/${token}`
  const amountFormatted = formatPrice(params.amountPaid, params.currency)

  const { error } = await getResend().emails.send({
    from: "Unlockt <onboarding@resend.dev>",
    to: params.buyerEmail,
    subject: `Your purchase: ${params.linkTitle}`,
    react: PurchaseReceiptEmail({
      linkTitle: params.linkTitle,
      amountFormatted,
      downloadUrl,
    }),
  })

  if (error) {
    throw error
  }
}
