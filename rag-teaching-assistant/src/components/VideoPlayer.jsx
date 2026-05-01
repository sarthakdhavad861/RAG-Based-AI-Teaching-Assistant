/**
 * VideoPlayer.jsx
 *
 * Handles two cases from your Processing.py backend:
 *  1. video.url is null  → shows video info + timestamps only (local file, no embed)
 *  2. video.url is set   → embeds it (YouTube or direct URL)
 *
 * Timestamps come from chunk Start/end (float seconds) via Processing.py
 */
import React, { useState, useRef, useCallback, memo } from 'react'
import { formatVideoTime } from '../utils/formatters'

export default memo(function VideoPlayer({ video }) {
  const [loaded,      setLoaded]      = useState(false)
  const [activeTime,  setActiveTime]  = useState(null)
  const iframeRef = useRef(null)
  const videoRef  = useRef(null)

  const hasUrl      = Boolean(video.url)
  const isYouTube   = hasUrl && (video.url.includes('youtube') || video.url.includes('youtu.be'))
  const isLocalFile = hasUrl && !isYouTube

  /* Seek handler */
  const seekToTime = useCallback((time) => {
    setActiveTime(time)

    if (!loaded) { setLoaded(true); return }

    if (isYouTube && iframeRef.current) {
      const base = video.url.split('?')[0]
      iframeRef.current.src = `${base}?start=${time}&autoplay=1`
    }
    if (isLocalFile && videoRef.current) {
      videoRef.current.currentTime = time
      videoRef.current.play().catch(() => {})
    }
  }, [loaded, isYouTube, isLocalFile, video.url])

  return (
    <div className="rounded-2xl overflow-hidden border border-obsidian-500 bg-obsidian-900 mt-2">

      {/* ── Chrome bar ── */}
      <div className="flex items-center gap-2 px-3 py-2 bg-obsidian-800 border-b border-obsidian-600">
        <div className="w-2 h-2 rounded-full bg-aurora-red"   />
        <div className="w-2 h-2 rounded-full bg-aurora-amber" />
        <div className="w-2 h-2 rounded-full bg-aurora-green" />
        <VideoIcon size={11} className="text-obsidian-400 ml-2 shrink-0" />
        <span className="text-[10px] text-obsidian-400 truncate flex-1 ml-1">{video.title}</span>
      </div>

      {/* ── Video area ── */}
      {hasUrl ? (
        <div className="relative aspect-video bg-obsidian-950">
          {!loaded ? (
            /* Click-to-load poster */
            <button
              onClick={() => setLoaded(true)}
              className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-obsidian-900 hover:bg-obsidian-800 transition-colors group"
            >
              <div className="w-14 h-14 rounded-full bg-aurora-indigo/20 border border-aurora-indigo/30 flex items-center justify-center group-hover:scale-110 transition-transform">
                <PlayIcon size={24} className="text-aurora-indigo ml-1" />
              </div>
              <p className="text-[10px] text-obsidian-400">Click to load video</p>
            </button>
          ) : isYouTube ? (
            <iframe
              ref={iframeRef}
              src={`${video.url}?autoplay=1${activeTime ? `&start=${activeTime}` : ''}`}
              title={video.title}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              className="absolute inset-0 w-full h-full"
            />
          ) : (
            /* Local video file */
            <video
              ref={videoRef}
              src={video.url}
              controls
              autoPlay
              className="absolute inset-0 w-full h-full object-contain bg-black"
            />
          )}
        </div>
      ) : (
        /* ── No URL — local file, show guidance banner ── */
        <div className="px-4 py-5 flex items-start gap-3 bg-obsidian-900">
          <div className="w-9 h-9 rounded-xl bg-aurora-indigo/15 border border-aurora-indigo/25 flex items-center justify-center shrink-0 mt-0.5">
            <BookOpenIcon size={16} className="text-aurora-indigo" />
          </div>
          <div>
            <p className="text-xs font-semibold text-white mb-1">Video reference found</p>
            <p className="text-[11px] text-obsidian-300 leading-relaxed">
              This answer references <span className="text-aurora-indigo font-medium">{video.title}</span>.
              Open this video in your local player and jump to the timestamps below.
            </p>
          </div>
        </div>
      )}

      {/* ── Timestamps from Processing.py Start/end fields ── */}
      {video.timestamps?.length > 0 && (
        <div className="p-3">
          <p className="text-[9px] uppercase tracking-widest text-obsidian-400 font-semibold mb-2 flex items-center gap-1">
            <ClockIcon size={9} />
            {hasUrl ? 'Click to seek' : 'Timestamps to watch'}
          </p>
          <div className="flex flex-wrap gap-1.5">
            {video.timestamps.map((ts, i) => (
              <button
                key={i}
                onClick={() => seekToTime(ts.time)}
                className={`
                  flex items-center gap-1.5 text-[10px] px-2.5 py-1.5 rounded-lg border transition-all
                  ${activeTime === ts.time
                    ? 'border-aurora-indigo/60 bg-aurora-indigo/15 text-aurora-blue'
                    : 'border-obsidian-500 text-obsidian-300 hover:border-aurora-indigo/40 hover:bg-obsidian-700 hover:text-white'
                  }
                `}
              >
                <span className="font-mono font-semibold text-aurora-indigo">{formatVideoTime(ts.time)}</span>
                <span className="text-obsidian-400 max-w-[140px] truncate">{ts.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
})

/* ── Icons ── */
const PlayIcon     = ({ size=16, className='' }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor"  className={className}><polygon points="5 3 19 12 5 21 5 3"/></svg>
const VideoIcon    = ({ size=14, className='' }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2"/></svg>
const ClockIcon    = ({ size=11, className='' }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className={className}><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
const BookOpenIcon = ({ size=16, className='' }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>
