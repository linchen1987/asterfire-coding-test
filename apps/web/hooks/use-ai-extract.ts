"use client"

import { useState, useCallback } from "react"
import { toast } from "sonner"
import { API_BASE } from "@/lib/api-client"
import { useEventStream } from "@/hooks/use-event-stream"
import type { PartialData } from "@app/shared"

interface UseAiExtractReturn {
  extract: (candidateId: string) => Promise<void>
  partialData: PartialData
  progress: string | null
  thinking: string
  isExtracting: boolean
  error: string | null
  reset: () => void
}

export function useAiExtract(onComplete?: (candidateId: string) => void): UseAiExtractReturn {
  const [partialData, setPartialData] = useState<PartialData>({})
  const [progress, setProgress] = useState<string | null>(null)
  const [thinking, setThinking] = useState("")
  const [isExtracting, setIsExtracting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const { start } = useEventStream({
    url: "",
    events: {
      progress: (data) => setProgress(data.message as string),
      thinking: (data) => setThinking(prev => prev + (data.delta as string)),
      partial: (data) =>
        setPartialData(prev => ({
          ...prev,
          [data.field as string]: data.data,
        })),
      complete: () => {
        setIsExtracting(false)
        setProgress(null)
        toast.success("信息提取完成")
      },
      error: (data) => {
        setIsExtracting(false)
        const msg = data.message as string
        setError(msg)
        toast.error(msg)
      },
    },
    onStart: () => {
      setPartialData({})
      setProgress(null)
      setThinking("")
      setIsExtracting(true)
      setError(null)
    },
    onError: (msg) => {
      setIsExtracting(false)
      setError(msg)
      toast.error(msg)
    },
  })

  const reset = useCallback(() => {
    setPartialData({})
    setProgress(null)
    setThinking("")
    setIsExtracting(false)
    setError(null)
  }, [])

  const extract = useCallback(async (candidateId: string) => {
    await start({ url: `${API_BASE}/ai/extract/${candidateId}`, method: "POST" })
    onComplete?.(candidateId)
  }, [start, onComplete])

  return { extract, partialData, progress, thinking, isExtracting, error, reset }
}
