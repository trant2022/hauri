"use client"

import { useCallback, useEffect, useState } from "react"
import {
  MoreHorizontal,
  Trash2,
  FileIcon,
  ImageIcon,
  VideoIcon,
  Music,
  FileArchive,
  FileText,
} from "lucide-react"
import { toast } from "sonner"

import { formatFileSize } from "@/lib/fees"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Skeleton } from "@/components/ui/skeleton"

interface FileRecord {
  id: string
  user_id: string
  name: string
  size_bytes: number
  mime_type: string
  storage_path: string
  created_at: string
}

interface FileListProps {
  refreshTrigger: number
}

function getFileCategory(mimeType: string): {
  label: string
  icon: React.ElementType
} {
  if (mimeType.startsWith("image/")) return { label: "Image", icon: ImageIcon }
  if (mimeType.startsWith("video/")) return { label: "Video", icon: VideoIcon }
  if (mimeType.startsWith("audio/")) return { label: "Audio", icon: Music }
  if (mimeType === "application/pdf") return { label: "PDF", icon: FileText }
  if (
    mimeType.includes("zip") ||
    mimeType.includes("rar") ||
    mimeType.includes("7z")
  )
    return { label: "Archive", icon: FileArchive }
  return { label: "File", icon: FileIcon }
}

function formatRelativeDate(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMinutes = Math.floor(diffMs / (1000 * 60))
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffMinutes < 1) return "Just now"
  if (diffMinutes < 60) return `${diffMinutes}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`
  return date.toLocaleDateString()
}

export function FileList({ refreshTrigger }: FileListProps) {
  const [files, setFiles] = useState<FileRecord[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [deleteTarget, setDeleteTarget] = useState<FileRecord | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const fetchFiles = useCallback(async () => {
    try {
      setIsLoading(true)
      const response = await fetch("/api/files")

      if (!response.ok) {
        throw new Error("Failed to fetch files")
      }

      const data = await response.json()
      setFiles(data)
    } catch {
      toast.error("Failed to load files")
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchFiles()
  }, [fetchFiles, refreshTrigger])

  const handleDelete = async () => {
    if (!deleteTarget) return

    setIsDeleting(true)
    try {
      const response = await fetch(`/api/files/${deleteTarget.id}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "Failed to delete file")
      }

      toast.success(`"${deleteTarget.name}" deleted`)
      setDeleteTarget(null)
      fetchFiles()
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to delete file"
      toast.error(message)
    } finally {
      setIsDeleting(false)
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 px-4 py-3">
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-5 w-16" />
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-16" />
          </div>
        ))}
      </div>
    )
  }

  if (files.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-12">
        <FileIcon className="mb-3 size-8 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">No files uploaded yet</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Upload your first file to get started
        </p>
      </div>
    )
  }

  return (
    <>
      <div className="rounded-md border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Size</TableHead>
              <TableHead>Uploaded</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {files.map((file) => {
              const category = getFileCategory(file.mime_type)
              const CategoryIcon = category.icon

              return (
                <TableRow key={file.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <CategoryIcon className="size-4 shrink-0 text-muted-foreground" />
                      <span className="truncate font-medium">{file.name}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">{category.label}</Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatFileSize(file.size_bytes)}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatRelativeDate(file.created_at)}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="size-8">
                          <MoreHorizontal className="size-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          className="text-destructive focus:text-destructive"
                          onClick={() => setDeleteTarget(file)}
                        >
                          <Trash2 className="mr-2 size-4" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>

      {/* Delete confirmation dialog */}
      <Dialog
        open={!!deleteTarget}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null)
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete file</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete &quot;{deleteTarget?.name}&quot;?
              This will also deactivate all payment links associated with this
              file. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteTarget(null)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={isDeleting}
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
