"use client"

import { useState, KeyboardEvent } from "react"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { X } from "lucide-react"

interface SkillTagsProps {
  skills: string[]
  onChange: (skills: string[]) => void
  placeholder?: string
}

export function SkillTags({ skills, onChange, placeholder = "输入技能后按 Enter 添加" }: SkillTagsProps) {
  const [input, setInput] = useState("")

  const add = (value: string) => {
    const trimmed = value.trim()
    if (trimmed && !skills.includes(trimmed)) {
      onChange([...skills, trimmed])
    }
    setInput("")
  }

  const remove = (index: number) => {
    onChange(skills.filter((_, i) => i !== index))
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault()
      add(input)
    } else if (e.key === "Backspace" && input === "" && skills.length > 0) {
      remove(skills.length - 1)
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5 rounded-md border px-3 py-2 text-sm min-h-[40px]">
      {skills.map((skill, i) => (
        <Badge key={i} variant="secondary" className="gap-1 pr-1">
          {skill}
          <button type="button" onClick={() => remove(i)} className="hover:text-destructive">
            <X className="h-3 w-3" />
          </button>
        </Badge>
      ))}
      <Input
        value={input}
        onChange={e => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={skills.length === 0 ? placeholder : ""}
        className="border-0 p-0 h-5 min-w-[100px] flex-1 focus-visible:ring-0 text-sm"
      />
    </div>
  )
}
