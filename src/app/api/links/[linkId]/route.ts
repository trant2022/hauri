import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { updateLinkSchema } from "@/lib/validations/link"
import { updateLink } from "@/lib/supabase/queries"

interface RouteParams {
  params: Promise<{ linkId: string }>
}

export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const { linkId } = await params
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { data: link, error } = await supabase
      .from("links")
      .select("*, files(name, mime_type, size_bytes)")
      .eq("id", linkId)
      .eq("user_id", user.id)
      .single()

    if (error || !link) {
      return NextResponse.json({ error: "Link not found" }, { status: 404 })
    }

    return NextResponse.json(link)
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { linkId } = await params
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const parsed = updateLinkSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid input" },
        { status: 400 }
      )
    }

    const {
      title,
      description,
      priceAmount,
      priceCurrency,
      maxUnlocks,
      previewUrl,
      isActive,
    } = parsed.data

    // Build update payload -- only include defined fields
    const updateData: Record<string, unknown> = {}
    if (title !== undefined) updateData.title = title
    if (description !== undefined) updateData.description = description
    if (priceAmount !== undefined) updateData.price_amount = priceAmount
    if (priceCurrency !== undefined) updateData.price_currency = priceCurrency
    if (maxUnlocks !== undefined) updateData.max_unlocks = maxUnlocks
    if (previewUrl !== undefined) updateData.preview_url = previewUrl
    if (isActive !== undefined) updateData.is_active = isActive

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: "No fields to update" },
        { status: 400 }
      )
    }

    const { data: link, error } = await updateLink(
      supabase,
      linkId,
      user.id,
      updateData
    )

    if (error || !link) {
      return NextResponse.json(
        { error: "Link not found or update failed" },
        { status: 404 }
      )
    }

    return NextResponse.json(link)
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  try {
    const { linkId } = await params
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { data: link, error } = await updateLink(supabase, linkId, user.id, {
      is_active: false,
    })

    if (error || !link) {
      return NextResponse.json(
        { error: "Link not found" },
        { status: 404 }
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
