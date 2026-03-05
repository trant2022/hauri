"use client"

import { useRef, useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Loader2, Camera } from "lucide-react"
import { toast } from "sonner"

import { uploadAvatar } from "@/lib/storage/avatar-upload"
import {
  profileSchema,
  type ProfileInput,
  SOCIAL_PLATFORMS,
} from "@/lib/validations/profile"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

interface ProfileFormProps {
  userId: string
  profile: {
    username: string
    avatar_url: string | null
    bio: string | null
    social_links: Record<string, string>
  }
}

export function ProfileForm({ userId, profile }: ProfileFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false)
  const [avatarUrl, setAvatarUrl] = useState<string | null>(
    profile.avatar_url
  )
  const fileInputRef = useRef<HTMLInputElement>(null)

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<ProfileInput>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      bio: profile.bio ?? "",
      social_links: {
        twitter: profile.social_links?.twitter ?? "",
        instagram: profile.social_links?.instagram ?? "",
        youtube: profile.social_links?.youtube ?? "",
        tiktok: profile.social_links?.tiktok ?? "",
        website: profile.social_links?.website ?? "",
      },
    },
  })

  const bio = watch("bio")

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size > 2 * 1024 * 1024) {
      toast.error("Avatar must be under 2MB")
      return
    }

    if (
      !["image/jpeg", "image/png", "image/webp"].includes(file.type)
    ) {
      toast.error("Avatar must be JPEG, PNG, or WebP")
      return
    }

    setIsUploadingAvatar(true)
    try {
      const url = await uploadAvatar(userId, file)
      setAvatarUrl(url)
      toast.success("Avatar uploaded")
    } catch {
      toast.error("Failed to upload avatar")
    } finally {
      setIsUploadingAvatar(false)
    }
  }

  async function onSubmit(data: ProfileInput) {
    setIsSubmitting(true)
    try {
      const response = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          avatar_url: avatarUrl,
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || "Failed to update profile")
      }

      toast.success("Profile updated")
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Something went wrong"
      toast.error(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
      {/* Avatar */}
      <div className="space-y-3">
        <Label>Avatar</Label>
        <div className="flex items-center gap-4">
          <Avatar className="size-20">
            {avatarUrl ? (
              <AvatarImage src={avatarUrl} alt={profile.username} />
            ) : null}
            <AvatarFallback className="text-2xl">
              {profile.username.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>

          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={isUploadingAvatar}
            onClick={() => fileInputRef.current?.click()}
          >
            {isUploadingAvatar ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <Camera className="mr-2 size-4" />
                Change Avatar
              </>
            )}
          </Button>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={handleAvatarChange}
          />
        </div>
      </div>

      {/* Bio */}
      <div className="space-y-2">
        <Label htmlFor="bio">Bio</Label>
        <Textarea
          id="bio"
          placeholder="Tell people about yourself..."
          rows={3}
          {...register("bio")}
          disabled={isSubmitting}
        />
        <div className="flex justify-between">
          {errors.bio ? (
            <p className="text-sm text-destructive">{errors.bio.message}</p>
          ) : (
            <span />
          )}
          <p className="text-xs text-muted-foreground">
            {(bio ?? "").length}/160
          </p>
        </div>
      </div>

      {/* Social Links */}
      <div className="space-y-4">
        <Label>Social Links</Label>
        {SOCIAL_PLATFORMS.map((platform) => (
          <div key={platform.key} className="space-y-1">
            <Label
              htmlFor={`social-${platform.key}`}
              className="text-sm text-muted-foreground"
            >
              {platform.label}
            </Label>
            <Input
              id={`social-${platform.key}`}
              placeholder={platform.placeholder}
              {...register(
                `social_links.${platform.key}` as `social_links.${typeof platform.key}`
              )}
              disabled={isSubmitting}
            />
            {errors.social_links?.[platform.key] && (
              <p className="text-sm text-destructive">
                {errors.social_links[platform.key]?.message}
              </p>
            )}
          </div>
        ))}
      </div>

      {/* Submit */}
      <Button type="submit" disabled={isSubmitting} className="w-full">
        {isSubmitting ? (
          <>
            <Loader2 className="mr-2 size-4 animate-spin" />
            Saving...
          </>
        ) : (
          "Save Profile"
        )}
      </Button>
    </form>
  )
}
