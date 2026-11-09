import { describe, expect, it } from 'vitest'
import {
  contentIndex,
  loadFullContent,
  loadInterviewQuestions,
  loadPracticeItems,
} from './content'

// Chunk fix (2026-11-09): the slim index loaded up front must NOT
// contain the full interview/practice bodies — those are lazy-loaded
// from separate generated files. If this test fails, the initial
// bundle has regressed to ~1.15 MB again.
describe('split content index', () => {
  it('slim index has topics/tracks/cheatsheets and id-only lists, not full bodies', () => {
    expect(contentIndex.topics.length).toBe(96)
    expect(contentIndex.tracks.length).toBe(10)
    expect(contentIndex.cheatsheets.length).toBe(19)
    expect(contentIndex.interviewQuestionIds.length).toBe(366)
    expect(contentIndex.practiceItemIds.length).toBe(183)
    // Full bodies must not be properties of the slim index at all.
    expect('interviewQuestions' in contentIndex).toBe(false)
    expect('practiceItems' in contentIndex).toBe(false)
  })

  it('lazy interview loader returns all questions and the ids match the slim index', async () => {
    const questions = await loadInterviewQuestions()
    expect(questions.length).toBe(366)
    expect(new Set(questions.map(q => q.id))).toEqual(new Set(contentIndex.interviewQuestionIds))
    expect(questions.every(q => typeof q.question === 'string' && q.question.length > 0)).toBe(true)
  })

  it('lazy practice loader returns all items and the ids match the slim index', async () => {
    const items = await loadPracticeItems()
    expect(items.length).toBe(183)
    expect(new Set(items.map(i => i.id))).toEqual(new Set(contentIndex.practiceItemIds))
  })

  it('lazy loaders are cached: repeated calls return the same array', async () => {
    const [a, b] = await Promise.all([loadInterviewQuestions(), loadInterviewQuestions()])
    expect(a).toBe(b)
    const [c, d] = await Promise.all([loadPracticeItems(), loadPracticeItems()])
    expect(c).toBe(d)
  })

  it('loadFullContent loads both collections together', async () => {
    const full = await loadFullContent()
    expect(full.interviewQuestions.length).toBe(366)
    expect(full.practiceItems.length).toBe(183)
  })
})
