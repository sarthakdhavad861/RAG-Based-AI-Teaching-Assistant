import React, {
  createContext, useContext, useReducer, useCallback, useRef
} from 'react'
import { titleFromMessage } from '../utils/formatters'
import { askQuestion, uploadVideo, checkHealth, APIError } from '../utils/api'
import { ERROR_MESSAGES } from '../utils/constants'

/* ─── Initial demo data ─────────────────────────────────────── */
const DEMO_SESSION = {
  id: 'session-1',
  title: 'Web Development Tutorials',
  createdAt: Date.now() - 3_600_000,
  messages: [
    {
      id: 'msg-1',
      role: 'user',
      content: 'How do I center a div in CSS?',
      timestamp: Date.now() - 3_500_000,
    },
    {
      id: 'msg-2',
      role: 'assistant',
      content: `Great question! Go to **video number 03 titled 'CSS Flexbox'** and watch from **02:14**.

In that segment, the instructor explains that the easiest modern way to center a div is using Flexbox:

\`\`\`css
.parent {
  display: flex;
  justify-content: center;
  align-items: center;
}
\`\`\`

You can also use CSS Grid:

\`\`\`css
.parent {
  display: grid;
  place-items: center;
}
\`\`\`

For older approaches, check **video number 02 titled 'CSS Basics'** at **05:40** where margin auto is covered.`,
      timestamp: Date.now() - 3_490_000,
      // ragSources use the exact normalised shape from api.js normaliseSource()
      // which maps Processing.py's { Title, number, Start, end, text, score }
      ragSources: [
        {
          id:        0,
          title:     'Video 03 — CSS Flexbox',
          score:     0.94,
          excerpt:   'To center elements using flexbox, set the parent to display flex then use justify-content center and align-items center.',
          _start:    134,   // 2:14 in seconds
          _end:      178,
          _number:   '03',
          _rawTitle: 'CSS Flexbox',
        },
        {
          id:        1,
          title:     'Video 02 — CSS Basics',
          score:     0.81,
          excerpt:   'Another approach is using margin auto on a block element with a defined width to center it horizontally.',
          _start:    340,   // 5:40 in seconds
          _end:      390,
          _number:   '02',
          _rawTitle: 'CSS Basics',
        },
        {
          id:        2,
          title:     'Video 05 — CSS Grid',
          score:     0.76,
          excerpt:   'CSS Grid place-items center is the most concise way to center both horizontally and vertically.',
          _start:    52,
          _end:      89,
          _number:   '05',
          _rawTitle: 'CSS Grid',
        },
      ],
      // video uses normalised shape from api.js normaliseVideo()
      // url is null because your backend serves local video files (no YouTube)
      video: {
        url:   null,
        title: 'Video 03 — CSS Flexbox',
        timestamps: [
          { time: 134, label: 'Centering with flexbox' },
          { time: 178, label: 'justify-content explained' },
          { time: 340, label: 'Margin auto approach' },
          { time: 52,  label: 'CSS Grid place-items' },
        ],
      },
    },
  ],
}

/* ─── Reducer ────────────────────────────────────────────────── */
const initialState = {
  sessions: [DEMO_SESSION],
  activeSessionId: DEMO_SESSION.id,
  isLoading: false,
  isStreaming: false,
  error: null,
  theme: 'dark',
  model: 'llama-3.1-70b',
  sidebarOpen: true,
  ragPanelOpen: true,
  selectedMessage: null,
  // Video upload state
  uploadStatus: null,      // null | 'uploading' | 'processing' | 'success' | 'error'
  uploadProgress: 0,       // 0–100
  uploadMessage: null,     // human-readable status string
  totalChunks: 0,          // total_chunks returned by backend
}

function reducer(state, action) {
  switch (action.type) {
    case 'NEW_SESSION': {
      const session = {
        id: `session-${Date.now()}`,
        title: 'New Chat',
        createdAt: Date.now(),
        messages: [],
      }
      return { ...state, sessions: [session, ...state.sessions], activeSessionId: session.id, selectedMessage: null }
    }

    case 'SELECT_SESSION':
      return { ...state, activeSessionId: action.id, selectedMessage: null }

    case 'DELETE_SESSION': {
      const sessions = state.sessions.filter(s => s.id !== action.id)
      return {
        ...state,
        sessions,
        activeSessionId: sessions.length ? sessions[0].id : null,
      }
    }

    case 'ADD_MESSAGE': {
      const sessions = state.sessions.map(s =>
        s.id === state.activeSessionId
          ? {
              ...s,
              title: s.messages.length === 0 ? titleFromMessage(action.message.content) : s.title,
              messages: [...s.messages, action.message],
            }
          : s
      )
      return { ...state, sessions }
    }

    case 'UPDATE_LAST_AI_MESSAGE': {
      const sessions = state.sessions.map(s => {
        if (s.id !== state.activeSessionId) return s
        const messages = [...s.messages]
        const lastIdx = messages.length - 1
        if (messages[lastIdx]?.role === 'assistant') {
          messages[lastIdx] = { ...messages[lastIdx], ...action.patch }
        }
        return { ...s, messages }
      })
      return { ...state, sessions }
    }

    case 'CLEAR_CHAT': {
      const sessions = state.sessions.map(s =>
        s.id === state.activeSessionId ? { ...s, messages: [] } : s
      )
      return { ...state, sessions, selectedMessage: null }
    }

    case 'SET_LOADING':   return { ...state, isLoading: action.value }
    case 'SET_STREAMING': return { ...state, isStreaming: action.value }
    case 'SET_ERROR':     return { ...state, error: action.value }
    case 'TOGGLE_THEME':  return { ...state, theme: state.theme === 'dark' ? 'light' : 'dark' }
    case 'SET_MODEL':     return { ...state, model: action.value }
    case 'TOGGLE_SIDEBAR':   return { ...state, sidebarOpen: !state.sidebarOpen }
    case 'TOGGLE_RAG_PANEL': return { ...state, ragPanelOpen: !state.ragPanelOpen }
    case 'SELECT_MESSAGE':   return { ...state, selectedMessage: action.id }

    // Video upload states
    case 'SET_UPLOAD_STATUS':   return { ...state, uploadStatus: action.value }
    case 'SET_UPLOAD_PROGRESS': return { ...state, uploadProgress: action.value }
    case 'SET_UPLOAD_MESSAGE':  return { ...state, uploadMessage: action.value }
    case 'SET_TOTAL_CHUNKS':    return { ...state, totalChunks: action.value }
    case 'RESET_UPLOAD':
      return { ...state, uploadStatus: null, uploadProgress: 0, uploadMessage: null }

    default: return state
  }
}

/* ─── Context ─────────────────────────────────────────────────── */
const ChatContext = createContext(null)

export function ChatProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, initialState)
  const abortRef = useRef(null)

  const activeSession = state.sessions.find(s => s.id === state.activeSessionId) ?? null

  /* Send message with streaming simulation */
  const sendMessage = useCallback(async (content) => {
    if (!content.trim() || state.isLoading) return

    const userMsg = {
      id: `msg-${Date.now()}`,
      role: 'user',
      content: content.trim(),
      timestamp: Date.now(),
    }
    dispatch({ type: 'ADD_MESSAGE', message: userMsg })
    dispatch({ type: 'SET_LOADING', value: true })
    dispatch({ type: 'SET_ERROR', value: null })

    /* Placeholder AI message for streaming */
    const aiMsg = {
      id: `msg-${Date.now() + 1}`,
      role: 'assistant',
      content: '',
      timestamp: Date.now(),
      isStreaming: true,
    }
    dispatch({ type: 'ADD_MESSAGE', message: aiMsg })

    try {
      const controller = new AbortController()
      abortRef.current = controller

      if (!import.meta.env.VITE_API_BASE_URL) {
        /* ── Demo mode: simulate streaming with demo content ── */
        await simulateDemoStreaming(content, (accumulated) => {
          dispatch({ type: 'UPDATE_LAST_AI_MESSAGE', patch: { content: accumulated } })
        })
        const demo = getDemoResponse(content)
        dispatch({
          type: 'UPDATE_LAST_AI_MESSAGE',
          patch: { content: demo.content, ragSources: demo.ragSources, video: demo.video, isStreaming: false },
        })
      } else {
        /* ── Real FastAPI: POST /query { query } → { response } ── */
        dispatch({ type: 'SET_STREAMING', value: true })
        const result = await askQuestion({
          question: content.trim(),
          signal: controller.signal,
          useCache: true,
        })
        dispatch({
          type: 'UPDATE_LAST_AI_MESSAGE',
          patch: {
            content:    result.answer,
            ragSources: result.ragSources,
            video:      result.video,
            isStreaming: false,
          },
        })
      }
    } catch (err) {
      if (err.name === 'AbortError') return
      const msg = err instanceof APIError
        ? (err.status === 429 ? 'Rate limited — please wait a moment.' : err.message)
        : ERROR_MESSAGES.NETWORK
      dispatch({ type: 'UPDATE_LAST_AI_MESSAGE', patch: { isStreaming: false, content: '' } })
      dispatch({ type: 'SET_ERROR', value: msg })
    } finally {
      dispatch({ type: 'SET_LOADING', value: false })
      dispatch({ type: 'SET_STREAMING', value: false })
    }
  }, [state.isLoading, state.model])

  const stopGeneration = useCallback(() => {
    abortRef.current?.abort()
    dispatch({ type: 'UPDATE_LAST_AI_MESSAGE', patch: { isStreaming: false } })
    dispatch({ type: 'SET_LOADING', value: false })
    dispatch({ type: 'SET_STREAMING', value: false })
  }, [])

  /**
   * Upload a video to POST /upload-video with real progress tracking.
   * Shows status in state.uploadStatus / uploadProgress / uploadMessage.
   */
  const uploadVideoFile = useCallback(async (file) => {
    dispatch({ type: 'SET_UPLOAD_STATUS',   value: 'uploading' })
    dispatch({ type: 'SET_UPLOAD_PROGRESS', value: 0 })
    dispatch({ type: 'SET_UPLOAD_MESSAGE',  value: `Uploading ${file.name}…` })
    dispatch({ type: 'SET_ERROR', value: null })

    const controller = new AbortController()

    try {
      const result = await uploadVideo(
        file,
        (pct) => {
          dispatch({ type: 'SET_UPLOAD_PROGRESS', value: pct })
          if (pct === 100) {
            dispatch({ type: 'SET_UPLOAD_STATUS',  value: 'processing' })
            dispatch({ type: 'SET_UPLOAD_MESSAGE', value: 'Processing video — transcribing & indexing…' })
          }
        },
        controller.signal
      )

      dispatch({ type: 'SET_UPLOAD_STATUS',   value: 'success' })
      dispatch({ type: 'SET_UPLOAD_PROGRESS', value: 100 })
      dispatch({ type: 'SET_UPLOAD_MESSAGE',  value: result.message ?? 'Video added to knowledge base!' })
      dispatch({ type: 'SET_TOTAL_CHUNKS',    value: result.total_chunks ?? 0 })

      // Auto-reset upload UI after 4 seconds
      setTimeout(() => dispatch({ type: 'RESET_UPLOAD' }), 4000)
    } catch (err) {
      if (err.name === 'AbortError') {
        dispatch({ type: 'RESET_UPLOAD' })
        return
      }
      dispatch({ type: 'SET_UPLOAD_STATUS',  value: 'error' })
      dispatch({ type: 'SET_UPLOAD_MESSAGE', value: err.message ?? 'Upload failed' })
      dispatch({ type: 'SET_ERROR', value: err.message ?? 'Video upload failed' })
    }
  }, [])

  return (
    <ChatContext.Provider value={{ state, dispatch, activeSession, sendMessage, stopGeneration, uploadVideoFile }}>
      {children}
    </ChatContext.Provider>
  )
}

export const useChat = () => {
  const ctx = useContext(ChatContext)
  if (!ctx) throw new Error('useChat must be used within ChatProvider')
  return ctx
}

/* ─── Helpers ─────────────────────────────────────────────────── */

/**
 * Simulate word-by-word streaming in demo mode so the UI
 * streaming animation is visible without a real backend.
 */
async function simulateDemoStreaming(question, onUpdate) {
  const demo = getDemoResponse(question)
  const words = demo.content.split(' ')
  let built = ''
  for (let i = 0; i < words.length; i++) {
    built += (i === 0 ? '' : ' ') + words[i]
    onUpdate(built)
    await new Promise(r => setTimeout(r, 18 + Math.random() * 14))
  }
}

function getDemoResponse(question) {
  const q = question.toLowerCase()

  // Web dev topics matching your tutorial domain
  if (q.includes('flex') || q.includes('center') || q.includes('css')) {
    return {
      content: `Go to **video number 03 titled 'CSS Flexbox'** and watch from **02:14**.

The instructor shows that centering with Flexbox is straightforward:

\`\`\`css
.container {
  display: flex;
  justify-content: center;   /* horizontal */
  align-items: center;       /* vertical   */
  height: 100vh;
}
\`\`\`

Also check **video 05 — CSS Grid** at **00:52** for the \`place-items: center\` shorthand.`,
      ragSources: [
        { id: 0, title: 'Video 03 — CSS Flexbox', score: 0.94, excerpt: 'To center elements using flexbox, set display flex and use justify-content center.', _start: 134, _end: 178, _number: '03', _rawTitle: 'CSS Flexbox' },
        { id: 1, title: 'Video 05 — CSS Grid',    score: 0.76, excerpt: 'CSS Grid place-items center is the most concise centering solution.', _start: 52, _end: 89, _number: '05', _rawTitle: 'CSS Grid' },
      ],
      video: { url: null, title: 'Video 03 — CSS Flexbox', timestamps: [{ time: 134, label: 'Centering with flexbox' }, { time: 52, label: 'CSS Grid shorthand' }] },
    }
  }

  if (q.includes('javascript') || q.includes('js') || q.includes('function') || q.includes('async')) {
    return {
      content: `Go to **video number 07 titled 'JavaScript Async'** and watch from **03:45**.

The instructor explains async/await:

\`\`\`javascript
async function fetchData(url) {
  try {
    const response = await fetch(url)
    const data = await response.json()
    return data
  } catch (error) {
    console.error('Error:', error)
  }
}
\`\`\`

For the basics of Promises, check **video 06 — JavaScript Promises** at **01:20**.`,
      ragSources: [
        { id: 0, title: 'Video 07 — JavaScript Async', score: 0.93, excerpt: 'Async await is syntactic sugar over Promises making asynchronous code read like synchronous code.', _start: 225, _end: 290, _number: '07', _rawTitle: 'JavaScript Async' },
        { id: 1, title: 'Video 06 — JavaScript Promises', score: 0.82, excerpt: 'A Promise represents a value that may be available now or in the future.', _start: 80, _end: 140, _number: '06', _rawTitle: 'JavaScript Promises' },
      ],
      video: { url: null, title: 'Video 07 — JavaScript Async', timestamps: [{ time: 225, label: 'async/await syntax' }, { time: 80, label: 'Promise basics' }] },
    }
  }

  // Generic demo — shown when backend not connected
  return {
    content: `I found relevant content for **"${question.slice(0, 45)}${question.length > 45 ? '…' : ''}"** in your video tutorials.

> Connect your FastAPI backend to get real answers from your videos.

**To start:**
\`\`\`bash
# Terminal 1 — FastAPI backend
uvicorn Main:app --reload --port 8000

# Terminal 2 — React frontend
cp .env.example .env
npm run dev
\`\`\`

Your \`/query\` endpoint returns \`{ response, sources, video }\` and the UI will automatically display the RAG sources panel and video timestamps from your **Processing.py** chunks.`,
    ragSources: [
      { id: 0, title: 'Video 01 — HTML Basics',   score: 0.91, excerpt: 'This tutorial covers the foundational HTML structure every web page needs.', _start: 0,  _end: 45,  _number: '01', _rawTitle: 'HTML Basics' },
      { id: 1, title: 'Video 03 — CSS Flexbox',   score: 0.83, excerpt: 'Flexbox makes responsive layouts straightforward without float hacks.', _start: 60, _end: 120, _number: '03', _rawTitle: 'CSS Flexbox' },
      { id: 2, title: 'Video 07 — JavaScript Async', score: 0.74, excerpt: 'Understanding async patterns is essential for working with APIs and data.', _start: 30, _end: 90,  _number: '07', _rawTitle: 'JavaScript Async' },
    ],
    video: {
      url: null,
      title: 'Video 01 — HTML Basics',
      timestamps: [
        { time: 0,  label: 'Introduction to HTML structure' },
        { time: 60, label: 'Flexbox layout basics' },
        { time: 30, label: 'Async JavaScript intro' },
      ],
    },
  }
}
