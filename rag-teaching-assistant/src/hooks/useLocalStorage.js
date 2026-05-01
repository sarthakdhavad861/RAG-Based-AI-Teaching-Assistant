import { useState, useEffect, useCallback } from 'react'

/**
 * useLocalStorage — persist state to localStorage with JSON serialization.
 * Falls back gracefully when localStorage is unavailable (SSR / private browsing).
 *
 * @param {string} key - localStorage key
 * @param {*} initialValue - default value if nothing stored
 */
export function useLocalStorage(key, initialValue) {
  const readValue = useCallback(() => {
    try {
      const item = window.localStorage.getItem(key)
      return item ? JSON.parse(item) : initialValue
    } catch {
      return initialValue
    }
  }, [key, initialValue])

  const [storedValue, setStoredValue] = useState(readValue)

  const setValue = useCallback((value) => {
    try {
      const nextValue = value instanceof Function ? value(storedValue) : value
      window.localStorage.setItem(key, JSON.stringify(nextValue))
      setStoredValue(nextValue)
    } catch (err) {
      console.warn(`useLocalStorage: failed to set "${key}"`, err)
    }
  }, [key, storedValue])

  const removeValue = useCallback(() => {
    try {
      window.localStorage.removeItem(key)
      setStoredValue(initialValue)
    } catch {}
  }, [key, initialValue])

  /* Sync across tabs */
  useEffect(() => {
    const handler = (e) => {
      if (e.key === key) setStoredValue(readValue())
    }
    window.addEventListener('storage', handler)
    return () => window.removeEventListener('storage', handler)
  }, [key, readValue])

  return [storedValue, setValue, removeValue]
}
