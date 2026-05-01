/**
 * ChatPage.jsx
 *
 * Top-level page component. Currently renders the full app shell directly.
 * When you add React Router, wrap routes here:
 *
 *   <Routes>
 *     <Route path="/"          element={<ChatPage />} />
 *     <Route path="/session/:id" element={<ChatPage />} />
 *   </Routes>
 *
 * The ChatProvider lives in App.jsx so state is shared across routes.
 */
import React, { lazy, Suspense } from 'react'
import Sidebar from '../components/Sidebar'
import ChatWindow from '../components/ChatWindow'
import { useChat } from '../context/ChatContext'

const RagPanel = lazy(() => import('../components/RagPanel'))

function RagPanelSkeleton() {
  return (
    <aside className="w-80 shrink-0 border-l border-obsidian-500 bg-obsidian-900 p-4 hidden xl:flex flex-col gap-3">
      {[...Array(3)].map((_, i) => (
        <div key={i} className="skeleton h-24 rounded-2xl" />
      ))}
    </aside>
  )
}

export default function ChatPage() {
  const { state } = useChat()

  return (
    <div className="flex h-full w-full overflow-hidden bg-mesh">
      <Sidebar />

      <main className="flex-1 flex flex-col overflow-hidden min-w-0">
        <ChatWindow />
      </main>

      {state.ragPanelOpen && (
        <Suspense fallback={<RagPanelSkeleton />}>
          <RagPanel />
        </Suspense>
      )}
    </div>
  )
}
