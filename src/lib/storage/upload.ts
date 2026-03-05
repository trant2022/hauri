import * as tus from "tus-js-client"

interface UploadOptions {
  file: File
  bucketName: string
  objectName: string
  accessToken: string
  supabaseUrl: string
  onProgress?: (percentage: number) => void
  onError?: (error: Error) => void
  onSuccess?: () => void
}

/**
 * Extracts the project ID from a Supabase URL.
 * For hosted: https://<projectId>.supabase.co -> projectId
 * For local: returns null (use full URL instead)
 */
function getProjectId(supabaseUrl: string): string | null {
  if (
    supabaseUrl.includes("127.0.0.1") ||
    supabaseUrl.includes("localhost")
  ) {
    return null
  }
  const match = supabaseUrl.match(/https:\/\/([^.]+)\.supabase\.co/)
  return match ? match[1] : null
}

/**
 * Builds the TUS endpoint URL based on the Supabase project URL.
 * For hosted Supabase: https://<projectId>.supabase.co/storage/v1/upload/resumable
 * For local development: <supabaseUrl>/storage/v1/upload/resumable
 */
function getTusEndpoint(supabaseUrl: string): string {
  const projectId = getProjectId(supabaseUrl)
  if (projectId) {
    return `https://${projectId}.supabase.co/storage/v1/upload/resumable`
  }
  // Local development: use the full Supabase URL
  return `${supabaseUrl}/storage/v1/upload/resumable`
}

/**
 * Creates a TUS resumable upload to Supabase Storage.
 *
 * Key requirements:
 * - chunkSize MUST be exactly 6MB (Supabase requirement)
 * - Automatically resumes from previous uploads if found
 * - Retries on failure with exponential backoff
 */
export function createTusUpload(options: UploadOptions): tus.Upload {
  const {
    file,
    bucketName,
    objectName,
    accessToken,
    supabaseUrl,
    onProgress,
    onError,
    onSuccess,
  } = options

  const endpoint = getTusEndpoint(supabaseUrl)

  const upload = new tus.Upload(file, {
    endpoint,
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
      const percentage = Number(
        ((bytesUploaded / bytesTotal) * 100).toFixed(1)
      )
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

/**
 * Generates a unique storage path for a file.
 * Format: {userId}/{8-char-uuid-prefix}-{sanitized-filename}
 */
export function generateStoragePath(
  userId: string,
  fileName: string
): string {
  const sanitized = fileName.replace(/[^a-zA-Z0-9._-]/g, "_")
  const uniquePrefix = crypto.randomUUID().split("-")[0] // 8 char prefix
  return `${userId}/${uniquePrefix}-${sanitized}`
}
