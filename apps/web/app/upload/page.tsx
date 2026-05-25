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

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api/v1"

interface PartialData {
  basics?: any
  education?: any[]
  workExperience?: any[]
  skills?: any[]
  projects?: any[]
}

export default function UploadPage() {
  const [dialogOpen, setDialogOpen] = useState(false)
  const [extractingId, setExtractingId] = useState<string | null>(null)
  const queryClient = useQueryClient()

  const [partialDataMap, setPartialDataMap] = useState<Record<string, PartialData>>({})
  const [progressMap, setProgressMap] = useState<Record<string, string | null>>({})
  const [errorMap, setErrorMap] = useState<Record<string, string | null>>({})
  const [thinkingMap, setThinkingMap] = useState<Record<string, string>>({})

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

  const handleSaveProfile = useCallback(async (id: string, data: PartialData) => {
    try {
      await api.put(`/candidates/${id}/profile`, data)
      toast.success("保存成功")
      setPartialDataMap(prev => {
        const next = { ...prev }
        delete next[id]
        return next
      })
      refreshList()
    } catch (e: any) {
      toast.error(e.message || "保存失败")
      throw e
    }
  }, [refreshList])

  const handleExtract = useCallback(async (id: string) => {
    setExtractingId(id)
    setPartialDataMap(prev => ({ ...prev, [id]: {} }))
    setProgressMap(prev => ({ ...prev, [id]: null }))
    setErrorMap(prev => ({ ...prev, [id]: null }))
    setThinkingMap(prev => ({ ...prev, [id]: "" }))

    try {
      const res = await fetch(`${API_BASE}/ai/extract/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      })

      if (!res.ok) {
        const json = await res.json()
        throw new Error(json.message || "Extract failed")
      }

      const reader = res.body?.getReader()
      if (!reader) throw new Error("No response body")

      const decoder = new TextDecoder()
      let buffer = ""

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split("\n")
        buffer = lines.pop() || ""

        let currentEvent = ""
        for (const line of lines) {
          if (line.startsWith("event: ")) {
            currentEvent = line.slice(7).trim()
          } else if (line.startsWith("data: ")) {
            try {
              const data = JSON.parse(line.slice(6))
              if (currentEvent === "progress") {
                setProgressMap(prev => ({ ...prev, [id]: data.message }))
              } else if (currentEvent === "thinking") {
                setThinkingMap(prev => ({ ...prev, [id]: (prev[id] || "") + data.delta }))
              } else if (currentEvent === "partial") {
                setPartialDataMap(prev => ({
                  ...prev,
                  [id]: { ...prev[id], [data.field]: data.data },
                }))
              } else if (currentEvent === "complete") {
                setExtractingId(null)
                setProgressMap(prev => ({ ...prev, [id]: null }))
              } else if (currentEvent === "error") {
                setExtractingId(null)
                setErrorMap(prev => ({ ...prev, [id]: data.message }))
              }
            } catch {}
          }
        }
      }
    } catch (e: any) {
      setExtractingId(null)
      setErrorMap(prev => ({ ...prev, [id]: e.message }))
    }
  }, [])

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
        <div className="flex items-center justify-center p-12 text-muted-foreground">加载中...</div>
      ) : (
        <ExtractList
          candidates={candidates}
          extractingId={extractingId}
          onExtract={handleExtract}
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
