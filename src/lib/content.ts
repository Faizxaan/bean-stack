import { useEffect, useState } from 'react'
import indexJson from '../generated/content-index.json'
import type { InterviewQuestion, NavContentIndex, PracticeItem, RevisionPrompt, TopicMeta } from '../types'

// The generated SLIM index is the single source of truth for
// navigation/search. It is produced by scripts/build-content-index.mjs
// from content/ files. It carries tracks, paths, topics and cheatsheets
// (about 80 KB) plus id-only lists for interview questions and practice
// items. The full interview/practice bodies live in separate generated
// files and are lazy-loaded below — inlining them made the initial
// bundle ~1.15 MB and tripped the 800 KB chunk-size warning.
export const contentIndex = indexJson as unknown as NavContentIndex

// Interview-only total from the slim index: all interview entries minus
// the bonus-resume entries (resume help, not interview questions). Same
// rule as interviewQuestionsOnly() in lib/interview.ts, applied to the
// id lists the index builder pre-splits. Home must use this, not
// interviewQuestionIds.length — that list holds every entry, bonus
// included. No count is hardcoded here; both lists come from the
// generated index. The `?? []` guards a stale generated index built
// before the bonus list existed.
export function interviewOnlyQuestionCount(): number {
  return contentIndex.interviewQuestionIds.length - (contentIndex.bonusResumeQuestionIds ?? []).length
}

// Lazy loaders for the heavy content. Each dynamic import becomes its
// own Vite chunk, fetched only when a page that needs it is visited
// (Interview, Practice, Library, Search, or the command palette).
// The promises are cached, so repeated calls return the same array
// and never re-fetch.
let interviewPromise: Promise<InterviewQuestion[]> | null = null
export function loadInterviewQuestions(): Promise<InterviewQuestion[]> {
  if (!interviewPromise) {
    interviewPromise = import('../generated/content-interview.json').then(
      m => (m.default as { interviewQuestions: InterviewQuestion[] }).interviewQuestions
    )
  }
  return interviewPromise
}

let practicePromise: Promise<PracticeItem[]> | null = null
export function loadPracticeItems(): Promise<PracticeItem[]> {
  if (!practicePromise) {
    practicePromise = import('../generated/content-practice.json').then(
      m => (m.default as { practiceItems: PracticeItem[] }).practiceItems
    )
  }
  return practicePromise
}

// One-minute revision prompts (former Module 0, content/revision).
// Same lazy pattern as interview/practice: a separate chunk fetched
// only by Revision & Cheatsheets, Search, the palette, and Library.
let revisionPromise: Promise<RevisionPrompt[]> | null = null
export function loadRevisionPrompts(): Promise<RevisionPrompt[]> {
  if (!revisionPromise) {
    revisionPromise = import('../generated/content-revision.json').then(
      m => (m.default as { revisionPrompts: RevisionPrompt[] }).revisionPrompts
    )
  }
  return revisionPromise
}

export function loadFullContent(): Promise<{ interviewQuestions: InterviewQuestion[]; practiceItems: PracticeItem[] }> {
  return Promise.all([loadInterviewQuestions(), loadPracticeItems()]).then(
    ([interviewQuestions, practiceItems]) => ({ interviewQuestions, practiceItems })
  )
}

// React hooks over the lazy loaders. `loaded` is false until the chunk
// arrives; pages must show a loading state in that window instead of
// an empty state, so a slow load is never mistaken for "no content".
export function useInterviewQuestions(enabled = true) {
  const [questions, setQuestions] = useState<InterviewQuestion[]>([])
  const [loaded, setLoaded] = useState(false)
  useEffect(() => {
    if (!enabled) return
    let live = true
    loadInterviewQuestions()
      .then(q => { if (live) { setQuestions(q); setLoaded(true) } })
      .catch(() => { if (live) setLoaded(true) })
    return () => { live = false }
  }, [enabled])
  return { questions, loaded }
}

export function usePracticeItems(enabled = true) {
  const [items, setItems] = useState<PracticeItem[]>([])
  const [loaded, setLoaded] = useState(false)
  useEffect(() => {
    if (!enabled) return
    let live = true
    loadPracticeItems()
      .then(p => { if (live) { setItems(p); setLoaded(true) } })
      .catch(() => { if (live) setLoaded(true) })
    return () => { live = false }
  }, [enabled])
  return { items, loaded }
}

export function useRevisionPrompts(enabled = true) {
  const [prompts, setPrompts] = useState<RevisionPrompt[]>([])
  const [loaded, setLoaded] = useState(false)
  useEffect(() => {
    if (!enabled) return
    let live = true
    loadRevisionPrompts()
      .then(p => { if (live) { setPrompts(p); setLoaded(true) } })
      .catch(() => { if (live) setLoaded(true) })
    return () => { live = false }
  }, [enabled])
  return { prompts, loaded }
}

export function useFullContent(enabled = true) {
  const { questions: interviewQuestions, loaded: interviewLoaded } = useInterviewQuestions(enabled)
  const { items: practiceItems, loaded: practiceLoaded } = usePracticeItems(enabled)
  return { interviewQuestions, practiceItems, loaded: interviewLoaded && practiceLoaded }
}

export function getTopic(id: string): TopicMeta | undefined {
  return contentIndex.topics.find(t => t.id === id)
}
export function getTrack(id: string) {
  return contentIndex.tracks.find(t => t.id === id)
}
export function topicsForTrack(trackId: string) {
  return contentIndex.topics.filter(t => t.track === trackId).sort((a, b) => a.order - b.order)
}
export function topicsForSection(trackId: string, sectionId: string) {
  return contentIndex.topics.filter(t => t.track === trackId && t.section === sectionId).sort((a, b) => a.order - b.order)
}
export function orderedTopics(trackId?: string) {
  const list = trackId ? topicsForTrack(trackId) : [...contentIndex.topics]
  // Keep section order as defined in tracks.json, then topic order
  const track = trackId ? getTrack(trackId) : undefined
  if (!track) return list.sort((a, b) => a.order - b.order)
  const sectionOrder = new Map(track.sections.map((s, i) => [s.id, i]))
  return list.sort((a, b) => {
    const sa = sectionOrder.get(a.section) ?? 999
    const sb = sectionOrder.get(b.section) ?? 999
    return sa === sb ? a.order - b.order : sa - sb
  })
}
export function prevNextTopic(topic: TopicMeta) {
  const list = orderedTopics(topic.track)
  const idx = list.findIndex(t => t.id === topic.id)
  return { prev: idx > 0 ? list[idx - 1] : undefined, next: idx >= 0 && idx < list.length - 1 ? list[idx + 1] : undefined }
}

// Lazy Markdown bodies: Vite code-splits each content file.
// Files live in /content (repo root), separate from UI code in /src.
const mdModules = import.meta.glob('/content/**/*.md', { query: '?raw', import: 'default' }) as Record<string, () => Promise<string>>

export async function loadTopicBody(topic: TopicMeta): Promise<string> {
  const key = `/content/${topic.file.replace(/^topics\//, 'topics/').replace(/^content\//, '')}`
  // topic.file is like "topics/java/core-java/xyz.md" (relative to content/)
  const candidates = [
    `/content/${topic.file}`,
    `/content/topics/${topic.file}`,
  ]
  for (const c of candidates) {
    const loader = mdModules[c]
    if (loader) return loader()
  }
  // Fallback: search by filename
  const filename = topic.file.split('/').pop()
  const found = Object.keys(mdModules).find(k => k.endsWith(`/${filename}`))
  if (found) return mdModules[found]()
  throw new Error(`Content file not found for topic ${topic.id} (looked for ${key})`)
}

export async function loadCheatsheetBody(file: string): Promise<string> {
  const loader = mdModules[`/content/${file}`]
  if (loader) return loader()
  const filename = file.split('/').pop()
  const found = Object.keys(mdModules).find(k => k.endsWith(`/${filename}`))
  if (found) return mdModules[found]()
  throw new Error(`Cheatsheet file not found: ${file}`)
}

// Strip frontmatter from a raw markdown body for display
export function stripFrontmatter(raw: string): string {
  return raw.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n/, '')
}

// Extract a section body by heading (## Heading) from markdown
export function extractSection(body: string, heading: string): string | null {
  const lines = body.split('\n')
  let start = -1
  let end = lines.length
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].trim() === `## ${heading}`) { start = i + 1; continue }
    if (start >= 0 && /^##\s/.test(lines[i])) { end = i; break }
  }
  if (start < 0) return null
  return lines.slice(start, end).join('\n').trim()
}
