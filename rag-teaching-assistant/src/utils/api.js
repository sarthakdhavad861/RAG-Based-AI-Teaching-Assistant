/**
 * api.js — Wired to FastAPI RAG Teaching Assistant (Main.py + Processing.py)
 *
 * Endpoints:
 *   GET  /             → health check
 *   POST /query        { query: string } → { response, sources, video }
 *   POST /upload-video multipart "file"  → { status, message, video, total_chunks }
 *
 * Processing.py chunk shape:
 *   { Title, number, Start (float secs), end (float secs), text, chunk_id, score }
 *
 * Normalised to frontend shape:
 *   source  → { id, title, score, excerpt }           (for RagPanel)
 *   video   → { title, number, timestamps: [{time, label}] }  (for VideoPlayer)
 */

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000'

/* ─── Error type ─────────────────────────────────────────────── */
export class APIError extends Error {
  constructor(message, status, retryable = false) {
    super(message)
    this.name      = 'APIError'
    this.status    = status
    this.retryable = retryable
  }
}

/* ─── Cache (keyed by query text) ────────────────────────────── */
const CACHE        = new Map()
const MAX_CACHE    = 50
const CACHE_TTL_MS = 10 * 60 * 1000   // 10 min

function cacheKey(q) { return q.trim().toLowerCase() }

function cacheGet(k) {
  const e = CACHE.get(k)
  if (!e) return null
  if (Date.now() - e.ts > CACHE_TTL_MS) { CACHE.delete(k); return null }
  return e.v
}

function cacheSet(k, v) {
  if (CACHE.size >= MAX_CACHE) CACHE.delete(CACHE.keys().next().value)
  CACHE.set(k, { v, ts: Date.now() })
}

export function clearCache() { CACHE.clear() }

/* ─── Retry ──────────────────────────────────────────────────── */
async function withRetry(fn, tries = 3, delay = 600) {
  let last
  for (let i = 0; i < tries; i++) {
    try { return await fn() }
    catch (e) {
      last = e
      if (e instanceof APIError && !e.retryable) throw e
      if (e.name === 'AbortError') throw e
      if (i < tries - 1) await new Promise(r => setTimeout(r, delay * 2 ** i))
    }
  }
  throw last
}

/* ─── Health check ───────────────────────────────────────────── */
export async function checkHealth() {
  try { return (await fetch(`${BASE_URL}/`, { method: 'GET' })).ok }
  catch { return false }
}

/* ─── Normalise a raw chunk from Processing.py ───────────────── */
/**
 * Converts your Processing.py chunk shape into what the UI components expect.
 *
 * RAG Panel expects:  { id, title, score, excerpt }
 * VideoPlayer expects timestamps: [{ time (int seconds), label (string) }]
 */
function normaliseSource(raw, index) {
  const title  = raw.title  ?? raw.Title  ?? 'Unknown'
  const number = raw.number ?? '?'
  const start  = parseFloat(raw.start ?? raw.Start ?? 0)
  const score  = typeof raw.score === 'number' ? raw.score : 0

  return {
    id:      raw.id ?? raw.chunk_id ?? index,
    title:   `Video ${number} — ${title}`,   // e.g. "Video 03 — HTML Basics"
    score:   score,
    excerpt: raw.text ?? '',
    // Extra fields kept for VideoPlayer timestamp building
    _start:  start,
    _end:    parseFloat(raw.end ?? 0),
    _number: number,
    _rawTitle: title,
  }
}

function normaliseVideo(rawVideo, sources) {
  if (!rawVideo && sources.length === 0) return null

  // If backend already sent a video object, use it directly
  if (rawVideo) {
    return {
      url:    buildYouTubeOrLocal(rawVideo),
      title:  rawVideo.title ?? `Video ${rawVideo.number}`,
      timestamps: (rawVideo.timestamps ?? []).map(ts => ({
        time:  typeof ts.time === 'number' ? Math.floor(ts.time) : 0,
        label: ts.label ?? '',
      })),
    }
  }

  // Fallback: build from top source
  const top = sources[0]
  return {
    url:   null,   // no URL — VideoPlayer will show "no video URL" state
    title: top.title,
    timestamps: sources.slice(0, 5).map(s => ({
      time:  Math.floor(s._start),
      label: s.excerpt.slice(0, 60) + (s.excerpt.length > 60 ? '…' : ''),
    })),
  }
}

/**
 * Your backend doesn't store YouTube URLs — videos are local files.
 * This function returns null (VideoPlayer renders a "local video" notice)
 * unless you later add a url field to the backend response.
 */
function buildYouTubeOrLocal(rawVideo) {
  return rawVideo.url ?? null
}

/* ─── POST /query ────────────────────────────────────────────── */
/**
 * Sends { query } to your FastAPI and returns the normalised result.
 *
 * @returns {{ answer: string, ragSources: Array, video: object|null }}
 */
export async function askQuestion({ question, signal, useCache = true }) {
  const key = cacheKey(question)
  if (useCache) { const c = cacheGet(key); if (c) return c }

  const raw = await withRetry(async () => {
    const res = await fetch(`${BASE_URL}/query`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ query: question.trim() }),   // ← "query" matches QueryRequest
      signal,
    })
    if (!res.ok) {
      const retryable = res.status === 429 || res.status >= 500
      let msg = `Server error ${res.status}`
      try { const b = await res.json(); msg = b.detail ?? b.message ?? msg } catch {}
      throw new APIError(msg, res.status, retryable)
    }
    return res.json()
  })

  /*
   * Backend returns:
   *   raw.response  — LLM answer string
   *   raw.sources   — array of chunk objects from Processing.py
   *   raw.video     — { title, number, timestamps } or null
   */
  const normSources = (raw.sources ?? []).map(normaliseSource)
  const normVideo   = normaliseVideo(raw.video ?? null, normSources)

  const result = {
    answer:     raw.response ?? raw.answer ?? '',
    ragSources: normSources,
    video:      normVideo,
  }

  if (useCache) cacheSet(key, result)
  return result
}

/* ─── POST /upload-video ─────────────────────────────────────── */
/**
 * Uploads a video file to POST /upload-video (multipart, field: "file").
 * Uses XHR for real upload progress reporting.
 *
 * @param {File}     file
 * @param {Function} [onProgress]  — called with 0-100
 * @param {AbortSignal} [signal]
 * @returns {{ status, message, video, total_chunks }}
 */
export async function uploadVideo(file, onProgress, signal) {
  // Mirror your FastAPI validation
  const allowed = ['.mp4', '.mkv', '.mov']
  const ext = file.name.slice(file.name.lastIndexOf('.')).toLowerCase()
  if (!allowed.includes(ext))
    throw new APIError(`Only ${allowed.join(', ')} files are supported`, 400, false)

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    const fd  = new FormData()
    fd.append('file', file)       // ← field name "file" matches UploadFile = File(...)

    xhr.open('POST', `${BASE_URL}/upload-video`)

    if (onProgress)
      xhr.upload.addEventListener('progress', e => {
        if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100))
      })

    if (signal) signal.addEventListener('abort', () => xhr.abort())

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try   { resolve(JSON.parse(xhr.responseText)) }
        catch { resolve({ status: 'success', message: xhr.responseText }) }
      } else {
        let msg = `Upload failed (${xhr.status})`
        try { const b = JSON.parse(xhr.responseText); msg = b.detail ?? b.message ?? msg } catch {}
        reject(new APIError(msg, xhr.status, xhr.status >= 500))
      }
    }
    xhr.onerror = () => reject(new APIError('Network error during upload', 0, true))
    xhr.onabort = () => { const e = new Error('Aborted'); e.name = 'AbortError'; reject(e) }
    xhr.send(fd)
  })
}
