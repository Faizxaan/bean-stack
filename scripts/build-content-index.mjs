import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseMarkdownFile, walk, readingMinutes } from './frontmatter.mjs'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const contentRoot = path.join(root, 'content')
const outDir = path.join(root, 'src', 'generated')
const outFile = path.join(outDir, 'content-index.json')

function readJson(p, fallback) {
  try { return JSON.parse(fs.readFileSync(p, 'utf8')) } catch { return fallback }
}

const tracks = readJson(path.join(contentRoot, 'tracks.json'), [])
const paths = readJson(path.join(contentRoot, 'paths.json'), [])

// Topics: content/topics/<track>/<section>/<file>.md
const topicFiles = walk(path.join(contentRoot, 'topics')).filter(f => f.endsWith('.md'))
const topics = []
for (const file of topicFiles) {
  const rel = path.relative(contentRoot, file).replace(/\\/g, '/')
  const { data, body, error } = parseMarkdownFile(file)
  if (error || !data) continue
  topics.push({
    id: data.id,
    title: data.title,
    track: data.track,
    section: data.section,
    order: data.order ?? 999,
    difficulty: data.difficulty || 'Intermediate',
    importance: data.importance ?? 3,
    tags: data.tags || [],
    prerequisites: data.prerequisites || [],
    related: data.related || [],
    status: data.status || 'draft',
    lastUpdated: data.lastUpdated || null,
    file: rel,
    readingMinutes: readingMinutes(body),
    summary: data.summary || '',
  })
}
topics.sort((a, b) => (a.track === b.track ? (a.section === b.section ? a.order - b.order : a.section.localeCompare(b.section)) : a.track.localeCompare(b.track)))

// Cheatsheets: content/cheatsheets/*.md
const cheatsheets = []
for (const file of walk(path.join(contentRoot, 'cheatsheets')).filter(f => f.endsWith('.md'))) {
  const rel = path.relative(contentRoot, file).replace(/\\/g, '/')
  const { data, body } = parseMarkdownFile(file)
  if (!data) continue
  cheatsheets.push({ id: data.id, title: data.title, track: data.track || null, category: data.category || 'General', status: data.status || 'draft', file: rel, readingMinutes: readingMinutes(body), summary: data.summary || '' })
}

// Interview + practice: JSON files under content/interview and content/practice
function loadJsonDir(dir) {
  const items = []
  for (const file of walk(dir).filter(f => f.endsWith('.json'))) {
    try {
      const data = JSON.parse(fs.readFileSync(file, 'utf8'))
      if (Array.isArray(data)) items.push(...data)
      else if (Array.isArray(data.questions)) items.push(...data.questions)
      else if (Array.isArray(data.items)) items.push(...data.items)
      else items.push(data)
    } catch (e) { console.error(`Failed to parse ${file}: ${e.message}`) }
  }
  return items
}
const interviewQuestions = loadJsonDir(path.join(contentRoot, 'interview'))
const practiceItems = loadJsonDir(path.join(contentRoot, 'practice'))

const index = {
  generatedAt: new Date().toISOString(),
  tracks,
  paths,
  topics,
  cheatsheets,
  interviewQuestions,
  practiceItems,
}

fs.mkdirSync(outDir, { recursive: true })
fs.writeFileSync(outFile, JSON.stringify(index, null, 2) + '\n')
console.log(`Wrote ${outFile}: ${topics.length} topics, ${cheatsheets.length} cheatsheets, ${interviewQuestions.length} interview questions, ${practiceItems.length} practice items, ${tracks.length} tracks, ${paths.length} paths`)
