import { NextResponse } from "next/server"

import { verifyDownloadToken } from "@/lib/download-token"
import { supabaseAdmin } from "@/lib/supabase/admin"

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params
  const payload = verifyDownloadToken(token)

  if (!payload) {
    return NextResponse.json(
      { error: "Invalid or expired download link" },
      { status: 403 }
    )
  }

  // Verify transaction exists and is not disputed
  const { data: transaction } = await supabaseAdmin
    .from("transactions")
    .select("link_id, status")
    .eq("id", payload.transactionId)
    .single()

  if (!transaction || transaction.status === "disputed") {
    return NextResponse.json(
      { error: "Download access revoked" },
      { status: 403 }
    )
  }

  // Verify link_id matches to prevent token tampering
  if (transaction.link_id !== payload.linkId) {
    return NextResponse.json(
      { error: "Invalid or expired download link" },
      { status: 403 }
    )
  }

  // Get file path from link
  const { data: link } = await supabaseAdmin
    .from("links")
    .select("files(storage_path, name)")
    .eq("id", payload.linkId)
    .single()

  // Handle Supabase join result
  const fileData = link?.files as unknown as {
    storage_path: string
    name: string
  } | null

  if (!fileData) {
    return NextResponse.json({ error: "File not found" }, { status: 404 })
  }

  // Generate fresh signed URL (60s expiry)
  const { data: signedUrlData, error: signedUrlError } =
    await supabaseAdmin.storage
      .from("files")
      .createSignedUrl(fileData.storage_path, 60, {
        download: fileData.name,
      })

  if (signedUrlError || !signedUrlData?.signedUrl) {
    return NextResponse.json(
      { error: "Failed to generate download link" },
      { status: 500 }
    )
  }

  return NextResponse.redirect(signedUrlData.signedUrl)
}
