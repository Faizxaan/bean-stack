import { describe, expect, it } from 'vitest'
import {
  EMPTY_INTERVIEW_FILTERS,
  filterQuestions,
  firstUnreviewed,
  groupQuestionsByTopic,
  prevNextQuestion,
  reviewStats,
  sortQuestions,
} from './interview'
import type { InterviewQuestion, TopicMeta, Track } from '../types'

const q = (over: Partial<InterviewQuestion> & { id: string }): InterviewQuestion => ({
  module: 'module-1',
  category: 'Java',
  title: over.id,
  question: over.question || `Question ${over.id}?`,
  shortAnswer: 'Short.',
  difficulty: 'Medium',
  topicId: 't1',
  ...over,
})

const topics: TopicMeta[] = [
  { id: 't1', title: 'Collections', track: 'java-core', section: 's1', order: 1, difficulty: 'Beginner', importance: 5, tags: [], prerequisites: [], related: [], status: 'complete', lastUpdated: null, file: 'x.md', readingMinutes: 5, summary: '' },
  { id: 't2', title: 'Streams', track: 'java-core', section: 's1', order: 2, difficulty: 'Beginner', importance: 5, tags: [], prerequisites: [], related: [], status: 'complete', lastUpdated: null, file: 'y.md', readingMinutes: 5, summary: '' },
]
const tracks: Track[] = [
  { id: 'java-core', title: 'Core Java', description: '', status: 'complete', sections: [] },
]

describe('interview grouping', () => {
  it('groups by topic, sorted by category then difficulty, with category subgroups', () => {
    const qs = [q({ id: 'a', category: 'Streams', difficulty: 'Hard', topicId: 't2' }), q({ id: 'b', category: 'Java', difficulty: 'Easy', topicId: 't1' }), q({ id: 'c', category: 'Java', difficulty: 'Hard', topicId: 't1' })]
    const groups = groupQuestionsByTopic(qs, topics, tracks)
    expect(groups.map(g => g.topicId)).toEqual(['t1', 't2'])
    expect(groups[0].questions.map(x => x.id)).toEqual(['b', 'c'])
    expect(groups[0].categories.map(c => c.category)).toEqual(['Java'])
    expect(groups[1].topicTitle).toBe('Streams')
  })

  it('puts questions with no topic under General', () => {
    const groups = groupQuestionsByTopic([q({ id: 'g', topicId: undefined })], topics, tracks)
    expect(groups[0].topicTitle).toBe('General')
  })

  it('sortQuestions orders Easy before Hard within a category', () => {
    const sorted = sortQuestions([q({ id: 'h', difficulty: 'Hard' }), q({ id: 'e', difficulty: 'Easy' })])
    expect(sorted.map(x => x.id)).toEqual(['e', 'h'])
  })
})

describe('interview filtering and review stats', () => {
  const qs = [
    q({ id: 'a', question: 'What is a HashMap?', category: 'Collections', difficulty: 'Easy' }),
    q({ id: 'b', question: 'Explain streams', category: 'Streams', difficulty: 'Hard' }),
    q({ id: 'c', question: 'What is a HashSet?', category: 'Collections', difficulty: 'Medium' }),
  ]
  const review = { a: 'confident' as const, b: 'needs-review' as const }

  it('filters by text, difficulty, category and review status', () => {
    expect(filterQuestions(qs, { ...EMPTY_INTERVIEW_FILTERS, query: 'hashmap' }, review, []).map(x => x.id)).toEqual(['a'])
    expect(filterQuestions(qs, { ...EMPTY_INTERVIEW_FILTERS, difficulty: 'Hard' }, review, []).map(x => x.id)).toEqual(['b'])
    expect(filterQuestions(qs, { ...EMPTY_INTERVIEW_FILTERS, category: 'Collections' }, review, []).map(x => x.id)).toEqual(['a', 'c'])
    expect(filterQuestions(qs, { ...EMPTY_INTERVIEW_FILTERS, review: 'confident' }, review, []).map(x => x.id)).toEqual(['a'])
    expect(filterQuestions(qs, { ...EMPTY_INTERVIEW_FILTERS, review: 'needs-review' }, review, []).map(x => x.id)).toEqual(['b'])
    expect(filterQuestions(qs, { ...EMPTY_INTERVIEW_FILTERS, review: 'not-reviewed' }, review, []).map(x => x.id)).toEqual(['c'])
    expect(filterQuestions(qs, { ...EMPTY_INTERVIEW_FILTERS, review: 'bookmarked' }, review, ['c']).map(x => x.id)).toEqual(['c'])
  })

  it('reviewStats counts reviewed/confident/needs-review/bookmarked', () => {
    expect(reviewStats(qs, review, ['b', 'c'])).toEqual({ total: 3, reviewed: 2, confident: 1, needsReview: 1, bookmarked: 2, pctReviewed: 67 })
  })

  it('firstUnreviewed skips reviewed questions', () => {
    expect(firstUnreviewed(qs, review)?.id).toBe('c')
    expect(firstUnreviewed(qs, { a: 'confident', b: 'confident', c: 'confident' })?.id).toBe('a')
  })
})

describe('prev/next within a topic group', () => {
  it('returns neighbours in display order and undefined at the ends', () => {
    const qs = [
      q({ id: 'a', category: 'Java', difficulty: 'Easy', topicId: 't1' }),
      q({ id: 'b', category: 'Java', difficulty: 'Medium', topicId: 't1' }),
      q({ id: 'c', category: 'Java', difficulty: 'Easy', topicId: 't2' }),
    ]
    expect(prevNextQuestion(qs, 'a')).toEqual({ prev: undefined, next: qs[1] })
    expect(prevNextQuestion(qs, 'b')).toEqual({ prev: qs[0], next: undefined })
    expect(prevNextQuestion(qs, 'missing')).toEqual({ prev: undefined, next: undefined })
  })
})
