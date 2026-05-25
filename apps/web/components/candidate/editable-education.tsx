"use client"

import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { GraduationCap, XCircle } from "lucide-react"
import type { PartialEducation } from "@app/shared"

interface EditableEducationProps {
  data: PartialEducation[]
  onChange: (d: PartialEducation[]) => void
}

export function EditableEducation({ data, onChange }: EditableEducationProps) {
  const updateItem = (i: number, key: keyof PartialEducation, val: string) => {
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
