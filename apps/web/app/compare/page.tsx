"use client"

import { Scale } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"

export default function ComparePage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">候选人对比</h1>
        <p className="text-muted-foreground">选择候选人进行多维度对比</p>
      </div>
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-16 text-muted-foreground">
        <Scale className="h-16 w-16 mb-4 opacity-30" />
        <p className="text-lg font-medium">候选人对比功能开发中</p>
        <p className="text-sm mt-1 mb-6">该功能将支持多候选人的技能、经验、评分等多维度对比</p>
        <Link href="/candidates">
          <Button variant="outline">前往候选人列表</Button>
        </Link>
      </div>
    </div>
  )
}
