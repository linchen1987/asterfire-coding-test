"use client"

import { ExtractProgress } from "./extract-progress"
import type { Candidate } from "@app/shared"

interface ExtractListProps {
  candidates: Candidate[]
  extractingId?: string | null
  onExtract: (id: string) => void
}

export function ExtractList({ candidates, extractingId, onExtract }: ExtractListProps) {
  if (candidates.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-12 text-muted-foreground">
        <p>暂无已上传的简历</p>
        <p className="text-sm mt-1">点击上方按钮上传 PDF 简历</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {candidates.map((c) => (
        <ExtractProgress
          key={c.id}
          candidate={c}
          onExtract={onExtract}
          extracting={extractingId === c.id}
        />
      ))}
    </div>
  )
}
