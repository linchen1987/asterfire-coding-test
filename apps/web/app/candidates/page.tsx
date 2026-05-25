"use client"

import { useState } from "react"
import Link from "next/link"
import { useQuery } from "@tanstack/react-query"
import { api } from "@/lib/api-client"
import type { Candidate, CandidateStatus, JobDescription } from "@app/shared"
import { CANDIDATE_STATUSES } from "@app/shared"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { StatusBadge } from "@/components/candidate/status-badge"
import { LayoutGrid, List, Search, ChevronLeft, ChevronRight, FileText } from "lucide-react"
import { ScoreRing } from "@/components/charts/score-ring"
import { getScoreColor } from "@/lib/score-colors"

export default function CandidatesPage() {
  const [jobId, setJobId] = useState<string>("all")
  const [search, setSearch] = useState("")
  const [searchInput, setSearchInput] = useState("")
  const [sortBy, setSortBy] = useState("createdAt")
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc")
  const [view, setView] = useState<"table" | "card">("table")
  const [page, setPage] = useState(1)
  const pageSize = 12

  const { data: jobs } = useQuery<JobDescription[]>({
    queryKey: ["jobs"],
    queryFn: () => api.get("/jobs"),
  })

  const params: Record<string, string> = {
    page: String(page),
    pageSize: String(pageSize),
    sortBy,
    sortOrder,
  }
  if (jobId !== "all") params.jobId = jobId
  if (search) params.search = search

  const { data, isLoading } = useQuery<{ items: Candidate[]; total: number; totalPages: number }>({
    queryKey: ["candidates", params],
    queryFn: () => api.get("/candidates", params),
  })

  const candidates = data?.items || []
  const totalPages = data?.totalPages || 0

  const handleSearch = () => {
    setSearch(searchInput)
    setPage(1)
  }

  const handleSortChange = (val: string) => {
    if (val === sortBy) {
      setSortOrder(prev => prev === "asc" ? "desc" : "asc")
    } else {
      setSortBy(val)
      setSortOrder("desc")
    }
    setPage(1)
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">候选人管理</h1>
        <p className="text-muted-foreground">共 {data?.total || 0} 位候选人</p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 flex-1 min-w-[200px] max-w-sm">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="搜索姓名、邮箱..."
              className="pl-9"
              value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleSearch()}
            />
          </div>
          <Button size="sm" variant="outline" onClick={handleSearch}>搜索</Button>
        </div>
        <Select value={sortBy} onValueChange={handleSortChange}>
          <SelectTrigger className="w-[140px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="createdAt">上传时间{sortBy === "createdAt" ? (sortOrder === "desc" ? " ↓" : " ↑") : ""}</SelectItem>
            <SelectItem value="overallScore">综合评分{sortBy === "overallScore" ? (sortOrder === "desc" ? " ↓" : " ↑") : ""}</SelectItem>
            <SelectItem value="name">姓名{sortBy === "name" ? (sortOrder === "desc" ? " ↓" : " ↑") : ""}</SelectItem>
          </SelectContent>
        </Select>
        <div className="border rounded-md p-0.5 flex">
          <Button size="sm" variant={view === "table" ? "secondary" : "ghost"} className="h-7 px-2" onClick={() => setView("table")}>
            <List className="h-4 w-4" />
          </Button>
          <Button size="sm" variant={view === "card" ? "secondary" : "ghost"} className="h-7 px-2" onClick={() => setView("card")}>
            <LayoutGrid className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="flex gap-2 flex-wrap">
        <Button size="sm" variant={jobId === "all" ? "default" : "outline"} onClick={() => { setJobId("all"); setPage(1) }}>
          全部
        </Button>
        {jobs?.map(job => (
          <Button key={job.id} size="sm" variant={jobId === job.id ? "default" : "outline"} onClick={() => { setJobId(job.id); setPage(1) }}>
            {job.title}
          </Button>
        ))}
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="flex items-center gap-4 rounded-md border px-4 py-3">
              <Skeleton className="h-5 w-24" />
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-10" />
              <Skeleton className="h-4 w-10" />
              <Skeleton className="h-5 w-12" />
              <Skeleton className="h-4 w-24" />
            </div>
          ))}
        </div>
      ) : candidates.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-12 text-muted-foreground">
          <FileText className="h-12 w-12 mb-3" />
          <p>暂无候选人数据</p>
          <p className="text-sm mt-1">请先在"上传"页面上传简历并完成 AI 提取</p>
        </div>
      ) : view === "table" ? (
        <div className="rounded-md border overflow-x-auto">
          <div className="min-w-[700px]">
          <div className="grid grid-cols-[1fr_140px_90px_90px_80px_160px] gap-4 border-b bg-muted/50 px-4 py-3 text-sm font-medium">
            <div>姓名</div>
            <div>岗位</div>
            <div>综合评分</div>
            <div>技能</div>
            <div>状态</div>
            <div>上传时间</div>
          </div>
          {candidates.map(c => {
            const job = jobs?.find(j => j.id === c.jobId)
            return (
              <Link key={c.id} href={`/candidates/${c.id}`} className="block">
                <div className="grid grid-cols-[1fr_140px_90px_90px_80px_160px] gap-4 border-b px-4 py-3 text-sm hover:bg-muted/30 transition-colors items-center">
                  <div className="font-medium truncate">
                    {c.name || "未提取"}
                  </div>
                  <div className="text-muted-foreground truncate text-xs">{job?.title || "—"}</div>
                  <div>
                    {c.overallScore != null ? (
                      <span className={`font-semibold ${getScoreColor(c.overallScore)}`}>
                        {c.overallScore}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">未评分</span>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-0.5">
                    {c.skills?.slice(0, 2).map((s, i) => (
                      <Badge key={i} variant="secondary" className="text-[10px] px-1 py-0">{s.name}</Badge>
                    ))}
                    {(c.skills?.length || 0) > 2 && (
                      <span className="text-[10px] text-muted-foreground">+{(c.skills?.length ?? 0) - 2}</span>
                    )}
                  </div>
                  <div>
                    <StatusBadge status={c.status} />
                  </div>
                  <div className="text-muted-foreground text-xs">{c.createdAt}</div>
                </div>
              </Link>
            )
          })}
          </div>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {candidates.map(c => {
            const job = jobs?.find(j => j.id === c.jobId)
            return (
              <Link key={c.id} href={`/candidates/${c.id}`}>
                <Card className="hover:shadow-md transition-shadow h-full">
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="font-medium">{c.name || "未提取"}</div>
                        <div className="text-xs text-muted-foreground">{job?.title || "—"}</div>
                      </div>
                      <StatusBadge status={c.status} />
                    </div>
                    {c.overallScore != null && (
                      <div className="flex justify-center">
                        <ScoreRing score={c.overallScore} size={80} strokeWidth={6} label="" />
                      </div>
                    )}
                    {c.skills && c.skills.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {c.skills.slice(0, 4).map((s, i) => (
                          <Badge key={i} variant="secondary" className="text-xs">{s.name}</Badge>
                        ))}
                        {c.skills.length > 4 && (
                          <Badge variant="outline" className="text-xs">+{c.skills.length - 4}</Badge>
                        )}
                      </div>
                    )}
                    <div className="text-xs text-muted-foreground">{c.createdAt}</div>
                  </CardContent>
                </Card>
              </Link>
            )
          })}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            第 {page} 页，共 {totalPages} 页
          </p>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button size="sm" variant="outline" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
