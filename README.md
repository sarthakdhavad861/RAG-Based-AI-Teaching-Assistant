# 🧠 RAG-Based AI Teaching Assistant

A production-ready chat UI for RAG-powered educational AI — with streaming responses,
knowledge source panels, video integration with timestamp seeking, and dark glassmorphism design.

## ⚡ Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Configure environment (optional — runs in demo mode without this)
cp .env.example .env
# Edit .env and set VITE_API_BASE_URL=http://your-backend:8000

# 3. Start dev server
npm run dev

# 4. Build for production
npm run build
```

## 🔌 API Contract

Your backend needs a single endpoint:

```
POST /ask
Content-Type: application/json

{ "question": "string", "model": "string" }
```

**Response** — streaming text body:

```
HTTP/1.1 200 OK
Content-Type: text/plain; charset=utf-8
Transfer-Encoding: chunked

<streamed markdown content>
```

For RAG sources + video, extend the response or add a second endpoint and update
`ChatContext.jsx` → `sendMessage()` to parse the extra fields.

## 🗂 Project Structure

```
src/
├── components/
│   ├── Sidebar.jsx         # Nav, chat history, model picker
│   ├── ChatWindow.jsx      # Main chat area + toolbar
│   ├── MessageBubble.jsx   # User & AI message rendering
│   ├── InputBox.jsx        # Multi-line input with send/stop
│   ├── VideoPlayer.jsx     # Lazy-loaded iframe + timestamps
│   └── RagPanel.jsx        # Lazy-loaded RAG sources panel
├── context/
│   └── ChatContext.jsx     # Global state (sessions, streaming, model)
├── index.css               # Tailwind + design tokens + utilities
└── main.jsx
```

## 🚀 Deploy

**Vercel / Netlify** — connect repo, set `VITE_API_BASE_URL` env var, deploy.

**Docker**:
```bash
npm run build
# serve the dist/ folder with any static host
```

## ✅ Features

- [x] Streaming AI responses (chunk-by-chunk)
- [x] Markdown + code syntax highlighting
- [x] RAG sources panel with similarity scores
- [x] YouTube video embed with clickable timestamps
- [x] Multi-session chat history
- [x] Model selector (LLaMA, GPT, Claude, Mistral)
- [x] Copy message / Like-Dislike feedback
- [x] Skeleton loaders & typing indicator
- [x] Code splitting (VideoPlayer + RagPanel lazy loaded)
- [x] Responsive (mobile: sidebar collapses)
- [x] Demo mode (works without backend)
