import type { InterviewQuestion, TopicMeta, Track } from '../types'
import { normalizeSearchQuery } from './utils'

// Pure Interview Prep logic, kept out of the page component so it can
// be unit-tested without rendering. No content is changed here — this
// only groups, sorts, filters, and navigates the questions as they are.
//
// Second pass (2026-11-12): Module 0 is gone from Interview Prep (its
// 37 one-minute prompts moved to content/revision and render under
// Revision & Cheatsheets). The old 26 categories are consolidated into
// 11 broad areas, questions are grouped by broad area (not by
// individual Learn topics), and ordering is learning order, not
// alphabetical by category.

export interface InterviewModuleMeta {
  id: string
  title: string
  level: string
  description: string
  isResume?: boolean
}

export const INTERVIEW_MODULES: InterviewModuleMeta[] = [
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

// A bonus-resume entry is resume help, not an interview question: its
// module is flagged isResume above. Progress totals and percentages
// must count interview questions only (see interviewQuestionsOnly),
// never the bonus-resume entries — the Bonus card keeps its own count.
export function isResumeEntry(q: InterviewQuestion): boolean {
  return moduleMeta(q.module)?.isResume === true
}

/** Interview questions only: everything except the bonus-resume entries. */
export function interviewQuestionsOnly(questions: InterviewQuestion[]): InterviewQuestion[] {
  return questions.filter(q => !isResumeEntry(q))
}

// The consolidated taxonomy (2026-11-12 second pass): 26 old categories
// collapsed to 10 broad areas, plus an 11th — 'Kafka & Redis' — added
// 2026-11-14 for the questions whose Learn topic lives in the Kafka &
// Redis track (topicIds kafka-spring-boot, spring-cache-redis). Order
// matters — it is the display order of the areas inside a module, and
// the first area (Java) is where "next unreviewed" starts, so a
// behavioural question can never come first in Module 1 again. The
// full old -> new mapping with counts is in DECISIONS.md; the mapping
// itself lives in the content files (only the `category` field was
// re-labelled, nothing else).
export const INTERVIEW_CATEGORIES = [
  'Java',
  'Spring & Spring Boot',
  'Kafka & Redis',
  'Microservices',
  'SQL & Databases',
  'System Design',
  'DSA & Coding',
  'Frontend',
  'DevOps & Cloud',
  'Testing',
  'Behavioral & Projects',
] as const

export type InterviewCategory = (typeof INTERVIEW_CATEGORIES)[number]

// 'Resume' is not an interview area: it is the category of the 12
// bonus-resume items, which are templates, not interview questions.
// It sorts after every real area and only ever appears in that module.
export const RESUME_CATEGORY = 'Resume'

const CATEGORY_RANK = new Map<string, number>([
  ...INTERVIEW_CATEGORIES.map((c, i) => [c, i] as [string, number]),
  [RESUME_CATEGORY, INTERVIEW_CATEGORIES.length],
])

export function categoryRank(category: string | undefined): number {
  if (!category) return INTERVIEW_CATEGORIES.length + 1
  return CATEGORY_RANK.get(category) ?? INTERVIEW_CATEGORIES.length + 1
}

export function isInterviewCategory(category: string | undefined): category is InterviewCategory {
  return category !== undefined && (INTERVIEW_CATEGORIES as readonly string[]).includes(category)
}

/** URL/anchor slug for a broad area, e.g. 'Spring & Spring Boot' -> 'spring-and-spring-boot'. */
export function areaSlug(category: string): string {
  return category
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

export const DIFFICULTY_RANK: Record<string, number> = { Easy: 0, Medium: 1, Hard: 2 }

/** Learning order of a Learn topic: track order, then section order within
 * the track, then the topic's own order. Unknown topics sort last. */
export interface SortContext {
  topics: TopicMeta[]
  tracks: Track[]
}

export function topicRankMap(ctx: SortContext): Map<string, number> {
  const trackOrder = new Map(ctx.tracks.map((t, i) => [t.id, i]))
  const sectionOrder = new Map<string, number>()
  for (const t of ctx.tracks) t.sections.forEach((s, i) => sectionOrder.set(`${t.id}|${s.id}`, i))
  const ranks = new Map<string, number>()
  for (const topic of ctx.topics) {
    const trackIdx = trackOrder.get(topic.track) ?? 999
    const sectionIdx = sectionOrder.get(`${topic.track}|${topic.section}`) ?? 999
    ranks.set(topic.id, trackIdx * 1_000_000 + sectionIdx * 1_000 + (topic.order ?? 999))
  }
  return ranks
}

/**
 * Display order inside a module and inside a broad area: broad area
 * (taxonomy order), then the question's Learn topic in learning order,
 * then difficulty Easy -> Medium -> Hard, then question text as
 * tie-break. NOT alphabetical by category and NOT file order — the old
 * alphabetical sort put Behavioral first, so Module 1's "next
 * unreviewed" was a behavioural question.
 */
export function sortQuestions(questions: InterviewQuestion[], ctx?: SortContext): InterviewQuestion[] {
  const ranks = ctx ? topicRankMap(ctx) : undefined
  return [...questions].sort((a, b) => {
    const cat = categoryRank(a.category) - categoryRank(b.category)
    if (cat !== 0) return cat
    if (ranks) {
      const ra = ranks.get(a.topicId || '') ?? Number.MAX_SAFE_INTEGER
      const rb = ranks.get(b.topicId || '') ?? Number.MAX_SAFE_INTEGER
      if (ra !== rb) return ra - rb
    }
    const diff = (DIFFICULTY_RANK[a.difficulty] ?? 99) - (DIFFICULTY_RANK[b.difficulty] ?? 99)
    if (diff !== 0) return diff
    return (a.question || '').localeCompare(b.question || '')
  })
}

export interface AreaGroup {
  category: string
  questions: InterviewQuestion[]
  /** Distinct Learn topic ids in display order, for the small sub-labels. */
  topicIds: string[]
}

/**
 * Group by broad area (= consolidated category), in taxonomy order.
 * Inside an area, questions are in display order (see sortQuestions);
 * the original Learn topic is only a small sub-label on the question
 * card / a sub-heading when the topic changes — never a separate
 * collapsible section. (The old groupQuestionsByTopic grouped by
 * individual Learn topics; that is what made the module view a wall
 * of tiny sections.)
 */
export function groupQuestionsByArea(
  questions: InterviewQuestion[],
  topics: TopicMeta[],
  tracks: Track[],
): AreaGroup[] {
  const ctx: SortContext = { topics, tracks }
  const sorted = sortQuestions(questions, ctx)
  const byArea = new Map<string, InterviewQuestion[]>()
  for (const q of sorted) {
    const cat = q.category || 'General'
    if (!byArea.has(cat)) byArea.set(cat, [])
    byArea.get(cat)!.push(q)
  }
  return [...byArea.entries()]
    .sort(([a], [b]) => categoryRank(a) - categoryRank(b))
    .map(([category, list]) => ({
      category,
      questions: list,
      topicIds: [...new Set(list.map(q => q.topicId).filter((t): t is string => Boolean(t)))],
    }))
}

export type ReviewFilter = 'all' | 'confident' | 'needs-review' | 'not-reviewed' | 'bookmarked'

export interface InterviewFilters {
  query: string
  difficulty: string
  category: string
  review: ReviewFilter
  // Batch 3 (2026-11-13): sub-filter by the Learn topic the question
  // belongs to (its topicId — no new taxonomy). 'all' is no filter;
  // 'general' is questions with no Learn topic (today: the 12
  // bonus-resume entries). The page derives the option list from the
  // questions in scope, in learning order, so it never offers a topic
  // with zero questions in the current module/area.
  topic: string
}

export const EMPTY_INTERVIEW_FILTERS: InterviewFilters = {
  query: '',
  difficulty: 'all',
  category: 'all',
  review: 'all',
  topic: 'all',
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
    if (filters.topic === 'general' && item.topicId) return false
    if (filters.topic !== 'all' && filters.topic !== 'general' && item.topicId !== filters.topic) return false
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

/** First question the user has not reviewed yet (for Start / Continue), else the first question.
 *  In display order, so it is a core technical question — never a
 *  behavioural question first in Module 1. */
export function firstUnreviewed(
  questions: InterviewQuestion[],
  review: Record<string, 'confident' | 'needs-review'>,
  ctx?: SortContext,
): InterviewQuestion | undefined {
  const sorted = sortQuestions(questions, ctx)
  return sorted.find(q => !review[q.id]) || sorted[0]
}

/** Previous / next question within the same module, in display order
 * (broad area -> learning order -> difficulty). The old version walked
 * only within the same Learn topic, which no longer matches the
 * broad-area grouping the page shows. */
export function prevNextQuestion(
  allQuestions: InterviewQuestion[],
  currentId: string,
  ctx?: SortContext,
): { prev: InterviewQuestion | undefined; next: InterviewQuestion | undefined } {
  const current = allQuestions.find(q => q.id === currentId)
  if (!current) return { prev: undefined, next: undefined }
  const group = sortQuestions(allQuestions.filter(q => q.module === current.module), ctx)
  const idx = group.findIndex(q => q.id === currentId)
  return { prev: idx > 0 ? group[idx - 1] : undefined, next: idx >= 0 && idx < group.length - 1 ? group[idx + 1] : undefined }
}
