"use client"

import { useRef, useCallback } from "react"

export interface SSEEventMap {
  [key: string]: (data: Record<string, unknown>, currentEvent: string) => void
}

export interface UseEventStreamOptions {
  url: string
  method?: string
  body?: unknown
  events: SSEEventMap
  onStart?: () => void
  onComplete?: () => void
  onError?: (error: string) => void
}

export interface UseEventStreamReturn {
  start: (opts?: Partial<UseEventStreamOptions>) => Promise<void>
  cancel: () => void
}

export function useEventStream(baseOpts: UseEventStreamOptions): UseEventStreamReturn {
  const abortRef = useRef<AbortController | null>(null)

  const cancel = useCallback(() => {
    abortRef.current?.abort()
    abortRef.current = null
  }, [])

  const start = useCallback(async (overrideOpts?: Partial<UseEventStreamOptions>) => {
    abortRef.current?.abort()
    const abort = new AbortController()
    abortRef.current = abort

    const opts = { ...baseOpts, ...overrideOpts }

    opts.onStart?.()

    try {
      const res = await fetch(opts.url, {
        method: opts.method ?? "POST",
        headers: { "Content-Type": "application/json" },
        signal: abort.signal,
        ...(opts.body != null ? { body: JSON.stringify(opts.body) } : {}),
      })

      if (!res.ok) {
        const json = await res.json().catch(() => ({}))
        throw new Error(json.message || res.statusText || "Request failed")
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
            try {
              const data = JSON.parse(line.slice(6))
              const handler = opts.events[currentEvent]
              if (handler) {
                handler(data, currentEvent)
              }
            } catch {
              // ignore non-JSON data lines
            }
          }
        }
      }
    } catch (e: unknown) {
      if (e instanceof DOMException && e.name === "AbortError") return
      const message = e instanceof Error ? e.message : "Unknown error"
      opts.onError?.(message)
    }
  }, [baseOpts])

  return { start, cancel }
}
