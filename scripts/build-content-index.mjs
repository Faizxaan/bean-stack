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
// One-minute revision prompts: moved out of content/interview in the
// 2026-11-12 second pass (they were Module 0, category Revision — recap
// prompts, not interview questions). They live in content/revision so
// the interview index, counts, filters and progress never see them, but
// the prompts themselves are kept, with the same ids, and lazy-loaded
// for the Revision & Cheatsheets page (see src/lib/content.ts).
const revisionPrompts = loadJsonDir(path.join(contentRoot, 'revision'))

// Split index (2026-11-09 chunk fix): the full interview + practice
// bodies are ~850 KB of the ~1 MB index, and inlining them in the app
// bundle pushed the initial chunk to ~1.15 MB, over the 800 KB warning
// limit. So the app loads only a slim navigation index up front, and
// lazy-loads the two heavy files on demand (see src/lib/content.ts).
// The slim index keeps id-only lists so import validation and
// LocalStorage sanitisation still work without the full text.
const generatedAt = new Date().toISOString()
const index = {
  generatedAt,
  tracks,
  paths,
  topics,
  cheatsheets,
  interviewQuestionIds: interviewQuestions.map(q => q.id),
  revisionPromptIds: revisionPrompts.map(q => q.id),
  practiceItemIds: practiceItems.map(i => i.id),
}
const interviewFile = path.join(outDir, 'content-interview.json')
const revisionFile = path.join(outDir, 'content-revision.json')
const practiceFile = path.join(outDir, 'content-practice.json')

fs.mkdirSync(outDir, { recursive: true })
fs.writeFileSync(outFile, JSON.stringify(index, null, 2) + '\n')
fs.writeFileSync(interviewFile, JSON.stringify({ generatedAt, interviewQuestions }, null, 2) + '\n')
fs.writeFileSync(revisionFile, JSON.stringify({ generatedAt, revisionPrompts }, null, 2) + '\n')
fs.writeFileSync(practiceFile, JSON.stringify({ generatedAt, practiceItems }, null, 2) + '\n')
console.log(`Wrote ${outFile}: ${topics.length} topics, ${cheatsheets.length} cheatsheets, ${interviewQuestions.length} interview question ids, ${revisionPrompts.length} revision prompt ids, ${practiceItems.length} practice item ids, ${tracks.length} tracks, ${paths.length} paths`)
console.log(`Wrote ${interviewFile}: ${interviewQuestions.length} interview questions`)
console.log(`Wrote ${revisionFile}: ${revisionPrompts.length} revision prompts`)
console.log(`Wrote ${practiceFile}: ${practiceItems.length} practice items`)
