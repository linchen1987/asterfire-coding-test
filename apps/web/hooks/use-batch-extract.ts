"use client"

import { useState, useCallback, useRef } from "react"
import { API_BASE } from "@/lib/api-client"
import { useEventStream } from "@/hooks/use-event-stream"
import type { PartialData } from "@app/shared"

interface UseBatchExtractReturn {
  extractingId: string | null
  partialDataMap: Record<string, PartialData>
  progressMap: Record<string, string | null>
  errorMap: Record<string, string | null>
  thinkingMap: Record<string, string>
  extract: (id: string) => Promise<void>
}

export function useBatchExtract(): UseBatchExtractReturn {
  const [extractingId, setExtractingId] = useState<string | null>(null)
  const [partialDataMap, setPartialDataMap] = useState<Record<string, PartialData>>({})
  const [progressMap, setProgressMap] = useState<Record<string, string | null>>({})
  const [errorMap, setErrorMap] = useState<Record<string, string | null>>({})
  const [thinkingMap, setThinkingMap] = useState<Record<string, string>>({})
  const currentIdRef = useRef<string | null>(null)

  const { start } = useEventStream({
    url: "",
    events: {
      progress: (data) => {
        const id = currentIdRef.current
        if (id) setProgressMap(prev => ({ ...prev, [id]: data.message as string }))
      },
      thinking: (data) => {
        const id = currentIdRef.current
        if (id) setThinkingMap(prev => ({ ...prev, [id]: (prev[id] || "") + (data.delta as string) }))
      },
      partial: (data) => {
        const id = currentIdRef.current
        if (id) {
          setPartialDataMap(prev => ({
            ...prev,
            [id]: { ...prev[id], [data.field as string]: data.data },
          }))
        }
      },
      complete: () => {
        setExtractingId(null)
        const id = currentIdRef.current
        if (id) setProgressMap(prev => ({ ...prev, [id]: null }))
      },
      error: (data) => {
        setExtractingId(null)
        const id = currentIdRef.current
        if (id) setErrorMap(prev => ({ ...prev, [id]: data.message as string }))
      },
    },
    onStart: () => {},
    onError: (msg) => {
      setExtractingId(null)
      const id = currentIdRef.current
      if (id) setErrorMap(prev => ({ ...prev, [id]: msg }))
    },
  })

  const extract = useCallback(async (id: string) => {
    currentIdRef.current = id
    setExtractingId(id)
    setPartialDataMap(prev => ({ ...prev, [id]: {} }))
    setProgressMap(prev => ({ ...prev, [id]: null }))
    setErrorMap(prev => ({ ...prev, [id]: null }))
    setThinkingMap(prev => ({ ...prev, [id]: "" }))

    await start({ url: `${API_BASE}/ai/extract/${id}`, method: "POST" })
  }, [start])

  return { extractingId, partialDataMap, progressMap, errorMap, thinkingMap, extract }
}
