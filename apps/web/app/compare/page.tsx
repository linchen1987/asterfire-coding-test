"use client"

import { Scale } from "lucide-react"
import { EmptyState } from "@/components/empty-state"

export default function ComparePage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">候选人对比</h1>
        <p className="text-muted-foreground text-sm mt-1">选择候选人进行多维度对比</p>
      </div>
      <EmptyState
        icon={Scale}
        title="候选人对比功能开发中"
        description="该功能将支持多候选人的技能、经验、评分等多维度对比分析"
        action={{ label: "前往候选人列表", href: "/candidates" }}
      />
    </div>
  )
}
