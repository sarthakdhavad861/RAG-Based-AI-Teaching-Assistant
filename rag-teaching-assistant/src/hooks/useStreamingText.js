import { useState, useCallback, useRef } from 'react'

/**
 * useStreamingText — reusable hook for streaming text from any ReadableStream
 * Handles chunk decoding, accumulation, and abort control.
 *
 * @returns {{ text, isStreaming, startStreaming, stopStreaming, reset }}
 */
export function useStreamingText() {
  const [text, setText] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)
  const abortRef = useRef(null)

  const startStreaming = useCallback(async (stream) => {
    const controller = new AbortController()
    abortRef.current = controller

    setIsStreaming(true)
    setText('')

    try {
      const reader = stream.getReader()
      const decoder = new TextDecoder()
      let accumulated = ''

      while (true) {
        if (controller.signal.aborted) break
        const { done, value } = await reader.read()
        if (done) break
        accumulated += decoder.decode(value, { stream: true })
        setText(accumulated)
      }
    } finally {
      setIsStreaming(false)
    }
  }, [])

  const stopStreaming = useCallback(() => {
    abortRef.current?.abort()
    setIsStreaming(false)
  }, [])

  const reset = useCallback(() => {
    setText('')
    setIsStreaming(false)
  }, [])

  return { text, isStreaming, startStreaming, stopStreaming, reset }
}
