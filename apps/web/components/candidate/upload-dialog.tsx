"use client"

import { useState, useCallback, useEffect } from "react"
import { useDropzone } from "react-dropzone"
import { Upload, X, FileText, Loader2 } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { useQuery } from "@tanstack/react-query"
import { api } from "@/lib/api-client"
import type { JobDescription } from "@app/shared"

interface UploadDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onUploadComplete: () => void
}

interface SelectedFile {
  file: File
  id: string
}

export function UploadDialog({ open, onOpenChange, onUploadComplete }: UploadDialogProps) {
  const [selectedJobId, setSelectedJobId] = useState<string>("")
  const [files, setFiles] = useState<SelectedFile[]>([])
  const [uploading, setUploading] = useState(false)

  const { data: jobs = [] } = useQuery<JobDescription[]>({
    queryKey: ["jobs"],
    queryFn: () => api.get("/jobs"),
  })

  useEffect(() => {
    if (jobs.length > 0 && !selectedJobId) {
      setSelectedJobId(jobs[0].id)
    }
  }, [jobs])

  const onDrop = useCallback((accepted: File[]) => {
    const pdfFiles = accepted.filter(
      (f) => f.type === "application/pdf" || f.name.endsWith(".pdf")
    )
    const newFiles = pdfFiles.map((f) => ({ file: f, id: crypto.randomUUID() }))
    setFiles((prev) => [...prev, ...newFiles].slice(0, 10))
  }, [])

  const removeFile = (id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id))
  }

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "application/pdf": [".pdf"] },
    maxSize: 10 * 1024 * 1024,
    maxFiles: 10,
  })

  const handleUpload = async () => {
    if (!selectedJobId || files.length === 0) return

    setUploading(true)
    try {
      const formData = new FormData()
      formData.append("jobId", selectedJobId)
      for (const f of files) {
        formData.append("files", f.file)
      }
      await api.postFormData("/resumes/upload", formData)
      setFiles([])
      setSelectedJobId("")
      onOpenChange(false)
      onUploadComplete()
    } catch (e: any) {
      console.error("Upload failed:", e)
    } finally {
      setUploading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>上传简历</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>选择岗位 *</Label>
            <Select value={selectedJobId} onValueChange={setSelectedJobId}>
              <SelectTrigger>
                <SelectValue placeholder="请选择岗位" />
              </SelectTrigger>
              <SelectContent>
                {jobs.map((job) => (
                  <SelectItem key={job.id} value={job.id}>
                    {job.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div
            {...getRootProps()}
            className={`flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-8 cursor-pointer transition-colors ${
              isDragActive
                ? "border-primary bg-primary/5"
                : "border-muted-foreground/25 hover:border-primary/50"
            }`}
          >
            <input {...getInputProps()} />
            <Upload className="h-8 w-8 text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">
              拖拽 PDF 文件到此处，或点击选择
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              最多 10 个文件，每个最大 10MB
            </p>
          </div>

          {files.length > 0 && (
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {files.map((f) => (
                <div
                  key={f.id}
                  className="flex items-center justify-between rounded-md border px-3 py-2"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <span className="text-sm truncate">{f.file.name}</span>
                    <span className="text-xs text-muted-foreground">
                      ({(f.file.size / 1024).toFixed(0)} KB)
                    </span>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 shrink-0"
                    onClick={() => removeFile(f.id)}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button
            onClick={handleUpload}
            disabled={!selectedJobId || files.length === 0 || uploading}
          >
            {uploading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {uploading ? "上传中..." : "确认上传"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
