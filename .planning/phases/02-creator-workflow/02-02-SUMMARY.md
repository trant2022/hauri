---
phase: 02-creator-workflow
plan: 02
subsystem: api, ui, validation
tags: [nanoid, payment-links, crud, react-hook-form, zod, fee-preview, supabase-storage-previews]

requires:
  - phase: 02-creator-workflow/01
    provides: "File upload system, fee calculation module, DB queries for links, shadcn/ui components, storage buckets"
provides:
  - "Link validation schemas (create, update, price display)"
  - "Links API routes (POST with nanoid slug, GET list, GET single, PATCH update, DELETE deactivate)"
  - "Link form component with create/edit modes, file selector, price input with live fee breakdown, preview upload"
  - "Link list component with table view, inline active toggle, copy-link, edit/view actions"
  - "Links dashboard pages at /dashboard/links, /dashboard/links/new, /dashboard/links/[linkId]/edit"
affects: [02-creator-workflow/03, 03-buyer-flow]

tech-stack:
  added: []
  patterns: [dual-mode form (create/edit), inline status toggle with optimistic UI, nanoid slug generation with collision retry]

key-files:
  created:
    - src/lib/validations/link.ts
    - src/app/api/links/route.ts
    - src/app/api/links/[linkId]/route.ts
    - src/components/link-form.tsx
    - src/components/link-list.tsx
    - src/app/(dashboard)/dashboard/links/page.tsx
    - src/app/(dashboard)/dashboard/links/new/page.tsx
    - src/app/(dashboard)/dashboard/links/[linkId]/edit/page.tsx
  modified: []

key-decisions:
  - "updateLinkSchema omits fileId (cannot change file after creation) and adds isActive toggle"
  - "priceDisplaySchema validates client-side decimal input with 0.50 minimum and 2 decimal place max"
  - "Link list uses inline Switch for active/inactive toggle rather than dropdown action"
  - "Edit page uses React 'use()' to unwrap params Promise in client component"
  - "Preview upload failure gracefully handled with toast error without blocking form submission"

patterns-established:
  - "Dual-mode form: single component handles create (POST) and edit (PATCH) with mode prop"
  - "Slug generation: nanoid(12) with retry on unique constraint violation (max 3 attempts)"
  - "Price conversion: user types decimal (10.50), stored as integer cents (1050), displayed via formatPrice"
  - "Fee preview: calculateFees() called on every price input change for live buyer-pays/creator-receives display"

duration: 3min
completed: 2026-03-05
---

# Phase 2 Plan 02: Payment Link CRUD Summary

**Payment link creation with nanoid slugs, dual-mode form with live fee breakdown and preview upload, links table with inline active toggle and copy-to-clipboard**

## Performance

- **Duration:** 3 min
- **Started:** 2026-03-05T20:42:55Z
- **Completed:** 2026-03-05T20:46:08Z
- **Tasks:** 2
- **Files created:** 8

## Accomplishments

- Link validation schemas with Zod v4 for creation, update, and price display input
- Links API with POST (nanoid slug + collision retry), GET (list with joined file data), GET (single), PATCH (update), DELETE (deactivate)
- Link form component supporting both create and edit modes with file selector, price input with live fee breakdown, currency picker, preview image upload to public previews bucket, and optional max unlocks
- Link list component with table view, inline Switch for active/inactive toggle, copy-link-to-clipboard, and edit/view actions
- Three dashboard pages: links listing, create new link, edit existing link

## Task Commits

Each task was committed atomically:

1. **Task 1: Link validation schema, links API routes** - `bd9a5d8` (feat)
2. **Task 2: Link form component, link list component, and links dashboard pages** - `154171e` (feat)

## Files Created

- `src/lib/validations/link.ts` - Zod schemas for createLink, updateLink, and priceDisplay validation
- `src/app/api/links/route.ts` - POST (create link with nanoid slug) and GET (list user links) endpoints
- `src/app/api/links/[linkId]/route.ts` - GET (single link), PATCH (update), DELETE (deactivate) endpoints
- `src/components/link-form.tsx` - Dual-mode form with file selector, price/currency/preview/maxUnlocks, live fee breakdown
- `src/components/link-list.tsx` - Links table with status badges, Switch toggle, copy-link, edit actions
- `src/app/(dashboard)/dashboard/links/page.tsx` - Links listing page with "New Link" button
- `src/app/(dashboard)/dashboard/links/new/page.tsx` - Create new link page with back navigation
- `src/app/(dashboard)/dashboard/links/[linkId]/edit/page.tsx` - Edit link page with pre-populated form

## Decisions Made

- `updateLinkSchema` omits `fileId` to prevent changing the associated file after link creation
- `priceDisplaySchema` validates decimal string input client-side with 0.50 minimum and max 2 decimal places
- Link list uses an inline `Switch` component for quick active/inactive toggle rather than a dropdown menu action
- Edit page uses React `use()` hook to unwrap the `params` Promise in a client component (Next.js 16 pattern)
- Preview upload failure is handled gracefully -- toast error shown and preview field cleared without blocking form submission

## Deviations from Plan

None -- plan executed exactly as written.

## Issues Encountered

None

## User Setup Required

None -- no external service configuration required.

## Next Phase Readiness

- Payment link CRUD system fully functional
- Links API ready for Plan 03 (public buyer-facing link page at /l/[slug])
- Fee breakdown display pattern established, reusable on the buyer-facing page
- Link slugs generated and stored, ready for public URL routing

---
*Phase: 02-creator-workflow*
*Completed: 2026-03-05*
