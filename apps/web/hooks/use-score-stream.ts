"use client"

import { useState, useCallback } from "react"
import { API_BASE } from "@/lib/api-client"
import { useEventStream } from "@/hooks/use-event-stream"

interface UseScoreStreamReturn {
  scoring: boolean
  scoreThinking: string
  scoreCommentStream: string
  scoreProgress: string
  startScore: (candidateId: string) => Promise<void>
}

export function useScoreStream(onComplete: (candidateId: string) => void): UseScoreStreamReturn {
  const [scoring, setScoring] = useState(false)
  const [scoreThinking, setScoreThinking] = useState("")
  const [scoreCommentStream, setScoreCommentStream] = useState("")
  const [scoreProgress, setScoreProgress] = useState("")
  const currentIdRef = { current: "" }

  const { start } = useEventStream({
    url: "",
    events: {
      progress: (data) => setScoreProgress(data.message as string || ""),
      thinking: (data) => setScoreThinking(prev => prev + (data.delta as string || "")),
      partial: (data) => setScoreCommentStream(prev => prev + (data.delta as string || "")),
      complete: () => {
        setScoring(false)
        setScoreProgress("")
        onComplete(currentIdRef.current)
      },
      error: (data) => {
        setScoring(false)
        setScoreProgress("")
        throw new Error(data.message as string || "评分失败")
      },
    },
    onStart: () => {
      setScoring(true)
      setScoreThinking("")
      setScoreCommentStream("")
      setScoreProgress("正在连接 AI 服务...")
    },
    onError: () => {
      setScoring(false)
      setScoreProgress("")
    },
  })

  const startScore = useCallback(async (candidateId: string) => {
    currentIdRef.current = candidateId
    await start({ url: `${API_BASE}/candidates/${candidateId}/score`, method: "POST" })
  }, [start, onComplete])

  return { scoring, scoreThinking, scoreCommentStream, scoreProgress, startScore }
}
