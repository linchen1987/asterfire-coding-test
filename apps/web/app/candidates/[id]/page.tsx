"use client"

export default function CandidateDetailPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">候选人详情</h1>
        <p className="text-muted-foreground">查看候选人完整信息和评分</p>
      </div>
      <div className="flex items-center justify-center rounded-lg border border-dashed p-12 text-muted-foreground">
        <p>候选人详情（功能开发中）</p>
      </div>
    </div>
  )
}
