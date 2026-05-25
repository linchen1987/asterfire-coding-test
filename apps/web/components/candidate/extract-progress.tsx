"use client"

import { useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import {
  FileText, Clock, CheckCircle2, XCircle, Loader2,
  User, GraduationCap, Briefcase, Wrench, Save, Pencil,
  Brain,
} from "lucide-react"
import type { Candidate } from "@app/shared"
import { UPLOAD_STATUSES } from "@app/shared"

interface PartialData {
  basics?: any
  education?: any[]
  workExperience?: any[]
  skills?: any[]
  projects?: any[]
}

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

function EditableBasics({ data, onChange }: { data: any; onChange: (d: any) => void }) {
  const update = (key: string, val: string) => onChange({ ...data, [key]: val })
  return (
    <div className="space-y-1">
      <div className="flex items-center gap-1.5 text-sm font-medium"><User className="h-3.5 w-3.5" /> 基本信息</div>
      <div className="grid grid-cols-2 gap-2 pl-5">
        <Input placeholder="姓名" value={data.name || ""} onChange={e => update("name", e.target.value)} className="h-8 text-sm" />
        <Input placeholder="电话" value={data.phone || ""} onChange={e => update("phone", e.target.value)} className="h-8 text-sm" />
        <Input placeholder="邮箱" value={data.email || ""} onChange={e => update("email", e.target.value)} className="h-8 text-sm" />
        <Input placeholder="城市" value={data.city || ""} onChange={e => update("city", e.target.value)} className="h-8 text-sm" />
      </div>
    </div>
  )
}

function EditableEducation({ data, onChange }: { data: any[]; onChange: (d: any[]) => void }) {
  const updateItem = (i: number, key: string, val: string) => {
    const next = [...data]; next[i] = { ...next[i], [key]: val }; onChange(next)
  }
  const addItem = () => onChange([...data, { school: "", major: "", degree: "", graduatedAt: "" }])
  const removeItem = (i: number) => onChange(data.filter((_, idx) => idx !== i))
  return (
    <div className="space-y-1">
      <div className="flex items-center gap-1.5 text-sm font-medium"><GraduationCap className="h-3.5 w-3.5" /> 教育背景</div>
      <div className="space-y-2 pl-5">
        {data.map((edu, i) => (
          <div key={i} className="grid grid-cols-2 gap-2 items-start">
            <Input placeholder="学校" value={edu.school || ""} onChange={e => updateItem(i, "school", e.target.value)} className="h-8 text-sm" />
            <Input placeholder="专业" value={edu.major || ""} onChange={e => updateItem(i, "major", e.target.value)} className="h-8 text-sm" />
            <Input placeholder="学历" value={edu.degree || ""} onChange={e => updateItem(i, "degree", e.target.value)} className="h-8 text-sm" />
            <div className="flex gap-1">
              <Input placeholder="毕业时间" value={edu.graduatedAt || ""} onChange={e => updateItem(i, "graduatedAt", e.target.value)} className="h-8 text-sm" />
              <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => removeItem(i)}><XCircle className="h-3.5 w-3.5 text-muted-foreground" /></Button>
            </div>
          </div>
        ))}
        <Button variant="outline" size="sm" onClick={addItem} className="h-7 text-xs">+ 添加</Button>
      </div>
    </div>
  )
}

function EditableWork({ data, onChange }: { data: any[]; onChange: (d: any[]) => void }) {
  const updateItem = (i: number, key: string, val: string) => {
    const next = [...data]; next[i] = { ...next[i], [key]: val }; onChange(next)
  }
  const addItem = () => onChange([...data, { company: "", position: "", startDate: "", endDate: "", summary: "" }])
  const removeItem = (i: number) => onChange(data.filter((_, idx) => idx !== i))
  return (
    <div className="space-y-1">
      <div className="flex items-center gap-1.5 text-sm font-medium"><Briefcase className="h-3.5 w-3.5" /> 工作经历</div>
      <div className="space-y-2 pl-5">
        {data.map((exp, i) => (
          <div key={i} className="space-y-1">
            <div className="grid grid-cols-2 gap-2">
              <Input placeholder="公司" value={exp.company || ""} onChange={e => updateItem(i, "company", e.target.value)} className="h-8 text-sm" />
              <Input placeholder="职位" value={exp.position || ""} onChange={e => updateItem(i, "position", e.target.value)} className="h-8 text-sm" />
              <Input placeholder="开始时间" value={exp.startDate || ""} onChange={e => updateItem(i, "startDate", e.target.value)} className="h-8 text-sm" />
              <div className="flex gap-1">
                <Input placeholder="结束时间" value={exp.endDate || ""} onChange={e => updateItem(i, "endDate", e.target.value)} className="h-8 text-sm" />
                <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => removeItem(i)}><XCircle className="h-3.5 w-3.5 text-muted-foreground" /></Button>
              </div>
            </div>
            <Input placeholder="工作摘要" value={exp.summary || ""} onChange={e => updateItem(i, "summary", e.target.value)} className="h-8 text-sm" />
          </div>
        ))}
        <Button variant="outline" size="sm" onClick={addItem} className="h-7 text-xs">+ 添加</Button>
      </div>
    </div>
  )
}

function EditableSkills({ data, onChange }: { data: any[]; onChange: (d: any[]) => void }) {
  const [input, setInput] = useState("")
  const addSkill = () => {
    const name = input.trim()
    if (name && !data.some(s => s.name === name)) {
      onChange([...data, { name, category: "other" }])
    }
    setInput("")
  }
  const removeSkill = (name: string) => onChange(data.filter(s => s.name !== name))
  return (
    <div className="space-y-1">
      <div className="flex items-center gap-1.5 text-sm font-medium"><Wrench className="h-3.5 w-3.5" /> 技能标签</div>
      <div className="pl-5 space-y-2">
        <div className="flex flex-wrap gap-1">
          {data.map((s, i) => (
            <Badge key={i} variant="secondary" className="text-xs cursor-pointer hover:bg-destructive/20" onClick={() => removeSkill(s.name)}>
              {s.name} <XCircle className="ml-1 h-3 w-3" />
            </Badge>
          ))}
        </div>
        <div className="flex gap-1">
          <Input placeholder="输入技能，回车添加" value={input} onChange={e => setInput(e.target.value)} className="h-8 text-sm" onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addSkill() } }} />
          <Button variant="outline" size="sm" onClick={addSkill} className="h-8 shrink-0">添加</Button>
        </div>
      </div>
    </div>
  )
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

  const currentData = isExtracted ? (Object.keys(editData).length > 0 ? editData : partialData!) : {}

  const handleSave = async () => {
    setSaving(true)
    try {
      await onSaveProfile(candidate.id, currentData)
    } finally {
      setSaving(false)
    }
  }

  const updateBasics = (d: any) => setEditData(prev => ({ ...prev, basics: d }))
  const updateEducation = (d: any[]) => setEditData(prev => ({ ...prev, education: d }))
  const updateWork = (d: any[]) => setEditData(prev => ({ ...prev, workExperience: d }))
  const updateSkills = (d: any[]) => setEditData(prev => ({ ...prev, skills: d }))

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
          <div className="rounded-md bg-muted/50 p-2.5 text-xs text-muted-foreground max-h-24 overflow-y-auto">
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
