# Phase 2: Creator Workflow - Research

**Researched:** 2026-03-05
**Domain:** Supabase Storage TUS uploads + Payment Link CRUD + Public Link Pages
**Confidence:** HIGH (verified against Supabase official docs, tus-js-client docs, and established codebase patterns)

## Summary

Phase 2 covers two major capabilities: (1) file upload with TUS resumable protocol directly to Supabase Storage, with progress tracking, resume-on-failure, validation, and rate limiting; and (2) payment link CRUD where creators set price, currency, preview, and description for uploaded files, plus a public buyer-facing link page.

The standard approach uses `tus-js-client` for direct browser-to-Supabase resumable uploads (bypassing Vercel's serverless function limits), a private bucket `files` for protected content with RLS policies scoped to user folders, a separate public bucket `previews` for link preview images (publicly accessible for Open Graph and link page display), `nanoid` for generating short URL-safe link slugs, and integer arithmetic in cents/rappen for all fee calculations. The files table and links table already exist in the database schema from Phase 1 -- this phase implements the UI and API layer on top of them.

Key findings: (1) Supabase TUS requires exactly 6MB chunk size -- do not change this. (2) The TUS endpoint uses a different hostname than the REST API: `https://{project-id}.supabase.co/storage/v1/upload/resumable` -- using the storage hostname directly improves large upload performance. (3) Preview images should go in a separate public bucket because they need to be accessible without authentication for Open Graph meta tags and the buyer-facing link page. (4) The link page at `/l/[slug]` should be a dynamic server component with `generateMetadata` for SEO/Open Graph. (5) Rate limiting for uploads can be done simply via a database count query in the API route (no need for Redis/Upstash for this use case).

**Primary recommendation:** Use `tus-js-client` directly (not Uppy -- too heavy for this use case) with the Supabase TUS endpoint, store files in `{user_id}/{uuid}-{filename}` paths within a private bucket, use a public `previews` bucket for link preview images, and build the link page as a server component with dynamic metadata.

## Standard Stack

### Core (New for Phase 2)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| tus-js-client | 4.3.1 | TUS resumable uploads | Official TUS protocol client; Supabase docs recommend it directly; pure JS, no heavy framework dependencies |
| nanoid | 5.1.6 | Short URL-safe slug generation | 118 bytes, cryptographically secure, URL-safe alphabet (A-Za-z0-9_-), 21 chars default |

### Already Installed (from Phase 1)

| Library | Version | Purpose | Used For |
|---------|---------|---------|----------|
| @supabase/supabase-js | ^2.98.0 | Supabase client | Storage operations (list, delete, signed URLs), DB queries |
| @supabase/ssr | ^0.9.0 | SSR auth | Server-side auth in API routes and server components |
| react-hook-form | ^7.71.2 | Form management | Link creation/edit forms |
| zod | ^4.3.6 | Validation | File type validation schemas, link form schemas |
| @hookform/resolvers | ^5.2.2 | Zod-to-RHF bridge | zodResolver for forms |
| sonner | ^2.0.7 | Toast notifications | Upload success/error, link creation feedback |
| lucide-react | ^0.577.0 | Icons | File type icons, upload icons, action buttons |

### shadcn/ui Components Needed

| Component | Purpose | Notes |
|-----------|---------|-------|
| progress | Upload progress bar | Already styled for dark theme |
| dialog | Confirmation dialogs (delete file, deactivate link) | Modal interactions |
| select | Currency selector, file selector | Dropdown for CHF/EUR/USD/GBP |
| textarea | Link description field | Multi-line text input |
| badge | File type badges, link status badges | Visual indicators |
| table | Files list, links list | Dashboard data display |
| dropdown-menu | Row actions (edit, delete, deactivate) | Contextual actions per item |
| separator | Visual dividers on link page | Clean section separation |
| switch | Toggle link active/inactive | Quick deactivation |
| skeleton | Loading states for file/link lists | Placeholder content |
| tabs | Organize dashboard sections | Files tab, Links tab if needed |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| tus-js-client | Uppy | Uppy is a full upload UI framework (drag-drop, camera, cloud sources); 100x heavier; overkill when we need just TUS protocol + custom UI |
| tus-js-client | supabase-js standard upload | Standard upload has no progress events, no resume capability; limited to ~5GB but no chunk-level reliability |
| nanoid | uuid | UUID is 36 chars (too long for URLs); nanoid is 21 chars, URL-safe, same collision resistance |
| nanoid | crypto.randomUUID() | Built-in but produces UUIDs (36 chars with hyphens); not URL-friendly |
| Public previews bucket | Signed URLs from private bucket | Signed URLs expire and cannot be used in Open Graph meta tags; preview images must be permanently accessible |

**Installation:**
```bash
# New dependencies for Phase 2
npm install tus-js-client nanoid

# shadcn/ui components
npx shadcn@latest add progress dialog select textarea badge table dropdown-menu separator switch skeleton tabs
```

## Architecture Patterns

### Recommended Project Structure

```
src/
├── app/
│   ├── (dashboard)/
│   │   └── dashboard/
│   │       ├── files/
│   │       │   └── page.tsx          # Files list + upload UI
│   │       └── links/
│   │           ├── page.tsx          # Links list
│   │           ├── new/
│   │           │   └── page.tsx      # Create link form
│   │           └── [linkId]/
│   │               └── edit/
│   │                   └── page.tsx  # Edit link form
│   ├── l/
│   │   └── [slug]/
│   │       └── page.tsx              # Public buyer-facing link page
│   └── api/
│       ├── files/
│       │   ├── route.ts              # POST: record file metadata, GET: list files
│       │   └── [fileId]/
│       │       └── route.ts          # DELETE: delete file + storage object
│       └── links/
│           ├── route.ts              # POST: create link, GET: list links
│           └── [linkId]/
│               └── route.ts          # PATCH: update link, DELETE: deactivate link
├── components/
│   ├── file-upload.tsx               # Client component: TUS upload with progress
│   ├── file-list.tsx                 # Client component: files table with actions
│   ├── link-form.tsx                 # Client component: create/edit link form
│   ├── link-list.tsx                 # Client component: links table with actions
│   ├── link-page-card.tsx            # Server component: buyer-facing link display
│   └── fee-breakdown.tsx             # Shared component: price + fees display
├── lib/
│   ├── supabase/
│   │   └── queries.ts                # Add file + link DB queries
│   ├── storage/
│   │   └── upload.ts                 # TUS upload helper (wraps tus-js-client)
│   ├── validations/
│   │   ├── auth.ts                   # Existing
│   │   ├── file.ts                   # File validation schemas (MIME types, size)
│   │   └── link.ts                   # Link validation schemas (price, currency, etc.)
│   └── fees.ts                       # Fee calculation (integer arithmetic)
├── types/
│   └── database.ts                   # Existing -- already has files + links tables
```

### Pattern 1: TUS Resumable Upload Flow

**What:** Direct browser-to-Supabase upload using TUS protocol, bypassing Vercel serverless
**When to use:** All file uploads (files can be up to 500MB)
**Flow:**
1. Client component gets auth session token
2. Client creates `tus.Upload` instance pointing at Supabase TUS endpoint
3. Upload streams in 6MB chunks directly to Supabase Storage
4. On success, client calls API route to record file metadata in `files` table
5. API route verifies the file exists in storage, then inserts DB record

```typescript
// Source: Supabase official docs (resumable-uploads)
import * as tus from "tus-js-client"

interface UploadOptions {
  file: File
  bucketName: string
  objectName: string
  accessToken: string
  projectId: string
  onProgress?: (percentage: number) => void
  onError?: (error: Error) => void
  onSuccess?: () => void
}

export function createTusUpload(options: UploadOptions): tus.Upload {
  const {
    file,
    bucketName,
    objectName,
    accessToken,
    projectId,
    onProgress,
    onError,
    onSuccess,
  } = options

  const upload = new tus.Upload(file, {
    endpoint: `https://${projectId}.supabase.co/storage/v1/upload/resumable`,
    retryDelays: [0, 3000, 5000, 10000, 20000],
    headers: {
      authorization: `Bearer ${accessToken}`,
    },
    uploadDataDuringCreation: true,
    removeFingerprintOnSuccess: true,
    metadata: {
      bucketName: bucketName,
      objectName: objectName,
      contentType: file.type,
      cacheControl: "3600",
    },
    chunkSize: 6 * 1024 * 1024, // MUST be 6MB -- Supabase requirement
    onError: (error) => {
      console.error("Upload failed:", error)
      onError?.(error)
    },
    onProgress: (bytesUploaded, bytesTotal) => {
      const percentage = Number(((bytesUploaded / bytesTotal) * 100).toFixed(1))
      onProgress?.(percentage)
    },
    onSuccess: () => {
      onSuccess?.()
    },
  })

  // Check for and resume previous uploads
  upload.findPreviousUploads().then((previousUploads) => {
    if (previousUploads.length) {
      upload.resumeFromPreviousUpload(previousUploads[0])
    }
    upload.start()
  })

  return upload
}
```

### Pattern 2: Two-Phase Upload (Upload + Record)

**What:** Separate the storage upload from the database record creation
**When to use:** When uploading files that need metadata tracked in a database table
**Why:** TUS uploads go directly to storage (no server middleware), so the DB record must be created separately after upload succeeds

```typescript
// Client-side flow:
// 1. Upload file via TUS to Supabase Storage
// 2. On success, POST to /api/files with metadata
// 3. API route validates, inserts into files table

// POST /api/files body:
interface CreateFileRequest {
  name: string          // Original filename
  sizeBytes: number     // File size
  mimeType: string      // MIME type
  storagePath: string   // Path in storage bucket
}
```

### Pattern 3: Fee Calculation with Integer Arithmetic

**What:** All prices stored and calculated in smallest currency unit (cents/rappen)
**When to use:** Every price display and fee calculation
**Why:** Floating point math causes rounding errors in financial calculations

```typescript
// lib/fees.ts
// Source: PROJECT.md fee structure

// Fee structure:
// - Buyer pays: base_price + 15% surcharge
// - Creator receives: base_price - 10%
// - Platform keeps: 15% surcharge + 10% deduction = ~25%

// All amounts in smallest currency unit (cents/rappen)
export function calculateFees(basePriceInCents: number) {
  const buyerSurcharge = Math.round(basePriceInCents * 0.15)
  const totalBuyerPays = basePriceInCents + buyerSurcharge
  const creatorDeduction = Math.round(basePriceInCents * 0.10)
  const creatorReceives = basePriceInCents - creatorDeduction
  const platformFee = buyerSurcharge + creatorDeduction

  return {
    basePriceInCents,
    buyerSurcharge,
    totalBuyerPays,
    creatorDeduction,
    creatorReceives,
    platformFee,
  }
}

// Display helper: convert cents to display string
export function formatPrice(amountInCents: number, currency: string): string {
  const amount = amountInCents / 100
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: currency,
  }).format(amount)
}

// Currency symbols for display
export const SUPPORTED_CURRENCIES = ["CHF", "EUR", "USD", "GBP"] as const
export type SupportedCurrency = (typeof SUPPORTED_CURRENCIES)[number]
```

### Pattern 4: API Route with Auth + Rate Limiting

**What:** Server-side API route that verifies auth and checks upload rate
**When to use:** File upload metadata recording, link creation

```typescript
// app/api/files/route.ts pattern
import { createClient } from "@/lib/supabase/server"
import { NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Rate limiting: count uploads in last hour
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()
    const { count } = await supabase
      .from("files")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)
      .gte("created_at", oneHourAgo)

    if (count !== null && count >= 20) {
      return NextResponse.json(
        { error: "Upload limit reached. Try again later." },
        { status: 429 }
      )
    }

    // ... validate body and insert record
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
```

### Pattern 5: Public Link Page as Server Component

**What:** The buyer-facing link page at `/l/[slug]` as a dynamic server component
**When to use:** Rendering the payment link page for buyers

```typescript
// app/l/[slug]/page.tsx
import { createClient } from "@/lib/supabase/server"
import { notFound } from "next/navigation"
import type { Metadata } from "next"

interface Props {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const supabase = await createClient()
  const { data: link } = await supabase
    .from("links")
    .select("title, description, preview_url")
    .eq("slug", slug)
    .eq("is_active", true)
    .single()

  if (!link) return { title: "Not Found" }

  return {
    title: link.title,
    description: link.description ?? "Get this file on Unlockt",
    openGraph: {
      title: link.title,
      description: link.description ?? "Get this file on Unlockt",
      images: link.preview_url ? [{ url: link.preview_url }] : [],
    },
  }
}

export default async function LinkPage({ params }: Props) {
  const { slug } = await params
  // Fetch link + file data, render buyer-facing page
  // This is a server component -- no client JS shipped for initial render
}
```

### Anti-Patterns to Avoid

- **Uploading through API routes:** Vercel serverless functions have body size limits (4.5MB on free/pro) and execution time limits. Files MUST go direct to Supabase Storage via TUS, never through a Next.js API route.
- **Storing preview URLs as signed URLs:** Signed URLs expire. Store the storage path and use public bucket URLs, or generate signed URLs on-demand for private content.
- **Using floating-point for prices:** `0.1 + 0.2 !== 0.3` in JavaScript. Always use integer cents/rappen.
- **Storing price_amount as dollars/francs:** The `price_amount` column should store cents (integer), not decimal dollars. The existing schema uses `number` type -- ensure it represents cents.
- **Client-side-only validation:** MIME type validation must happen both client-side (for UX) and server-side (in Supabase bucket config) to prevent bypass.
- **Polling for upload status:** TUS provides `onProgress` callbacks -- use them instead of polling.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Resumable uploads | Custom chunked upload protocol | tus-js-client + Supabase TUS endpoint | TUS is an RFC standard; handles resume, retry, chunk management, fingerprinting |
| Short URL IDs | Random string generator | nanoid | Cryptographically secure, URL-safe, collision resistant, 118 bytes |
| File type validation | Custom MIME sniffing | Supabase bucket `allowed_mime_types` + client-side File.type check | Server-side enforcement at storage level; client-side for UX only |
| Currency formatting | Template strings with symbols | `Intl.NumberFormat` with `style: "currency"` | Handles locale-specific formatting, decimal separators, symbol placement |
| Upload progress UI | Custom progress calculation | tus-js-client `onProgress` callback | Accurate byte-level progress with chunked uploads |
| Slug uniqueness | Manual collision checking loop | nanoid with 12+ chars + database unique constraint | Statistical uniqueness at 12 chars; DB constraint as safety net |

**Key insight:** The TUS protocol handles all the hard parts of large file uploads (chunking, fingerprinting, resume, retry). The only custom code needed is the UI wrapper and the metadata recording API route.

## Common Pitfalls

### Pitfall 1: TUS Chunk Size Must Be Exactly 6MB

**What goes wrong:** Upload fails silently or returns errors from Supabase Storage
**Why it happens:** Supabase Storage TUS implementation requires exactly 6MB (6 * 1024 * 1024 bytes) chunks. This is a server-side constraint, not a client preference.
**How to avoid:** Set `chunkSize: 6 * 1024 * 1024` in tus-js-client config. Never change this value.
**Warning signs:** 400/413 errors from the TUS endpoint

### Pitfall 2: Auth Token Expiry During Long Uploads

**What goes wrong:** Upload of a 500MB file takes several minutes. If the JWT expires mid-upload, subsequent chunks fail with 401.
**Why it happens:** Supabase JWTs have a default 1-hour expiry. A 500MB upload over slow connections could theoretically approach this.
**How to avoid:** Before starting upload, call `supabase.auth.getSession()` to get a fresh token. The TUS client's `retryDelays` config will retry failed chunks. If retry still fails, refresh the token and create a new upload instance that resumes from the previous upload.
**Warning signs:** 401 errors appearing partway through an upload

### Pitfall 3: File Metadata Orphaning

**What goes wrong:** File gets uploaded to Supabase Storage but the API call to record it in the `files` table fails (network error, validation error, etc.). The file exists in storage but has no database record.
**Why it happens:** The two-phase upload (storage + DB) is not atomic.
**How to avoid:** (1) On the client, retry the metadata POST if it fails after upload succeeds. (2) Consider a background cleanup job (future) for orphaned storage files. (3) Store enough metadata in the TUS upload's metadata field to reconstruct the DB record if needed.
**Warning signs:** Storage usage growing faster than file count in database

### Pitfall 4: Preview Image Size and Type

**What goes wrong:** Creator uploads a 50MB raw image as a "preview" image, or uploads a non-image file.
**Why it happens:** No validation on the preview upload.
**How to avoid:** Use a separate public bucket `previews` with strict `allowed_mime_types: ['image/jpeg', 'image/png', 'image/webp']` and `file_size_limit: '5MB'`. Use standard upload (not TUS) for previews since they are small.
**Warning signs:** Slow link page loads, excessive storage usage in previews bucket

### Pitfall 5: Price Amount Interpretation Mismatch

**What goes wrong:** Creator enters "10.50" in the price field. System stores 10.50 (float) or 10 (truncated) instead of 1050 (cents).
**Why it happens:** Ambiguity between display format (10.50 CHF) and storage format (1050 rappen).
**How to avoid:** The form accepts a decimal number from the user and converts to integer cents before storing: `Math.round(parseFloat(userInput) * 100)`. The display converts back: `amountInCents / 100`. The Zod schema should validate the user input as a positive number with max 2 decimal places.
**Warning signs:** Prices off by factor of 100, or rounding errors in fee calculations

### Pitfall 6: Slug Collision

**What goes wrong:** Two links get the same slug, causing a database unique constraint violation.
**Why it happens:** Extremely unlikely with nanoid at 12+ characters, but possible.
**How to avoid:** Use a database unique constraint on `links.slug` (should already exist). Catch the constraint violation error in the API route and retry with a new nanoid. Use at least 12 characters for the slug.
**Warning signs:** 409/500 errors on link creation

### Pitfall 7: Supabase Storage RLS Blocking Uploads

**What goes wrong:** TUS upload returns 403 or fails silently.
**Why it happens:** The `files` bucket has no RLS policy allowing INSERT for authenticated users, or the policy doesn't match the file path pattern.
**How to avoid:** Create explicit RLS policies on `storage.objects`:
  - INSERT: Allow authenticated users to upload to `files/{user_id}/*`
  - SELECT: Allow authenticated users to read their own files
  - DELETE: Allow authenticated users to delete their own files
  Use `(storage.foldername(name))[1] = (select auth.uid()::text)` to scope to user folders.
**Warning signs:** 403 errors on upload, "new row violates RLS policy" errors

## Code Examples

### File Validation Schema

```typescript
// lib/validations/file.ts
import { z } from "zod"

export const ALLOWED_MIME_TYPES = [
  // Images
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/svg+xml",
  // Documents
  "application/pdf",
  // Video
  "video/mp4",
  "video/quicktime",
  "video/webm",
  // Archives
  "application/zip",
  "application/x-zip-compressed",
  "application/x-rar-compressed",
  "application/x-7z-compressed",
  // Audio
  "audio/mpeg",
  "audio/wav",
  "audio/ogg",
  "audio/flac",
] as const

export const MAX_FILE_SIZE_BYTES = 500 * 1024 * 1024 // 500MB

export const fileUploadSchema = z.object({
  name: z.string().min(1, "File name is required"),
  sizeBytes: z
    .number()
    .positive("File size must be positive")
    .max(MAX_FILE_SIZE_BYTES, "File size must be under 500MB"),
  mimeType: z.enum(ALLOWED_MIME_TYPES, {
    errorMap: () => ({ message: "File type not supported" }),
  }),
  storagePath: z.string().min(1, "Storage path is required"),
})

export type FileUploadInput = z.infer<typeof fileUploadSchema>

// Client-side pre-upload validation
export function validateFile(file: File): { valid: boolean; error?: string } {
  if (file.size > MAX_FILE_SIZE_BYTES) {
    return { valid: false, error: `File too large. Maximum size is 500MB.` }
  }
  if (!ALLOWED_MIME_TYPES.includes(file.type as any)) {
    return { valid: false, error: `File type "${file.type}" is not supported.` }
  }
  return { valid: true }
}
```

### Link Validation Schema

```typescript
// lib/validations/link.ts
import { z } from "zod"
import { SUPPORTED_CURRENCIES } from "@/lib/fees"

export const createLinkSchema = z.object({
  fileId: z.string().uuid("Invalid file ID"),
  title: z
    .string()
    .min(1, "Title is required")
    .max(100, "Title must be under 100 characters"),
  description: z
    .string()
    .max(500, "Description must be under 500 characters")
    .optional()
    .nullable(),
  priceAmount: z
    .number()
    .positive("Price must be greater than 0")
    .max(999999, "Price too high"), // in cents
  priceCurrency: z.enum(SUPPORTED_CURRENCIES, {
    errorMap: () => ({ message: "Invalid currency" }),
  }),
  maxUnlocks: z
    .number()
    .int("Must be a whole number")
    .positive("Must be at least 1")
    .optional()
    .nullable(),
  previewUrl: z.string().url("Invalid URL").optional().nullable(),
})

export type CreateLinkInput = z.infer<typeof createLinkSchema>

export const updateLinkSchema = createLinkSchema.partial().extend({
  isActive: z.boolean().optional(),
})

export type UpdateLinkInput = z.infer<typeof updateLinkSchema>
```

### Supabase Storage RLS Policies

```sql
-- RLS policies for the private 'files' bucket
-- Users can only manage files in their own folder: files/{user_id}/*

-- Allow authenticated users to upload files to their folder
CREATE POLICY "Users can upload to own folder"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'files'
  AND (storage.foldername(name))[1] = (SELECT auth.uid()::text)
);

-- Allow authenticated users to read their own files
CREATE POLICY "Users can read own files"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'files'
  AND (storage.foldername(name))[1] = (SELECT auth.uid()::text)
);

-- Allow authenticated users to delete their own files
CREATE POLICY "Users can delete own files"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'files'
  AND (storage.foldername(name))[1] = (SELECT auth.uid()::text)
);

-- RLS policies for the public 'previews' bucket
-- Users can upload/manage preview images in their folder

CREATE POLICY "Users can upload preview images"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'previews'
  AND (storage.foldername(name))[1] = (SELECT auth.uid()::text)
);

CREATE POLICY "Anyone can view preview images"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'previews');

CREATE POLICY "Users can delete own preview images"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'previews'
  AND (storage.foldername(name))[1] = (SELECT auth.uid()::text)
);
```

### Bucket Configuration

```sql
-- Create private bucket for files (500MB limit)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'files',
  'files',
  false,
  524288000, -- 500MB in bytes
  ARRAY[
    'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml',
    'application/pdf',
    'video/mp4', 'video/quicktime', 'video/webm',
    'application/zip', 'application/x-zip-compressed',
    'application/x-rar-compressed', 'application/x-7z-compressed',
    'audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/flac'
  ]
);

-- Create public bucket for preview images (5MB limit)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'previews',
  'previews',
  true,
  5242880, -- 5MB in bytes
  ARRAY['image/jpeg', 'image/png', 'image/webp']
);
```

### DB Queries Pattern

```typescript
// lib/supabase/queries.ts -- additions for Phase 2

// Files
export async function getUserFiles(supabase: SupabaseClient, userId: string) {
  return supabase
    .from("files")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
}

export async function createFileRecord(
  supabase: SupabaseClient,
  data: Database["public"]["Tables"]["files"]["Insert"]
) {
  return supabase.from("files").insert(data).select().single()
}

export async function deleteFileRecord(
  supabase: SupabaseClient,
  fileId: string,
  userId: string
) {
  return supabase
    .from("files")
    .delete()
    .eq("id", fileId)
    .eq("user_id", userId)
}

// Links
export async function getUserLinks(supabase: SupabaseClient, userId: string) {
  return supabase
    .from("links")
    .select("*, files(name, mime_type, size_bytes)")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
}

export async function createLink(
  supabase: SupabaseClient,
  data: Database["public"]["Tables"]["links"]["Insert"]
) {
  return supabase.from("links").insert(data).select().single()
}

export async function updateLink(
  supabase: SupabaseClient,
  linkId: string,
  userId: string,
  data: Database["public"]["Tables"]["links"]["Update"]
) {
  return supabase
    .from("links")
    .update(data)
    .eq("id", linkId)
    .eq("user_id", userId)
    .select()
    .single()
}

export async function getLinkBySlug(supabase: SupabaseClient, slug: string) {
  return supabase
    .from("links")
    .select("*, files(name, mime_type, size_bytes)")
    .eq("slug", slug)
    .eq("is_active", true)
    .single()
}
```

### Storage Path Convention

```typescript
// File storage path: {user_id}/{uuid}-{sanitized-filename}
// Example: a1b2c3d4-e5f6.../f8e7d6c5-myfile.pdf

function generateStoragePath(userId: string, fileName: string): string {
  const sanitized = fileName.replace(/[^a-zA-Z0-9._-]/g, "_")
  const uniquePrefix = crypto.randomUUID().split("-")[0] // 8 char prefix for uniqueness
  return `${userId}/${uniquePrefix}-${sanitized}`
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Standard multipart upload through server | TUS resumable direct-to-storage | Supabase Storage v3 (2023) | Supports files up to 50GB, progress tracking, resume on failure |
| UUID v4 for slugs | nanoid with custom length | Industry-wide shift | Shorter URLs, same security, smaller bundle |
| Float prices (`19.99`) | Integer cents (`1999`) | Always was best practice | Eliminates rounding errors in fee calculations |
| `getSession()` for auth checks | `getUser()` for server routes | Supabase recommendation | `getUser()` validates against auth server; `getSession()` may return stale data |
| Public storage for all files | Private bucket + signed URLs | Security best practice | Files never publicly accessible; signed URLs with short expiry |

**Important notes for this codebase:**
- Next.js 16.1.6 is installed (not 14/15 as originally spec'd). The `params` prop in page components is now a `Promise` -- must `await params`.
- Zod v4.3.6 is installed (not v3). API is compatible for the validation patterns used here.

## Open Questions

1. **Supabase Storage Global File Size Limit (Free Plan)**
   - What we know: Free plan limits file uploads to 50MB globally. The requirement is 500MB.
   - What's unclear: Whether the project is on the Free or Pro plan. If Free, 500MB uploads will be rejected by Supabase regardless of bucket config.
   - Recommendation: Verify the Supabase project is on Pro plan (or upgrade) before implementing. Pro plan supports up to 500GB per file.

2. **Preview Image Storage URL Format**
   - What we know: Public bucket URLs follow the pattern `https://{project-id}.supabase.co/storage/v1/object/public/previews/{path}`
   - What's unclear: Whether to store the full URL or just the path in `links.preview_url`
   - Recommendation: Store the full public URL in `preview_url`. This simplifies rendering (direct use as img src and Open Graph image), and the URL is stable since the bucket is public. If migrating storage providers later, a data migration would be needed regardless.

3. **Upload Rate Limit Threshold**
   - What we know: FILE-05 requires rate limiting (max uploads per hour per user)
   - What's unclear: The exact threshold (e.g., 10/hour? 20/hour? 50/hour?)
   - Recommendation: Start with 20 uploads per hour per user. This allows productive use while preventing abuse. Easy to adjust via a constant.

4. **Delete Cascade: File Deletion When Links Exist**
   - What we know: A file can have multiple links. Deleting a file should deactivate all associated links.
   - What's unclear: Whether this should be a hard delete (cascade) or soft delete
   - Recommendation: Hard delete the file record and storage object, set `is_active = false` on all associated links. Use a database transaction or handle in the API route.

## Sources

### Primary (HIGH confidence)
- [Supabase Resumable Uploads Docs](https://supabase.com/docs/guides/storage/uploads/resumable-uploads) - TUS endpoint, chunk size, metadata format, code example
- [Supabase Storage Buckets](https://supabase.com/docs/guides/storage/buckets/fundamentals) - Public vs private, access control
- [Supabase Storage Access Control](https://supabase.com/docs/guides/storage/security/access-control) - RLS policies for storage.objects, helper functions
- [Supabase Creating Buckets](https://supabase.com/docs/guides/storage/buckets/creating-buckets) - `allowed_mime_types`, `file_size_limit` configuration
- [Supabase Storage File Limits](https://supabase.com/docs/guides/storage/uploads/file-limits) - Plan-specific limits (Free: 50MB, Pro: 500GB)
- [tus-js-client npm](https://www.npmjs.com/package/tus-js-client) - v4.3.1, TypeScript support, API reference
- [nanoid npm](https://www.npmjs.com/package/nanoid) - v5.1.6, ESM-only, URL-safe alphabet
- [Next.js generateMetadata](https://nextjs.org/docs/app/api-reference/functions/generate-metadata) - Dynamic metadata for server components

### Secondary (MEDIUM confidence)
- [Supabase Storage v3 Blog](https://supabase.com/blog/storage-v3-resumable-uploads) - TUS support announcement, 50GB limit confirmation
- [Supabase Storage Schema Design](https://supabase.com/docs/guides/storage/schema/design) - storage.objects table structure
- [Modern Treasury: Floats Don't Work For Cents](https://www.moderntreasury.com/journal/floats-dont-work-for-storing-cents) - Integer arithmetic best practice

### Tertiary (LOW confidence)
- shadcn/ui file-uploader community template (sadmann7/file-uploader) - Pattern reference only, not directly used

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Verified via Supabase official docs and npm registry
- Architecture: HIGH - Follows established patterns from Phase 1 codebase + Supabase docs
- TUS upload pattern: HIGH - Verified exact code from Supabase official docs
- Fee calculation: HIGH - Standard integer arithmetic, verified against PROJECT.md fee structure
- RLS policies: HIGH - Verified syntax from Supabase access control docs
- Pitfalls: MEDIUM - Mix of documented issues and community experience
- Rate limiting approach: MEDIUM - Simple DB-based approach; may need Redis for scale (not needed for v1)

**Research date:** 2026-03-05
**Valid until:** 2026-04-05 (30 days -- Supabase Storage API is stable; tus-js-client is mature)
