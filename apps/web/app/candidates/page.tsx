"use client"

export default function CandidatesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">候选人管理</h1>
        <p className="text-muted-foreground">查看和管理所有候选人</p>
      </div>
      <div className="flex items-center justify-center rounded-lg border border-dashed p-12 text-muted-foreground">
        <p>暂无候选人数据</p>
      </div>
    </div>
  )
}
