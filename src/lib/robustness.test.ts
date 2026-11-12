import { describe, expect, it } from 'vitest'
import {
  accuracyByTopic,
  clampFlashcardBox,
  filterKnownIds,
  formatDate,
  isDue,
  localDateString,
  nextDueDate,
  normalizeSearchQuery,
  sanitizeSettings,
  sanitizeUserData,
  searchScore,
  studyStreak,
  truncateImportErrors,
  validateImport,
} from './utils'

const KNOWN = {
  topics: new Set(['t1', 't2']),
  questions: new Set(['q1']),
  revision: new Set(['r1']),
  practice: new Set(['p1', 'p2']),
}

describe('sanitizeUserData (corrupt / old-schema storage)', () => {
  it('returns empty defaults for null, array, and string shapes', () => {
    for (const bad of [null, undefined, [], 'garbage', 42]) {
      const s = sanitizeUserData(bad, KNOWN)
      expect(s.bookmarks).toEqual([])
      expect(s.progress).toEqual({})
      expect(s.settings.theme).toBe('system')
    }
  })
  it('drops unknown ids and invalid progress values, keeps known ones', () => {
    const s = sanitizeUserData({
      progress: { t1: 'completed', nope: 'completed', t2: 'banana' },
      bookmarks: ['t1', 'nope', 't1', 7],
      notes: { t1: 'hello', nope: 'gone' },
      recentlyViewed: ['t2', 'nope'],
    }, KNOWN)
    expect(s.progress).toEqual({ t1: 'completed' })
    expect(s.bookmarks).toEqual(['t1'])
    expect(s.notes).toEqual({ t1: 'hello' })
    expect(s.recentlyViewed).toEqual(['t2'])
  })
  it('falls back on invalid settings enums instead of storing bogus tokens', () => {
    const s = sanitizeUserData({ settings: { theme: 'neon', fontSize: 'huge', width: 'wide', reducedMotion: 'yes' } }, KNOWN)
    expect(s.settings).toEqual({ theme: 'system', fontSize: 'medium', width: 'wide', reducedMotion: false })
    expect(sanitizeSettings(null).theme).toBe('system')
  })
  it('truncates huge notes and clamps flashcard boxes, treating bad due dates as due now', () => {
    const s = sanitizeUserData({
      notes: { t1: 'x'.repeat(20000) },
      flashcardStates: { p1: { box: 99, dueAt: 'not-a-date' }, p2: { box: 0, dueAt: '2030-01-01T00:00:00.000Z' }, nope: { box: 3, dueAt: '2030-01-01T00:00:00.000Z' } },
    }, KNOWN)
    expect(s.notes.t1.length).toBe(10000)
    expect(s.flashcardStates.p1.box).toBe(5)
    expect(isDue(s.flashcardStates.p1.dueAt)).toBe(true)
    expect(s.flashcardStates.p2.box).toBe(1)
    expect(s.flashcardStates.nope).toBeUndefined()
  })
  it('keeps only well-formed activity dates and caps attempts', () => {
    const attempts = Array.from({ length: 5010 }, (_, i) => ({ itemId: 'p1', correct: i % 2 === 0, at: '2026-01-01' }))
    const s = sanitizeUserData({ activityDates: ['2026-01-01', 'junk', '2026-13-40', 5], practiceAttempts: attempts }, KNOWN)
    expect(s.activityDates).toEqual(['2026-01-01'])
    expect(s.practiceAttempts.length).toBe(5000)
  })
  it('keeps review/bookmark state for revision prompt ids as well as interview ids', () => {
    // The former Module 0 prompts moved to content/revision with the
    // same ids; dropping them here would silently lose saved state.
    const s = sanitizeUserData({
      questionBookmarks: ['q1', 'r1', 'nope'],
      interviewReview: { q1: 'confident', r1: 'needs-review', nope: 'confident' },
    }, KNOWN)
    expect(s.questionBookmarks).toEqual(['q1', 'r1'])
    expect(s.interviewReview).toEqual({ q1: 'confident', r1: 'needs-review' })
  })
})

describe('validateImport (strict import, lenient storage)', () => {
  it('rejects arrays and non-objects with a usable message', () => {
    const r = validateImport(['t1'], KNOWN.topics, KNOWN.questions)
    expect(r.ok).toBe(false)
    expect(r.errors.join(' ')).toMatch(/not an object/)
  })
  it('rejects unknown flashcard, recently-viewed, review and attempt ids — not just topics/questions', () => {
    const r = validateImport({
      flashcardBookmarks: ['nope'], recentlyViewed: ['nope'],
      interviewReview: { nope: 'confident', q1: 'shrugging' },
      practiceAttempts: [{ itemId: 'nope', correct: true, at: '2026-01-01' }],
      flashcardStates: { p1: { box: 9, dueAt: 'junk' } },
      settings: { theme: 'neon' },
    }, KNOWN.topics, KNOWN.questions, KNOWN.practice)
    expect(r.ok).toBe(false)
    expect(r.errors.length).toBeGreaterThanOrEqual(6)
  })
  it('warns (does not reject) on huge notes and duplicates, which import then trims/dedupes', () => {
    const r = validateImport({ bookmarks: ['t1', 't1'], notes: { t1: 'x'.repeat(15000) } }, KNOWN.topics, KNOWN.questions, KNOWN.practice)
    expect(r.ok).toBe(true)
    expect(r.warnings.length).toBeGreaterThanOrEqual(2)
    const s = sanitizeUserData({ bookmarks: ['t1', 't1'], notes: { t1: 'x'.repeat(15000) } }, KNOWN)
    expect(s.bookmarks).toEqual(['t1'])
    expect(s.notes.t1.length).toBe(10000)
  })
  it('accepts a clean round-trip and truncates long error lists for display', () => {
    const data = { schemaVersion: 1, bookmarks: ['t1'], progress: { t1: 'completed' }, practiceAttempts: [{ itemId: 'p1', correct: true, at: '2026-01-01' }] }
    expect(validateImport(data, KNOWN.topics, KNOWN.questions, KNOWN.practice).ok).toBe(true)
    const { shown, hidden } = truncateImportErrors(Array.from({ length: 25 }, (_, i) => `e${i}`))
    expect(shown.length).toBe(20)
    expect(hidden).toBe(5)
  })
})

describe('search normalisation', () => {
  it('matches accents, case and extra whitespace; punctuation-only and empty queries score 0', () => {
    expect(normalizeSearchQuery('  Café   Java ')).toBe('cafe java')
    expect(searchScore('cafe', 'Café Basics')).toBeGreaterThan(0)
    expect(searchScore('  JAVA  ', 'Java')).toBe(100)
    expect(searchScore('', 'Java')).toBe(0)
    expect(searchScore('!!!', 'Java')).toBe(0)
    expect(searchScore('c++', 'C++ Basics')).toBeGreaterThan(0)
  })
})

describe('streak / Leitner edge cases', () => {
  it('a gap breaks the streak and future or invalid dates do not extend it', () => {
    const today = localDateString()
    const threeAgo = localDateString(new Date(Date.now() - 3 * 86400000))
    const tomorrow = localDateString(new Date(Date.now() + 86400000))
    expect(studyStreak([today, threeAgo])).toBe(1)
    expect(studyStreak([tomorrow])).toBe(0)
    expect(studyStreak(['junk', today])).toBe(1)
    expect(studyStreak([])).toBe(0)
  })
  it('invalid due dates are due; box clamps to 1–5', () => {
    expect(isDue('not-a-date')).toBe(true)
    expect(isDue('')).toBe(true)
    expect(clampFlashcardBox(99)).toBe(5)
    expect(clampFlashcardBox(0)).toBe(1)
    expect(clampFlashcardBox(NaN)).toBe(1)
    expect(new Date(nextDueDate(99)).getTime()).toBeGreaterThan(Date.now())
  })
})

describe('misc degradation helpers', () => {
  it('formatDate returns a dash for null and invalid dates, not "Invalid Date"', () => {
    expect(formatDate(null)).toBe('—')
    expect(formatDate('not-a-date')).toBe('—')
    expect(formatDate('2026-01-02')).not.toBe('—')
  })
  it('accuracy skips attempts for removed items instead of a phantom bucket', () => {
    const acc = accuracyByTopic(
      [{ itemId: 'gone', correct: true, at: '2026-01-01' }, { itemId: 'p1', correct: false, at: '2026-01-01' }],
      [{ id: 'p1', topicId: 't1' }],
    )
    expect(acc).toEqual([{ topicId: 't1', correct: 0, total: 1, pct: 0 }])
  })
  it('filterKnownIds handles non-arrays and dedupes', () => {
    expect(filterKnownIds('t1', KNOWN.topics)).toEqual([])
    expect(filterKnownIds(['t1', 't1', 'nope'], KNOWN.topics)).toEqual(['t1'])
  })
})
