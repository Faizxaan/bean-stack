import type { InterviewQuestion, TopicMeta, Track } from '../types'
import { normalizeSearchQuery } from './utils'

// Pure Interview Prep logic, kept out of the page component so it can
// be unit-tested without rendering. No content is changed here — this
// only groups, sorts, filters, and navigates the questions as they are.

export interface InterviewModuleMeta {
  id: string
  title: string
  level: string
  description: string
  isResume?: boolean
}

export const INTERVIEW_MODULES: InterviewModuleMeta[] = [
  {
    id: 'module-0',
    title: 'Module 0 — Revision Notes',
    level: 'Optional · all levels',
    description: 'One-minute revision of the essentials — JDK/JVM, OOP, collections, streams, Spring, SQL — before you go deeper.',
  },
  {
    id: 'module-1',
    title: 'Module 1 — 0–3 years',
    level: '0–3 years',
    description: 'First-job interviews: Core Java, collections, streams, Spring Boot basics, SQL and coding fundamentals.',
  },
  {
    id: 'module-2',
    title: 'Module 2 — 3–5 years',
    level: '3–5 years',
    description: 'Mid-level interviews: deeper Java, concurrency, Spring internals, JPA, microservices and real scenarios.',
  },
  {
    id: 'module-3',
    title: 'Module 3 — 5–8 years',
    level: '5–8 years',
    description: 'Senior interviews: design, trade-offs, scaling, security, Kafka and leading a technical discussion.',
  },
  {
    id: 'module-4',
    title: 'Module 4 — 8–15 years',
    level: '8–15 years',
    description: 'Staff / lead interviews: architecture, system design, and leading people and projects through hard calls.',
  },
  {
    id: 'bonus-resume',
    title: 'Bonus — Resume Tips & Templates',
    level: 'Resume',
    description: 'How to write a resume that gets interviews — structure, impact bullets, ATS, and templates by experience band.',
    isResume: true,
  },
]

export function moduleMeta(id: string): InterviewModuleMeta | undefined {
  return INTERVIEW_MODULES.find(m => m.id === id)
}

export const DIFFICULTY_RANK: Record<string, number> = { Easy: 0, Medium: 1, Hard: 2 }

export function sortQuestions(questions: InterviewQuestion[]): InterviewQuestion[] {
  return [...questions].sort((a, b) => {
    const cat = (a.category || '').localeCompare(b.category || '')
    if (cat !== 0) return cat
    const diff = (DIFFICULTY_RANK[a.difficulty] ?? 99) - (DIFFICULTY_RANK[b.difficulty] ?? 99)
    if (diff !== 0) return diff
    return (a.question || '').localeCompare(b.question || '')
  })
}

export interface CategoryGroup {
  category: string
  questions: InterviewQuestion[]
}

export interface TopicGroup {
  topicId: string
  topicTitle: string
  trackId: string
  trackTitle: string
  questions: InterviewQuestion[]
  categories: CategoryGroup[]
}

export function groupQuestionsByTopic(
  questions: InterviewQuestion[],
  topics: TopicMeta[],
  tracks: Track[],
): TopicGroup[] {
  const topicById = new Map(topics.map(t => [t.id, t]))
  const trackOrder = new Map(tracks.map((t, i) => [t.id, i]))
  const trackById = new Map(tracks.map(t => [t.id, t]))
  const byTopic = new Map<string, InterviewQuestion[]>()
  for (const q of questions) {
    const key = q.topicId || 'general'
    if (!byTopic.has(key)) byTopic.set(key, [])
    byTopic.get(key)!.push(q)
  }
  const groups: TopicGroup[] = [...byTopic.entries()].map(([topicId, qs]) => {
    const topic = topicById.get(topicId)
    const sorted = sortQuestions(qs)
    const catMap = new Map<string, InterviewQuestion[]>()
    for (const q of sorted) {
      const cat = q.category || 'General'
      if (!catMap.has(cat)) catMap.set(cat, [])
      catMap.get(cat)!.push(q)
    }
    return {
      topicId,
      topicTitle: topic ? topic.title : 'General',
      trackId: topic ? topic.track : '',
      trackTitle: topic ? (trackById.get(topic.track)?.title || topic.track) : '',
      questions: sorted,
      categories: [...catMap.entries()].map(([category, list]) => ({ category, questions: list })),
    }
  })
  return groups.sort((a, b) => {
    const ta = trackOrder.get(a.trackId) ?? 999
    const tb = trackOrder.get(b.trackId) ?? 999
    if (ta !== tb) return ta - tb
    return a.topicTitle.localeCompare(b.topicTitle)
  })
}

export type ReviewFilter = 'all' | 'confident' | 'needs-review' | 'not-reviewed' | 'bookmarked'

export interface InterviewFilters {
  query: string
  difficulty: string
  category: string
  review: ReviewFilter
}

export const EMPTY_INTERVIEW_FILTERS: InterviewFilters = {
  query: '',
  difficulty: 'all',
  category: 'all',
  review: 'all',
}

export function filterQuestions(
  questions: InterviewQuestion[],
  filters: InterviewFilters,
  review: Record<string, 'confident' | 'needs-review'>,
  bookmarked: string[],
): InterviewQuestion[] {
  const q = normalizeSearchQuery(filters.query)
  const bookmarkSet = new Set(bookmarked)
  return questions.filter(item => {
    if (filters.difficulty !== 'all' && item.difficulty !== filters.difficulty) return false
    if (filters.category !== 'all' && item.category !== filters.category) return false
    const status = review[item.id]
    if (filters.review === 'confident' && status !== 'confident') return false
    if (filters.review === 'needs-review' && status !== 'needs-review') return false
    if (filters.review === 'not-reviewed' && status) return false
    if (filters.review === 'bookmarked' && !bookmarkSet.has(item.id)) return false
    if (q) {
      const hay = normalizeSearchQuery(`${item.question} ${item.shortAnswer || ''} ${item.title || ''} ${item.category || ''}`)
      if (!hay.includes(q)) return false
    }
    return true
  })
}

export interface ReviewStats {
  total: number
  reviewed: number
  confident: number
  needsReview: number
  bookmarked: number
  pctReviewed: number
}

export function reviewStats(
  questions: InterviewQuestion[],
  review: Record<string, 'confident' | 'needs-review'>,
  bookmarked: string[],
): ReviewStats {
  const bookmarkSet = new Set(bookmarked)
  let reviewed = 0
  let confident = 0
  let needsReview = 0
  let bookmarkedCount = 0
  for (const q of questions) {
    const status = review[q.id]
    if (status === 'confident') { reviewed += 1; confident += 1 }
    else if (status === 'needs-review') { reviewed += 1; needsReview += 1 }
    if (bookmarkSet.has(q.id)) bookmarkedCount += 1
  }
  const total = questions.length
  return { total, reviewed, confident, needsReview, bookmarked: bookmarkedCount, pctReviewed: total ? Math.round((reviewed / total) * 100) : 0 }
}

/** First question the user has not reviewed yet (for Start / Continue), else the first question. */
export function firstUnreviewed(
  questions: InterviewQuestion[],
  review: Record<string, 'confident' | 'needs-review'>,
): InterviewQuestion | undefined {
  const sorted = sortQuestions(questions)
  return sorted.find(q => !review[q.id]) || sorted[0]
}

/** Previous / next question within the same topic group, in display order. */
export function prevNextQuestion(
  allQuestions: InterviewQuestion[],
  currentId: string,
): { prev: InterviewQuestion | undefined; next: InterviewQuestion | undefined } {
  const current = allQuestions.find(q => q.id === currentId)
  if (!current) return { prev: undefined, next: undefined }
  const group = sortQuestions(allQuestions.filter(q => (q.topicId || 'general') === (current.topicId || 'general')))
  const idx = group.findIndex(q => q.id === currentId)
  return { prev: idx > 0 ? group[idx - 1] : undefined, next: idx >= 0 && idx < group.length - 1 ? group[idx + 1] : undefined }
}
