"use client"

import { useState } from "react"
import type { JobDescription } from "@app/shared"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { SkillTags } from "./skill-tags"
import { Save, Pencil } from "lucide-react"

interface JdEditorProps {
  job: JobDescription
  onSave: (data: { title: string; description: string; requiredSkills: string[]; bonusSkills: string[] }) => Promise<void>
  saving?: boolean
}

export function JdEditor({ job, onSave, saving }: JdEditorProps) {
  const [editing, setEditing] = useState(false)
  const [title, setTitle] = useState(job.title)
  const [description, setDescription] = useState(job.description || "")
  const [requiredSkills, setRequiredSkills] = useState<string[]>(job.requiredSkills || [])
  const [bonusSkills, setBonusSkills] = useState<string[]>(job.bonusSkills || [])

  const handleSave = async () => {
    await onSave({ title, description, requiredSkills, bonusSkills })
    setEditing(false)
  }

  const handleCancel = () => {
    setTitle(job.title)
    setDescription(job.description || "")
    setRequiredSkills(job.requiredSkills || [])
    setBonusSkills(job.bonusSkills || [])
    setEditing(false)
  }

  if (!editing) {
    return (
      <div className="space-y-6">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-2xl font-bold">{job.title}</h2>
            <p className="text-sm text-muted-foreground mt-1">
              创建于 {job.createdAt} · 更新于 {job.updatedAt}
            </p>
          </div>
          <Button size="sm" variant="outline" onClick={() => setEditing(true)}>
            <Pencil className="h-3 w-3 mr-1" /> 编辑
          </Button>
        </div>

        {job.description && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">岗位描述</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm whitespace-pre-wrap">{job.description}</p>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">必备技能</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-1.5">
              {(job.requiredSkills || []).map((s, i) => (
                <Badge key={i} variant="default" className="text-xs">{s}</Badge>
              ))}
              {(job.requiredSkills || []).length === 0 && <span className="text-sm text-muted-foreground">未设置</span>}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">加分技能</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-1.5">
              {(job.bonusSkills || []).map((s, i) => (
                <Badge key={i} variant="secondary" className="text-xs">{s}</Badge>
              ))}
              {(job.bonusSkills || []).length === 0 && <span className="text-sm text-muted-foreground">未设置</span>}
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">编辑岗位</h2>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={handleCancel}>取消</Button>
          <Button size="sm" onClick={handleSave} disabled={saving}>
            <Save className="h-3 w-3 mr-1" /> {saving ? "保存中..." : "保存"}
          </Button>
        </div>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label>岗位名称</Label>
          <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="如：前端工程师" />
        </div>
        <div className="space-y-2">
          <Label>岗位描述</Label>
          <Textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="描述岗位职责和要求..." rows={5} />
        </div>
        <div className="space-y-2">
          <Label>必备技能</Label>
          <SkillTags skills={requiredSkills} onChange={setRequiredSkills} placeholder="输入必备技能后按 Enter 添加" />
        </div>
        <div className="space-y-2">
          <Label>加分技能</Label>
          <SkillTags skills={bonusSkills} onChange={setBonusSkills} placeholder="输入加分技能后按 Enter 添加" />
        </div>
      </div>
    </div>
  )
}
