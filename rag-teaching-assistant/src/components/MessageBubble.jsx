import React, { memo, useState, lazy, Suspense, useCallback } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism'
import { useChat } from '../context/ChatContext'
import { formatTimestamp } from '../utils/formatters'

const VideoPlayer = lazy(() => import('./VideoPlayer'))

/* ── Code block ─────────────────────────────────────────────── */
const CodeBlock = memo(({ language, children }) => {
  const [copied, setCopied] = useState(false)

  const copy = useCallback(() => {
    navigator.clipboard.writeText(children)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }, [children])

  return (
    <div className="relative group my-3 rounded-xl overflow-hidden border border-obsidian-500">
      <div className="flex items-center justify-between bg-obsidian-700 px-4 py-1.5">
        <span className="text-[10px] font-mono text-obsidian-400 uppercase tracking-wider">
          {language || 'code'}
        </span>
        <button
          onClick={copy}
          className="text-[10px] text-obsidian-400 hover:text-white flex items-center gap-1 transition-colors"
        >
          {copied ? <><CheckIcon size={11} /> Copied</> : <><CopyIcon size={11} /> Copy</>}
        </button>
      </div>
      <SyntaxHighlighter
        style={oneDark}
        language={language}
        PreTag="div"
        customStyle={{ margin: 0, borderRadius: 0, background: '#0d0d1a', fontSize: '0.8rem' }}
      >
        {children}
      </SyntaxHighlighter>
    </div>
  )
})

/* ── Markdown components ─────────────────────────────────────── */
const mdComponents = {
  code({ node, inline, className, children, ...props }) {
    const match = /language-(\w+)/.exec(className || '')
    return !inline && match
      ? <CodeBlock language={match[1]}>{String(children).replace(/\n$/, '')}</CodeBlock>
      : <code className="bg-obsidian-700 text-aurora-cyan px-1.5 py-0.5 rounded text-[0.82em] font-mono border border-obsidian-500" {...props}>{children}</code>
  },
  table: ({ children }) => (
    <div className="overflow-x-auto my-3">
      <table className="w-full text-sm border-collapse border border-obsidian-500">{children}</table>
    </div>
  ),
  th: ({ children }) => <th className="border border-obsidian-500 px-3 py-2 bg-obsidian-700 text-left font-semibold text-xs">{children}</th>,
  td: ({ children }) => <td className="border border-obsidian-500 px-3 py-2 text-sm">{children}</td>,
}

/* ── Message actions ─────────────────────────────────────────── */
const MessageActions = memo(({ content, onFeedback, feedback }) => {
  const [copied, setCopied] = useState(false)

  const copy = useCallback(() => {
    navigator.clipboard.writeText(content)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }, [content])

  return (
    <div className="flex items-center gap-1 mt-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
      <button
        onClick={copy}
        className="flex items-center gap-1 text-[10px] text-obsidian-400 hover:text-white px-2 py-1 rounded-lg hover:bg-obsidian-600 transition-all"
      >
        {copied ? <><CheckIcon size={10} /> Copied</> : <><CopyIcon size={10} /> Copy</>}
      </button>
      <button
        onClick={() => onFeedback('up')}
        className={`p-1.5 rounded-lg hover:bg-obsidian-600 transition-all ${feedback === 'up' ? 'text-aurora-green' : 'text-obsidian-400 hover:text-white'}`}
        title="Helpful"
      >
        <ThumbUpIcon size={11} />
      </button>
      <button
        onClick={() => onFeedback('down')}
        className={`p-1.5 rounded-lg hover:bg-obsidian-600 transition-all ${feedback === 'down' ? 'text-aurora-red' : 'text-obsidian-400 hover:text-white'}`}
        title="Not helpful"
      >
        <ThumbDownIcon size={11} />
      </button>
    </div>
  )
})

/* ── Message Bubble ─────────────────────────────────────────── */
const MessageBubble = memo(({ message }) => {
  const { dispatch } = useChat()
  const [feedback, setFeedback] = useState(null)
  const isUser = message.role === 'user'

  const handleFeedback = useCallback((val) => {
    setFeedback(prev => prev === val ? null : val)
  }, [])

  const handleSelectMessage = useCallback(() => {
    if (!isUser) dispatch({ type: 'SELECT_MESSAGE', id: message.id })
  }, [dispatch, isUser, message.id])

  const timestamp = formatTimestamp(message.timestamp)

  if (isUser) {
    return (
      <div className="flex justify-end px-4 py-1.5 animate-fade-up">
        <div className="max-w-[75%]">
          <div className="bg-gradient-to-br from-aurora-indigo to-aurora-blue text-white rounded-2xl rounded-tr-sm px-4 py-3 text-sm leading-relaxed shadow-lg">
            {message.content}
          </div>
          <p className="text-[10px] text-obsidian-400 text-right mt-1 pr-1">{timestamp}</p>
        </div>
      </div>
    )
  }

  return (
    <div
      className="group flex items-start gap-3 px-4 py-1.5 animate-fade-up cursor-pointer"
      onClick={handleSelectMessage}
    >
      {/* Avatar */}
      <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-aurora-indigo to-aurora-blue flex items-center justify-center shrink-0 mt-1 shadow-md">
        <BotIcon size={14} className="text-white" />
      </div>

      <div className="flex-1 min-w-0">
        {/* Bubble */}
        <div className="glass rounded-2xl rounded-tl-sm px-4 py-3">
          {message.isStreaming && !message.content ? (
            /* Skeleton while streaming starts */
            <div className="space-y-2">
              <div className="skeleton h-3 w-3/4 rounded" />
              <div className="skeleton h-3 w-full rounded" />
              <div className="skeleton h-3 w-1/2 rounded" />
            </div>
          ) : (
            <div className="prose-ai text-sm">
              <ReactMarkdown remarkPlugins={[remarkGfm]} components={mdComponents}>
                {message.content}
              </ReactMarkdown>
              {message.isStreaming && (
                <span className="inline-block w-0.5 h-4 bg-aurora-indigo ml-0.5 animate-pulse align-text-bottom" />
              )}
            </div>
          )}
        </div>

        <p className="text-[10px] text-obsidian-400 mt-1 pl-1">{timestamp}</p>

        {/* Actions */}
        {!message.isStreaming && (
          <MessageActions content={message.content} onFeedback={handleFeedback} feedback={feedback} />
        )}

        {/* Embedded video */}
        {message.video && !message.isStreaming && (
          <div className="mt-3">
            <Suspense fallback={<div className="skeleton h-48 w-full rounded-2xl" />}>
              <VideoPlayer video={message.video} />
            </Suspense>
          </div>
        )}
      </div>
    </div>
  )
})

export default MessageBubble

/* ── Icons ───────────────────────────────────────────────────── */
const BotIcon = ({ size = 16, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <rect x="3" y="11" width="18" height="10" rx="2"/><circle cx="12" cy="5" r="2"/>
    <path d="M12 7v4"/>
  </svg>
)
const CopyIcon = ({ size = 14, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
)
const CheckIcon = ({ size = 14, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className={className}><polyline points="20 6 9 17 4 12"/></svg>
)
const ThumbUpIcon = ({ size = 13, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3H14z"/><path d="M7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"/></svg>
)
const ThumbDownIcon = ({ size = 13, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M10 15v4a3 3 0 0 0 3 3l4-9V2H5.72a2 2 0 0 0-2 1.7l-1.38 9a2 2 0 0 0 2 2.3H10z"/><path d="M17 2h2.67A2.31 2.31 0 0 1 22 4v7a2.31 2.31 0 0 1-2.33 2H17"/></svg>
)
