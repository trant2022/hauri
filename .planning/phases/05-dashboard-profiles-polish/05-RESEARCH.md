# Phase 5: Dashboard + Profiles + Polish - Research

**Researched:** 2026-03-06
**Domain:** Dashboard analytics, public profiles, mobile responsiveness
**Confidence:** HIGH

## Summary

Phase 5 completes the final 5 requirements: DASH-01 (summary stats), DASH-02 (per-link breakdown), DASH-03 (payout history), PAGE-02 (creator profile at /[username]), and UX-02 (mobile-responsive buyer flow). The codebase is mature with 12 plans completed, and this phase primarily builds on existing data models and UI patterns.

The dashboard overview page replaces the current placeholder at `/dashboard/page.tsx` with aggregated stats cards and a per-link earnings table. All data can be fetched via existing Supabase queries with minor additions -- no SQL RPCs needed since the established pattern uses server component aggregation. The creator profile page requires a database migration (adding `avatar_url`, `bio`, `social_links` columns to users table + a public RLS read policy), a new storage bucket for avatars, and a dynamic route at `/[username]`. Mobile responsiveness requires converting the fixed 64-wide sidebar to a sheet-based mobile menu and auditing buyer-facing pages for touch/viewport issues.

**Primary recommendation:** Build in three plans: (1) dashboard overview with stats + per-link + payout history, (2) profile schema migration + profile editing + public profile page, (3) mobile responsiveness pass.

## Standard Stack

### Core (already installed)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Next.js | 16.1.6 | App Router with server components | Already in use; server components for data aggregation |
| Supabase JS | 2.98.0 | Database queries + storage | Already in use; queries.ts pattern established |
| shadcn/ui | latest | UI components (Card, Table, Badge, Avatar, Sheet) | Already in use; add Avatar + Sheet components |
| Tailwind CSS | v4 | Responsive design utilities | Already in use; standard breakpoints (sm/md/lg) |
| lucide-react | 0.577.0 | Icons | Already in use |

### Supporting (need to add via shadcn CLI)
| Component | Purpose | When to Use |
|-----------|---------|-------------|
| Avatar (shadcn/ui) | Creator profile avatar display | Profile page and profile editing |
| Sheet (shadcn/ui) | Mobile sidebar drawer | Dashboard layout mobile nav |

### No New Dependencies Needed

Everything required is either already installed or available via `npx shadcn@latest add avatar sheet`. No new npm packages needed.

**Installation:**
```bash
npx shadcn@latest add avatar sheet
```

## Architecture Patterns

### Recommended Structure for New Files
```
src/
  app/
    [username]/
      page.tsx                    # Public creator profile (server component)
    (dashboard)/dashboard/
      page.tsx                    # REPLACE: dashboard overview with stats
      profile/
        page.tsx                  # Profile editing (avatar, bio, social links)
  components/
    dashboard-sidebar.tsx         # MODIFY: add mobile sheet toggle
    mobile-sidebar.tsx            # NEW: sheet wrapper for mobile
    profile-form.tsx              # NEW: avatar/bio/social editing form
    creator-profile-card.tsx      # NEW: public profile display card
  lib/
    supabase/queries.ts           # ADD: new query functions
    storage/avatar-upload.ts      # NEW: avatar upload helper
    validations/profile.ts        # NEW: Zod schema for profile editing
  types/
    database.ts                   # MODIFY: add avatar_url, bio, social_links to users
```

### Pattern 1: Server Component Data Aggregation (Established)
**What:** Fetch raw rows from Supabase, aggregate in server component TypeScript code
**When to use:** Dashboard stats (total earnings, sales count, per-link breakdown)
**Why:** Already established in earnings page; consistent with project decisions; avoids SQL RPCs

```typescript
// Pattern from existing earnings page -- reuse for dashboard
const transactions = earningsResult.data ?? []

// Aggregate per-link stats
const linkStats = new Map<string, { sales: number; earnings: number }>()
for (const tx of transactions) {
  const linkId = tx.link_id
  if (!linkStats.has(linkId)) {
    linkStats.set(linkId, { sales: 0, earnings: 0 })
  }
  const stats = linkStats.get(linkId)!
  stats.sales += 1
  stats.earnings += tx.creator_amount
}
```

### Pattern 2: Public Data via Admin Client (Established)
**What:** Use `supabaseAdmin` (service role) in server components for public pages
**When to use:** Public profile page at /[username] (bypasses RLS)
**Why:** Already established in `/l/[slug]` link page; safe because only called server-side

```typescript
// Existing pattern from link page
import { supabaseAdmin } from "@/lib/supabase/admin"

const { data: profile } = await supabaseAdmin
  .from("users")
  .select("username, avatar_url, bio, social_links")
  .eq("username", username)
  .single()
```

### Pattern 3: React cache() for Metadata + Page Dedup (Established)
**What:** Use React `cache()` to share data between `generateMetadata` and the page component
**When to use:** Public profile page (needs username in both metadata and render)
**Why:** Already established in `/l/[slug]` page

### Pattern 4: Client Component for Interactive Forms (Established)
**What:** "use client" component with React Hook Form + Zod for form handling
**When to use:** Profile editing form (avatar upload, bio, social links)
**Why:** Already established in link-form.tsx; consistent with project patterns

### Anti-Patterns to Avoid
- **Don't create SQL RPCs for dashboard aggregation:** The project decision is to aggregate in server components, not SQL. The earnings page already does this. Follow the same pattern for dashboard stats.
- **Don't duplicate earnings page logic on dashboard:** The dashboard overview shows summary stats; the earnings page shows detailed transaction history. Different data views, not duplicated functionality.
- **Don't use client-side fetching for dashboard stats:** Server components fetch data directly. No API routes or useEffect for initial load.
- **Don't use catch-all routes for /[username]:** Use a simple dynamic segment `[username]/page.tsx`, not `[...username]` or `[[...username]]`.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Avatar display | Custom img with fallback | shadcn/ui Avatar (AvatarImage + AvatarFallback) | Handles load errors, shows initials fallback, accessible |
| Mobile sidebar | Custom CSS toggle | shadcn/ui Sheet (side="left") | Focus management, overlay, accessible, animation |
| Avatar upload to storage | Custom fetch to storage API | Supabase `storage.from('avatars').upload()` | Matches existing preview upload pattern |
| Profile image optimization | Manual resize/crop | next/image with Supabase storage URL | Already configured in next.config.ts for supabase.co |
| Social links storage | Separate social_links table | JSONB column on users table | Simple key-value pairs; no relational queries needed |

## Common Pitfalls

### Pitfall 1: /[username] Route Conflicts with Existing Routes
**What goes wrong:** A dynamic `[username]` segment at root level could potentially catch requests meant for `/login`, `/signup`, `/dashboard`, `/l/slug`, `/api/*`, or `/auth/*`.
**Why it happens:** Dynamic segments match any path segment not matched by a static route.
**How to avoid:** In Next.js App Router, static routes (including those defined via route groups) take precedence over dynamic segments. The existing routes are:
  - `/(marketing)/page.tsx` -> `/` (static, takes precedence)
  - `/(auth)/login/page.tsx` -> `/login` (static, takes precedence)
  - `/(auth)/signup/page.tsx` -> `/signup` (static, takes precedence)
  - `/(dashboard)/dashboard/*` -> `/dashboard/*` (static, takes precedence)
  - `/l/[slug]` -> `/l/*` (static prefix, takes precedence)
  - `/api/*` -> API routes (takes precedence)
  - `/auth/*` -> auth callbacks (takes precedence)

  The `[username]` route will ONLY match URLs that don't match any of the above. This is correct behavior.
**Warning signs:** Add a `notFound()` call if the username doesn't exist in the database. Add a blocklist check for reserved words (`dashboard`, `login`, `signup`, `api`, `l`, `auth`, `settings`, `admin`, `forgot-password`, `reset-password`).

### Pitfall 2: Users Table Missing Profile Columns
**What goes wrong:** The current users table has NO `avatar_url`, `bio`, or social links columns.
**Why it happens:** Initial schema only included `id, email, username, stripe_account_id, stripe_customer_id, kyc_verified, created_at`. Phase 4 added Connect fields but no profile fields.
**How to avoid:** Create migration `00005_user_profiles.sql` adding:
  - `avatar_url text` (nullable)
  - `bio text` (nullable)
  - `social_links jsonb default '{}'::jsonb` (JSON object: `{ twitter?: string, instagram?: string, website?: string, ... }`)
  Also update `database.ts` types to include these new columns.
**Warning signs:** Forgetting to update the TypeScript types in `src/types/database.ts` will cause compile errors.

### Pitfall 3: Users RLS Blocks Public Profile Access
**What goes wrong:** The current RLS policy for users table is `auth.uid() = id` (SELECT) -- only the owner can read their own profile.
**Why it happens:** Initial schema designed for private profile access only.
**How to avoid:** Add a new RLS policy: `"Anyone can read public profile fields"` that allows anon/public SELECT on specific columns. Since Supabase RLS is row-level not column-level, the profile page query should use the admin client (supabaseAdmin) to bypass RLS entirely -- same pattern as the public link page.
**Warning signs:** Using the anon client for profile page will return null/empty due to RLS.

### Pitfall 4: Dashboard Layout Not Mobile-Friendly
**What goes wrong:** The dashboard sidebar is a fixed `w-64` element that takes full height. On mobile, it either overlaps content or gets hidden by overflow.
**Why it happens:** Dashboard was designed desktop-first in Phase 1.
**How to avoid:** Use responsive hiding: `hidden md:flex` for desktop sidebar + Sheet component for mobile. Add a hamburger button that only shows on `md:hidden`.
**Warning signs:** Test by resizing browser below 768px (md breakpoint).

### Pitfall 5: Avatar Storage Bucket Not Created
**What goes wrong:** Attempting to upload avatar images fails because no `avatars` storage bucket exists.
**Why it happens:** Only `files` (private) and `previews` (public) buckets were created in Phase 2.
**How to avoid:** Create `avatars` public bucket in migration with:
  - Public access (avatars are displayed on public profile pages)
  - 2MB file size limit (sufficient for profile photos)
  - Allowed MIME types: image/jpeg, image/png, image/webp
  - RLS: authenticated users can upload to their own folder, anyone can view
  - Storage path convention: `avatars/{user_id}/avatar.{ext}` (overwrite on re-upload)

### Pitfall 6: Multi-Currency Earnings Display on Dashboard
**What goes wrong:** Dashboard shows total earnings but creator may have sales in multiple currencies (CHF, EUR, USD, GBP).
**Why it happens:** Each link can be priced in a different currency.
**How to avoid:** Follow the same pattern as the earnings page: show primary currency prominently, list additional currencies below. Group totals by currency. Do NOT attempt to convert between currencies.

### Pitfall 7: Payouts Table Has No Query Function
**What goes wrong:** DASH-03 requires payout history, but there's no `getCreatorPayouts` query function.
**Why it happens:** Phase 4 created the payouts table and column structure but didn't build a query function (payouts were tracked at the transfer level on individual transactions).
**How to avoid:** Note that the actual payout data is stored in TWO places:
  1. `payouts` table: explicit payout requests (may be empty if using Stripe auto-payouts)
  2. `transactions` table: `transfer_status` column tracks per-transaction transfer state

  For DASH-03, show per-transaction transfer status grouped chronologically. The `getCreatorEarnings` query already returns `transfer_status` and `created_at`. Reuse this data on the dashboard, filtered to show transfer history.

## Code Examples

### Dashboard Overview Stats (Server Component)
```typescript
// src/app/(dashboard)/dashboard/page.tsx
import { createClient } from "@/lib/supabase/server"
import { getCreatorEarnings } from "@/lib/supabase/queries"
import { formatPrice } from "@/lib/fees"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const [earningsResult, linksResult] = await Promise.all([
    getCreatorEarnings(supabase, user.id),
    getUserLinks(supabase, user.id),
  ])

  const transactions = earningsResult.data ?? []
  const links = linksResult.data ?? []
  const activeLinks = links.filter(l => l.is_active)

  // Aggregate totals by currency
  const totalsByCurrency = new Map<string, number>()
  for (const tx of transactions) {
    totalsByCurrency.set(tx.currency,
      (totalsByCurrency.get(tx.currency) ?? 0) + tx.creator_amount
    )
  }

  // Per-link stats
  const linkStats = new Map<string, { sales: number; earnings: number; currency: string }>()
  // ... aggregate transactions by link_id

  return (
    <div className="space-y-8">
      {/* Summary cards: Total Earnings, Total Sales, Active Links */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>...</Card>
      </div>
      {/* Per-link breakdown table */}
      {/* Payout/transfer history */}
    </div>
  )
}
```

### Per-Link Stats Query (New query function)
```typescript
// Addition to src/lib/supabase/queries.ts
export async function getCreatorTransactionsWithLinks(
  supabase: SupabaseClient<Database>,
  userId: string
) {
  return supabase
    .from("transactions")
    .select(
      "id, creator_amount, currency, transfer_status, created_at, links!inner(id, title, slug, user_id)"
    )
    .eq("links.user_id", userId)
    .eq("status", "completed")
    .order("created_at", { ascending: false })
}
```

### Public Profile Page
```typescript
// src/app/[username]/page.tsx
import { cache } from "react"
import { notFound } from "next/navigation"
import { supabaseAdmin } from "@/lib/supabase/admin"

const getProfile = cache(async (username: string) => {
  const { data } = await supabaseAdmin
    .from("users")
    .select("username, avatar_url, bio, social_links")
    .eq("username", username)
    .single()
  return data
})

const getProfileLinks = cache(async (userId: string) => {
  const { data } = await supabaseAdmin
    .from("links")
    .select("slug, title, description, preview_url, price_amount, price_currency")
    .eq("user_id", userId)
    .eq("is_active", true)
    .order("created_at", { ascending: false })
  return data
})

export async function generateMetadata({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params
  const profile = await getProfile(username)
  if (!profile) return { title: "Not Found" }
  return {
    title: `${profile.username} | Unlockt`,
    description: profile.bio || `Check out ${profile.username}'s files on Unlockt`,
  }
}

export default async function ProfilePage({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params
  const profile = await getProfile(username)
  if (!profile) notFound()

  // ... render profile with avatar, bio, social links, and active links grid
}
```

### Mobile Sidebar with Sheet
```typescript
// src/components/mobile-sidebar.tsx
"use client"
import { Menu } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"

export function MobileSidebar({ children }: { children: React.ReactNode }) {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="md:hidden">
          <Menu className="size-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-64 p-0">
        {children}
      </SheetContent>
    </Sheet>
  )
}
```

### Avatar Upload Pattern
```typescript
// src/lib/storage/avatar-upload.ts
import { createClient } from "@/lib/supabase/client"

export async function uploadAvatar(userId: string, file: File): Promise<string> {
  const supabase = createClient()
  const ext = file.name.split(".").pop() ?? "jpg"
  const path = `${userId}/avatar.${ext}`

  const { error } = await supabase.storage
    .from("avatars")
    .upload(path, file, { upsert: true })

  if (error) throw error

  const { data: { publicUrl } } = supabase.storage
    .from("avatars")
    .getPublicUrl(path)

  return publicUrl
}
```

### Database Migration
```sql
-- supabase/migrations/00005_user_profiles.sql

-- Add profile fields to users table
ALTER TABLE public.users
ADD COLUMN avatar_url text,
ADD COLUMN bio text,
ADD COLUMN social_links jsonb DEFAULT '{}'::jsonb;

-- Create public avatars bucket (2MB limit, image types only)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'avatars',
  'avatars',
  true,
  2097152, -- 2MB
  ARRAY['image/jpeg', 'image/png', 'image/webp']
);

-- Storage RLS: authenticated users upload to own folder
CREATE POLICY "Users can upload own avatar"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'avatars'
  AND (storage.foldername(name))[1] = (SELECT auth.uid()::text)
);

-- Storage RLS: anyone can view avatars
CREATE POLICY "Anyone can view avatars"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'avatars');

-- Storage RLS: users can update/delete own avatar
CREATE POLICY "Users can update own avatar"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'avatars'
  AND (storage.foldername(name))[1] = (SELECT auth.uid()::text)
);

CREATE POLICY "Users can delete own avatar"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'avatars'
  AND (storage.foldername(name))[1] = (SELECT auth.uid()::text)
);
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| SQL views/RPCs for dashboard stats | Server component aggregation | Project decision (Phase 4) | All aggregation in TypeScript, no new SQL functions |
| Separate avatar table | Column on users table + storage bucket | N/A (greenfield) | Simpler schema, avatar_url stored directly |
| Client-side data fetching for dashboard | Server components with direct DB access | Next.js App Router pattern | No loading spinners for initial data; faster TTI |
| Custom mobile menu CSS | shadcn/ui Sheet component | shadcn standard | Accessible, animated, focus-managed |

## Key Architecture Decisions

### Dashboard Overview vs. Earnings Page (No Duplication)

The dashboard overview (DASH-01, DASH-02, DASH-03) and the existing earnings page serve different purposes:

| Feature | Dashboard Overview | Earnings Page |
|---------|-------------------|---------------|
| Total earnings | Summary card (DASH-01) | Detailed with transferred/pending split |
| Total sales count | Summary card (DASH-01) | Not shown (transaction list instead) |
| Active links count | Summary card (DASH-01) | Not shown |
| Per-link breakdown | Table with link title + sales + earnings (DASH-02) | Not shown |
| Payout/transfer history | Status badges per transfer (DASH-03) | Full transaction history with amounts |

The dashboard fetches a superset of the earnings data (adding link title/slug via join) but renders it differently. The query is slightly different (includes link info), justifying a new query function rather than reusing `getCreatorEarnings`.

### Social Links Storage Format

Social links stored as JSONB on the users table:
```json
{
  "twitter": "https://twitter.com/creator",
  "instagram": "https://instagram.com/creator",
  "youtube": "https://youtube.com/@creator",
  "website": "https://creator.com",
  "tiktok": "https://tiktok.com/@creator"
}
```

Predefined keys with optional values. Validated with Zod URL schema. Displayed as icons on the profile page.

### /[username] Route Safety

Reserved usernames that must be blocked (validated at signup and in the profile route):
- `dashboard`, `login`, `signup`, `forgot-password`, `reset-password`
- `api`, `auth`, `l`, `admin`, `settings`, `profile`
- `about`, `terms`, `privacy`, `help`, `support`

The dynamic route uses `notFound()` if the username doesn't exist in the database, which naturally handles reserved paths since no user can have those usernames.

### Mobile Responsiveness Strategy for UX-02

The buyer flow pages to audit:
1. **Link page `/l/[slug]`** -- Already uses `max-w-lg` and `p-4`, likely okay but needs viewport testing
2. **Checkout** -- Hosted by Stripe, inherently mobile-responsive
3. **Success page `/l/success`** -- Uses same card pattern as link page, likely okay
4. **Download** -- API redirect to signed URL, no UI to make responsive

Dashboard mobile: Convert sidebar from always-visible to Sheet-based on mobile (below `md` breakpoint).

## Open Questions

1. **Username reserved word validation at signup**
   - What we know: Signup flow validates username uniqueness via database query. No blocklist exists.
   - What's unclear: Should we add the reserved words blocklist to the existing signup validation now, or is it sufficient to rely on `notFound()` in the profile route?
   - Recommendation: Add a blocklist check to the signup validation schema. Simple array of strings, checked in Zod `.refine()`. Prevents confusion if a user named "api" tries to view their profile.

2. **Payout history data source**
   - What we know: The `payouts` table exists but may be empty (Stripe Connect Express uses auto-payouts by default). Individual transfers are tracked per-transaction in `transfer_status`.
   - What's unclear: Are there actual rows in the payouts table, or does "payout history" mean transfer history?
   - Recommendation: For DASH-03, show transfer history from the transactions table (transfer_status field). This is the data that actually exists. If the payouts table has data, include it too with a secondary query.

3. **Profile editing page location**
   - What we know: Settings page at `/dashboard/settings` shows account info (email, username) and Connect status.
   - What's unclear: Should profile editing (avatar, bio, social links) live on the settings page or a new `/dashboard/profile` page?
   - Recommendation: Add a new `/dashboard/profile` page. Settings is already dense with Connect status. Profile is a distinct concern. Add "Profile" to the sidebar nav items.

## Sources

### Primary (HIGH confidence)
- Codebase analysis: All existing files read directly (queries.ts, earnings/page.tsx, dashboard-sidebar.tsx, database.ts, migrations/*)
- Next.js App Router docs: [Dynamic Routes](https://nextjs.org/docs/app/api-reference/file-conventions/dynamic-routes), [Route Groups](https://nextjs.org/docs/app/api-reference/file-conventions/route-groups) (v16.1.6)
- Supabase storage patterns: [Storage Quickstart](https://supabase.com/docs/guides/storage/quickstart)
- shadcn/ui components: [Avatar](https://ui.shadcn.com/docs/components/radix/avatar), [Sheet](https://ui.shadcn.com/docs/components/radix/sheet)

### Secondary (MEDIUM confidence)
- Next.js route priority behavior: [GitHub Discussion #37171](https://github.com/vercel/next.js/discussions/37171) - static routes take precedence over dynamic segments
- Supabase avatar best practices: [GitHub Discussion #18877](https://github.com/orgs/supabase/discussions/18877)

### Tertiary (LOW confidence)
- None. All findings verified against codebase and official docs.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - No new dependencies; all tools already in project
- Architecture: HIGH - Follows established project patterns (server components, admin client, aggregation)
- Pitfalls: HIGH - All verified against actual codebase (RLS policies, missing columns, route structure)
- Mobile strategy: MEDIUM - Standard Tailwind responsive approach, but needs viewport testing

**Research date:** 2026-03-06
**Valid until:** 2026-04-06 (stable; no fast-moving dependencies)
