import React, { memo, useMemo } from 'react'
import { useChat } from '../context/ChatContext'
import { formatScore, scoreColor, formatVideoTime } from '../utils/formatters'
import { MAX_RAG_SOURCES } from '../utils/constants'

/* ── Score bar ───────────────────────────────────────────────── */
const ScoreBar = memo(({ score }) => {
  const pct = Math.round(score * 100)
  const color = scoreColor(score)
  return (
    <div className="flex items-center gap-2 mt-1.5">
      <div className="flex-1 h-1 bg-obsidian-600 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${pct}%`, background: color }}
        />
      </div>
      <span className="text-[10px] font-mono font-semibold shrink-0" style={{ color }}>
        {formatScore(score)}
      </span>
    </div>
  )
})

/* ── Source card ─────────────────────────────────────────────── */
const SourceCard = memo(({ source, index }) => {
  // _start comes from Processing.py's Start field (float seconds)
  const hasTimestamp = typeof source._start === 'number' && source._start >= 0

  return (
    <div className="card p-3 space-y-1.5 hover:border-obsidian-400 transition-colors">
      <div className="flex items-start gap-2">
        <div className="w-5 h-5 rounded-md bg-aurora-indigo/20 border border-aurora-indigo/30 flex items-center justify-center shrink-0 text-[9px] font-bold text-aurora-indigo mt-0.5">
          {index + 1}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold text-white leading-snug truncate">
            {source.title}
          </p>
          {hasTimestamp && (
            <p className="text-[9px] text-obsidian-400 font-mono mt-0.5">
              ⏱ {formatVideoTime(source._start)} → {formatVideoTime(source._end)}
            </p>
          )}
          <ScoreBar score={source.score} />
        </div>
      </div>
      <p className="text-[11px] text-obsidian-300 leading-relaxed pl-7 line-clamp-3">
        {source.excerpt}
      </p>
    </div>
  )
})

/* ── Skeleton ─────────────────────────────────────────────────── */
const SourceSkeleton = () => (
  <div className="card p-3 space-y-2">
    <div className="skeleton h-3 w-3/4 rounded" />
    <div className="skeleton h-1.5 w-full rounded-full" />
    <div className="skeleton h-8 w-full rounded" />
  </div>
)

/* ── RAG Panel ───────────────────────────────────────────────── */
export default memo(function RagPanel() {
  const { activeSession, state } = useChat()

  /* Get sources from last AI message */
  const { sources, hasVideo } = useMemo(() => {
    const messages = activeSession?.messages ?? []
    const lastAI = [...messages].reverse().find(m => m.role === 'assistant' && !m.isStreaming)
    return {
      sources:  lastAI?.ragSources ?? [],
      hasVideo: Boolean(lastAI?.video),
    }
  }, [activeSession?.messages])

  const avgScore = sources.length
    ? Math.round((sources.reduce((a, s) => a + s.score, 0) / sources.length) * 100)
    : 0

  return (
    <aside className="w-80 shrink-0 flex flex-col border-l border-obsidian-600 bg-obsidian-900 hidden xl:flex">
      {/* Header */}
      <div className="px-4 pt-4 pb-3 border-b border-obsidian-600">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-6 h-6 rounded-md bg-aurora-indigo/20 border border-aurora-indigo/30 flex items-center justify-center">
            <DatabaseIcon size={12} className="text-aurora-indigo" />
          </div>
          <h2 className="text-xs font-semibold text-white">Knowledge Sources</h2>
          {sources.length > 0 && (
            <span className="ml-auto text-[10px] bg-aurora-indigo/20 text-aurora-indigo border border-aurora-indigo/30 rounded-full px-2 py-0.5 font-medium">
              {sources.length}
            </span>
          )}
        </div>

        {/* Stats */}
        {sources.length > 0 && (
          <div className="grid grid-cols-3 gap-2">
            <Stat label="Sources" value={sources.length} />
            <Stat label="Avg. Score" value={`${avgScore}%`} />
            <Stat label="Video" value={hasVideo ? 'Yes' : 'No'} highlight={hasVideo} />
          </div>
        )}
      </div>

      {/* Sources list */}
      <div className="flex-1 overflow-y-auto px-3 py-3 scrollbar-thin space-y-2">
        {state.isLoading && sources.length === 0 && (
          <>
            <SourceSkeleton />
            <SourceSkeleton />
            <SourceSkeleton />
          </>
        )}

        {!state.isLoading && sources.length === 0 && (
          <EmptySourcesState />
        )}

        {sources.slice(0, MAX_RAG_SOURCES).map((s, i) => (
          <SourceCard key={s.id ?? i} source={s} index={i} />
        ))}
      </div>

      {/* Footer */}
      <div className="border-t border-obsidian-600 px-4 py-3">
        <p className="text-[10px] text-obsidian-400 leading-relaxed">
          Sources are retrieved via semantic similarity search from the course knowledge base.
        </p>
      </div>
    </aside>
  )
})

/* ── Sub-components ──────────────────────────────────────────── */
const Stat = ({ label, value, highlight }) => (
  <div className="bg-obsidian-800 rounded-xl px-2 py-1.5 text-center border border-obsidian-600">
    <p className={`text-sm font-bold ${highlight ? 'text-aurora-green' : 'text-white'}`}>{value}</p>
    <p className="text-[9px] text-obsidian-400 uppercase tracking-wider">{label}</p>
  </div>
)

const EmptySourcesState = () => (
  <div className="flex flex-col items-center justify-center h-48 text-center px-4">
    <div className="w-10 h-10 rounded-xl bg-obsidian-800 border border-obsidian-600 flex items-center justify-center mb-3">
      <SearchIcon size={18} className="text-obsidian-400" />
    </div>
    <p className="text-xs font-medium text-obsidian-300 mb-1">No sources yet</p>
    <p className="text-[10px] text-obsidian-400 leading-relaxed">
      Send a message to see the retrieved knowledge chunks and similarity scores
    </p>
  </div>
)

/* ── Icons ───────────────────────────────────────────────────── */
const DatabaseIcon = ({ size = 14, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/>
    <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/>
  </svg>
)
const SearchIcon = ({ size = 16, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
  </svg>
)
