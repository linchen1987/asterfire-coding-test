"use client"

import { useState, useCallback, useRef } from "react"
import { toast } from "sonner"

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api/v1"

interface PartialData {
  basics?: any
  education?: any[]
  workExperience?: any[]
  skills?: any[]
  projects?: any[]
}

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
  const abortRef = useRef<AbortController | null>(null)

  const reset = useCallback(() => {
    setPartialData({})
    setProgress(null)
    setThinking("")
    setIsExtracting(false)
    setError(null)
  }, [])

  const extract = useCallback(async (candidateId: string) => {
    abortRef.current?.abort()
    const abort = new AbortController()
    abortRef.current = abort

    reset()
    setIsExtracting(true)

    try {
      const res = await fetch(`${API_BASE}/ai/extract/${candidateId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: abort.signal,
      })

      if (!res.ok) {
        const json = await res.json()
        throw new Error(json.message || "Extract failed")
      }

      const reader = res.body?.getReader()
      if (!reader) throw new Error("No response body")

      const decoder = new TextDecoder()
      let buffer = ""

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split("\n")
        buffer = lines.pop() || ""

        let currentEvent = ""
        for (const line of lines) {
          if (line.startsWith("event: ")) {
            currentEvent = line.slice(7).trim()
          } else if (line.startsWith("data: ")) {
            const dataStr = line.slice(6)
            try {
              const data = JSON.parse(dataStr)
              if (currentEvent === "progress") {
                setProgress(data.message)
              } else if (currentEvent === "thinking") {
                setThinking(prev => prev + data.delta)
              } else if (currentEvent === "partial") {
                setPartialData((prev) => ({
                  ...prev,
                  [data.field]: data.data,
                }))
              } else if (currentEvent === "complete") {
                setIsExtracting(false)
                setProgress(null)
                toast.success("信息提取完成")
                onComplete?.(candidateId)
              } else if (currentEvent === "error") {
                setIsExtracting(false)
                setError(data.message)
                toast.error(data.message)
              }
            } catch {}
          }
        }
      }
    } catch (e: any) {
      if (e.name !== "AbortError") {
        setIsExtracting(false)
        setError(e.message)
        toast.error(e.message)
      }
    }
  }, [onComplete, reset])

  return { extract, partialData, progress, thinking, isExtracting, error, reset }
}
