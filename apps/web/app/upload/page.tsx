"use client"

import { useState, useCallback } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { Upload } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { UploadDialog } from "@/components/candidate/upload-dialog"
import { ExtractList } from "@/components/candidate/extract-list"
import { api } from "@/lib/api-client"
import type { Candidate, PartialData } from "@app/shared"
import { useBatchExtract } from "@/hooks/use-batch-extract"
import { toast } from "sonner"

export default function UploadPage() {
  const [dialogOpen, setDialogOpen] = useState(false)
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

  const { extractingId, partialDataMap, progressMap, errorMap, thinkingMap, extract } = useBatchExtract()

  const refreshList = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["upload-candidates"] })
  }, [queryClient])

  const handleSaveProfile = useCallback(async (id: string, data: PartialData) => {
    try {
      await api.put(`/candidates/${id}/profile`, data)
      toast.success("保存成功")
      refreshList()
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "保存失败"
      toast.error(message)
      throw e
    }
  }, [refreshList])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">简历上传与解析</h1>
          <p className="text-muted-foreground text-sm mt-1">上传 PDF 简历并使用 AI 提取信息</p>
        </div>
        <Button onClick={() => setDialogOpen(true)}>
          <Upload className="mr-2 h-4 w-4" />
          上传简历
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="flex items-center gap-4 rounded-md border px-4 py-4">
              <Skeleton className="h-8 w-8 rounded" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-48" />
                <Skeleton className="h-3 w-32" />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <ExtractList
          candidates={candidates}
          extractingId={extractingId}
          onExtract={extract}
          onSaveProfile={handleSaveProfile}
          partialDataMap={partialDataMap}
          progressMap={progressMap}
          errorMap={errorMap}
          thinkingMap={thinkingMap}
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
