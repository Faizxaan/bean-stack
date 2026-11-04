import React, { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { EMPTY_USER_DATA, type ProgressStatus, type UserData } from '../types'
import { nextDueDate, safeJsonParse, todayIso } from '../lib/utils'

const STORAGE_KEY = 'beanstack-user-data-v1'

function loadInitial(): UserData {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return EMPTY_USER_DATA
    const parsed = safeJsonParse<Partial<UserData>>(raw, {})
    // Migration: schemaVersion 1 is current; older/unknown shapes fall back to defaults for missing fields
    return { ...EMPTY_USER_DATA, ...parsed, settings: { ...EMPTY_USER_DATA.settings, ...(parsed.settings || {}) } }
  } catch {
    return EMPTY_USER_DATA
  }
}

interface AppContextValue {
  data: UserData
  setProgress: (topicId: string, status: ProgressStatus) => void
  toggleList: (key: 'bookmarks' | 'favorites' | 'questionBookmarks' | 'flashcardBookmarks', id: string) => void
  setNote: (topicId: string, text: string) => void
  recordAttempt: (itemId: string, correct: boolean) => void
  setFlashcardBox: (itemId: string, box: number) => void
  setInterviewReview: (questionId: string, value: 'confident' | 'needs-review') => void
  markViewed: (topicId: string) => void
  setInterviewDate: (date: string | null) => void
  setSettings: (patch: Partial<UserData['settings']>) => void
  markExported: () => void
  resetScope: (scope: 'progress' | 'bookmarks' | 'favorites' | 'notes' | 'practice' | 'all') => void
  replaceData: (data: UserData) => void
}

const Ctx = createContext<AppContextValue | null>(null)

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [data, setData] = useState<UserData>(loadInitial)

  useEffect(() => {
    try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data)) } catch {
      // Quota / private mode: fail silently, app still works in-memory
    }
    // Apply theme + font size + width to document
    const root = document.documentElement
    const theme = data.settings.theme === 'system'
      ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
      : data.settings.theme
    root.dataset.theme = theme
    root.dataset.fontSize = data.settings.fontSize
    root.dataset.width = data.settings.width
    if (data.settings.reducedMotion) root.dataset.reducedMotion = 'true'
    else delete root.dataset.reducedMotion
  }, [data])

  const value = useMemo<AppContextValue>(() => ({
    data,
    setProgress: (topicId, status) => setData(d => ({ ...d, progress: { ...d.progress, [topicId]: status }, activityDates: [...new Set([...d.activityDates, todayIso()])] })),
    toggleList: (key, id) => setData(d => {
      const list = d[key]
      const next = list.includes(id) ? list.filter(x => x !== id) : [...list, id]
      return { ...d, [key]: next }
    }),
    setNote: (topicId, text) => setData(d => ({ ...d, notes: { ...d.notes, [topicId]: text } })),
    recordAttempt: (itemId, correct) => setData(d => ({ ...d, practiceAttempts: [...d.practiceAttempts, { itemId, correct, at: new Date().toISOString() }], activityDates: [...new Set([...d.activityDates, todayIso()])] })),
    setFlashcardBox: (itemId, box) => setData(d => ({ ...d, flashcardStates: { ...d.flashcardStates, [itemId]: { box, dueAt: nextDueDate(box), lastReviewedAt: new Date().toISOString() } }, activityDates: [...new Set([...d.activityDates, todayIso()])] })),
    setInterviewReview: (questionId, value) => setData(d => ({ ...d, interviewReview: { ...d.interviewReview, [questionId]: value } })),
    markViewed: (topicId) => setData(d => ({ ...d, recentlyViewed: [topicId, ...d.recentlyViewed.filter(x => x !== topicId)].slice(0, 20), activityDates: [...new Set([...d.activityDates, todayIso()])] })),
    setInterviewDate: (date) => setData(d => ({ ...d, interviewDate: date })),
    setSettings: (patch) => setData(d => ({ ...d, settings: { ...d.settings, ...patch } })),
    markExported: () => setData(d => ({ ...d, lastExportedAt: new Date().toISOString() })),
    resetScope: (scope) => setData(d => {
      if (scope === 'all') return { ...EMPTY_USER_DATA, settings: d.settings }
      if (scope === 'progress') return { ...d, progress: {} }
      if (scope === 'bookmarks') return { ...d, bookmarks: [], questionBookmarks: [], flashcardBookmarks: [] }
      if (scope === 'favorites') return { ...d, favorites: [] }
      if (scope === 'notes') return { ...d, notes: {} }
      if (scope === 'practice') return { ...d, practiceAttempts: [], flashcardStates: {}, interviewReview: {} }
      return d
    }),
    replaceData: (next) => setData({ ...EMPTY_USER_DATA, ...next, settings: { ...EMPTY_USER_DATA.settings, ...next.settings } }),
  }), [data])

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useApp(): AppContextValue {
  const v = useContext(Ctx)
  if (!v) throw new Error('useApp must be used inside AppProvider')
  return v
}
