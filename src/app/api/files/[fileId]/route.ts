import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { deleteFileRecord } from "@/lib/supabase/queries"

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ fileId: string }> }
) {
  try {
    const { fileId } = await params
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Fetch the file record (ensuring ownership)
    const { data: file, error: fetchError } = await supabase
      .from("files")
      .select("*")
      .eq("id", fileId)
      .eq("user_id", user.id)
      .single()

    if (fetchError || !file) {
      return NextResponse.json({ error: "File not found" }, { status: 404 })
    }

    // Deactivate all associated links before deleting the file
    const { error: deactivateError } = await supabase
      .from("links")
      .update({ is_active: false })
      .eq("file_id", fileId)
      .eq("user_id", user.id)

    if (deactivateError) {
      return NextResponse.json(
        { error: "Failed to deactivate associated links" },
        { status: 500 }
      )
    }

    // Delete the file from Supabase Storage
    const { error: storageError } = await supabase.storage
      .from("files")
      .remove([file.storage_path])

    if (storageError) {
      return NextResponse.json(
        { error: "Failed to delete file from storage" },
        { status: 500 }
      )
    }

    // Delete the file record from the database
    const { error: deleteError } = await deleteFileRecord(
      supabase,
      fileId,
      user.id
    )

    if (deleteError) {
      return NextResponse.json(
        { error: "Failed to delete file record" },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
