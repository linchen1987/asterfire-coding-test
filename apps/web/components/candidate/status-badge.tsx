"use client"

import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ChevronDown } from "lucide-react"
import type { CandidateStatus } from "@app/shared"
import { CANDIDATE_STATUSES } from "@app/shared"

const STATUS_STYLES: Record<string, string> = {
  pending: "bg-slate-100 text-slate-700 hover:bg-slate-100 dark:bg-slate-800 dark:text-slate-300",
  screened: "bg-blue-100 text-blue-700 hover:bg-blue-100 dark:bg-blue-900/40 dark:text-blue-300",
  interviewing: "bg-amber-100 text-amber-700 hover:bg-amber-100 dark:bg-amber-900/40 dark:text-amber-300",
  hired: "bg-emerald-100 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-900/40 dark:text-emerald-300",
  rejected: "bg-red-100 text-red-700 hover:bg-red-100 dark:bg-red-900/40 dark:text-red-300",
}

interface StatusBadgeProps {
  status: CandidateStatus | null
  onStatusChange?: (status: CandidateStatus) => void
  transitioning?: boolean
}

const NEXT_STATUSES: Record<string, CandidateStatus[]> = {
  pending: ["screened", "rejected"],
  screened: ["interviewing", "rejected"],
  interviewing: ["hired", "rejected"],
}

export function StatusBadge({ status, onStatusChange, transitioning }: StatusBadgeProps) {
  if (!status) {
    return (
      <span className="inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium bg-muted text-muted-foreground">
        —
      </span>
    )
  }

  const info = CANDIDATE_STATUSES[status]
  const allowed = NEXT_STATUSES[status] || []
  const style = STATUS_STYLES[status] ?? "bg-muted text-muted-foreground"

  if (!onStatusChange || allowed.length === 0) {
    return (
      <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${style}`}>
        {info.label}
      </span>
    )
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1 transition-colors ${style}`} disabled={transitioning}>
          {transitioning ? "..." : info.label}
          <ChevronDown className="h-3 w-3 opacity-50" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        {allowed.map(s => (
          <DropdownMenuItem key={s} onClick={() => onStatusChange(s)}>
            {CANDIDATE_STATUSES[s].label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
