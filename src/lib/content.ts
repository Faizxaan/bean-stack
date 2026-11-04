import indexJson from '../generated/content-index.json'
import type { ContentIndex, TopicMeta } from '../types'

// The generated index is the single source of truth for navigation/search.
// It is produced by scripts/build-content-index.mjs from content/ files.
export const contentIndex = indexJson as unknown as ContentIndex

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
