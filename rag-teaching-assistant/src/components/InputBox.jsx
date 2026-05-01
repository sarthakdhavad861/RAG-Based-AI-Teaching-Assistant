import React, { useState, useRef, useCallback, useEffect, memo } from 'react'
import { useChat } from '../context/ChatContext'

export default memo(function InputBox() {
  const { sendMessage, stopGeneration, uploadVideoFile, state } = useChat()
  const [value, setValue]           = useState('')
  const textareaRef                 = useRef(null)
  const fileInputRef                = useRef(null)
  const isDisabled  = state.isLoading
  const isUploading = state.uploadStatus === 'uploading' || state.uploadStatus === 'processing'
  const MAX_ROWS = 6

  /* Auto-resize textarea */
  useEffect(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    const maxH = 24 * MAX_ROWS
    el.style.height = Math.min(el.scrollHeight, maxH) + 'px'
    el.style.overflowY = el.scrollHeight > maxH ? 'auto' : 'hidden'
  }, [value])

  const handleSend = useCallback(() => {
    const trimmed = value.trim()
    if (!trimmed || isDisabled) return
    sendMessage(trimmed)
    setValue('')
    textareaRef.current?.focus()
  }, [value, isDisabled, sendMessage])

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() }
  }, [handleSend])

  /* ── File picker → upload to POST /upload-video ── */
  const handleFileChange = useCallback(async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''                // reset so same file can be re-selected
    await uploadVideoFile(file)
  }, [uploadVideoFile])

  const openFilePicker = useCallback(() => {
    if (!isDisabled && !isUploading) fileInputRef.current?.click()
  }, [isDisabled, isUploading])

  /* Upload status colour */
  const uploadColor =
    state.uploadStatus === 'success'  ? 'text-aurora-green' :
    state.uploadStatus === 'error'    ? 'text-aurora-red'   :
    'text-aurora-indigo'

  return (
    <div className="px-4 py-4 border-t border-obsidian-600 bg-obsidian-900/80 backdrop-blur-sm">

      {/* ── Upload status banner ── */}
      {state.uploadStatus && (
        <div className={`
          mb-3 flex items-center gap-2 px-3 py-2 rounded-xl text-xs border
          ${state.uploadStatus === 'success' ? 'border-aurora-green/30 bg-aurora-green/10 text-aurora-green' :
            state.uploadStatus === 'error'   ? 'border-aurora-red/30  bg-aurora-red/10  text-aurora-red'   :
            'border-aurora-indigo/30 bg-aurora-indigo/10 text-aurora-indigo'}
        `}>
          {/* Spinner / icon */}
          {(state.uploadStatus === 'uploading' || state.uploadStatus === 'processing') && (
            <SpinnerIcon size={13} className="animate-spin shrink-0" />
          )}
          {state.uploadStatus === 'success' && <CheckCircleIcon size={13} className="shrink-0" />}
          {state.uploadStatus === 'error'   && <AlertIcon       size={13} className="shrink-0" />}

          <span className="flex-1 truncate">{state.uploadMessage}</span>

          {/* Progress bar */}
          {(state.uploadStatus === 'uploading') && (
            <div className="w-20 h-1 bg-obsidian-600 rounded-full overflow-hidden shrink-0">
              <div
                className="h-full bg-aurora-indigo rounded-full transition-all duration-300"
                style={{ width: `${state.uploadProgress}%` }}
              />
            </div>
          )}
          {state.uploadStatus === 'uploading' && (
            <span className="font-mono text-[10px] shrink-0">{state.uploadProgress}%</span>
          )}
          {state.uploadStatus === 'success' && state.totalChunks > 0 && (
            <span className="font-mono text-[10px] shrink-0">{state.totalChunks} chunks indexed</span>
          )}
        </div>
      )}

      {/* ── Main input row ── */}
      <div
        className={`
          flex items-end gap-2 glass rounded-2xl px-3 py-2.5 transition-all duration-200
          ${!isDisabled
            ? 'focus-within:border-aurora-indigo/50 focus-within:shadow-[0_0_0_1px_rgba(124,92,252,0.2)]'
            : 'opacity-75'}
        `}
      >
        {/* Hidden file input — only .mp4, .mkv, .mov (matches your FastAPI check) */}
        <input
          ref={fileInputRef}
          type="file"
          accept=".mp4,.mkv,.mov"
          className="hidden"
          onChange={handleFileChange}
          disabled={isDisabled || isUploading}
        />

        {/* Paperclip button → triggers file picker */}
        <button
          onClick={openFilePicker}
          disabled={isDisabled || isUploading}
          title="Upload video (.mp4, .mkv, .mov) to knowledge base"
          className={`
            p-2 shrink-0 rounded-xl transition-all duration-200
            ${isUploading
              ? 'text-aurora-indigo animate-pulse cursor-wait'
              : 'btn-ghost'}
          `}
        >
          {isUploading ? <SpinnerIcon size={16} className="animate-spin" /> : <PaperclipIcon size={16} />}
        </button>

        {/* Textarea */}
        <textarea
          ref={textareaRef}
          value={value}
          onChange={e => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={isDisabled}
          placeholder={
            isUploading ? 'Processing video…' :
            isDisabled  ? 'AI is thinking…' :
            'Ask anything about the course material…'
          }
          rows={1}
          className="
            flex-1 bg-transparent resize-none text-sm text-white
            placeholder-obsidian-400 focus:outline-none leading-6
            min-h-[24px] py-1 scrollbar-thin disabled:cursor-not-allowed
          "
        />

        {/* Mic button */}
        <button
          className="btn-ghost p-2 shrink-0"
          disabled={isDisabled}
          title="Voice input (coming soon)"
        >
          <MicIcon size={16} />
        </button>

        {/* Send / Stop */}
        {isDisabled ? (
          <button
            onClick={stopGeneration}
            className="shrink-0 w-8 h-8 flex items-center justify-center rounded-xl bg-aurora-red/20 border border-aurora-red/30 text-aurora-red hover:bg-aurora-red/30 transition-all"
            title="Stop generation"
          >
            <StopIcon size={14} />
          </button>
        ) : (
          <button
            onClick={handleSend}
            disabled={!value.trim()}
            className={`
              shrink-0 w-8 h-8 flex items-center justify-center rounded-xl transition-all duration-200
              ${value.trim()
                ? 'bg-gradient-to-br from-aurora-indigo to-aurora-blue text-white glow-accent hover:opacity-90'
                : 'bg-obsidian-700 text-obsidian-400 cursor-not-allowed'}
            `}
            title="Send message (Enter)"
          >
            <SendIcon size={14} />
          </button>
        )}
      </div>

      <p className="text-[10px] text-obsidian-400 text-center mt-2">
        Press <kbd className="bg-obsidian-700 border border-obsidian-500 rounded px-1 py-0.5 font-mono text-[9px]">Enter</kbd> to send
        · <kbd className="bg-obsidian-700 border border-obsidian-500 rounded px-1 py-0.5 font-mono text-[9px]">Shift+Enter</kbd> new line
        · <kbd className="bg-obsidian-700 border border-obsidian-500 rounded px-1 py-0.5 font-mono text-[9px]">📎</kbd> upload video
      </p>
    </div>
  )
})

/* ── Icons ───────────────────────────────────────────────────── */
const SendIcon = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
  </svg>
)
const MicIcon = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
    <path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/>
  </svg>
)
const PaperclipIcon = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/>
  </svg>
)
const StopIcon = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor"><rect x="4" y="4" width="16" height="16" rx="2"/></svg>
)
const SpinnerIcon = ({ size = 16, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className={className}>
    <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
  </svg>
)
const CheckCircleIcon = ({ size = 14, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
  </svg>
)
const AlertIcon = ({ size = 14, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
  </svg>
)
