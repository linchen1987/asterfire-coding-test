"use client"

import { use, useState, useRef, useCallback } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { api } from "@/lib/api-client"
import type { Candidate } from "@app/shared"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { ScoreRadar } from "@/components/charts/score-radar"
import { ScoreRing } from "@/components/charts/score-ring"
import { StatusBadge } from "@/components/candidate/status-badge"
import {
  User, GraduationCap, Briefcase, Wrench, FolderOpen,
  Loader2, Sparkles, ArrowLeft, MessageSquare, Brain, RotateCcw,
} from "lucide-react"
import Link from "next/link"
import { toast } from "sonner"

export default function CandidateDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const queryClient = useQueryClient()
  const [transitioning, setTransitioning] = useState(false)

  const [scoring, setScoring] = useState(false)
  const [scoreThinking, setScoreThinking] = useState("")
  const [scoreCommentStream, setScoreCommentStream] = useState("")
  const [scoreProgress, setScoreProgress] = useState("")
  const thinkingRef = useRef<HTMLDivElement>(null)

  const { data: candidate, isLoading } = useQuery<Candidate>({
    queryKey: ["candidate", id],
    queryFn: () => api.get(`/candidates/${id}`),
  })

  const handleScore = useCallback(async () => {
    setScoring(true)
    setScoreThinking("")
    setScoreCommentStream("")
    setScoreProgress("正在连接 AI 服务...")

    const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1'

    try {
      const res = await fetch(`${API_BASE}/candidates/${id}/score`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })

      if (!res.ok || !res.body) {
        throw new Error(res.statusText || '评分请求失败')
      }

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          if (line.startsWith('event: ')) {
            const eventType = line.slice(7).trim()
            continue
          }
          if (line.startsWith('data: ')) {
            const dataStr = line.slice(6)
            try {
              const data = JSON.parse(dataStr)

              const prevLine2 = lines[lines.indexOf(line) - 1] || ''
              const eventType = prevLine2.startsWith('event: ') ? prevLine2.slice(7).trim() : ''

              if (eventType === 'progress') {
                setScoreProgress(data.message || '')
              } else if (eventType === 'thinking') {
                setScoreThinking(prev => {
                  const next = prev + (data.delta || '')
                  setTimeout(() => thinkingRef.current?.scrollTo(0, thinkingRef.current.scrollHeight), 0)
                  return next
                })
              } else if (eventType === 'partial') {
                setScoreCommentStream(prev => prev + (data.delta || ''))
              } else if (eventType === 'complete') {
                toast.success("评分完成")
                queryClient.invalidateQueries({ queryKey: ["candidate", id] })
              } else if (eventType === 'error') {
                throw new Error(data.message || '评分失败')
              }
            } catch (e: any) {
              if (e.message && !e.message.includes('JSON')) throw e
            }
          }
        }
      }
    } catch (e: any) {
      toast.error(e.message || "评分失败")
    } finally {
      setScoring(false)
      setScoreProgress("")
    }
  }, [id, queryClient])

  const handleStatusChange = async (status: any) => {
    setTransitioning(true)
    try {
      await api.put(`/candidates/${id}/status`, { status })
      toast.success("状态已更新")
      queryClient.invalidateQueries({ queryKey: ["candidate", id] })
    } catch (e: any) {
      toast.error(e.message || "状态更新失败")
    } finally {
      setTransitioning(false)
    }
  }

  if (isLoading || !candidate) {
    return (
      <div className="flex items-center justify-center p-12 text-muted-foreground">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" /> 加载中...
      </div>
    )
  }

  const hasScore = candidate.overallScore != null

  const showStreamingUI = scoring
  const showScoreResult = hasScore && !scoring

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/candidates" className="text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{candidate.name || "未知候选人"}</h1>
            <p className="text-muted-foreground text-sm mt-1">
              {candidate.fileName} · {candidate.createdAt}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <StatusBadge status={candidate.status} onStatusChange={handleStatusChange} transitioning={transitioning} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <InfoSection icon={User} title="基本信息">
            <div className="grid grid-cols-2 gap-3">
              <InfoItem label="姓名" value={candidate.name} />
              <InfoItem label="电话" value={candidate.phone} />
              <InfoItem label="邮箱" value={candidate.email} />
              <InfoItem label="城市" value={candidate.city} />
            </div>
          </InfoSection>

          <InfoSection icon={GraduationCap} title="教育背景">
            {candidate.educations && candidate.educations.length > 0 ? (
              <div className="space-y-2">
                {candidate.educations.map((edu, i) => (
                  <div key={i} className="flex items-start justify-between text-sm">
                    <div>
                      <span className="font-medium">{edu.school}</span>
                      <span className="text-muted-foreground ml-2">{edu.major}</span>
                    </div>
                    <div className="text-muted-foreground text-xs shrink-0">
                      {edu.degree}{edu.graduatedAt ? ` · ${edu.graduatedAt}` : ""}
                    </div>
                  </div>
                ))}
              </div>
            ) : <p className="text-sm text-muted-foreground">暂无教育信息</p>}
          </InfoSection>

          <InfoSection icon={Briefcase} title="工作经历">
            {candidate.workExperiences && candidate.workExperiences.length > 0 ? (
              <div className="space-y-4">
                {candidate.workExperiences.map((exp, i) => (
                  <div key={i} className="relative pl-4 border-l-2 border-muted">
                    <div className="text-sm font-medium">{exp.company} · {exp.position}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {exp.startDate}{exp.endDate ? ` — ${exp.endDate}` : " — 至今"}
                    </div>
                    {exp.summary && <p className="text-sm text-muted-foreground mt-1">{exp.summary}</p>}
                  </div>
                ))}
              </div>
            ) : <p className="text-sm text-muted-foreground">暂无工作经历</p>}
          </InfoSection>

          <InfoSection icon={Wrench} title="技能标签">
            {candidate.skills && candidate.skills.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {candidate.skills.map((s, i) => (
                  <Badge key={i} variant="secondary" className="text-xs">{s.name}</Badge>
                ))}
              </div>
            ) : <p className="text-sm text-muted-foreground">暂无技能信息</p>}
          </InfoSection>

          {candidate.projects && candidate.projects.length > 0 && (
            <InfoSection icon={FolderOpen} title="项目经历">
              <div className="space-y-3">
                {candidate.projects.map((proj, i) => (
                  <div key={i} className="text-sm space-y-1">
                    <div className="font-medium">{proj.name}</div>
                    {proj.techStack && (
                      <div className="flex flex-wrap gap-1">
                        {(typeof proj.techStack === "string" ? JSON.parse(proj.techStack) : proj.techStack).map((t: string, j: number) => (
                          <Badge key={j} variant="outline" className="text-xs">{t}</Badge>
                        ))}
                      </div>
                    )}
                    {proj.responsibilities && <p className="text-muted-foreground">{proj.responsibilities}</p>}
                  </div>
                ))}
              </div>
            </InfoSection>
          )}
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Sparkles className="h-4 w-4" /> AI 匹配评分
              </CardTitle>
            </CardHeader>
            <CardContent>
              {showStreamingUI ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>{scoreProgress || "评分中..."}</span>
                  </div>

                  {scoreThinking && (
                    <div className="space-y-1">
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Brain className="h-3 w-3" /> AI 思考过程
                      </div>
                      <div
                        ref={thinkingRef}
                        className="max-h-40 overflow-y-auto rounded-md bg-muted/50 p-3 text-xs text-muted-foreground leading-relaxed"
                      >
                        {scoreThinking}
                      </div>
                    </div>
                  )}

                  {scoreCommentStream && (
                    <div className="space-y-1">
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <MessageSquare className="h-3 w-3" /> 评语生成中
                      </div>
                      <div className="rounded-md border p-3 text-sm text-muted-foreground leading-relaxed">
                        {scoreCommentStream}
                        <span className="inline-block w-1 h-4 bg-primary animate-pulse ml-0.5 align-text-bottom" />
                      </div>
                    </div>
                  )}
                </div>
              ) : showScoreResult ? (
                <div className="space-y-4">
                  <div className="flex justify-center relative">
                    <ScoreRing score={candidate.overallScore!} />
                  </div>
                  <ScoreRadar
                    skillScore={candidate.skillScore!}
                    experienceScore={candidate.experienceScore!}
                    educationScore={candidate.educationScore!}
                    overallScore={candidate.overallScore!}
                  />
                  <Separator />
                  <div className="grid grid-cols-3 gap-2 text-center text-sm">
                    <div>
                      <div className="font-semibold">{candidate.skillScore}</div>
                      <div className="text-xs text-muted-foreground">技能</div>
                    </div>
                    <div>
                      <div className="font-semibold">{candidate.experienceScore}</div>
                      <div className="text-xs text-muted-foreground">经验</div>
                    </div>
                    <div>
                      <div className="font-semibold">{candidate.educationScore}</div>
                      <div className="text-xs text-muted-foreground">教育</div>
                    </div>
                  </div>
                  <div className="flex justify-center pt-2">
                    <Button size="sm" variant="outline" onClick={handleScore} disabled={scoring}>
                      <RotateCcw className="h-3 w-3 mr-1" /> 重新评分
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-3 py-6">
                  <p className="text-sm text-muted-foreground">尚未评分</p>
                  <Button onClick={handleScore} disabled={scoring}>
                    <Sparkles className="mr-1 h-3 w-3" />开始评分
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {(showScoreResult && candidate.aiComment) && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <MessageSquare className="h-4 w-4" /> AI 评语
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground leading-relaxed">{candidate.aiComment}</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}

function InfoSection({ icon: Icon, title, children }: { icon: any; title: string; children: React.ReactNode }) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Icon className="h-4 w-4 text-muted-foreground" /> {title}
        </CardTitle>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  )
}

function InfoItem({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="text-sm">
      <span className="text-muted-foreground">{label}：</span>
      <span className="font-medium">{value || "—"}</span>
    </div>
  )
}
