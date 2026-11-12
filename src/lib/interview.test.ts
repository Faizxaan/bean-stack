import { describe, expect, it } from 'vitest'
import {
  EMPTY_INTERVIEW_FILTERS,
  INTERVIEW_CATEGORIES,
  INTERVIEW_MODULES,
  areaSlug,
  categoryRank,
  filterQuestions,
  firstUnreviewed,
  groupQuestionsByArea,
  isInterviewCategory,
  moduleMeta,
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

// Two tracks so learning order (track, then topic order) is testable:
// java-core comes before spring-boot; within java-core, t1 before t2.
const topics: TopicMeta[] = [
  { id: 't1', title: 'Collections', track: 'java-core', section: 's1', order: 1, difficulty: 'Beginner', importance: 5, tags: [], prerequisites: [], related: [], status: 'complete', lastUpdated: null, file: 'x.md', readingMinutes: 5, summary: '' },
  { id: 't2', title: 'Streams', track: 'java-core', section: 's1', order: 2, difficulty: 'Beginner', importance: 5, tags: [], prerequisites: [], related: [], status: 'complete', lastUpdated: null, file: 'y.md', readingMinutes: 5, summary: '' },
  { id: 't3', title: 'Spring IoC', track: 'spring-boot', section: 's1', order: 1, difficulty: 'Beginner', importance: 5, tags: [], prerequisites: [], related: [], status: 'complete', lastUpdated: null, file: 'z.md', readingMinutes: 5, summary: '' },
]
const tracks: Track[] = [
  { id: 'java-core', title: 'Core Java', description: '', status: 'complete', sections: [{ id: 's1', title: 'S1' }] },
  { id: 'spring-boot', title: 'Spring & Spring Boot', description: '', status: 'complete', sections: [{ id: 's1', title: 'S1' }] },
]
const ctx = { topics, tracks }

describe('Module 0 exclusion', () => {
  it('has no Module 0 in the module list', () => {
    expect(INTERVIEW_MODULES.map(m => m.id)).toEqual(['module-1', 'module-2', 'module-3', 'module-4', 'bonus-resume'])
    expect(moduleMeta('module-0')).toBeUndefined()
  })
})

describe('category taxonomy', () => {
  it('is 10 broad areas, in display order starting with Java', () => {
    expect(INTERVIEW_CATEGORIES).toHaveLength(10)
    expect(INTERVIEW_CATEGORIES[0]).toBe('Java')
    expect(INTERVIEW_CATEGORIES).toContain('Spring & Spring Boot')
    expect(INTERVIEW_CATEGORIES).toContain('Behavioral & Projects')
    expect(INTERVIEW_CATEGORIES).not.toContain('Revision')
    expect(INTERVIEW_CATEGORIES).not.toContain('Scenario-based')
    expect(INTERVIEW_CATEGORIES).not.toContain('Collections')
  })

  it('accepts only taxonomy categories (Resume is bonus-only, not an area)', () => {
    expect(isInterviewCategory('Java')).toBe(true)
    expect(isInterviewCategory('Collections')).toBe(false)
    expect(isInterviewCategory('Revision')).toBe(false)
    expect(isInterviewCategory('Scenario-based')).toBe(false)
    expect(isInterviewCategory('Resume')).toBe(false)
    // Resume sorts after every real area.
    expect(categoryRank('Resume')).toBeGreaterThan(categoryRank('Behavioral & Projects'))
  })

  it('slugs areas for URLs and anchors', () => {
    expect(areaSlug('Spring & Spring Boot')).toBe('spring-and-spring-boot')
    expect(areaSlug('SQL & Databases')).toBe('sql-and-databases')
    expect(areaSlug('Java')).toBe('java')
  })
})

describe('ordering: broad area, then learning order, then difficulty', () => {
  it('sorts by taxonomy order, not alphabetically — Java before Behavioral', () => {
    const sorted = sortQuestions([
      q({ id: 'bh', category: 'Behavioral & Projects', question: 'Tell me about a failure.' }),
      q({ id: 'jv', category: 'Java', question: 'What is a HashMap?' }),
    ])
    expect(sorted.map(x => x.id)).toEqual(['jv', 'bh'])
  })

  it('orders within an area by Learn topic order, then Easy before Hard', () => {
    const sorted = sortQuestions([
      q({ id: 'hard-t1', category: 'Java', difficulty: 'Hard', topicId: 't1' }),
      q({ id: 'easy-t2', category: 'Java', difficulty: 'Easy', topicId: 't2' }),
      q({ id: 'easy-t1', category: 'Java', difficulty: 'Easy', topicId: 't1' }),
      q({ id: 'spring', category: 'Spring & Spring Boot', difficulty: 'Easy', topicId: 't3' }),
    ], ctx)
    // Java area first (t1 before t2, Easy before Hard), then Spring.
    expect(sorted.map(x => x.id)).toEqual(['easy-t1', 'hard-t1', 'easy-t2', 'spring'])
  })

  it('firstUnreviewed is a core technical question, never Behavioral first', () => {
    const qs = [
      q({ id: 'bh', category: 'Behavioral & Projects', question: 'Tell me about a failure.' }),
      q({ id: 'jv', category: 'Java', question: 'What is a HashMap?' }),
    ]
    expect(firstUnreviewed(qs, {}, ctx)?.id).toBe('jv')
    // With the Java question reviewed, the next unreviewed is the behavioural one.
    expect(firstUnreviewed(qs, { jv: 'confident' }, ctx)?.id).toBe('bh')
    // All reviewed: falls back to the first question in display order.
    expect(firstUnreviewed(qs, { jv: 'confident', bh: 'confident' }, ctx)?.id).toBe('jv')
  })
})

describe('grouping by broad area', () => {
  it('puts all Java-related questions in one Java group, in taxonomy order', () => {
    const qs = [
      q({ id: 's', category: 'Java', topicId: 't2' }),
      q({ id: 'c', category: 'Java', topicId: 't1' }),
      q({ id: 'sp', category: 'Spring & Spring Boot', topicId: 't3' }),
      q({ id: 'bh', category: 'Behavioral & Projects', topicId: 't1' }),
    ]
    const groups = groupQuestionsByArea(qs, topics, tracks)
    expect(groups.map(g => g.category)).toEqual(['Java', 'Spring & Spring Boot', 'Behavioral & Projects'])
    expect(groups[0].questions.map(x => x.id)).toEqual(['c', 's'])
    expect(groups[0].topicIds).toEqual(['t1', 't2'])
  })

  it('keeps the Resume category only as its own last group', () => {
    const groups = groupQuestionsByArea(
      [q({ id: 'r', category: 'Resume', module: 'bonus-resume' }), q({ id: 'j', category: 'Java' })],
      topics, tracks,
    )
    expect(groups.map(g => g.category)).toEqual(['Java', 'Resume'])
  })
})

describe('interview filtering and review stats', () => {
  const qs = [
    q({ id: 'a', question: 'What is a HashMap?', category: 'Java', difficulty: 'Easy' }),
    q({ id: 'b', question: 'Explain streams', category: 'Java', difficulty: 'Hard' }),
    q({ id: 'c', question: 'What is a HashSet?', category: 'Java', difficulty: 'Medium' }),
  ]
  const review = { a: 'confident' as const, b: 'needs-review' as const }

  it('filters by text, difficulty, consolidated category and review status', () => {
    expect(filterQuestions(qs, { ...EMPTY_INTERVIEW_FILTERS, query: 'hashmap' }, review, []).map(x => x.id)).toEqual(['a'])
    expect(filterQuestions(qs, { ...EMPTY_INTERVIEW_FILTERS, difficulty: 'Hard' }, review, []).map(x => x.id)).toEqual(['b'])
    expect(filterQuestions(qs, { ...EMPTY_INTERVIEW_FILTERS, category: 'Java' }, review, []).map(x => x.id)).toEqual(['a', 'b', 'c'])
    expect(filterQuestions(qs, { ...EMPTY_INTERVIEW_FILTERS, category: 'Collections' }, review, []).map(x => x.id)).toEqual([])
    expect(filterQuestions(qs, { ...EMPTY_INTERVIEW_FILTERS, review: 'confident' }, review, []).map(x => x.id)).toEqual(['a'])
    expect(filterQuestions(qs, { ...EMPTY_INTERVIEW_FILTERS, review: 'needs-review' }, review, []).map(x => x.id)).toEqual(['b'])
    expect(filterQuestions(qs, { ...EMPTY_INTERVIEW_FILTERS, review: 'not-reviewed' }, review, []).map(x => x.id)).toEqual(['c'])
    expect(filterQuestions(qs, { ...EMPTY_INTERVIEW_FILTERS, review: 'bookmarked' }, review, ['c']).map(x => x.id)).toEqual(['c'])
  })

  it('reviewStats counts reviewed/confident/needs-review/bookmarked', () => {
    expect(reviewStats(qs, review, ['b', 'c'])).toEqual({ total: 3, reviewed: 2, confident: 1, needsReview: 1, bookmarked: 2, pctReviewed: 67 })
  })
})

describe('prev/next within a module in display order', () => {
  it('walks across Learn topics inside the module, in broad-area order', () => {
    const qs = [
      q({ id: 'a', category: 'Java', difficulty: 'Easy', topicId: 't1' }),
      q({ id: 'b', category: 'Java', difficulty: 'Medium', topicId: 't1' }),
      q({ id: 'c', category: 'Java', difficulty: 'Easy', topicId: 't2' }),
      q({ id: 'd', category: 'Spring & Spring Boot', difficulty: 'Easy', topicId: 't3' }),
      q({ id: 'other', category: 'Java', difficulty: 'Easy', topicId: 't1', module: 'module-2' }),
    ]
    // Display order in module-1: a, b, c, d. The module-2 question is not a neighbour.
    expect(prevNextQuestion(qs, 'a', ctx)).toEqual({ prev: undefined, next: qs[1] })
    expect(prevNextQuestion(qs, 'b', ctx).next?.id).toBe('c')
    expect(prevNextQuestion(qs, 'c', ctx)).toEqual({ prev: qs[1], next: qs[3] })
    expect(prevNextQuestion(qs, 'd', ctx)).toEqual({ prev: qs[2], next: undefined })
    expect(prevNextQuestion(qs, 'missing', ctx)).toEqual({ prev: undefined, next: undefined })
  })
})
