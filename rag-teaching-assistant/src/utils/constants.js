/**
 * constants.js — app-wide constants for RAG Teaching Assistant
 */

export const MODELS = [
  { id: 'llama-3.1-70b',       label: 'LLaMA 3.1 70B',     badge: 'Fast'      },
  { id: 'llama-3.1-8b',        label: 'LLaMA 3.1 8B',      badge: 'Lite'      },
  { id: 'gpt-4o',              label: 'GPT-4o',             badge: 'Powerful'  },
  { id: 'gpt-4o-mini',         label: 'GPT-4o Mini',        badge: 'Balanced'  },
  { id: 'claude-sonnet-4-20250514', label: 'Claude Sonnet 4', badge: 'Smart'  },
  { id: 'mistral-large',       label: 'Mistral Large',      badge: 'Open'      },
]

export const MAX_RAG_SOURCES = 5
export const MAX_CHAT_SESSIONS = 50
export const CACHE_TTL_MS = 10 * 60 * 1000   // 10 min
export const STREAMING_CHUNK_DELAY_MS = 16    // ~60fps

export const SUGGESTION_PROMPTS = [
  'Explain gradient descent with an example',
  'What is the attention mechanism in transformers?',
  'How does dropout prevent overfitting?',
  'Difference between CNN and RNN architectures',
  'What is the vanishing gradient problem?',
  'Explain the role of activation functions',
]

export const ERROR_MESSAGES = {
  NETWORK: 'Network error — check your connection and try again.',
  SERVER:  'Server error — the API returned an unexpected response.',
  TIMEOUT: 'Request timed out — the server may be overloaded.',
  UNKNOWN: 'Something went wrong. Please try again.',
}
