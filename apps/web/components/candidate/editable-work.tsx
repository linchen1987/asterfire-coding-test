"use client"

import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Briefcase, XCircle } from "lucide-react"
import type { PartialWorkExperience } from "@app/shared"

interface EditableWorkProps {
  data: PartialWorkExperience[]
  onChange: (d: PartialWorkExperience[]) => void
}

export function EditableWork({ data, onChange }: EditableWorkProps) {
  const updateItem = (i: number, key: keyof PartialWorkExperience, val: string) => {
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
