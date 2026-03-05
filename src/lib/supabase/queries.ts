import type { SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "@/types/database"

// ============================================================
// File Queries
// ============================================================

export async function getUserFiles(
  supabase: SupabaseClient<Database>,
  userId: string
) {
  return supabase
    .from("files")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
}

export async function createFileRecord(
  supabase: SupabaseClient<Database>,
  data: Database["public"]["Tables"]["files"]["Insert"]
) {
  return supabase.from("files").insert(data).select().single()
}

export async function deleteFileRecord(
  supabase: SupabaseClient<Database>,
  fileId: string,
  userId: string
) {
  return supabase
    .from("files")
    .delete()
    .eq("id", fileId)
    .eq("user_id", userId)
}

// ============================================================
// Link Queries
// ============================================================

export async function getUserLinks(
  supabase: SupabaseClient<Database>,
  userId: string
) {
  return supabase
    .from("links")
    .select("*, files(name, mime_type, size_bytes)")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
}

export async function createLink(
  supabase: SupabaseClient<Database>,
  data: Database["public"]["Tables"]["links"]["Insert"]
) {
  return supabase.from("links").insert(data).select().single()
}

export async function updateLink(
  supabase: SupabaseClient<Database>,
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

export async function getLinkBySlug(
  supabase: SupabaseClient<Database>,
  slug: string
) {
  return supabase
    .from("links")
    .select("*, files(name, mime_type, size_bytes)")
    .eq("slug", slug)
    .eq("is_active", true)
    .single()
}

// ============================================================
// Public Queries (use admin client to bypass RLS)
// ============================================================

/**
 * Fetches a public link by slug with joined file data.
 * Uses admin client (service role) to bypass RLS -- safe because
 * this is only called from server components, never exposed to client.
 */
export async function getPublicLinkBySlug(
  supabase: SupabaseClient<Database>,
  slug: string
) {
  return supabase
    .from("links")
    .select("id, title, description, preview_url, price_amount, price_currency, is_active, files(name, mime_type, size_bytes)")
    .eq("slug", slug)
    .eq("is_active", true)
    .single()
}

// ============================================================
// Earnings Queries
// ============================================================

/**
 * Fetches all completed transactions for a creator's links,
 * including link title and slug for per-link breakdown.
 * Used by the dashboard overview page.
 */
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

/**
 * Fetches all completed transactions for a creator's links.
 * Joins transactions -> links to filter by creator user_id.
 * Returns raw rows for client-side aggregation by currency.
 */
export async function getCreatorEarnings(
  supabase: SupabaseClient<Database>,
  userId: string
) {
  return supabase
    .from("transactions")
    .select(
      "creator_amount, currency, transfer_status, created_at, links!inner(user_id)"
    )
    .eq("links.user_id", userId)
    .eq("status", "completed")
    .order("created_at", { ascending: false })
}

/**
 * Fetches a creator's Connect account status fields.
 */
export async function getCreatorConnectStatus(
  supabase: SupabaseClient<Database>,
  userId: string
) {
  return supabase
    .from("users")
    .select(
      "stripe_account_id, charges_enabled, payouts_enabled, onboarding_complete"
    )
    .eq("id", userId)
    .single()
}
