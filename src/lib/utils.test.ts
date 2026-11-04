import { describe, expect, it } from 'vitest'
import { accuracyByTopic, isDue, nextDueDate, progressStats, searchScore, studyStreak, validateImport, weakTopics } from './utils'

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

describe('studyStreak', () => {
  it('counts consecutive days ending today or yesterday', () => {
    const today = new Date().toISOString().slice(0, 10)
    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10)
    expect(studyStreak([today, yesterday])).toBe(2)
    expect(studyStreak(['2000-01-01'])).toBe(0)
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
