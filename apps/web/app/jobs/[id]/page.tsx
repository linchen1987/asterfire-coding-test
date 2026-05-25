"use client"

import { use, useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { api } from "@/lib/api-client"
import type { JobDescription } from "@app/shared"
import { JdEditor } from "@/components/job/jd-editor"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Loader2 } from "lucide-react"
import Link from "next/link"
import { toast } from "sonner"

export default function JobDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const queryClient = useQueryClient()

  const { data: job, isLoading } = useQuery<JobDescription>({
    queryKey: ["job", id],
    queryFn: () => api.get(`/jobs/${id}`),
  })

  const saveMutation = useMutation({
    mutationFn: (data: { title: string; description: string; requiredSkills: string[]; bonusSkills: string[] }) =>
      api.put(`/jobs/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["job", id] })
      queryClient.invalidateQueries({ queryKey: ["jobs"] })
      toast.success("岗位信息已更新")
    },
    onError: (e: any) => toast.error(e.message || "保存失败"),
  })

  if (isLoading || !job) {
    return (
      <div className="flex items-center justify-center p-12 text-muted-foreground">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" /> 加载中...
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/jobs" className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-5 w-5" />
        </Link>
      </div>
      <JdEditor
        job={job}
        onSave={async data => { await saveMutation.mutateAsync(data) }}
        saving={saveMutation.isPending}
      />
    </div>
  )
}
