"use client"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { FileText, Clock, CheckCircle2, XCircle, Loader2 } from "lucide-react"
import type { Candidate } from "@app/shared"
import { UPLOAD_STATUSES } from "@app/shared"

interface ExtractProgressProps {
  candidate: Candidate
  onExtract: (id: string) => void
  extracting?: boolean
}

export function ExtractProgress({ candidate, onExtract, extracting }: ExtractProgressProps) {
  const statusInfo = UPLOAD_STATUSES[candidate.uploadStatus]

  return (
    <Card>
      <CardContent className="flex items-center justify-between p-4">
        <div className="flex items-center gap-3 min-w-0">
          <FileText className="h-8 w-8 shrink-0 text-muted-foreground" />
          <div className="min-w-0">
            <p className="font-medium truncate">{candidate.fileName || "未知文件"}</p>
            <div className="flex items-center gap-2 mt-1">
              <Clock className="h-3 w-3 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">{candidate.createdAt}</span>
              <Badge
                variant={
                  candidate.uploadStatus === "completed"
                    ? "default"
                    : candidate.uploadStatus === "failed"
                    ? "destructive"
                    : "secondary"
                }
                className="text-xs"
              >
                {statusInfo.label}
              </Badge>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {candidate.uploadStatus === "pending" && (
            <Button
              size="sm"
              onClick={() => onExtract(candidate.id)}
              disabled={extracting}
            >
              {extracting ? (
                <>
                  <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                  解析中...
                </>
              ) : (
                "开始解析"
              )}
            </Button>
          )}
          {candidate.uploadStatus === "completed" && (
            <CheckCircle2 className="h-5 w-5 text-green-500" />
          )}
          {candidate.uploadStatus === "failed" && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => onExtract(candidate.id)}
            >
              <XCircle className="mr-1 h-3 w-3 text-red-500" />
              重试
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
