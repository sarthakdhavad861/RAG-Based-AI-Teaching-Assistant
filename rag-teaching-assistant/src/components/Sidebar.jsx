import React, { memo, useCallback } from 'react'
import { useChat } from '../context/ChatContext'
import { MODELS } from '../utils/constants'
import { formatRelativeDate } from '../utils/formatters'

/* ── Session item ─────────────────────────────────────────────── */
const SessionItem = memo(({ session, isActive, onClick, onDelete }) => (
  <button
    onClick={onClick}
    className={`
      group w-full text-left rounded-xl px-3 py-2.5 text-sm transition-all duration-150
      ${isActive
        ? 'bg-obsidian-600 border border-obsidian-400 text-white'
        : 'text-[var(--color-muted)] hover:bg-obsidian-700 hover:text-white'
      }
    `}
  >
    <div className="flex items-start justify-between gap-1">
      <span className="truncate leading-snug font-medium">{session.title}</span>
      <button
        onClick={e => { e.stopPropagation(); onDelete(session.id) }}
        className="opacity-0 group-hover:opacity-100 shrink-0 mt-0.5 text-obsidian-400 hover:text-aurora-red transition-all"
        aria-label="Delete session"
      >
        <TrashIcon size={12} />
      </button>
    </div>
    <div className="text-[10px] text-obsidian-400 mt-0.5">
      {formatRelativeDate(session.createdAt)} · {session.messages.length} messages
    </div>
  </button>
))

/* ── Sidebar ──────────────────────────────────────────────────── */
export default memo(function Sidebar() {
  const { state, dispatch } = useChat()
  const { sessions, activeSessionId, sidebarOpen, model } = state

  const newChat    = useCallback(() => dispatch({ type: 'NEW_SESSION' }), [dispatch])
  const selectSess = useCallback((id) => dispatch({ type: 'SELECT_SESSION', id }), [dispatch])
  const deleteSess = useCallback((id) => dispatch({ type: 'DELETE_SESSION', id }), [dispatch])
  const setModel   = useCallback((v) => dispatch({ type: 'SET_MODEL', value: v }), [dispatch])
  const toggleTheme = useCallback(() => dispatch({ type: 'TOGGLE_THEME' }), [dispatch])

  if (!sidebarOpen) return null

  return (
    <aside
      className="
        w-64 shrink-0 flex flex-col border-r border-obsidian-600 bg-obsidian-900
        animate-slide-in overflow-hidden
      "
    >
      {/* Header */}
      <div className="px-4 pt-5 pb-4 border-b border-obsidian-600">
        <div className="flex items-center gap-2.5 mb-4">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-aurora-indigo to-aurora-blue flex items-center justify-center shrink-0 shadow-lg">
            <BrainIcon size={16} className="text-white" />
          </div>
          <div>
            <p className="text-xs font-semibold text-gradient leading-none">AI Teaching</p>
            <p className="text-[10px] text-obsidian-400 mt-0.5">Assistant</p>
          </div>
        </div>

        <button
          onClick={newChat}
          className="
            w-full flex items-center justify-center gap-2 text-sm font-medium
            rounded-xl py-2.5 px-3 transition-all duration-200
            bg-gradient-to-r from-aurora-indigo to-aurora-blue text-white
            hover:opacity-90 glow-accent
          "
        >
          <PlusIcon size={15} />
          New Chat
        </button>
      </div>

      {/* Model selector */}
      <div className="px-4 pt-3 pb-2">
        <label className="text-[10px] uppercase tracking-widest text-obsidian-400 font-semibold">Model</label>
        <select
          value={model}
          onChange={e => setModel(e.target.value)}
          className="
            mt-1.5 w-full input-field text-xs py-2 cursor-pointer
            appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%2212%22 height=%2212%22 viewBox=%220 0 12 12%22%3E%3Cpath fill=%22%237070a0%22 d=%22M6 8L1 3h10z%22/%3E%3C/svg%3E')] bg-no-repeat bg-[center_right_12px]
          "
        >
          {MODELS.map(m => (
            <option key={m.id} value={m.id} className="bg-obsidian-800">{m.label}</option>
          ))}
        </select>
      </div>

      {/* History */}
      <div className="flex-1 overflow-y-auto px-3 py-2 scrollbar-thin space-y-1">
        <p className="text-[10px] uppercase tracking-widest text-obsidian-400 font-semibold px-2 mb-2">History</p>
        {sessions.length === 0 && (
          <p className="text-xs text-obsidian-400 text-center py-8">No conversations yet</p>
        )}
        {sessions.map(s => (
          <SessionItem
            key={s.id}
            session={s}
            isActive={s.id === activeSessionId}
            onClick={() => selectSess(s.id)}
            onDelete={deleteSess}
          />
        ))}
      </div>

      {/* Footer controls */}
      <div className="border-t border-obsidian-600 px-3 py-3 flex items-center justify-between">
        <button onClick={toggleTheme} className="btn-ghost text-xs flex items-center gap-1.5">
          <SunMoonIcon size={14} />
          Theme
        </button>
        <button
          onClick={() => dispatch({ type: 'TOGGLE_RAG_PANEL' })}
          className="btn-ghost text-xs flex items-center gap-1.5"
          title="Toggle RAG panel"
        >
          <LayersIcon size={14} />
          Sources
        </button>
      </div>
    </aside>
  )
})

/* ── Inline SVG Icons (zero bundle cost) ─────────────────────── */
const BrainIcon = ({ size = 16, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96-.46 2.5 2.5 0 0 1-2.96-3.08 3 3 0 0 1-.34-5.58 2.5 2.5 0 0 1 1.32-4.24 2.5 2.5 0 0 1 4.44-1.14"/>
    <path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96-.46 2.5 2.5 0 0 0 2.96-3.08 3 3 0 0 0 .34-5.58 2.5 2.5 0 0 0-1.32-4.24 2.5 2.5 0 0 0-4.44-1.14"/>
  </svg>
)
const PlusIcon = ({ size = 16, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className={className}><path d="M12 5v14M5 12h14"/></svg>
)
const TrashIcon = ({ size = 16, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/></svg>
)
const SunMoonIcon = ({ size = 16, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9"/><path d="M20 21v-2M20 5V3M22 11h2M18 11h-2"/></svg>
)
const LayersIcon = ({ size = 16, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>
)
