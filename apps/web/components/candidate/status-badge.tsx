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

const STATUS_VARIANTS: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  pending: "secondary",
  screened: "default",
  interviewing: "outline",
  hired: "default",
  rejected: "destructive",
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
    return <Badge variant="secondary" className="text-xs">—</Badge>
  }

  const info = CANDIDATE_STATUSES[status]
  const allowed = NEXT_STATUSES[status] || []

  if (!onStatusChange || allowed.length === 0) {
    return <Badge variant={STATUS_VARIANTS[status]} className="text-xs">{info.label}</Badge>
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="inline-flex items-center gap-1 focus:outline-none" disabled={transitioning}>
          <Badge variant={STATUS_VARIANTS[status]} className="text-xs cursor-pointer">
            {transitioning ? "..." : info.label}
          </Badge>
          <ChevronDown className="h-3 w-3 text-muted-foreground" />
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
