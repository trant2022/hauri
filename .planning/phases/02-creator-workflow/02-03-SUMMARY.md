---
phase: 02-creator-workflow
plan: 03
subsystem: ui
tags: [next-image, open-graph, server-components, fee-breakdown, supabase-admin]

# Dependency graph
requires:
  - phase: 02-creator-workflow/02-02
    provides: "Link CRUD with slug generation, fee calculation module"
  - phase: 02-creator-workflow/02-01
    provides: "File upload and storage system"
provides:
  - "Public buyer-facing link page at /l/[slug]"
  - "FeeBreakdown server component for price display"
  - "LinkPageCard server component with file info and buy button"
  - "getPublicLinkBySlug admin query function"
  - "Open Graph meta tags for social sharing"
affects: [03-payment-checkout, 04-buyer-flow]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "React cache() for deduplicating server component data fetches"
    - "Admin client (service role) for public server component queries"
    - "next/image with Supabase storage remote patterns"

key-files:
  created:
    - src/app/l/[slug]/page.tsx
    - src/components/fee-breakdown.tsx
    - src/components/link-page-card.tsx
  modified:
    - src/lib/supabase/queries.ts
    - src/types/database.ts
    - next.config.ts

key-decisions:
  - "Used React cache() to deduplicate getPublicLinkBySlug calls between generateMetadata and page component"
  - "Added Relationships to Database types for proper Supabase SDK join type inference"
  - "Configured next/image remote patterns for **.supabase.co storage URLs"

patterns-established:
  - "Public pages use supabaseAdmin (service role) to bypass RLS in server components"
  - "generateMetadata + page component share cached data fetch via React cache()"
  - "File type labels derived from MIME type prefix (image/, video/, audio/, etc.)"

# Metrics
duration: 3min
completed: 2026-03-05
---

# Phase 2 Plan 3: Public Link Page Summary

**Public buyer-facing link page at /l/[slug] with fee breakdown, OG meta tags, file info card, and buy button placeholder**

## Performance

- **Duration:** 3 min
- **Started:** 2026-03-05T20:49:08Z
- **Completed:** 2026-03-05T20:51:40Z
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments

- FeeBreakdown server component shows base price, 15% service fee, and total with currency formatting
- LinkPageCard renders preview image (or file icon fallback), title, description, file type badge, file size, fee breakdown, and prominent buy button
- Public /l/[slug] page with generateMetadata for Open Graph tags (title, description, preview image)
- Invalid/inactive slugs handled with notFound() for proper 404 responses
- Zero client JavaScript -- all components are server-rendered

## Task Commits

Each task was committed atomically:

1. **Task 1: Fee breakdown component and link page card component** - `f47da63` (feat)
2. **Task 2: Public link page with dynamic metadata, public query function, and 404 handling** - `cb0f32f` (feat)

## Files Created/Modified

- `src/components/fee-breakdown.tsx` - Server component displaying base price, service fee, and total using calculateFees/formatPrice
- `src/components/link-page-card.tsx` - Server component rendering preview image, title, description, file info badge, fee breakdown, and buy button
- `src/app/l/[slug]/page.tsx` - Dynamic server page with generateMetadata for OG tags, React cache() for fetch deduplication, notFound() for invalid slugs
- `src/lib/supabase/queries.ts` - Added getPublicLinkBySlug function for admin client queries
- `src/types/database.ts` - Added Relationships definitions for files, links, transactions, and payouts tables
- `next.config.ts` - Added next/image remote patterns for Supabase storage URLs

## Decisions Made

- **React cache() for fetch deduplication:** generateMetadata and page component both call getPublicLinkBySlug -- wrapping in React cache() ensures only one database query per request
- **Database Relationships added:** Empty Relationships arrays in Database types prevented Supabase SDK from inferring join types; added proper foreign key relationship definitions for all tables
- **next/image remote patterns:** Configured `**.supabase.co` with `/storage/v1/object/public/**` path for preview images stored in Supabase Storage

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Added Relationships to Database types for Supabase join inference**
- **Found during:** Task 2 (Build failed with type error on files join)
- **Issue:** Supabase SDK `select("..., files(name, mime_type, size_bytes)")` returned a SelectQueryError type because the Database type had empty Relationships arrays, preventing join type resolution
- **Fix:** Added proper foreign key Relationships to files, links, transactions, and payouts tables in database.ts
- **Files modified:** src/types/database.ts
- **Verification:** npm run build succeeds with no TypeScript errors
- **Committed in:** cb0f32f (Task 2 commit)

**2. [Rule 3 - Blocking] Added next/image remote patterns for Supabase storage**
- **Found during:** Task 1 (LinkPageCard uses next/image for preview_url)
- **Issue:** next/image requires configured remotePatterns for external image URLs; preview images stored in Supabase Storage would fail without this
- **Fix:** Added remotePatterns config for `**.supabase.co` with storage path pattern
- **Files modified:** next.config.ts
- **Verification:** npm run build succeeds
- **Committed in:** cb0f32f (Task 2 commit)

---

**Total deviations:** 2 auto-fixed (2 blocking)
**Impact on plan:** Both auto-fixes necessary for build to succeed and images to render. No scope creep.

## Issues Encountered

None -- all issues were blocking type errors resolved via deviation rules.

## User Setup Required

None -- no external service configuration required.

## Next Phase Readiness

- Public link page complete and ready for Stripe Checkout integration (Phase 3)
- Buy button has `data-link-id` attribute for easy wiring to Stripe Checkout session creation
- Fee calculation already produces all values needed for Stripe (totalBuyerPays, platformFee, creatorReceives)
- Database Relationships now properly defined, enabling type-safe joins across all future queries

---
*Phase: 02-creator-workflow*
*Completed: 2026-03-05*
