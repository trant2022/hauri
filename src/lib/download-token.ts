import { createHmac, timingSafeEqual } from "crypto"

function getSecret() {
  return process.env.DOWNLOAD_TOKEN_SECRET!
}
const TOKEN_TTL_MS = 48 * 60 * 60 * 1000 // 48 hours

interface TokenPayload {
  transactionId: string
  linkId: string
  exp: number
}

export function createDownloadToken(
  transactionId: string,
  linkId: string
): string {
  const payload: TokenPayload = {
    transactionId,
    linkId,
    exp: Date.now() + TOKEN_TTL_MS,
  }

  const data = Buffer.from(JSON.stringify(payload)).toString("base64url")
  const signature = createHmac("sha256", getSecret())
    .update(data)
    .digest("base64url")

  return `${data}.${signature}`
}

export function verifyDownloadToken(token: string): TokenPayload | null {
  const dotIndex = token.indexOf(".")
  if (dotIndex === -1) return null

  const data = token.slice(0, dotIndex)
  const signature = token.slice(dotIndex + 1)
  if (!data || !signature) return null

  const expectedSig = createHmac("sha256", getSecret())
    .update(data)
    .digest("base64url")

  // Constant-time comparison to prevent timing attacks
  const sigBuffer = Buffer.from(signature, "base64url")
  const expectedBuffer = Buffer.from(expectedSig, "base64url")
  if (sigBuffer.length !== expectedBuffer.length) return null
  if (!timingSafeEqual(sigBuffer, expectedBuffer)) return null

  const payload: TokenPayload = JSON.parse(
    Buffer.from(data, "base64url").toString()
  )

  // Check expiration
  if (Date.now() > payload.exp) return null

  return payload
}
