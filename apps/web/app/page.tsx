"use client"

import { useQuery } from "@tanstack/react-query"
import { api } from "@/lib/api-client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Users, Briefcase, FileText, TrendingUp, Clock, CheckCircle2 } from "lucide-react"
import Link from "next/link"
import { StatusBadge } from "@/components/candidate/status-badge"
import { StatCard } from "@/components/stat-card"
import type { CandidateStatus } from "@app/shared"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"

interface StatsOverview {
  totalCandidates: number
  totalJobs: number
  statusCounts: Record<string, number>
  avgScore: number | null
  jobStats: Array<{ id: string; title: string; candidateCount: number; avgScore: number | null }>
  recentUploads: Array<{
    id: string; name: string | null; fileName: string | null; jobId: string;
    status: string | null; overallScore: number | null; createdAt: string | null;
  }>
}

export default function DashboardPage() {
  const { data: stats, isLoading } = useQuery<StatsOverview>({
    queryKey: ["stats-overview"],
    queryFn: () => api.get("/stats/overview"),
    refetchInterval: 30000,
  })

  if (isLoading || !stats) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">概览</h1>
          <p className="text-muted-foreground">数据统计与概览</p>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
            <StatCardSkeleton key={i} />
          ))}
        </div>
      </div>
    )
  }

  const statusCards = [
    { title: "待筛选", value: stats.statusCounts.pending, icon: FileText, iconClassName: "text-muted-foreground" },
    { title: "初筛通过", value: stats.statusCounts.screened, icon: CheckCircle2, iconClassName: "text-blue-500" },
    { title: "面试中", value: stats.statusCounts.interviewing, icon: Clock, iconClassName: "text-amber-500" },
    { title: "已录用", value: stats.statusCounts.hired, icon: Users, iconClassName: "text-green-500" },
  ]

  const chartData = stats.jobStats.map(j => ({
    name: j.title.length > 6 ? j.title.slice(0, 6) + "..." : j.title,
    candidates: j.candidateCount,
    avgScore: j.avgScore || 0,
  }))

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">概览</h1>
        <p className="text-muted-foreground">数据统计与概览</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard title="总候选人" value={stats.totalCandidates} icon={Users} />
        <StatCard title="岗位数量" value={stats.totalJobs} icon={Briefcase} />
        <StatCard title="平均评分" value={stats.avgScore ?? "--"} icon={TrendingUp} />
        <StatCard title="已淘汰" value={stats.statusCounts.rejected} icon={Users} />
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        {statusCards.map(s => (
          <StatCard key={s.title} {...s} />
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">各岗位候选人统计</CardTitle>
          </CardHeader>
          <CardContent>
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} />
                  <YAxis tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--popover))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                      fontSize: 12,
                    }}
                  />
                  <Bar dataKey="candidates" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} name="候选人数" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[240px] text-muted-foreground text-sm">暂无数据</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">最近上传</CardTitle>
          </CardHeader>
          <CardContent>
            {stats.recentUploads.length > 0 ? (
              <div className="space-y-3">
                {stats.recentUploads.map(r => (
                  <Link key={r.id} href={`/candidates/${r.id}`} className="flex items-center justify-between py-2 border-b last:border-0 hover:bg-muted/30 -mx-2 px-2 rounded transition-colors">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="font-medium text-sm truncate">{r.name || r.fileName || "未知"}</div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      {r.overallScore != null && (
                        <span className="text-sm font-semibold">{r.overallScore}</span>
                      )}
                      <StatusBadge status={r.status as CandidateStatus | null} />
                      <span className="text-xs text-muted-foreground w-28 text-right">{r.createdAt}</span>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="flex items-center justify-center h-[240px] text-muted-foreground text-sm">暂无上传记录</div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function StatCardSkeleton() {
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="h-4 w-20 bg-muted animate-pulse rounded" />
      </CardHeader>
      <CardContent>
        <div className="h-8 w-12 bg-muted animate-pulse rounded" />
      </CardContent>
    </Card>
  )
}
