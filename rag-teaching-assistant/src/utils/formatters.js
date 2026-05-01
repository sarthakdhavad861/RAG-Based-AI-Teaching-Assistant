/**
 * formatters.js — shared formatting utilities
 */

/**
 * Format a timestamp into a human-readable relative or absolute label.
 * @param {number} ts - Unix ms timestamp
 * @returns {string}
 */
export function formatTimestamp(ts) {
  const date = new Date(ts)
  const now  = new Date()

  if (date.toDateString() === now.toDateString()) {
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
  }

  const yesterday = new Date(now)
  yesterday.setDate(now.getDate() - 1)
  if (date.toDateString() === yesterday.toDateString()) {
    return `Yesterday ${date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`
  }

  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

/**
 * Format a relative date label for session history items.
 * @param {number} ts - Unix ms timestamp
 * @returns {string}
 */
export function formatRelativeDate(ts) {
  const date = new Date(ts)
  const now  = new Date()
  if (date.toDateString() === now.toDateString()) return 'Today'
  const yesterday = new Date(now); yesterday.setDate(now.getDate() - 1)
  if (date.toDateString() === yesterday.toDateString()) return 'Yesterday'
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

/**
 * Format seconds into MM:SS display.
 * @param {number} seconds
 * @returns {string}
 */
export function formatVideoTime(seconds) {
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

/**
 * Format a similarity score (0–1) to a percentage string.
 * @param {number} score
 * @returns {string}
 */
export function formatScore(score) {
  return `${Math.round(score * 100)}%`
}

/**
 * Pick a color based on a similarity score.
 * @param {number} score - 0 to 1
 * @returns {string} CSS color
 */
export function scoreColor(score) {
  const pct = score * 100
  if (pct >= 90) return '#34d399'  // green
  if (pct >= 75) return '#4f8ef7'  // blue
  return '#fbbf24'                  // amber
}

/**
 * Truncate a string to a max length, appending ellipsis if needed.
 * @param {string} str
 * @param {number} maxLen
 * @returns {string}
 */
export function truncate(str, maxLen = 60) {
  if (!str || str.length <= maxLen) return str ?? ''
  return str.slice(0, maxLen).trimEnd() + '…'
}

/**
 * Generate a short title from the first user message.
 * @param {string} content
 * @returns {string}
 */
export function titleFromMessage(content) {
  return truncate(content.replace(/\s+/g, ' ').trim(), 42)
}
