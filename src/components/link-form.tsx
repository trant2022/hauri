"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { useRouter } from "next/navigation"
import { Loader2, Upload, X, ImageIcon } from "lucide-react"
import { toast } from "sonner"

import { createClient } from "@/lib/supabase/client"
import { calculateFees, formatPrice, SUPPORTED_CURRENCIES } from "@/lib/fees"
import { priceDisplaySchema } from "@/lib/validations/link"
import {
  PREVIEW_ALLOWED_TYPES,
  MAX_PREVIEW_SIZE_BYTES,
} from "@/lib/validations/file"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface FileOption {
  id: string
  name: string
  size_bytes: number
  mime_type: string
}

interface LinkData {
  id: string
  file_id: string
  title: string
  description: string | null
  price_amount: number
  price_currency: string
  max_unlocks: number | null
  preview_url: string | null
  is_active: boolean
  files: {
    name: string
    mime_type: string
    size_bytes: number
  }
}

interface LinkFormProps {
  mode: "create" | "edit"
  linkId?: string
}

const formSchema = z.object({
  fileId: z.string().min(1, "Select a file"),
  title: z
    .string()
    .min(1, "Title is required")
    .max(100, "Title must be under 100 characters"),
  description: z
    .string()
    .max(500, "Description must be under 500 characters")
    .optional(),
  priceDisplay: priceDisplaySchema,
  priceCurrency: z.enum(SUPPORTED_CURRENCIES, {
    error: "Select a currency",
  }),
  maxUnlocks: z.string().optional(),
})

type FormValues = z.infer<typeof formSchema>

export function LinkForm({ mode, linkId }: LinkFormProps) {
  const router = useRouter()
  const [files, setFiles] = useState<FileOption[]>([])
  const [isLoadingFiles, setIsLoadingFiles] = useState(mode === "create")
  const [isLoadingLink, setIsLoadingLink] = useState(mode === "edit")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [isUploadingPreview, setIsUploadingPreview] = useState(false)
  const previewInputRef = useRef<HTMLInputElement>(null)

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      fileId: "",
      title: "",
      description: "",
      priceDisplay: "",
      priceCurrency: "CHF",
      maxUnlocks: "",
    },
  })

  const priceDisplay = watch("priceDisplay")
  const priceCurrency = watch("priceCurrency")

  // Calculate fee breakdown
  const feeBreakdown = (() => {
    if (!priceDisplay) return null
    const parsed = parseFloat(priceDisplay)
    if (isNaN(parsed) || parsed < 0.5) return null
    const cents = Math.round(parsed * 100)
    return calculateFees(cents)
  })()

  // Fetch files for the selector (create mode only)
  useEffect(() => {
    if (mode !== "create") return

    async function fetchFiles() {
      try {
        const response = await fetch("/api/files")
        if (!response.ok) throw new Error("Failed to fetch files")
        const data = await response.json()
        setFiles(data)
      } catch {
        toast.error("Failed to load files")
      } finally {
        setIsLoadingFiles(false)
      }
    }

    fetchFiles()
  }, [mode])

  // Fetch link data for edit mode
  useEffect(() => {
    if (mode !== "edit" || !linkId) return

    async function fetchLink() {
      try {
        const response = await fetch(`/api/links/${linkId}`)
        if (!response.ok) throw new Error("Failed to fetch link")
        const data: LinkData = await response.json()

        setValue("fileId", data.file_id)
        setValue("title", data.title)
        setValue("description", data.description ?? "")
        setValue("priceDisplay", (data.price_amount / 100).toFixed(2))
        setValue("priceCurrency", data.price_currency as FormValues["priceCurrency"])
        setValue(
          "maxUnlocks",
          data.max_unlocks !== null ? String(data.max_unlocks) : ""
        )
        setPreviewUrl(data.preview_url)
      } catch {
        toast.error("Failed to load link data")
        router.push("/dashboard/links")
      } finally {
        setIsLoadingLink(false)
      }
    }

    fetchLink()
  }, [mode, linkId, setValue, router])

  // Preview image upload
  const handlePreviewUpload = useCallback(
    async (file: File) => {
      // Validate file type
      if (
        !PREVIEW_ALLOWED_TYPES.includes(
          file.type as (typeof PREVIEW_ALLOWED_TYPES)[number]
        )
      ) {
        toast.error("Preview must be a JPEG, PNG, or WebP image")
        return
      }

      // Validate file size
      if (file.size > MAX_PREVIEW_SIZE_BYTES) {
        toast.error("Preview image must be under 5MB")
        return
      }

      setIsUploadingPreview(true)

      try {
        const supabase = createClient()
        const {
          data: { session },
          error: sessionError,
        } = await supabase.auth.getSession()

        if (sessionError || !session) {
          toast.error("Authentication required")
          return
        }

        const ext = file.name.split(".").pop() || "jpg"
        const path = `${session.user.id}/${crypto.randomUUID()}.${ext}`

        const { error: uploadError } = await supabase.storage
          .from("previews")
          .upload(path, file, {
            contentType: file.type,
            upsert: false,
          })

        if (uploadError) {
          throw uploadError
        }

        const {
          data: { publicUrl },
        } = supabase.storage.from("previews").getPublicUrl(path)

        setPreviewUrl(publicUrl)
      } catch {
        toast.error("Failed to upload preview image")
        setPreviewUrl(null)
        if (previewInputRef.current) {
          previewInputRef.current.value = ""
        }
      } finally {
        setIsUploadingPreview(false)
      }
    },
    []
  )

  const onSubmit = async (data: FormValues) => {
    setIsSubmitting(true)

    try {
      const priceAmountCents = Math.round(parseFloat(data.priceDisplay) * 100)
      const maxUnlocks = data.maxUnlocks
        ? parseInt(data.maxUnlocks, 10)
        : null

      if (mode === "create") {
        const response = await fetch("/api/links", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fileId: data.fileId,
            title: data.title,
            description: data.description || null,
            priceAmount: priceAmountCents,
            priceCurrency: data.priceCurrency,
            maxUnlocks,
            previewUrl,
          }),
        })

        if (!response.ok) {
          const result = await response.json()
          throw new Error(result.error || "Failed to create link")
        }

        toast.success("Link created!")
        router.push("/dashboard/links")
      } else {
        const response = await fetch(`/api/links/${linkId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: data.title,
            description: data.description || null,
            priceAmount: priceAmountCents,
            priceCurrency: data.priceCurrency,
            maxUnlocks,
            previewUrl,
          }),
        })

        if (!response.ok) {
          const result = await response.json()
          throw new Error(result.error || "Failed to update link")
        }

        toast.success("Link updated!")
        router.push("/dashboard/links")
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Something went wrong"
      toast.error(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isLoadingLink) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* File selector (create mode only) */}
      {mode === "create" && (
        <div className="space-y-2">
          <Label htmlFor="fileId">File</Label>
          {isLoadingFiles ? (
            <div className="h-10 animate-pulse rounded-md bg-muted" />
          ) : files.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No files uploaded.{" "}
              <a
                href="/dashboard/files"
                className="text-primary underline-offset-4 hover:underline"
              >
                Upload a file first
              </a>
            </p>
          ) : (
            <Select
              onValueChange={(value) => setValue("fileId", value)}
              defaultValue=""
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a file" />
              </SelectTrigger>
              <SelectContent>
                {files.map((file) => (
                  <SelectItem key={file.id} value={file.id}>
                    {file.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          {errors.fileId && (
            <p className="text-sm text-destructive">{errors.fileId.message}</p>
          )}
        </div>
      )}

      {/* Title */}
      <div className="space-y-2">
        <Label htmlFor="title">Title</Label>
        <Input
          id="title"
          placeholder="e.g., My Design Pack"
          {...register("title")}
          disabled={isSubmitting}
        />
        {errors.title && (
          <p className="text-sm text-destructive">{errors.title.message}</p>
        )}
      </div>

      {/* Description */}
      <div className="space-y-2">
        <Label htmlFor="description">
          Description{" "}
          <span className="text-muted-foreground">(optional)</span>
        </Label>
        <Textarea
          id="description"
          placeholder="Describe what buyers will get..."
          rows={3}
          {...register("description")}
          disabled={isSubmitting}
        />
        {errors.description && (
          <p className="text-sm text-destructive">
            {errors.description.message}
          </p>
        )}
      </div>

      {/* Price and Currency */}
      <div className="grid grid-cols-3 gap-4">
        <div className="col-span-2 space-y-2">
          <Label htmlFor="priceDisplay">Price</Label>
          <Input
            id="priceDisplay"
            placeholder="10.00"
            inputMode="decimal"
            {...register("priceDisplay")}
            disabled={isSubmitting}
          />
          {errors.priceDisplay && (
            <p className="text-sm text-destructive">
              {errors.priceDisplay.message}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="priceCurrency">Currency</Label>
          <Select
            onValueChange={(value) =>
              setValue("priceCurrency", value as FormValues["priceCurrency"])
            }
            defaultValue="CHF"
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SUPPORTED_CURRENCIES.map((currency) => (
                <SelectItem key={currency} value={currency}>
                  {currency}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.priceCurrency && (
            <p className="text-sm text-destructive">
              {errors.priceCurrency.message}
            </p>
          )}
        </div>
      </div>

      {/* Fee breakdown */}
      {feeBreakdown && (
        <div className="rounded-md border border-border bg-muted/30 p-3 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Buyer pays</span>
            <span className="font-medium">
              {formatPrice(feeBreakdown.totalBuyerPays, priceCurrency)}
            </span>
          </div>
          <div className="mt-1 flex justify-between">
            <span className="text-muted-foreground">You receive</span>
            <span className="font-medium text-green-500">
              {formatPrice(feeBreakdown.creatorReceives, priceCurrency)}
            </span>
          </div>
        </div>
      )}

      {/* Preview image */}
      <div className="space-y-2">
        <Label>
          Preview image{" "}
          <span className="text-muted-foreground">(optional)</span>
        </Label>

        {previewUrl ? (
          <div className="relative inline-block">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={previewUrl}
              alt="Preview"
              className="h-32 w-auto rounded-md border border-border object-cover"
            />
            <button
              type="button"
              onClick={() => {
                setPreviewUrl(null)
                if (previewInputRef.current) {
                  previewInputRef.current.value = ""
                }
              }}
              className="absolute -right-2 -top-2 rounded-full bg-destructive p-1 text-destructive-foreground shadow-sm"
            >
              <X className="size-3" />
            </button>
          </div>
        ) : (
          <div
            role="button"
            tabIndex={0}
            onClick={() => previewInputRef.current?.click()}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ")
                previewInputRef.current?.click()
            }}
            className="flex cursor-pointer items-center gap-3 rounded-md border border-dashed border-border p-4 transition-colors hover:border-primary/50 hover:bg-muted/30"
          >
            {isUploadingPreview ? (
              <Loader2 className="size-5 animate-spin text-muted-foreground" />
            ) : (
              <ImageIcon className="size-5 text-muted-foreground" />
            )}
            <div>
              <p className="text-sm font-medium">
                {isUploadingPreview
                  ? "Uploading..."
                  : "Click to upload preview image"}
              </p>
              <p className="text-xs text-muted-foreground">
                JPEG, PNG, or WebP (max 5MB)
              </p>
            </div>
          </div>
        )}

        <input
          ref={previewInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) handlePreviewUpload(file)
          }}
        />
      </div>

      {/* Max unlocks */}
      <div className="space-y-2">
        <Label htmlFor="maxUnlocks">
          Max unlocks{" "}
          <span className="text-muted-foreground">(optional)</span>
        </Label>
        <Input
          id="maxUnlocks"
          type="number"
          placeholder="Unlimited"
          min={1}
          {...register("maxUnlocks")}
          disabled={isSubmitting}
        />
        <p className="text-xs text-muted-foreground">
          Leave empty for unlimited unlocks
        </p>
      </div>

      {/* Submit */}
      <Button type="submit" disabled={isSubmitting} className="w-full">
        {isSubmitting ? (
          <>
            <Loader2 className="mr-2 size-4 animate-spin" />
            {mode === "create" ? "Creating..." : "Saving..."}
          </>
        ) : mode === "create" ? (
          <>
            <Upload className="mr-2 size-4" />
            Create Payment Link
          </>
        ) : (
          "Save Changes"
        )}
      </Button>
    </form>
  )
}
