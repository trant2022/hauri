"use client"

import { useCallback, useState } from "react"
import { FileUpload } from "@/components/file-upload"
import { FileList } from "@/components/file-list"

export default function FilesPage() {
  const [refreshTrigger, setRefreshTrigger] = useState(0)

  const handleUploadComplete = useCallback(() => {
    setRefreshTrigger((prev) => prev + 1)
  }, [])

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Files</h1>
        <p className="mt-1 text-muted-foreground">
          Upload and manage your files
        </p>
      </div>

      <FileUpload onUploadComplete={handleUploadComplete} />

      <div>
        <h2 className="mb-4 text-lg font-semibold">Your files</h2>
        <FileList refreshTrigger={refreshTrigger} />
      </div>
    </div>
  )
}
