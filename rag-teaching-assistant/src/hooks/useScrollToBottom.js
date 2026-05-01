import { useRef, useCallback, useEffect } from 'react'

/**
 * useScrollToBottom — attaches to a scrollable container and provides:
 *   - scrollToBottom(behavior?)  — programmatic scroll
 *   - isAtBottom                 — reactive boolean
 *   - containerRef               — attach to your scrollable div
 */
export function useScrollToBottom(deps = []) {
  const containerRef = useRef(null)
  const isAtBottomRef = useRef(true)

  const scrollToBottom = useCallback((behavior = 'smooth') => {
    const el = containerRef.current
    if (!el) return
    el.scrollTo({ top: el.scrollHeight, behavior })
  }, [])

  /* Auto-scroll when deps change (e.g. new message) only if already at bottom */
  useEffect(() => {
    if (isAtBottomRef.current) scrollToBottom('smooth')
  }, deps) // eslint-disable-line react-hooks/exhaustive-deps

  const handleScroll = useCallback(() => {
    const el = containerRef.current
    if (!el) return
    const distFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight
    isAtBottomRef.current = distFromBottom < 80
  }, [])

  return { containerRef, scrollToBottom, handleScroll }
}
