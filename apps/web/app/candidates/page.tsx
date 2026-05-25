"use client"

import { useQuery } from "@tanstack/react-query"
import { api } from "@/lib/api-client"
import type { Candidate } from "@app/shared"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { CANDIDATE_STATUSES } from "@app/shared"
import Link from "next/link"
import { FileText, ArrowUpDown } from "lucide-react"

export default function CandidatesPage() {
  const { data, isLoading } = useQuery<{ items: Candidate[]; total: number }>({
    queryKey: ["candidates"],
    queryFn: () => api.get("/candidates", { pageSize: "50" }),
  })

  const candidates = data?.items || []

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">候选人管理</h1>
          <p className="text-muted-foreground">查看和管理所有候选人</p>
        </div>
        <div className="flex items-center justify-center p-12 text-muted-foreground">加载中...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">候选人管理</h1>
        <p className="text-muted-foreground">
          共 {data?.total || 0} 位候选人
        </p>
      </div>

      {candidates.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-12 text-muted-foreground">
          <FileText className="h-12 w-12 mb-3" />
          <p>暂无候选人数据</p>
          <p className="text-sm mt-1">请先在"上传"页面上传简历并完成 AI 提取</p>
        </div>
      ) : (
        <div className="rounded-md border">
          <div className="grid grid-cols-[1fr_120px_100px_80px_180px] gap-4 border-b bg-muted/50 px-4 py-3 text-sm font-medium">
            <div>姓名</div>
            <div>岗位</div>
            <div>评分</div>
            <div>状态</div>
            <div>上传时间</div>
          </div>
          {candidates.map((c) => {
            const statusInfo = c.status ? CANDIDATE_STATUSES[c.status] : null
            return (
              <Link key={c.id} href={`/candidates/${c.id}`} className="block">
                <div className="grid grid-cols-[1fr_120px_100px_80px_180px] gap-4 border-b px-4 py-3 text-sm hover:bg-muted/30 transition-colors">
                  <div className="font-medium truncate">
                    {c.name || "未提取"}
                    {c.skills && c.skills.length > 0 && (
                      <span className="ml-2 text-muted-foreground text-xs">
                        {c.skills.slice(0, 3).map(s => s.name).join(", ")}
                      </span>
                    )}
                  </div>
                  <div className="text-muted-foreground truncate text-xs">{c.jobId ? "—" : ""}</div>
                  <div>
                    {c.overallScore != null ? (
                      <span className="font-semibold">{c.overallScore}</span>
                    ) : (
                      <span className="text-muted-foreground">未评分</span>
                    )}
                  </div>
                  <div>
                    {statusInfo ? (
                      <Badge variant="secondary" className="text-xs">{statusInfo.label}</Badge>
                    ) : (
                      <span className="text-muted-foreground text-xs">—</span>
                    )}
                  </div>
                  <div className="text-muted-foreground text-xs">{c.createdAt}</div>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
