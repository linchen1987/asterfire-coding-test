"use client"

import { ExtractProgress } from "./extract-progress"
import type { Candidate } from "@app/shared"

interface PartialData {
  basics?: any
  education?: any[]
  workExperience?: any[]
  skills?: any[]
  projects?: any[]
}

interface ExtractListProps {
  candidates: Candidate[]
  extractingId?: string | null
  onExtract: (id: string) => void
  onSaveProfile: (id: string, data: any) => Promise<void>
  partialDataMap?: Record<string, PartialData>
  progressMap?: Record<string, string | null>
  errorMap?: Record<string, string | null>
  thinkingMap?: Record<string, string>
}

export function ExtractList({ candidates, extractingId, onExtract, onSaveProfile, partialDataMap, progressMap, errorMap, thinkingMap }: ExtractListProps) {
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
          onSaveProfile={onSaveProfile}
          extracting={extractingId === c.id}
          partialData={partialDataMap?.[c.id]}
          progress={progressMap?.[c.id]}
          error={errorMap?.[c.id]}
          thinking={thinkingMap?.[c.id]}
        />
      ))}
    </div>
  )
}
