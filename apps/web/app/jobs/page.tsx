"use client"

import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { api } from "@/lib/api-client"
import type { JobDescription } from "@app/shared"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Skeleton } from "@/components/ui/skeleton"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from "@/components/ui/dialog"
import { SkillTags } from "@/components/job/skill-tags"
import { Plus, Pencil, Trash2, Briefcase, Users } from "lucide-react"
import Link from "next/link"
import { toast } from "sonner"

export default function JobsPage() {
  const queryClient = useQueryClient()
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [requiredSkills, setRequiredSkills] = useState<string[]>([])
  const [bonusSkills, setBonusSkills] = useState<string[]>([])

  const { data: jobs = [], isLoading } = useQuery<JobDescription[]>({
    queryKey: ["jobs"],
    queryFn: () => api.get("/jobs"),
  })

  const createMutation = useMutation({
    mutationFn: (data: { title: string; description: string; requiredSkills: string[]; bonusSkills: string[] }) =>
      api.post("/jobs", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["jobs"] })
      setOpen(false)
      setTitle("")
      setDescription("")
      setRequiredSkills([])
      setBonusSkills([])
      toast.success("岗位创建成功")
    },
    onError: (e: Error) => toast.error(e.message || "创建失败"),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/jobs/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["jobs"] })
      toast.success("岗位已删除")
    },
    onError: (e: Error) => toast.error(e.message || "删除失败"),
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">岗位管理</h1>
          <p className="text-muted-foreground">管理招聘岗位需求</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-1" /> 新建岗位</Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>新建岗位</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>岗位名称 *</Label>
                <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="如：前端工程师" />
              </div>
              <div className="space-y-2">
                <Label>岗位描述</Label>
                <Textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="描述岗位职责和要求..." rows={4} />
              </div>
              <div className="space-y-2">
                <Label>必备技能</Label>
                <SkillTags skills={requiredSkills} onChange={setRequiredSkills} />
              </div>
              <div className="space-y-2">
                <Label>加分技能</Label>
                <SkillTags skills={bonusSkills} onChange={setBonusSkills} />
              </div>
            </div>
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="outline">取消</Button>
              </DialogClose>
              <Button onClick={() => createMutation.mutate({ title, description, requiredSkills, bonusSkills })} disabled={!title.trim() || createMutation.isPending}>
                {createMutation.isPending ? "创建中..." : "创建"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map(i => (
            <Card key={i}>
              <CardContent className="p-4 space-y-3">
                <Skeleton className="h-6 w-32" />
                <Skeleton className="h-4 w-full" />
                <div className="flex gap-1">
                  <Skeleton className="h-5 w-12" />
                  <Skeleton className="h-5 w-12" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : jobs.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-12 text-muted-foreground">
          <Briefcase className="h-12 w-12 mb-3" />
          <p>暂无岗位</p>
          <p className="text-sm mt-1">点击"新建岗位"添加招聘岗位</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {jobs.map(job => (
            <Card key={job.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <Link href={`/jobs/${job.id}`} className="hover:underline">
                    <h3 className="font-semibold text-lg">{job.title}</h3>
                  </Link>
                  <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive" onClick={() => deleteMutation.mutate(job.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                {job.description && (
                  <p className="text-sm text-muted-foreground line-clamp-2">{job.description}</p>
                )}
                <div className="space-y-1.5">
                  {(job.requiredSkills || []).length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {job.requiredSkills.slice(0, 3).map((s, i) => (
                        <span key={i} className="inline-flex items-center rounded-md bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">{s}</span>
                      ))}
                      {job.requiredSkills.length > 3 && (
                        <span className="text-[10px] text-muted-foreground">+{job.requiredSkills.length - 3}</span>
                      )}
                    </div>
                  )}
                  {(job.bonusSkills || []).length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {job.bonusSkills.slice(0, 3).map((s, i) => (
                        <span key={i} className="inline-flex items-center rounded-md bg-secondary px-1.5 py-0.5 text-[10px] font-medium">{s}</span>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex items-center justify-between pt-1">
                  <span className="text-xs text-muted-foreground">{job.createdAt}</span>
                  <Link href={`/jobs/${job.id}`}>
                    <Button size="sm" variant="outline" className="h-7 text-xs">
                      <Pencil className="h-3 w-3 mr-1" /> 编辑
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
