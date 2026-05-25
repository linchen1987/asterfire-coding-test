"use client"

import { useState } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Wrench, XCircle } from "lucide-react"
import type { PartialSkill } from "@app/shared"

interface EditableSkillsProps {
  data: PartialSkill[]
  onChange: (d: PartialSkill[]) => void
}

export function EditableSkills({ data, onChange }: EditableSkillsProps) {
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
