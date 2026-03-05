import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { fileUploadSchema } from "@/lib/validations/file"
import { getUserFiles, createFileRecord } from "@/lib/supabase/queries"

const RATE_LIMIT_MAX_UPLOADS = 20
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000 // 1 hour

export async function GET() {
  try {
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { data: files, error } = await getUserFiles(supabase, user.id)

    if (error) {
      return NextResponse.json(
        { error: "Failed to fetch files" },
        { status: 500 }
      )
    }

    return NextResponse.json(files)
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Rate limiting: count uploads in last hour
    const oneHourAgo = new Date(
      Date.now() - RATE_LIMIT_WINDOW_MS
    ).toISOString()

    const { count, error: countError } = await supabase
      .from("files")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)
      .gte("created_at", oneHourAgo)

    if (countError) {
      return NextResponse.json(
        { error: "Failed to check rate limit" },
        { status: 500 }
      )
    }

    if (count !== null && count >= RATE_LIMIT_MAX_UPLOADS) {
      return NextResponse.json(
        { error: "Upload limit reached. Maximum 20 uploads per hour." },
        { status: 429 }
      )
    }

    // Validate request body
    const body = await request.json()
    const parsed = fileUploadSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid input" },
        { status: 400 }
      )
    }

    const { name, sizeBytes, mimeType, storagePath } = parsed.data

    // Verify file exists in storage
    const folder = storagePath.split("/").slice(0, -1).join("/")
    const fileName = storagePath.split("/").pop() ?? ""

    const { data: storageFiles, error: storageError } = await supabase.storage
      .from("files")
      .list(folder, { search: fileName })

    if (storageError || !storageFiles?.length) {
      return NextResponse.json(
        { error: "File not found in storage" },
        { status: 400 }
      )
    }

    // Create file record in database
    const { data: file, error: insertError } = await createFileRecord(
      supabase,
      {
        user_id: user.id,
        name,
        size_bytes: sizeBytes,
        mime_type: mimeType,
        storage_path: storagePath,
      }
    )

    if (insertError) {
      return NextResponse.json(
        { error: "Failed to create file record" },
        { status: 500 }
      )
    }

    return NextResponse.json(file, { status: 201 })
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
