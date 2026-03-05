-- Storage buckets and RLS policies for files, previews, and public tables
-- Phase 2: Creator Workflow

-- ============================================================
-- 1. Storage Buckets
-- ============================================================

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

-- ============================================================
-- 2. Storage RLS Policies (storage.objects)
-- ============================================================

-- Private 'files' bucket: users can only manage files in their own folder

CREATE POLICY "Users can upload to own folder"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'files'
  AND (storage.foldername(name))[1] = (SELECT auth.uid()::text)
);

CREATE POLICY "Users can read own files"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'files'
  AND (storage.foldername(name))[1] = (SELECT auth.uid()::text)
);

CREATE POLICY "Users can delete own files"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'files'
  AND (storage.foldername(name))[1] = (SELECT auth.uid()::text)
);

-- Public 'previews' bucket: users can manage own previews, anyone can view

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

-- ============================================================
-- 3. RLS Policies for public.files table
-- ============================================================

CREATE POLICY "Users can read own files"
ON public.files
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own files"
ON public.files
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own files"
ON public.files
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- ============================================================
-- 4. RLS Policies for public.links table
-- ============================================================

-- Owner can read own links
CREATE POLICY "Users can read own links"
ON public.links
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Owner can create links
CREATE POLICY "Users can insert own links"
ON public.links
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Owner can update own links
CREATE POLICY "Users can update own links"
ON public.links
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

-- Public can read active links by slug (for buyer-facing link page)
CREATE POLICY "Anyone can read active links"
ON public.links
FOR SELECT
TO anon
USING (is_active = true);
