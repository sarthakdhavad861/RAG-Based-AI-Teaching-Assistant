import React, { useCallback, memo } from 'react'
import { useChat } from '../context/ChatContext'
import MessageBubble from './MessageBubble'
import InputBox from './InputBox'
import { SUGGESTION_PROMPTS } from '../utils/constants'
import { useScrollToBottom } from '../hooks/useScrollToBottom'

/* ── Empty state ─────────────────────────────────────────────── */
const EmptyState = memo(() => (
  <div className="flex-1 flex flex-col items-center justify-center px-6 text-center animate-fade-up">
    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-aurora-indigo/20 to-aurora-blue/10 border border-aurora-indigo/20 flex items-center justify-center mb-5">
      <SparklesIcon size={28} className="text-aurora-indigo" />
    </div>
    <h2 className="text-xl font-semibold text-white mb-2">
      What would you like to learn today?
    </h2>
    <p className="text-sm text-obsidian-400 max-w-sm leading-relaxed">
      Ask anything — I'll retrieve the most relevant knowledge from the course materials,
      videos, and documentation to give you a precise answer.
    </p>
    <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-2 max-w-lg w-full">
      {SUGGESTION_PROMPTS.slice(0, 4).map((s, i) => (
        <SuggestionChip key={i} text={s} />
      ))}
    </div>
  </div>
))

function SuggestionChip({ text }) {
  const { sendMessage } = useChat()
  return (
    <button
      onClick={() => sendMessage(text)}
      className="
        text-left text-xs px-3 py-2.5 rounded-xl
        border border-obsidian-500 text-obsidian-300
        hover:border-aurora-indigo/40 hover:text-white hover:bg-obsidian-700
        transition-all duration-200
      "
    >
      {text}
    </button>
  )
}

/* ── Typing indicator ─────────────────────────────────────────── */
const TypingIndicator = memo(() => (
  <div className="flex items-start gap-3 px-4 py-3 animate-fade-up">
    <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-aurora-indigo to-aurora-blue flex items-center justify-center shrink-0">
      <BotIcon size={14} className="text-white" />
    </div>
    <div className="glass rounded-2xl rounded-tl-sm px-4 py-3 flex items-center gap-1.5">
      <span className="typing-dot" />
      <span className="typing-dot" />
      <span className="typing-dot" />
    </div>
  </div>
))

/* ── Scroll to bottom button ─────────────────────────────────── */
const ScrollToBottomBtn = memo(({ onClick }) => (
  <button
    onClick={onClick}
    className="
      absolute bottom-24 right-6 w-8 h-8 rounded-full
      bg-obsidian-600 border border-obsidian-400
      flex items-center justify-center
      hover:bg-obsidian-500 transition-all duration-200
      shadow-lg animate-fade-up
    "
    aria-label="Scroll to bottom"
  >
    <ChevronDownIcon size={14} className="text-obsidian-300" />
  </button>
))

/* ── Chat toolbar ─────────────────────────────────────────────── */
const ChatToolbar = memo(() => {
  const { dispatch, state, activeSession } = useChat()
  const hasMessages = (activeSession?.messages?.length ?? 0) > 0

  return (
    <div className="flex items-center justify-between px-4 py-3 border-b border-obsidian-600 bg-obsidian-900/80 backdrop-blur-sm">
      <div className="flex items-center gap-2">
        <button
          onClick={() => dispatch({ type: 'TOGGLE_SIDEBAR' })}
          className="btn-ghost p-2"
          aria-label="Toggle sidebar"
        >
          <MenuIcon size={16} />
        </button>
        <div>
          <h1 className="text-sm font-semibold text-white truncate max-w-48">
            {activeSession?.title ?? 'New Chat'}
          </h1>
          {state.model && (
            <p className="text-[10px] text-obsidian-400">{state.model}</p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-1">
        {hasMessages && (
          <button
            onClick={() => dispatch({ type: 'CLEAR_CHAT' })}
            className="btn-ghost text-xs flex items-center gap-1.5 text-aurora-red/70 hover:text-aurora-red"
          >
            <TrashIcon size={13} />
            <span className="hidden sm:inline">Clear</span>
          </button>
        )}
        <button
          onClick={() => dispatch({ type: 'TOGGLE_RAG_PANEL' })}
          className={`
            btn-ghost text-xs flex items-center gap-1.5
            ${state.ragPanelOpen ? 'text-aurora-indigo' : ''}
          `}
          title="Toggle knowledge sources panel"
        >
          <LayersIcon size={13} />
          <span className="hidden sm:inline">Sources</span>
        </button>
      </div>
    </div>
  )
})

/* ── Main ChatWindow ─────────────────────────────────────────── */
export default function ChatWindow() {
  const { activeSession, state } = useChat()
  const [showScrollBtn, setShowScrollBtn] = React.useState(false)

  const messages = activeSession?.messages ?? []
  const hasMessages = messages.length > 0

  const { containerRef, scrollToBottom, handleScroll: onScroll } = useScrollToBottom([
    messages.length,
    state.isStreaming,
  ])

  /* Show/hide scroll button based on scroll position */
  const handleScroll = useCallback(() => {
    const el = containerRef.current
    if (!el) return
    const distFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight
    setShowScrollBtn(distFromBottom > 200)
    onScroll()
  }, [containerRef, onScroll])

  return (
    <div className="flex flex-col h-full">
      <ChatToolbar />

      {/* Messages area */}
      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto scrollbar-thin relative"
      >
        {!hasMessages ? (
          <EmptyState />
        ) : (
          <div className="py-4 space-y-1">
            {messages.map(msg => (
              <MessageBubble key={msg.id} message={msg} />
            ))}

            {/* Typing indicator — show when loading but no streaming yet */}
            {state.isLoading && !state.isStreaming && (
              <TypingIndicator />
            )}

            <div className="h-4" />
          </div>
        )}

        {/* Error banner */}
        {state.error && (
          <div className="mx-4 mb-2 px-4 py-2.5 rounded-xl border border-aurora-red/30 bg-aurora-red/10 text-aurora-red text-xs flex items-center gap-2">
            <AlertIcon size={13} />
            {state.error}
          </div>
        )}

        {showScrollBtn && <ScrollToBottomBtn onClick={() => scrollToBottom('smooth')} />}
      </div>

      <InputBox />
    </div>
  )
}

/* ── Icons ───────────────────────────────────────────────────── */
const SparklesIcon = ({ size = 16, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M12 3l1.9 5.4L19 10l-5.1 1.6L12 17l-1.9-5.4L5 10l5.1-1.6z"/>
    <path d="M5 3l.9 2.4L8 6l-2.1.6L5 9l-.9-2.4L2 6l2.1-.6z"/>
    <path d="M19 14l.9 2.4L22 17l-2.1.6L19 20l-.9-2.4L16 17l2.1-.6z"/>
  </svg>
)
const BotIcon = ({ size = 16, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <rect x="3" y="11" width="18" height="10" rx="2"/><circle cx="12" cy="5" r="2"/>
    <path d="M12 7v4"/><line x1="8" y1="16" x2="8" y2="16"/><line x1="16" y1="16" x2="16" y2="16"/>
  </svg>
)
const MenuIcon = ({ size = 16, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className={className}><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
)
const TrashIcon = ({ size = 16, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/></svg>
)
const ChevronDownIcon = ({ size = 16, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className={className}><polyline points="6 9 12 15 18 9"/></svg>
)
const LayersIcon = ({ size = 16, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>
)
const AlertIcon = ({ size = 16, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
)
