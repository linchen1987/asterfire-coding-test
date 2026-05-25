"use client"

export default function JobDetailPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">岗位详情</h1>
        <p className="text-muted-foreground">编辑岗位需求和技能要求</p>
      </div>
      <div className="flex items-center justify-center rounded-lg border border-dashed p-12 text-muted-foreground">
        <p>JD 编辑器（功能开发中）</p>
      </div>
    </div>
  )
}
