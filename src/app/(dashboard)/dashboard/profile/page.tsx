import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { ProfileForm } from "@/components/profile-form"

export default async function ProfilePage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login")
  }

  const { data: profile } = await supabase
    .from("users")
    .select("username, avatar_url, bio, social_links")
    .eq("id", user.id)
    .single()

  if (!profile) {
    redirect("/login")
  }

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Profile</h1>
        <p className="mt-1 text-muted-foreground">
          Customize your public profile.
        </p>
      </div>

      <ProfileForm
        userId={user.id}
        profile={{
          username: profile.username,
          avatar_url: profile.avatar_url,
          bio: profile.bio,
          social_links: (profile.social_links ?? {}) as Record<string, string>,
        }}
      />
    </div>
  )
}
