import type { PracticeAttempt, TopicMeta, UserData } from '../types'

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
  const byTopic = new Map<string, { correct: number; total: number }>()
  const itemTopic = new Map(items.map(i => [i.id, i.topicId || 'general']))
  for (const a of attempts) {
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

export function studyStreak(activityDates: string[]): number {
  const set = new Set(activityDates)
  let streak = 0
  const d = new Date()
  // If today has no activity yet, streak counts up to yesterday
  const fmt = (x: Date) => x.toISOString().slice(0, 10)
  if (!set.has(fmt(d))) d.setDate(d.getDate() - 1)
  while (set.has(fmt(d))) {
    streak += 1
    d.setDate(d.getDate() - 1)
  }
  return streak
}

// Leitner: box 1 = 1 day, 2 = 3 days, 3 = 7 days, 4 = 14 days, 5 = 30 days
export const LEITNER_INTERVALS = [0, 1, 3, 7, 14, 30]
export function nextDueDate(box: number, from = new Date()): string {
  const days = LEITNER_INTERVALS[Math.min(Math.max(box, 1), 5)] || 1
  const d = new Date(from)
  d.setDate(d.getDate() + days)
  return d.toISOString()
}
export function isDue(dueAt: string, now = new Date()): boolean {
  return new Date(dueAt).getTime() <= now.getTime()
}

export function searchScore(query: string, haystack: string): number {
  const q = query.toLowerCase().trim()
  if (!q) return 0
  const h = haystack.toLowerCase()
  if (h === q) return 100
  if (h.startsWith(q)) return 80
  if (h.includes(q)) return 50
  const words = q.split(/\s+/)
  const matched = words.filter(w => h.includes(w)).length
  return words.length ? Math.round((matched / words.length) * 40) : 0
}

export function validateImport(data: unknown, knownTopicIds: Set<string>, knownQuestionIds: Set<string>): { ok: boolean; errors: string[] } {
  const errors: string[] = []
  if (!data || typeof data !== 'object') return { ok: false, errors: ['Imported data is not an object'] }
  const d = data as Record<string, unknown>
  if (d.schemaVersion !== 1 && d.schemaVersion !== undefined) errors.push(`Unsupported schema version: ${String(d.schemaVersion)}`)
  const checkIds = (label: string, list: unknown, known: Set<string>) => {
    if (list === undefined) return
    if (!Array.isArray(list)) { errors.push(`${label} must be an array`); return }
    for (const id of list) if (typeof id === 'string' && !known.has(id)) errors.push(`${label} references unknown id: ${id}`)
  }
  if (d.progress && typeof d.progress === 'object') {
    for (const id of Object.keys(d.progress as Record<string, unknown>)) if (!knownTopicIds.has(id)) errors.push(`progress references unknown topic: ${id}`)
  }
  checkIds('bookmarks', d.bookmarks, knownTopicIds)
  checkIds('favorites', d.favorites, knownTopicIds)
  checkIds('questionBookmarks', d.questionBookmarks, knownQuestionIds)
  if (d.notes && typeof d.notes === 'object') {
    for (const id of Object.keys(d.notes as Record<string, unknown>)) if (!knownTopicIds.has(id)) errors.push(`notes references unknown topic: ${id}`)
  }
  return { ok: errors.length === 0, errors }
}

export function safeJsonParse<T>(text: string | null, fallback: T): T {
  if (!text) return fallback
  try { return JSON.parse(text) as T } catch { return fallback }
}

export function todayIso(): string {
  return new Date().toISOString().slice(0, 10)
}

export function topicUrl(topic: TopicMeta): string {
  return `/learn/${topic.track}/${topic.section}/${topic.id}`
}

export function formatDate(iso: string | null): string {
  if (!iso) return '—'
  try { return new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) } catch { return iso }
}

export type { UserData }
