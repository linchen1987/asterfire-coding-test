"use client"

import { useState, useCallback } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { Upload } from "lucide-react"
import { Button } from "@/components/ui/button"
import { UploadDialog } from "@/components/candidate/upload-dialog"
import { ExtractList } from "@/components/candidate/extract-list"
import { api } from "@/lib/api-client"
import type { Candidate } from "@app/shared"
import { toast } from "sonner"

export default function UploadPage() {
  const [dialogOpen, setDialogOpen] = useState(false)
  const [extractingId, setExtractingId] = useState<string | null>(null)
  const queryClient = useQueryClient()

  const { data: candidates = [], isLoading } = useQuery<Candidate[]>({
    queryKey: ["upload-candidates"],
    queryFn: async () => {
      const res = await api.get<{ items: Candidate[] }>("/candidates", {
        uploadStatus: "pending,completed,failed",
        pageSize: "50",
      })
      return res.items
    },
  })

  const refreshList = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["upload-candidates"] })
  }, [queryClient])

  const handleExtract = async (id: string) => {
    setExtractingId(id)
    toast.info("AI 提取功能将在 Phase 3 接入")
    setExtractingId(null)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">简历上传与解析</h1>
          <p className="text-muted-foreground">上传 PDF 简历并使用 AI 提取信息</p>
        </div>
        <Button onClick={() => setDialogOpen(true)}>
          <Upload className="mr-2 h-4 w-4" />
          上传简历
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center p-12 text-muted-foreground">
          加载中...
        </div>
      ) : (
        <ExtractList
          candidates={candidates}
          extractingId={extractingId}
          onExtract={handleExtract}
        />
      )}

      <UploadDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onUploadComplete={refreshList}
      />
    </div>
  )
}
