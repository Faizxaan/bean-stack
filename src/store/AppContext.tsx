import React, { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { EMPTY_USER_DATA, type ProgressStatus, type UserData } from '../types'
import { contentIndex } from '../lib/content'
import { MAX_ACTIVITY_DATES, MAX_NOTE_LENGTH, MAX_PRACTICE_ATTEMPTS, clampFlashcardBox, nextDueDate, safeJsonParse, sanitizeSettings, sanitizeUserData, todayIso } from '../lib/utils'

const STORAGE_KEY = 'beanstack-user-data-v1'

export const KNOWN_IDS = {
  topics: new Set(contentIndex.topics.map(t => t.id)),
  // Id-only lists from the slim index — the full interview/practice
  // bodies are lazy-loaded, but sanitisation still needs the ids.
  questions: new Set(contentIndex.interviewQuestionIds),
  practice: new Set(contentIndex.practiceItemIds),
}

function loadInitial(): UserData {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return { ...EMPTY_USER_DATA, settings: { ...EMPTY_USER_DATA.settings } }
    const parsed = safeJsonParse<unknown>(raw, {})
    // Corrupt, empty, array-shaped, or old-schema storage must never
    // crash the app or poison state: sanitize drops unknown ids and
    // invalid shapes and keeps everything recognisable. A stored
    // string/array used to spread into index-keyed garbage here.
    return sanitizeUserData(parsed, KNOWN_IDS)
  } catch {
    return { ...EMPTY_USER_DATA, settings: { ...EMPTY_USER_DATA.settings } }
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

  // When theme is "system", an OS light/dark switch must apply without
  // waiting for the next study action to rewrite state.
  useEffect(() => {
    if (data.settings.theme !== 'system') return
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const apply = () => { document.documentElement.dataset.theme = mq.matches ? 'dark' : 'light' }
    apply()
    mq.addEventListener('change', apply)
    return () => mq.removeEventListener('change', apply)
  }, [data.settings.theme])

  const value = useMemo<AppContextValue>(() => ({
    data,
    setProgress: (topicId, status) => setData(d => {
      if (status !== 'not-started' && status !== 'in-progress' && status !== 'completed') return d
      return { ...d, progress: { ...d.progress, [topicId]: status }, activityDates: [...new Set([...d.activityDates, todayIso()])].slice(-MAX_ACTIVITY_DATES) }
    }),
    toggleList: (key, id) => setData(d => {
      const list = Array.isArray(d[key]) ? d[key] : []
      const next = list.includes(id) ? list.filter(x => x !== id) : [...list, id]
      return { ...d, [key]: next }
    }),
    // A pasted novel-length note used to grow LocalStorage without bound
    // until the next save silently failed on quota; cap at the same
    // limit import/export round-trips enforce.
    setNote: (topicId, text) => setData(d => ({ ...d, notes: { ...d.notes, [topicId]: (text || '').slice(0, MAX_NOTE_LENGTH) } })),
    recordAttempt: (itemId, correct) => setData(d => ({ ...d, practiceAttempts: [...d.practiceAttempts, { itemId, correct, at: new Date().toISOString() }].slice(-MAX_PRACTICE_ATTEMPTS), activityDates: [...new Set([...d.activityDates, todayIso()])].slice(-MAX_ACTIVITY_DATES) })),
    setFlashcardBox: (itemId, box) => setData(d => {
      const clamped = clampFlashcardBox(box)
      return { ...d, flashcardStates: { ...d.flashcardStates, [itemId]: { box: clamped, dueAt: nextDueDate(clamped), lastReviewedAt: new Date().toISOString() } }, activityDates: [...new Set([...d.activityDates, todayIso()])].slice(-MAX_ACTIVITY_DATES) }
    }),
    setInterviewReview: (questionId, value) => setData(d => {
      if (value !== 'confident' && value !== 'needs-review') return d
      return { ...d, interviewReview: { ...d.interviewReview, [questionId]: value } }
    }),
    markViewed: (topicId) => setData(d => ({ ...d, recentlyViewed: [topicId, ...d.recentlyViewed.filter(x => x !== topicId)].slice(0, 20), activityDates: [...new Set([...d.activityDates, todayIso()])].slice(-MAX_ACTIVITY_DATES) })),
    setInterviewDate: (date) => setData(d => ({ ...d, interviewDate: date && !Number.isNaN(new Date(date).getTime()) ? date : null })),
    // Whitelist settings on every write, so a corrupt stored value can
    // never set dataset.theme/fontSize/width to a bogus token again.
    setSettings: (patch) => setData(d => ({ ...d, settings: sanitizeSettings({ ...d.settings, ...patch }) })),
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
    replaceData: (next) => setData(sanitizeUserData(next, KNOWN_IDS)),
  }), [data])

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useApp(): AppContextValue {
  const v = useContext(Ctx)
  if (!v) throw new Error('useApp must be used inside AppProvider')
  return v
}
