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

export const PREVIEW_ALLOWED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const

export const MAX_PREVIEW_SIZE_BYTES = 5 * 1024 * 1024 // 5MB

export const fileUploadSchema = z.object({
  name: z.string().min(1, "File name is required"),
  sizeBytes: z
    .number()
    .positive("File size must be positive")
    .max(MAX_FILE_SIZE_BYTES, "File size must be under 500MB"),
  mimeType: z.enum(ALLOWED_MIME_TYPES, {
    error: "File type not supported",
  }),
  storagePath: z.string().min(1, "Storage path is required"),
})

export type FileUploadInput = z.infer<typeof fileUploadSchema>

/**
 * Client-side pre-upload validation.
 * Checks file size and MIME type before upload starts.
 */
export function validateFile(
  file: File
): { valid: boolean; error?: string } {
  if (file.size > MAX_FILE_SIZE_BYTES) {
    return { valid: false, error: "File too large. Maximum size is 500MB." }
  }
  if (
    !ALLOWED_MIME_TYPES.includes(file.type as (typeof ALLOWED_MIME_TYPES)[number])
  ) {
    return {
      valid: false,
      error: `File type "${file.type || "unknown"}" is not supported.`,
    }
  }
  return { valid: true }
}
