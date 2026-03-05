import { z } from "zod"

export const profileSchema = z.object({
  bio: z
    .string()
    .max(160, "Bio must be 160 characters or less")
    .optional()
    .or(z.literal("")),
  social_links: z
    .object({
      twitter: z.string().url("Invalid URL").optional().or(z.literal("")),
      instagram: z.string().url("Invalid URL").optional().or(z.literal("")),
      youtube: z.string().url("Invalid URL").optional().or(z.literal("")),
      tiktok: z.string().url("Invalid URL").optional().or(z.literal("")),
      website: z.string().url("Invalid URL").optional().or(z.literal("")),
    })
    .optional(),
})

export type ProfileInput = z.infer<typeof profileSchema>

export const SOCIAL_PLATFORMS = [
  {
    key: "twitter",
    label: "Twitter / X",
    placeholder: "https://twitter.com/username",
  },
  {
    key: "instagram",
    label: "Instagram",
    placeholder: "https://instagram.com/username",
  },
  {
    key: "youtube",
    label: "YouTube",
    placeholder: "https://youtube.com/@channel",
  },
  {
    key: "tiktok",
    label: "TikTok",
    placeholder: "https://tiktok.com/@username",
  },
  {
    key: "website",
    label: "Website",
    placeholder: "https://example.com",
  },
] as const
