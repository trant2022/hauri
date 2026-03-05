import { cache } from "react"
import type { Metadata } from "next"
import { notFound } from "next/navigation"
import Image from "next/image"
import Link from "next/link"
import { Twitter, Instagram, Youtube, Globe, Music2 } from "lucide-react"

import { supabaseAdmin } from "@/lib/supabase/admin"
import {
  getPublicProfile,
  getPublicCreatorLinks,
} from "@/lib/supabase/queries"
import { formatPrice } from "@/lib/fees"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

const SOCIAL_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  twitter: Twitter,
  instagram: Instagram,
  youtube: Youtube,
  tiktok: Music2,
  website: Globe,
}

const getProfile = cache(async (username: string) => {
  const { data } = await getPublicProfile(supabaseAdmin, username)
  return data
})

interface PageProps {
  params: Promise<{ username: string }>
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { username } = await params
  const profile = await getProfile(username)

  if (!profile) {
    return { title: "Not Found" }
  }

  const description =
    profile.bio || `Check out ${profile.username}'s files on Unlockt`

  return {
    title: `${profile.username} | Unlockt`,
    description,
    openGraph: {
      title: `${profile.username} | Unlockt`,
      description,
      type: "website",
      ...(profile.avatar_url
        ? { images: [{ url: profile.avatar_url }] }
        : {}),
    },
  }
}

export default async function PublicProfilePage({ params }: PageProps) {
  const { username } = await params
  const profile = await getProfile(username)

  if (!profile) {
    notFound()
  }

  const { data: links } = await getPublicCreatorLinks(
    supabaseAdmin,
    profile.id
  )

  const socialLinks = (profile.social_links ?? {}) as Record<string, string>
  const activeSocialLinks = Object.entries(socialLinks).filter(
    ([, url]) => url && url.length > 0
  )

  return (
    <div className="min-h-screen p-4">
      <div className="mx-auto max-w-2xl space-y-8 py-8">
        {/* Profile Header */}
        <div className="flex flex-col items-center space-y-4 text-center">
          {profile.avatar_url ? (
            <Image
              src={profile.avatar_url}
              alt={profile.username}
              width={96}
              height={96}
              className="size-24 rounded-full object-cover"
            />
          ) : (
            <Avatar className="size-24">
              <AvatarFallback className="text-3xl">
                {profile.username.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
          )}

          <div>
            <h1 className="text-xl font-bold">@{profile.username}</h1>
            {profile.bio && (
              <p className="mt-1 text-muted-foreground">{profile.bio}</p>
            )}
          </div>

          {/* Social Links */}
          {activeSocialLinks.length > 0 && (
            <div className="flex items-center gap-3">
              {activeSocialLinks.map(([key, url]) => {
                const Icon = SOCIAL_ICONS[key]
                if (!Icon) return null
                return (
                  <a
                    key={key}
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-muted-foreground transition-colors hover:text-foreground"
                  >
                    <Icon className="size-5" />
                  </a>
                )
              })}
            </div>
          )}
        </div>

        {/* Active Links Grid */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Available Files</h2>

          {!links || links.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No files available yet.
            </p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {links.map((link) => (
                <Link key={link.slug} href={`/l/${link.slug}`}>
                  <Card className="transition-colors hover:border-primary/50">
                    {link.preview_url && (
                      <div className="relative h-32 w-full overflow-hidden rounded-t-lg">
                        <Image
                          src={link.preview_url}
                          alt={link.title}
                          fill
                          className="object-cover"
                        />
                      </div>
                    )}
                    <CardHeader>
                      <div className="flex items-start justify-between gap-2">
                        <CardTitle className="line-clamp-1 text-base">
                          {link.title}
                        </CardTitle>
                        <Badge variant="secondary" className="shrink-0">
                          {formatPrice(
                            link.price_amount,
                            link.price_currency
                          )}
                        </Badge>
                      </div>
                      {link.description && (
                        <CardDescription className="line-clamp-2">
                          {link.description}
                        </CardDescription>
                      )}
                    </CardHeader>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="text-center">
          <Link
            href="/"
            className="text-xs text-muted-foreground transition-colors hover:text-foreground"
          >
            Powered by Unlockt
          </Link>
        </div>
      </div>
    </div>
  )
}
