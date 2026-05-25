"use client"

import { Input } from "@/components/ui/input"
import { User } from "lucide-react"
import type { PartialBasics } from "@app/shared"

interface EditableBasicsProps {
  data: PartialBasics
  onChange: (d: PartialBasics) => void
}

export function EditableBasics({ data, onChange }: EditableBasicsProps) {
  const update = (key: keyof PartialBasics, val: string) => onChange({ ...data, [key]: val })
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
