---
phase: 05-dashboard-profiles-polish
plan: 02
subsystem: profiles
tags: [profiles, avatar, supabase-storage, public-page, zod, react-hook-form]

# Dependency graph
requires:
  - phase: 01-project-setup
    provides: Supabase auth, users table, dashboard layout
  - phase: 02-file-upload-links
    provides: links table, link display patterns
provides:
  - Creator profile editing at /dashboard/profile (avatar, bio, social links)
  - Public profile page at /[username] with avatar, bio, social links, active links grid
  - Database migration adding avatar_url, bio, social_links to users + avatars storage bucket
  - Reserved username blocklist in signup validation
  - getPublicProfile and getPublicCreatorLinks queries
affects: []

# Tech tracking
tech-stack:
  added:
    - "@radix-ui/react-avatar (via shadcn Avatar component)"
  patterns:
    - "Avatar upload to Supabase storage with upsert"
    - "cache() + supabaseAdmin for public profile page deduplication"
    - "JSONB column for flexible social_links storage"

# File tracking
key-files:
  created:
    - supabase/migrations/00005_user_profiles.sql
    - src/lib/validations/profile.ts
    - src/lib/storage/avatar-upload.ts
    - src/app/api/profile/route.ts
    - src/app/(dashboard)/dashboard/profile/page.tsx
    - src/components/profile-form.tsx
    - src/app/[username]/page.tsx
    - src/components/ui/avatar.tsx
  modified:
    - src/types/database.ts
    - src/lib/validations/auth.ts
    - src/lib/supabase/queries.ts
    - src/components/dashboard-sidebar.tsx

# Decisions
decisions:
  - id: social-links-jsonb
    choice: "JSONB column for social_links with typed keys (twitter, instagram, youtube, tiktok, website)"
    reason: "Flexible schema -- easy to add new platforms without migrations"
  - id: avatar-upsert
    choice: "Avatar upload uses upsert:true to single path per user ({userId}/avatar.{ext})"
    reason: "Avoids orphaned files -- each upload replaces the previous avatar"
  - id: public-profile-admin-client
    choice: "Public profile page uses supabaseAdmin (service role) like link page"
    reason: "No user session available on public pages; RLS bypass is safe in server components"
  - id: reserved-usernames
    choice: "Blocklist of route-colliding usernames checked via Zod refine at signup"
    reason: "Prevents /[username] dynamic route from shadowing static routes like /dashboard, /login"

# Metrics
metrics:
  duration: ~4 min
  completed: 2026-03-06
---

# Phase 5 Plan 2: Creator Profiles Summary

JWT-free public profile pages at /[username] with avatar, bio, social links, and active payment links grid. Profile editing via /dashboard/profile with avatar upload to Supabase storage, bio textarea with character counter, and social link inputs with URL validation.

## What Was Built

### Task 1: Database Migration, Types, and Validation Schemas
- **Migration** (`00005_user_profiles.sql`): Added `avatar_url`, `bio`, `social_links` columns to users table; created `avatars` storage bucket (2MB limit, JPEG/PNG/WebP) with RLS policies for upload/view/update/delete
- **TypeScript types**: Updated users table Row/Insert/Update types with new profile fields
- **Reserved usernames**: Added blocklist of 16 route-colliding names (dashboard, login, api, etc.) with Zod `.refine()` on signup validation
- **Profile schema**: Created `profileSchema` with bio (max 160 chars) and social_links object with URL validation per platform
- **Sidebar**: Added Profile nav item between Dashboard and Files

### Task 2: Avatar Upload, Profile API, and Editing Page
- **Avatar upload** (`avatar-upload.ts`): Client-side helper using Supabase storage with upsert to `{userId}/avatar.{ext}`
- **Profile API** (`/api/profile`): PATCH endpoint with auth check, Zod validation, updates bio/social_links/avatar_url
- **Profile page** (`/dashboard/profile`): Server component fetching current profile, passing to client form
- **ProfileForm component**: React Hook Form with avatar upload, bio textarea (160 char counter), social links inputs for 5 platforms, loading states, toast notifications

### Task 3: Public Creator Profile Page
- **Public profile** (`/[username]/page.tsx`): Server component using `cache()` + `supabaseAdmin` pattern (same as link page)
- **Queries**: `getPublicProfile` (by username) and `getPublicCreatorLinks` (active links for creator)
- **Layout**: Centered avatar, @username, bio, social link icons (Twitter, Instagram, YouTube, TikTok, Globe), and card grid of active links with preview images and price badges
- **SEO**: `generateMetadata` with username, bio, and avatar OG image
- **404**: Non-existent usernames return `notFound()`

## Deviations from Plan

None -- plan executed exactly as written.

## Commit Log

| Task | Commit | Description |
|------|--------|-------------|
| 1 | c03f596 | Database migration, types, and validation schemas |
| 2 | 724d34c | Avatar upload, profile API, and editing page |
| 3 | 56ffbfb | Public creator profile page at /[username] |

## Verification Results

- `npx tsc --noEmit`: Pass (zero errors)
- `npm run build`: Pass (all 28 routes compile)
- Migration file exists at `supabase/migrations/00005_user_profiles.sql`
- `/dashboard/profile` route builds as dynamic server page
- `/[username]` route builds as dynamic server page
- `/api/profile` route builds as dynamic API route
- Profile nav item appears in sidebar between Dashboard and Files
- Reserved usernames blocklist exported from auth validations

## Next Phase Readiness

No blockers. Profile system is complete and ready for Phase 5 Plan 3 (polish/final touches).
