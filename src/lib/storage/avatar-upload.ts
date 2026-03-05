import { createClient } from "@/lib/supabase/client"

export async function uploadAvatar(
  userId: string,
  file: File
): Promise<string> {
  const supabase = createClient()
  const ext = file.name.split(".").pop() ?? "jpg"
  const path = `${userId}/avatar.${ext}`

  const { error } = await supabase.storage
    .from("avatars")
    .upload(path, file, { upsert: true })

  if (error) throw error

  const {
    data: { publicUrl },
  } = supabase.storage.from("avatars").getPublicUrl(path)

  return publicUrl
}
