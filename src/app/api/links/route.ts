import { NextRequest, NextResponse } from "next/server"
import { nanoid } from "nanoid"
import { createClient } from "@/lib/supabase/server"
import { createLinkSchema } from "@/lib/validations/link"
import { getUserLinks, createLink } from "@/lib/supabase/queries"

const MAX_SLUG_RETRIES = 3

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

    const { data: links, error } = await getUserLinks(supabase, user.id)

    if (error) {
      return NextResponse.json(
        { error: "Failed to fetch links" },
        { status: 500 }
      )
    }

    return NextResponse.json(links)
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

    // Validate request body
    const body = await request.json()
    const parsed = createLinkSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid input" },
        { status: 400 }
      )
    }

    const {
      fileId,
      title,
      description,
      priceAmount,
      priceCurrency,
      maxUnlocks,
      previewUrl,
    } = parsed.data

    // Verify file belongs to the user
    const { data: fileData, error: fileError } = await supabase
      .from("files")
      .select("id")
      .eq("id", fileId)
      .eq("user_id", user.id)
      .single()

    if (fileError || !fileData) {
      return NextResponse.json(
        { error: "File not found or does not belong to you" },
        { status: 404 }
      )
    }

    // Generate slug with retry on collision
    let link = null
    let lastError = null

    for (let attempt = 0; attempt < MAX_SLUG_RETRIES; attempt++) {
      const slug = nanoid(12)

      const { data, error } = await createLink(supabase, {
        user_id: user.id,
        file_id: fileId,
        slug,
        title,
        description: description ?? null,
        price_amount: priceAmount,
        price_currency: priceCurrency,
        max_unlocks: maxUnlocks ?? null,
        preview_url: previewUrl ?? null,
      })

      if (!error) {
        link = data
        break
      }

      // Check if it's a unique constraint violation on slug
      if (error.code === "23505" && error.message?.includes("slug")) {
        lastError = error
        continue
      }

      // Different error -- don't retry
      return NextResponse.json(
        { error: "Failed to create link" },
        { status: 500 }
      )
    }

    if (!link) {
      console.error("Failed to generate unique slug after retries:", lastError)
      return NextResponse.json(
        { error: "Failed to generate unique link. Please try again." },
        { status: 500 }
      )
    }

    return NextResponse.json(link, { status: 201 })
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
