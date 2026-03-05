import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { profileSchema } from "@/lib/validations/profile"

export async function PATCH(request: Request) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { avatar_url, ...profileFields } = body

    const parsed = profileSchema.safeParse(profileFields)
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid input" },
        { status: 400 }
      )
    }

    const updateData: Record<string, unknown> = {
      bio: parsed.data.bio ?? null,
      social_links: parsed.data.social_links ?? {},
    }

    if (typeof avatar_url === "string") {
      updateData.avatar_url = avatar_url
    }

    const { data, error } = await supabase
      .from("users")
      .update(updateData)
      .eq("id", user.id)
      .select("username, avatar_url, bio, social_links")
      .single()

    if (error) {
      return NextResponse.json(
        { error: "Failed to update profile" },
        { status: 500 }
      )
    }

    return NextResponse.json(data)
  } catch {
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 }
    )
  }
}
