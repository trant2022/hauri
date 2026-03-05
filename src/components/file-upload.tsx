"use client"

import { useCallback, useRef, useState } from "react"
import { Upload, X, CheckCircle2, AlertCircle } from "lucide-react"
import type * as tus from "tus-js-client"
import { toast } from "sonner"

import { createClient } from "@/lib/supabase/client"
import { createTusUpload, generateStoragePath } from "@/lib/storage/upload"
import { validateFile, MAX_FILE_SIZE_BYTES } from "@/lib/validations/file"
import { formatFileSize } from "@/lib/fees"
import { Progress } from "@/components/ui/progress"
import { Button } from "@/components/ui/button"

type UploadState = "idle" | "uploading" | "recording" | "complete" | "error"

interface FileUploadProps {
  onUploadComplete?: () => void
}

export function FileUpload({ onUploadComplete }: FileUploadProps) {
  const [uploadState, setUploadState] = useState<UploadState>("idle")
  const [progress, setProgress] = useState(0)
  const [fileName, setFileName] = useState("")
  const [errorMessage, setErrorMessage] = useState("")
  const [isDragOver, setIsDragOver] = useState(false)

  const uploadRef = useRef<tus.Upload | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!

  const handleUpload = useCallback(
    async (file: File) => {
      // Validate file before upload
      const validation = validateFile(file)
      if (!validation.valid) {
        toast.error(validation.error)
        return
      }

      setFileName(file.name)
      setUploadState("uploading")
      setProgress(0)
      setErrorMessage("")

      try {
        const supabase = createClient()
        const {
          data: { session },
          error: sessionError,
        } = await supabase.auth.getSession()

        if (sessionError || !session) {
          toast.error("Authentication required. Please sign in again.")
          setUploadState("error")
          setErrorMessage("Not authenticated")
          return
        }

        const storagePath = generateStoragePath(session.user.id, file.name)

        const upload = createTusUpload({
          file,
          bucketName: "files",
          objectName: storagePath,
          accessToken: session.access_token,
          supabaseUrl,
          onProgress: (percentage) => {
            setProgress(percentage)
          },
          onError: (error) => {
            console.error("Upload error:", error)
            setUploadState("error")
            setErrorMessage(error.message || "Upload failed")
            toast.error("Upload failed. You can retry.")
          },
          onSuccess: async () => {
            // Record file metadata in the database
            setUploadState("recording")

            try {
              const response = await fetch("/api/files", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  name: file.name,
                  sizeBytes: file.size,
                  mimeType: file.type,
                  storagePath,
                }),
              })

              if (!response.ok) {
                const data = await response.json()
                throw new Error(data.error || "Failed to record file")
              }

              setUploadState("complete")
              setProgress(100)
              toast.success(`"${file.name}" uploaded successfully`)
              onUploadComplete?.()

              // Reset after a short delay
              setTimeout(() => {
                setUploadState("idle")
                setProgress(0)
                setFileName("")
              }, 2000)
            } catch (err) {
              const message =
                err instanceof Error ? err.message : "Failed to record file"
              setUploadState("error")
              setErrorMessage(message)
              toast.error(message)
            }
          },
        })

        uploadRef.current = upload
      } catch {
        setUploadState("error")
        setErrorMessage("Failed to start upload")
        toast.error("Failed to start upload")
      }
    },
    [supabaseUrl, onUploadComplete]
  )

  const handleAbort = useCallback(() => {
    if (uploadRef.current) {
      uploadRef.current.abort()
      uploadRef.current = null
    }
    setUploadState("idle")
    setProgress(0)
    setFileName("")
    toast.info("Upload cancelled")
  }, [])

  const handleRetry = useCallback(() => {
    setUploadState("idle")
    setProgress(0)
    setFileName("")
    setErrorMessage("")
  }, [])

  const handleFileSelect = useCallback(
    (files: FileList | null) => {
      if (!files || files.length === 0) return
      handleUpload(files[0])
    },
    [handleUpload]
  )

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setIsDragOver(false)
      handleFileSelect(e.dataTransfer.files)
    },
    [handleFileSelect]
  )

  const handleClick = useCallback(() => {
    if (uploadState === "idle") {
      fileInputRef.current?.click()
    }
  }, [uploadState])

  return (
    <div className="space-y-4">
      {/* Drop zone */}
      <div
        role="button"
        tabIndex={0}
        onClick={handleClick}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") handleClick()
        }}
        onDragOver={handleDragOver}
        onDragEnter={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`relative flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-8 transition-colors ${
          isDragOver
            ? "border-primary bg-primary/5"
            : uploadState === "idle"
              ? "border-border hover:border-primary/50 hover:bg-muted/30"
              : "border-border"
        } ${uploadState !== "idle" ? "pointer-events-none" : ""}`}
      >
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          onChange={(e) => handleFileSelect(e.target.files)}
        />

        {uploadState === "idle" && (
          <>
            <Upload className="mb-3 size-8 text-muted-foreground" />
            <p className="text-sm font-medium text-foreground">
              Drag and drop or click to upload
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              PDF, images, video, audio, archives -- up to{" "}
              {formatFileSize(MAX_FILE_SIZE_BYTES)}
            </p>
          </>
        )}

        {(uploadState === "uploading" || uploadState === "recording") && (
          <div className="w-full max-w-md space-y-3">
            <div className="flex items-center justify-between">
              <p className="truncate text-sm font-medium text-foreground">
                {fileName}
              </p>
              {uploadState === "uploading" && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="pointer-events-auto size-6"
                  onClick={(e) => {
                    e.stopPropagation()
                    handleAbort()
                  }}
                >
                  <X className="size-4" />
                </Button>
              )}
            </div>
            <Progress value={progress} className="h-2" />
            <p className="text-xs text-muted-foreground">
              {uploadState === "uploading"
                ? `Uploading... ${progress.toFixed(1)}%`
                : "Saving file record..."}
            </p>
          </div>
        )}

        {uploadState === "complete" && (
          <div className="flex items-center gap-2">
            <CheckCircle2 className="size-5 text-green-500" />
            <p className="text-sm font-medium text-foreground">
              Upload complete
            </p>
          </div>
        )}

        {uploadState === "error" && (
          <div className="space-y-3 text-center">
            <div className="flex items-center justify-center gap-2">
              <AlertCircle className="size-5 text-destructive" />
              <p className="text-sm font-medium text-destructive">
                {errorMessage}
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="pointer-events-auto"
              onClick={(e) => {
                e.stopPropagation()
                handleRetry()
              }}
            >
              Try again
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
