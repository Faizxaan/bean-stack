import { EMPTY_USER_DATA, type PracticeAttempt, type ProgressStatus, type TopicMeta, type UserData } from '../types'

export const MAX_NOTE_LENGTH = 10000
export const MAX_PRACTICE_ATTEMPTS = 5000
export const MAX_ACTIVITY_DATES = 730
const MAX_IMPORT_ERRORS_SHOWN = 20

// Local (not UTC) calendar date, YYYY-MM-DD. The old code used
// toISOString(), so a user east of UTC studying after midnight local
// time recorded the *previous* day and could silently lose a streak.
export function localDateString(d = new Date()): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function readingMinutesFromText(text: string): number {
  const words = text.replace(/```[\s\S]*?```/g, ' ').replace(/[#>*`\[\]()!-]/g, ' ').split(/\s+/).filter(Boolean).length
  return Math.max(1, Math.ceil(words / 200))
}

export function progressStats(progress: Record<string, string>, topicIds: string[]) {
  const completed = topicIds.filter(id => progress[id] === 'completed').length
  const inProgress = topicIds.filter(id => progress[id] === 'in-progress').length
  const total = topicIds.length
  const pct = total ? Math.round((completed / total) * 100) : 0
  return { completed, inProgress, total, pct }
}

export function accuracyByTopic(attempts: PracticeAttempt[], items: { id: string; topicId?: string }[]) {
  if (!Array.isArray(attempts) || !Array.isArray(items)) return []
  const byTopic = new Map<string, { correct: number; total: number }>()
  const itemTopic = new Map(items.map(i => [i.id, i.topicId || 'general']))
  for (const a of attempts) {
    // Attempts pointing at a removed/unknown item must not inflate a
    // phantom "general" bucket; they are dropped, not counted.
    if (!a || typeof a.itemId !== 'string' || !itemTopic.has(a.itemId)) continue
    const t = itemTopic.get(a.itemId) || 'general'
    const cur = byTopic.get(t) || { correct: 0, total: 0 }
    cur.total += 1
    if (a.correct) cur.correct += 1
    byTopic.set(t, cur)
  }
  return [...byTopic.entries()].map(([topicId, v]) => ({ topicId, ...v, pct: v.total ? Math.round((v.correct / v.total) * 100) : 0 }))
}

export function weakTopics(attempts: PracticeAttempt[], items: { id: string; topicId?: string }[]) {
  return accuracyByTopic(attempts, items).filter(x => x.total >= 2 && x.pct < 70).sort((a, b) => a.pct - b.pct)
}

// Fisher-Yates shuffle: returns a new array in random order and never
// mutates the input, so a caller can re-shuffle the same pool safely.
export function shuffleItems<T>(items: readonly T[]): T[] {
  const out = [...items]
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}

/**
 * Pick `count` mock questions from a pool: shuffled, with no repeats,
 * and avoiding `previousIds` (the previous mock's questions) while the
 * pool still leaves enough fresh questions for a full mock. Only when
 * the fresh remainder is short of `count` are previous questions
 * reused, shuffled, to fill the mock — so a small pool can still
 * produce a full mock instead of a short one.
 */
export function pickMockQuestions<T extends { id: string }>(
  pool: readonly T[],
  count: number,
  previousIds: readonly string[] = [],
): T[] {
  const prev = new Set(previousIds)
  const fresh = shuffleItems(pool.filter(i => !prev.has(i.id)))
  if (fresh.length >= count) return fresh.slice(0, count)
  const repeats = shuffleItems(pool.filter(i => prev.has(i.id)))
  return [...fresh, ...repeats].slice(0, count)
}

export type ResetScope = 'progress' | 'bookmarks' | 'favorites' | 'notes' | 'practice' | 'interview' | 'all'

/**
 * Pure reset logic, extracted so it can be unit-tested without
 * rendering. Each scope clears only what it names:
 * - 'practice' clears practice attempts and Leitner flashcard state
 *   only — NOT interviewReview (interview marks are their own scope).
 * - 'interview' clears Confident / Needs review marks only. The map
 *   also holds marks for one-minute revision prompts, which share the
 *   interviewReview key, so those marks go with it; question
 *   bookmarks are untouched here and stay with 'bookmarks'.
 * - 'all' keeps reading settings, as before.
 */
export function applyResetScope(d: UserData, scope: ResetScope): UserData {
  if (scope === 'all') return { ...EMPTY_USER_DATA, settings: d.settings }
  if (scope === 'progress') return { ...d, progress: {} }
  if (scope === 'bookmarks') return { ...d, bookmarks: [], questionBookmarks: [], flashcardBookmarks: [] }
  if (scope === 'favorites') return { ...d, favorites: [] }
  if (scope === 'notes') return { ...d, notes: {} }
  if (scope === 'practice') return { ...d, practiceAttempts: [], flashcardStates: {} }
  if (scope === 'interview') return { ...d, interviewReview: {} }
  return d
}

export function isValidCalendarDate(s: string): boolean {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s)
  if (!m) return false
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]))
  return d.getFullYear() === Number(m[1]) && d.getMonth() === Number(m[2]) - 1 && d.getDate() === Number(m[3])
}

export function studyStreak(activityDates: string[]): number {
  if (!Array.isArray(activityDates)) return 0
  // Only real calendar dates count; garbage strings (and impossible
  // dates like 2026-13-40, which a bare format regex would accept)
  // can never extend (or crash) the streak.
  const set = new Set(activityDates.filter(d => typeof d === 'string' && isValidCalendarDate(d)))
  let streak = 0
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  // If today has no activity yet, streak counts up to yesterday.
  // A future-dated entry (clock skew / hand-edited storage) is ignored:
  // the walk starts at today/yesterday, never in the future.
  if (!set.has(localDateString(d))) d.setDate(d.getDate() - 1)
  while (set.has(localDateString(d))) {
    streak += 1
    d.setDate(d.getDate() - 1)
  }
  return streak
}

// Leitner: box 1 = 1 day, 2 = 3 days, 3 = 7 days, 4 = 14 days, 5 = 30 days
export const LEITNER_INTERVALS = [0, 1, 3, 7, 14, 30]
export function clampFlashcardBox(box: unknown): number {
  if (typeof box !== 'number' || !Number.isFinite(box)) return 1
  return Math.min(5, Math.max(1, Math.floor(box)))
}
export function nextDueDate(box: number, from = new Date()): string {
  const days = LEITNER_INTERVALS[clampFlashcardBox(box)] || 1
  const d = new Date(from)
  d.setDate(d.getDate() + days)
  return d.toISOString()
}
// Practice track/section filter (Batch 3, 2026-11-13): narrow a practice
// list to one Learn track, optionally one section inside it. The caller
// supplies the topic lookup (getTopic in the page) so this stays pure
// and unit-testable. 'all' means no filter on that axis; an item whose
// topic is unknown matches nothing once any filter is on — every
// current practice item has a valid topicId, so nothing is hidden by
// accident, and a future orphan surfaces as "missing" instead of
// silently appearing under the wrong track.
export function filterByTrackSection<T extends { topicId?: string }>(
  items: T[],
  trackId: string,
  sectionId: string,
  topicOf: (topicId: string) => { track: string; section: string } | undefined,
): T[] {
  if (trackId === 'all' && sectionId === 'all') return items
  return items.filter(item => {
    const topic = item.topicId ? topicOf(item.topicId) : undefined
    if (!topic) return false
    if (trackId !== 'all' && topic.track !== trackId) return false
    if (sectionId !== 'all' && topic.section !== sectionId) return false
    return true
  })
}

export function isDue(dueAt: string, now = new Date()): boolean {
  // A corrupt/missing due date must surface the card for review,
  // never hide it forever (the old NaN <= now === false behaviour).
  const t = new Date(dueAt).getTime()
  if (Number.isNaN(t)) return true
  return t <= now.getTime()
}

// Normalise for search: case, accents and stray whitespace/punctuation
// spacing must not change whether a match is found. "cafe" matches
// "café", "  java   spring " matches like "java spring".
export function normalizeSearchQuery(text: string): string {
  return (text || '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
}

export function searchScore(query: string, haystack: string): number {
  const q = normalizeSearchQuery(query)
  if (!q) return 0
  const h = normalizeSearchQuery(haystack)
  if (!h) return 0
  if (h === q) return 100
  if (h.startsWith(q)) return 80
  if (h.includes(q)) return 50
  const words = q.split(' ')
  const matched = words.filter(w => h.includes(w)).length
  return words.length ? Math.round((matched / words.length) * 40) : 0
}

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return !!v && typeof v === 'object' && !Array.isArray(v)
}

const VALID_PROGRESS: ProgressStatus[] = ['not-started', 'in-progress', 'completed']
const VALID_THEMES = ['light', 'dark', 'system'] as const
const VALID_FONT_SIZES = ['small', 'medium', 'large'] as const
const VALID_WIDTHS = ['narrow', 'wide'] as const

export function sanitizeSettings(value: unknown): UserData['settings'] {
  const d = EMPTY_USER_DATA.settings
  if (!isPlainObject(value)) return { ...d }
  return {
    theme: (VALID_THEMES as readonly string[]).includes(value.theme as string) ? (value.theme as UserData['settings']['theme']) : d.theme,
    fontSize: (VALID_FONT_SIZES as readonly string[]).includes(value.fontSize as string) ? (value.fontSize as UserData['settings']['fontSize']) : d.fontSize,
    width: (VALID_WIDTHS as readonly string[]).includes(value.width as string) ? (value.width as UserData['settings']['width']) : d.width,
    reducedMotion: typeof value.reducedMotion === 'boolean' ? value.reducedMotion : d.reducedMotion,
  }
}

export function filterKnownIds(ids: unknown, known: Set<string>): string[] {
  if (!Array.isArray(ids)) return []
  const out: string[] = []
  for (const id of ids) {
    if (typeof id === 'string' && known.has(id) && !out.includes(id)) out.push(id)
  }
  return out
}

export interface KnownIdSets {
  topics: Set<string>
  questions: Set<string>
  practice: Set<string>
  // One-minute revision prompts (former Module 0). They share the
  // questionBookmarks / interviewReview keys with interview questions
  // (same ids as before the move), so sanitisation accepts an id that
  // is in either set — dropping a revision id here would silently lose
  // a user's saved review/bookmark for that prompt.
  revision?: Set<string>
}

function knownQuestionOrRevision(known: KnownIdSets): Set<string> {
  if (!known.revision || known.revision.size === 0) return known.questions
  return new Set([...known.questions, ...known.revision])
}

function parseableDate(v: unknown): v is string {
  return typeof v === 'string' && !Number.isNaN(new Date(v).getTime())
}

// Lenient repair for LocalStorage (our own data, possibly corrupt,
// hand-edited, or from an older schema): drop what cannot be trusted,
// clamp what can, never throw, never return a half-shaped object.
// Import is deliberately stricter — see validateImport.
export function sanitizeUserData(data: unknown, known: KnownIdSets): UserData {
  // Fresh containers for every map/array the function writes into
  // below (progress, notes, flashcardStates, interviewReview): a bare
  // {...EMPTY_USER_DATA} shares those objects with the constant, so
  // the old code wrote sanitised entries INTO EMPTY_USER_DATA itself.
  // That leaked across calls in one session — importing file B after
  // file A kept A's progress, and "Reset everything" (which returns
  // {...EMPTY_USER_DATA}) failed to clear progress loaded at startup.
  const base: UserData = {
    ...EMPTY_USER_DATA,
    settings: { ...EMPTY_USER_DATA.settings },
    progress: {},
    notes: {},
    flashcardStates: {},
    interviewReview: {},
  }
  if (!isPlainObject(data)) return base
  const d = data as Record<string, unknown>

  if (isPlainObject(d.progress)) {
    for (const [id, v] of Object.entries(d.progress)) {
      if (known.topics.has(id) && (VALID_PROGRESS as string[]).includes(v as string)) base.progress[id] = v as ProgressStatus
    }
  }
  base.bookmarks = filterKnownIds(d.bookmarks, known.topics)
  base.favorites = filterKnownIds(d.favorites, known.topics)
  // Question bookmarks / interview reviews may reference a revision
  // prompt id as well as an interview question id (see KnownIdSets).
  const knownQ = knownQuestionOrRevision(known)
  base.questionBookmarks = filterKnownIds(d.questionBookmarks, knownQ)
  base.flashcardBookmarks = filterKnownIds(d.flashcardBookmarks, known.practice)
  if (isPlainObject(d.notes)) {
    for (const [id, v] of Object.entries(d.notes)) {
      if (known.topics.has(id) && typeof v === 'string' && v.trim()) base.notes[id] = v.slice(0, MAX_NOTE_LENGTH)
    }
  }
  if (Array.isArray(d.practiceAttempts)) {
    const kept = d.practiceAttempts.filter(a =>
      isPlainObject(a) && typeof a.itemId === 'string' && typeof a.correct === 'boolean' &&
      (known.practice.size === 0 || known.practice.has(a.itemId)),
    ) as PracticeAttempt[]
    base.practiceAttempts = kept.slice(-MAX_PRACTICE_ATTEMPTS)
  }
  if (isPlainObject(d.flashcardStates)) {
    for (const [id, v] of Object.entries(d.flashcardStates)) {
      if (known.practice.size > 0 && !known.practice.has(id)) continue
      if (!isPlainObject(v)) continue
      const box = clampFlashcardBox(v.box)
      base.flashcardStates[id] = {
        box,
        // An unreadable due date means "due now", not "due in a box
        // interval" — otherwise a corrupt card could hide for 30 days.
        dueAt: parseableDate(v.dueAt) ? (v.dueAt as string) : new Date().toISOString(),
        lastReviewedAt: parseableDate(v.lastReviewedAt) ? (v.lastReviewedAt as string) : undefined,
      }
    }
  }
  if (isPlainObject(d.interviewReview)) {
    for (const [id, v] of Object.entries(d.interviewReview)) {
      if (knownQ.has(id) && (v === 'confident' || v === 'needs-review')) base.interviewReview[id] = v
    }
  }
  base.recentlyViewed = filterKnownIds(d.recentlyViewed, known.topics).slice(0, 20)
  if (Array.isArray(d.activityDates)) {
    const dates = d.activityDates.filter(x => typeof x === 'string' && isValidCalendarDate(x))
    base.activityDates = [...new Set(dates)].slice(-MAX_ACTIVITY_DATES)
  }
  base.interviewDate = parseableDate(d.interviewDate) ? (d.interviewDate as string) : null
  base.lastExportedAt = parseableDate(d.lastExportedAt) ? (d.lastExportedAt as string) : null
  base.settings = sanitizeSettings(d.settings)
  return base
}

export function validateImport(
  data: unknown,
  knownTopicIds: Set<string>,
  knownQuestionIds: Set<string>,
  knownPracticeIds: Set<string> = new Set(),
): { ok: boolean; errors: string[]; warnings: string[] } {
  const errors: string[] = []
  const warnings: string[] = []
  if (!isPlainObject(data)) return { ok: false, errors: ['Imported data is not an object (it must be a JSON object, not an array or plain text)'], warnings }
  const d = data as Record<string, unknown>
  if (d.schemaVersion !== 1 && d.schemaVersion !== undefined) errors.push(`Unsupported schema version: ${String(d.schemaVersion)} — this file was made for a different version of Beanstack`)
  const checkIds = (label: string, list: unknown, known: Set<string>) => {
    if (list === undefined) return
    if (!Array.isArray(list)) { errors.push(`${label} must be an array`); return }
    const seen = new Set<string>()
    for (const id of list) {
      if (typeof id !== 'string') { errors.push(`${label} contains a non-string entry`); continue }
      if (seen.has(id)) warnings.push(`${label} contains a duplicate id (${id}) — duplicates will be removed on import`)
      seen.add(id)
      if (known.size > 0 && !known.has(id)) errors.push(`${label} references unknown id: ${id}`)
    }
  }
  if (d.progress !== undefined) {
    if (!isPlainObject(d.progress)) errors.push('progress must be an object')
    else for (const [id, v] of Object.entries(d.progress)) {
      if (!knownTopicIds.has(id)) errors.push(`progress references unknown topic: ${id}`)
      else if (!(VALID_PROGRESS as string[]).includes(v as string)) errors.push(`progress for ${id} has an invalid status: ${String(v)}`)
    }
  }
  checkIds('bookmarks', d.bookmarks, knownTopicIds)
  checkIds('favorites', d.favorites, knownTopicIds)
  checkIds('questionBookmarks', d.questionBookmarks, knownQuestionIds)
  checkIds('flashcardBookmarks', d.flashcardBookmarks, knownPracticeIds)
  checkIds('recentlyViewed', d.recentlyViewed, knownTopicIds)
  if (d.notes !== undefined) {
    if (!isPlainObject(d.notes)) errors.push('notes must be an object')
    else for (const [id, v] of Object.entries(d.notes)) {
      if (!knownTopicIds.has(id)) errors.push(`notes references unknown topic: ${id}`)
      else if (typeof v !== 'string') errors.push(`notes for ${id} is not text`)
      else if (v.length > MAX_NOTE_LENGTH) warnings.push(`Note for ${id} is very long (${v.length} characters) — it will be trimmed to ${MAX_NOTE_LENGTH} characters on import`)
    }
  }
  if (d.practiceAttempts !== undefined) {
    if (!Array.isArray(d.practiceAttempts)) errors.push('practiceAttempts must be an array')
    else for (const a of d.practiceAttempts) {
      if (!isPlainObject(a) || typeof a.itemId !== 'string' || typeof a.correct !== 'boolean') { errors.push('practiceAttempts contains a malformed entry (needs itemId and correct)'); continue }
      if (knownPracticeIds.size > 0 && !knownPracticeIds.has(a.itemId)) errors.push(`practiceAttempts references unknown practice item: ${a.itemId}`)
    }
  }
  if (d.flashcardStates !== undefined) {
    if (!isPlainObject(d.flashcardStates)) errors.push('flashcardStates must be an object')
    else for (const [id, v] of Object.entries(d.flashcardStates)) {
      if (knownPracticeIds.size > 0 && !knownPracticeIds.has(id)) errors.push(`flashcardStates references unknown practice item: ${id}`)
      else if (!isPlainObject(v) || typeof v.box !== 'number' || v.box < 1 || v.box > 5 || !parseableDate(v.dueAt)) errors.push(`flashcardStates for ${id} is malformed (box must be 1–5 with a valid due date)`)
    }
  }
  if (d.interviewReview !== undefined) {
    if (!isPlainObject(d.interviewReview)) errors.push('interviewReview must be an object')
    else for (const [id, v] of Object.entries(d.interviewReview)) {
      if (!knownQuestionIds.has(id)) errors.push(`interviewReview references unknown question: ${id}`)
      else if (v !== 'confident' && v !== 'needs-review') errors.push(`interviewReview for ${id} has an invalid value: ${String(v)}`)
    }
  }
  if (d.activityDates !== undefined) {
    if (!Array.isArray(d.activityDates)) errors.push('activityDates must be an array')
    else for (const x of d.activityDates) if (typeof x !== 'string' || !isValidCalendarDate(x)) errors.push(`activityDates contains an invalid date: ${String(x)}`)
  }
  if (d.settings !== undefined) {
    if (!isPlainObject(d.settings)) errors.push('settings must be an object')
    else {
      const s = d.settings
      if (s.theme !== undefined && !(VALID_THEMES as readonly string[]).includes(s.theme as string)) errors.push(`settings.theme is invalid: ${String(s.theme)}`)
      if (s.fontSize !== undefined && !(VALID_FONT_SIZES as readonly string[]).includes(s.fontSize as string)) errors.push(`settings.fontSize is invalid: ${String(s.fontSize)}`)
      if (s.width !== undefined && !(VALID_WIDTHS as readonly string[]).includes(s.width as string)) errors.push(`settings.width is invalid: ${String(s.width)}`)
      if (s.reducedMotion !== undefined && typeof s.reducedMotion !== 'boolean') errors.push('settings.reducedMotion must be true or false')
    }
  }
  if (d.interviewDate !== undefined && d.interviewDate !== null && !parseableDate(d.interviewDate)) errors.push('interviewDate is not a valid date')
  if (d.lastExportedAt !== undefined && d.lastExportedAt !== null && !parseableDate(d.lastExportedAt)) errors.push('lastExportedAt is not a valid date')
  return { ok: errors.length === 0, errors, warnings }
}

export function truncateImportErrors(errors: string[]): { shown: string[]; hidden: number } {
  return { shown: errors.slice(0, MAX_IMPORT_ERRORS_SHOWN), hidden: Math.max(0, errors.length - MAX_IMPORT_ERRORS_SHOWN) }
}

export function safeJsonParse<T>(text: string | null, fallback: T): T {
  if (!text) return fallback
  try { return JSON.parse(text) as T } catch { return fallback }
}

export function todayIso(): string {
  return localDateString()
}

// Days from today (local calendar) until a YYYY-MM-DD date: 0 means
// today, 1 tomorrow, negative means past. The old Home countdown did
// `new Date('2026-11-14')`, which parses as midnight UTC — in IST
// that is 05:30 local, so the count could be off by a day around
// midnight. Parsing as local midnight keeps the count honest.
export function daysUntilLocal(dateStr: string | null | undefined): number | null {
  if (!dateStr || !isValidCalendarDate(dateStr)) return null
  const [y, m, d] = dateStr.split('-').map(Number)
  const target = new Date(y, m - 1, d)
  target.setHours(0, 0, 0, 0)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return Math.round((target.getTime() - today.getTime()) / 86400000)
}

// Scroll behaviour that respects reduced motion, whether the user set
// it in Beanstack settings (dataset flag) or in their OS. Used by
// every smooth-scroll call site so a "smooth" scroll never overrides
// a reduced-motion preference.
export function smoothScrollBehavior(): ScrollBehavior {
  if (typeof document === 'undefined' || typeof window === 'undefined') return 'auto'
  if (document.documentElement.dataset.reducedMotion === 'true') return 'auto'
  try {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return 'auto'
  } catch { /* matchMedia unavailable — fall through to smooth */ }
  return 'smooth'
}

export function topicUrl(topic: TopicMeta): string {
  return `/learn/${topic.track}/${topic.section}/${topic.id}`
}

export function formatDate(iso: string | null): string {
  if (!iso) return '—'
  const t = new Date(iso).getTime()
  if (Number.isNaN(t)) return '—'
  try { return new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) } catch { return '—' }
}

export type { UserData }
