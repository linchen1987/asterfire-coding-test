"use client"

import { useState, useRef, useEffect } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import {
  FileText, Clock, CheckCircle2, XCircle, Loader2,
  Save,
  Brain,
} from "lucide-react"
import type { Candidate, PartialData } from "@app/shared"
import { UPLOAD_STATUSES } from "@app/shared"
import { EditableBasics } from "./editable-basics"
import { EditableEducation } from "./editable-education"
import { EditableWork } from "./editable-work"
import { EditableSkills } from "./editable-skills"

interface ExtractProgressProps {
  candidate: Candidate
  onExtract: (id: string) => void
  onSaveProfile: (id: string, data: PartialData) => Promise<void>
  extracting?: boolean
  partialData?: PartialData
  progress?: string | null
  error?: string | null
  thinking?: string
}

function SkeletonBlock() {
  return <div className="space-y-2"><Skeleton className="h-4 w-3/4" /><Skeleton className="h-4 w-1/2" /></div>
}

export function ExtractProgress({ candidate, onExtract, onSaveProfile, extracting, partialData, progress, error, thinking }: ExtractProgressProps) {
  const statusInfo = UPLOAD_STATUSES[candidate.uploadStatus]
  const hasPartial = partialData && Object.keys(partialData).length > 0

  const isExtracted = !extracting && hasPartial && candidate.uploadStatus !== "completed"
  const isCompleted = candidate.uploadStatus === "completed"

  const [editData, setEditData] = useState<PartialData>({})
  const [saving, setSaving] = useState(false)

  const thinkingRef = useRef<HTMLDivElement>(null)
  const userScrolledUp = useRef(false)

  useEffect(() => {
    const el = thinkingRef.current
    if (!el) return
    if (!userScrolledUp.current) {
      el.scrollTop = el.scrollHeight
    }
  }, [thinking])

  useEffect(() => {
    const el = thinkingRef.current
    if (!el) return
    const handleScroll = () => {
      if (!el) return
      const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 20
      userScrolledUp.current = !atBottom
    }
    el.addEventListener("scroll", handleScroll)
    return () => el.removeEventListener("scroll", handleScroll)
  }, [])

  const currentData = isExtracted ? (Object.keys(editData).length > 0 ? editData : partialData!) : {}

  const handleSave = async () => {
    setSaving(true)
    try {
      await onSaveProfile(candidate.id, currentData)
    } finally {
      setSaving(false)
    }
  }

  const updateBasics = (d: PartialData["basics"]) => setEditData(prev => ({ ...prev, basics: d }))
  const updateEducation = (d: PartialData["education"]) => setEditData(prev => ({ ...prev, education: d }))
  const updateWork = (d: PartialData["workExperience"]) => setEditData(prev => ({ ...prev, workExperience: d }))
  const updateSkills = (d: PartialData["skills"]) => setEditData(prev => ({ ...prev, skills: d }))

  return (
    <Card>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <FileText className="h-8 w-8 shrink-0 text-muted-foreground" />
            <div className="min-w-0">
              <p className="font-medium truncate">{candidate.fileName || "未知文件"}</p>
              <div className="flex items-center gap-2 mt-1">
                <Clock className="h-3 w-3 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">{candidate.createdAt}</span>
                <Badge
                  variant={isCompleted ? "default" : candidate.uploadStatus === "failed" || error ? "destructive" : "secondary"}
                  className="text-xs"
                >
                  {isCompleted ? "已完成" : isExtracted ? "待确认" : statusInfo.label}
                </Badge>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {(candidate.uploadStatus === "pending" || candidate.uploadStatus === "failed") && !extracting && !isExtracted && (
              <Button size="sm" onClick={() => onExtract(candidate.id)}>
                {candidate.uploadStatus === "failed" ? (<><XCircle className="mr-1 h-3 w-3 text-red-500" />重试</>) : "开始解析"}
              </Button>
            )}
            {extracting && (
              <Button size="sm" disabled><Loader2 className="mr-1 h-3 w-3 animate-spin" />解析中...</Button>
            )}
            {isExtracted && (
              <Button size="sm" onClick={handleSave} disabled={saving}>
                {saving ? <><Loader2 className="mr-1 h-3 w-3 animate-spin" />保存中...</> : <><Save className="mr-1 h-3 w-3" />确认保存</>}
              </Button>
            )}
            {isCompleted && <CheckCircle2 className="h-5 w-5 text-green-500" />}
          </div>
        </div>

        {extracting && progress && (
          <p className="text-sm text-muted-foreground animate-pulse">{progress}</p>
        )}
        {extracting && thinking && (
          <div ref={thinkingRef} className="rounded-md bg-muted/50 p-2.5 text-xs text-muted-foreground max-h-24 overflow-y-auto">
            <div className="flex items-center gap-1.5 mb-1 font-medium">
              <Brain className="h-3 w-3" /> AI 思考过程
            </div>
            <p className="whitespace-pre-wrap">{thinking}</p>
          </div>
        )}
        {error && <p className="text-sm text-destructive">{error}</p>}

        {(hasPartial || extracting) && !isCompleted && (
          <>
            <Separator />
            <div className="space-y-3">
              {isExtracted ? (
                <>
                  <EditableBasics data={currentData.basics || {}} onChange={updateBasics} />
                  <EditableEducation data={currentData.education || []} onChange={updateEducation} />
                  <EditableWork data={currentData.workExperience || []} onChange={updateWork} />
                  <EditableSkills data={currentData.skills || []} onChange={updateSkills} />
                </>
              ) : (
                <>
                  {partialData?.basics ? (
                    <div className="text-sm"><span className="font-medium">基本信息：</span>{partialData.basics.name}{partialData.basics.phone ? ` · ${partialData.basics.phone}` : ""}</div>
                  ) : extracting ? <SkeletonBlock /> : null}
                  {partialData?.education ? (
                    <div className="text-sm"><span className="font-medium">教育：</span>{partialData.education.map(e => e.school).join("、") || "无"}</div>
                  ) : extracting && partialData?.basics ? <SkeletonBlock /> : null}
                  {partialData?.workExperience ? (
                    <div className="text-sm"><span className="font-medium">工作：</span>{partialData.workExperience.map(e => `${e.company}·${e.position}`).join("、") || "无"}</div>
                  ) : extracting && partialData?.education ? <SkeletonBlock /> : null}
                  {partialData?.skills ? (
                    <div className="flex flex-wrap gap-1">{partialData.skills.map((s, i) => <Badge key={i} variant="secondary" className="text-xs">{s.name}</Badge>)}</div>
                  ) : extracting && partialData?.workExperience ? <SkeletonBlock /> : null}
                </>
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}
