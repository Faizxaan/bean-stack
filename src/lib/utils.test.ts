import { describe, expect, it } from 'vitest'
import { accuracyByTopic, applyResetScope, filterByTrackSection, formatDate, isDue, nextDueDate, pickMockQuestions, progressStats, searchScore, shuffleItems, studyStreak, validateImport, weakTopics } from './utils'
import { EMPTY_USER_DATA, type UserData } from '../types'

describe('progressStats', () => {
  it('computes completed / in-progress / percent', () => {
    const s = progressStats({ a: 'completed', b: 'in-progress', c: 'not-started' }, ['a', 'b', 'c'])
    expect(s).toEqual({ completed: 1, inProgress: 1, total: 3, pct: 33 })
  })
  it('handles empty topics', () => {
    expect(progressStats({}, []).pct).toBe(0)
  })
})

describe('searchScore', () => {
  it('ranks exact and prefix matches above contains', () => {
    expect(searchScore('java', 'Java')).toBeGreaterThan(searchScore('java', 'Core Java Basics'))
    expect(searchScore('java', 'Core Java Basics')).toBeGreaterThan(0)
    expect(searchScore('python', 'Core Java Basics')).toBe(0)
  })
})

describe('spaced repetition', () => {
  it('next due is later than now for box >= 1', () => {
    expect(new Date(nextDueDate(2)).getTime()).toBeGreaterThan(Date.now())
  })
  it('isDue detects past dates', () => {
    expect(isDue('2000-01-01T00:00:00.000Z')).toBe(true)
    expect(isDue('2999-01-01T00:00:00.000Z')).toBe(false)
  })
})

describe('accuracy and weak topics', () => {
  const items = [{ id: 'm1', topicId: 't1' }, { id: 'm2', topicId: 't1' }, { id: 'm3', topicId: 't2' }]
  const attempts = [
    { itemId: 'm1', correct: false, at: '2026-01-01' },
    { itemId: 'm2', correct: false, at: '2026-01-01' },
    { itemId: 'm3', correct: true, at: '2026-01-01' },
  ]
  it('computes per-topic accuracy', () => {
    const acc = accuracyByTopic(attempts, items)
    expect(acc.find(a => a.topicId === 't1')?.pct).toBe(0)
    expect(acc.find(a => a.topicId === 't2')?.pct).toBe(100)
  })
  it('flags weak topics with at least 2 attempts below 70%', () => {
    expect(weakTopics(attempts, items).map(w => w.topicId)).toEqual(['t1'])
  })
})

describe('filterByTrackSection (Practice track/section filter, Batch 3)', () => {
  const items = [
    { id: 'a', topicId: 't1' },
    { id: 'b', topicId: 't2' },
    { id: 'c', topicId: 't3' },
    { id: 'd', topicId: 'missing' },
    { id: 'e' },
  ]
  const topicOf = (id: string) => ({
    t1: { track: 'java-core', section: 's1' },
    t2: { track: 'java-core', section: 's2' },
    t3: { track: 'spring-boot', section: 's1' },
  } as Record<string, { track: string; section: string }>)[id]
  it('returns everything when both filters are all', () => {
    expect(filterByTrackSection(items, 'all', 'all', topicOf).map(i => i.id)).toEqual(['a', 'b', 'c', 'd', 'e'])
  })
  it('filters by track, then by section within it', () => {
    expect(filterByTrackSection(items, 'java-core', 'all', topicOf).map(i => i.id)).toEqual(['a', 'b'])
    expect(filterByTrackSection(items, 'java-core', 's2', topicOf).map(i => i.id)).toEqual(['b'])
    expect(filterByTrackSection(items, 'spring-boot', 'all', topicOf).map(i => i.id)).toEqual(['c'])
    expect(filterByTrackSection(items, 'spring-boot', 's2', topicOf).map(i => i.id)).toEqual([])
  })
  it('drops items whose topic is unknown or missing once a filter is on', () => {
    expect(filterByTrackSection(items, 'java-core', 'all', topicOf).map(i => i.id)).not.toContain('d')
    expect(filterByTrackSection(items, 'java-core', 'all', topicOf).map(i => i.id)).not.toContain('e')
  })
})

describe('studyStreak', () => {
  it('counts consecutive days ending today or yesterday', () => {
    const today = new Date().toISOString().slice(0, 10)
    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10)
    expect(studyStreak([today, yesterday])).toBe(2)
    expect(studyStreak(['2000-01-01'])).toBe(0)
  })
})

describe('formatDate', () => {
  it('renders an ISO timestamp as a readable date, never the raw timestamp', () => {
    // Topic pages used to print "Updated 2026-11-04T00:00:00.000Z".
    const out = formatDate('2026-11-04T00:00:00.000Z')
    expect(out).not.toContain('T00:00:00')
    expect(out).toContain('2026')
    expect(out).toContain('Nov')
  })
  it('returns an em dash for missing or invalid input', () => {
    expect(formatDate(null)).toBe('—')
    expect(formatDate('not-a-date')).toBe('—')
  })
})

describe('validateImport', () => {
  it('rejects unknown topic ids', () => {
    const r = validateImport({ schemaVersion: 1, bookmarks: ['nope'] }, new Set(['ok']), new Set())
    expect(r.ok).toBe(false)
    expect(r.errors.join(' ')).toContain('nope')
  })
  it('accepts valid import', () => {
    const r = validateImport({ schemaVersion: 1, bookmarks: ['ok'], progress: { ok: 'completed' } }, new Set(['ok']), new Set())
    expect(r.ok).toBe(true)
  })
})

describe('mock question picking (shuffle + avoid previous mock)', () => {
  const pool = Array.from({ length: 12 }, (_, i) => ({ id: `m${i}` }))

  it('shuffleItems returns the same items in a new array, without mutating the input', () => {
    const input = [1, 2, 3, 4, 5]
    const out = shuffleItems(input)
    expect([...out].sort()).toEqual([1, 2, 3, 4, 5])
    expect(out).not.toBe(input)
    expect(input).toEqual([1, 2, 3, 4, 5])
  })

  it('picks 10 distinct questions and avoids the previous mock when the pool allows', () => {
    for (let run = 0; run < 20; run++) {
      const picked = pickMockQuestions(pool, 10, ['m0', 'm1'])
      expect(picked).toHaveLength(10)
      expect(new Set(picked.map(p => p.id)).size).toBe(10)
      expect(picked.some(p => p.id === 'm0' || p.id === 'm1')).toBe(false)
    }
  })

  it('fills from the previous mock only when the fresh remainder is short of 10', () => {
    // 11 fresh + 1 previous: a full mock of 10 can still avoid the repeat.
    expect(pickMockQuestions(pool, 10, ['m0']).some(p => p.id === 'm0')).toBe(false)
    // Only 5 fresh: the mock must reuse 5 previous questions to reach 10.
    const picked = pickMockQuestions(pool, 10, ['m0', 'm1', 'm2', 'm3', 'm4', 'm5', 'm6'])
    expect(picked).toHaveLength(10)
    expect(new Set(picked.map(p => p.id)).size).toBe(10)
  })

  it('returns the whole (shuffled) pool when it holds fewer than 10', () => {
    expect(pickMockQuestions(pool.slice(0, 3), 10)).toHaveLength(3)
    expect(pickMockQuestions([], 10)).toEqual([])
  })
})

describe('applyResetScope (practice / interview separation)', () => {
  const full: UserData = {
    ...EMPTY_USER_DATA,
    settings: { ...EMPTY_USER_DATA.settings },
    progress: { t1: 'completed' },
    bookmarks: ['t1'],
    questionBookmarks: ['q1'],
    flashcardBookmarks: ['f1'],
    notes: { t1: 'note' },
    practiceAttempts: [{ itemId: 'm1', correct: true, at: '2026-01-01' }],
    flashcardStates: { f1: { box: 3, dueAt: '2026-01-08T00:00:00.000Z' } },
    interviewReview: { q1: 'confident' },
  }

  it("'practice' clears attempts and flashcard state but NOT interviewReview", () => {
    const out = applyResetScope(full, 'practice')
    expect(out.practiceAttempts).toEqual([])
    expect(out.flashcardStates).toEqual({})
    expect(out.interviewReview).toEqual({ q1: 'confident' })
    expect(out.questionBookmarks).toEqual(['q1'])
    expect(out.progress).toEqual({ t1: 'completed' })
  })

  it("'interview' clears interviewReview only", () => {
    const out = applyResetScope(full, 'interview')
    expect(out.interviewReview).toEqual({})
    expect(out.practiceAttempts).toHaveLength(1)
    expect(out.flashcardStates).toEqual(full.flashcardStates)
    expect(out.questionBookmarks).toEqual(['q1'])
    expect(out.notes).toEqual({ t1: 'note' })
  })

  it("'all' clears everything except settings", () => {
    const out = applyResetScope(full, 'all')
    expect(out.interviewReview).toEqual({})
    expect(out.practiceAttempts).toEqual([])
    expect(out.progress).toEqual({})
    expect(out.settings).toEqual(full.settings)
  })
})
