import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseMarkdownFile, walk } from './frontmatter.mjs'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const contentRoot = path.join(root, 'content')
let errors = []
let warnings = []
function err(msg) { errors.push(msg) }
function warn(msg) { warnings.push(msg) }

const tracks = (() => { try { return JSON.parse(fs.readFileSync(path.join(contentRoot, 'tracks.json'), 'utf8')) } catch { err('tracks.json missing or invalid'); return [] } })()
const trackIds = new Set(tracks.map(t => t.id))
const sectionIds = new Set()
for (const t of tracks) {
  if (!t.id || !t.title) err(`Track missing id/title: ${JSON.stringify(t)}`)
  for (const s of t.sections || []) {
    if (!s.id || !s.title) err(`Section missing id/title in track ${t.id}`)
    if (sectionIds.has(s.id)) err(`Duplicate section id ${s.id} (also in another track)`)
    sectionIds.add(s.id)
    if (s.track && s.track !== t.id) warn(`Section ${s.id} track field mismatch`)
  }
  if (t.status && !['complete', 'placeholder', 'draft'].includes(t.status)) err(`Track ${t.id} has invalid status ${t.status}`)
}

// Topics
const topicFiles = walk(path.join(contentRoot, 'topics')).filter(f => f.endsWith('.md'))
const topicIds = new Map()
const topicOrders = new Set()
const requiredSections = ['Overview']
for (const file of topicFiles) {
  const rel = path.relative(contentRoot, file)
  const { data, body, error } = parseMarkdownFile(file)
  if (error) { err(`${rel}: ${error}`); continue }
  if (!data) { err(`${rel}: no frontmatter data`); continue }
  for (const f of ['id', 'title', 'track', 'section', 'status']) {
    if (!data[f]) err(`${rel}: missing metadata ${f}`)
  }
  if (data.id) {
    if (topicIds.has(data.id)) err(`Duplicate topic id ${data.id} in ${rel} and ${topicIds.get(data.id)}`)
    else topicIds.set(data.id, rel)
  }
  if (data.track && !trackIds.has(data.track)) err(`${rel}: unknown track ${data.track}`)
  if (data.section && !sectionIds.has(data.section)) err(`${rel}: unknown section ${data.section}`)
  if (data.status && !['complete', 'placeholder', 'draft'].includes(data.status)) err(`${rel}: invalid status ${data.status}`)
  if (data.importance !== undefined && (data.importance < 1 || data.importance > 5)) err(`${rel}: importance must be 1-5`)
  {
    // Frontmatter parsers may return lastUpdated as a Date object, not a string.
    const lu = data.lastUpdated instanceof Date ? data.lastUpdated.toISOString().slice(0, 10) : String(data.lastUpdated ?? '')
    if (!/^\d{4}-\d{2}-\d{2}$/.test(lu)) err(`${rel}: missing or invalid lastUpdated (expected YYYY-MM-DD)`)
  }
  if (data.track && data.section && data.order !== undefined) {
    const orderKey = `${data.track}|${data.section}|${data.order}`
    if (topicOrders.has(orderKey)) err(`${rel}: duplicate topic order ${data.order} in ${data.track}/${data.section}`)
    topicOrders.add(orderKey)
  }
  if (!body || body.trim().length < 50) err(`${rel}: body too short / empty required content`)
  for (const s of requiredSections) {
    if (!new RegExp(`^## ${s}`, 'm').test(body)) err(`${rel}: missing required section ## ${s}`)
  }
  // Check prerequisites / related after collecting all ids (second pass below)
}
// Second pass for refs
for (const file of topicFiles) {
  const rel = path.relative(contentRoot, file)
  const { data } = parseMarkdownFile(file)
  if (!data) continue
  for (const ref of data.prerequisites || []) {
    if (!topicIds.has(ref)) err(`${rel}: broken prerequisite id ${ref}`)
  }
  for (const ref of data.related || []) {
    if (!topicIds.has(ref)) err(`${rel}: broken related id ${ref}`)
  }
}

// Cheatsheets
const cheatsheetIds = new Set()
for (const file of walk(path.join(contentRoot, 'cheatsheets')).filter(f => f.endsWith('.md'))) {
  const rel = path.relative(contentRoot, file)
  const { data, body, error } = parseMarkdownFile(file)
  if (error || !data?.id || !data?.title) err(`${rel}: cheatsheet missing id/title or frontmatter error`)
  if (data?.id) {
    if (cheatsheetIds.has(data.id)) err(`Duplicate cheatsheet id ${data.id} in ${rel}`)
    cheatsheetIds.add(data.id)
  }
  if (!body || body.trim().length < 30) err(`${rel}: cheatsheet body too short`)
}

// JSON content: interview + practice
function loadJsonFiles(dir, kind) {
  const ids = new Set()
  for (const file of walk(dir).filter(f => f.endsWith('.json'))) {
    const rel = path.relative(contentRoot, file)
    let data
    try { data = JSON.parse(fs.readFileSync(file, 'utf8')) } catch (e) { err(`${rel}: invalid JSON: ${e.message}`); continue }
    const items = Array.isArray(data) ? data : (data.questions || data.items || [])
    for (const it of items) {
      if (!it.id) { err(`${rel}: ${kind} item missing id`); continue }
      if (ids.has(it.id)) err(`Duplicate ${kind} id ${it.id} in ${rel}`)
      ids.add(it.id)
      if (!it.question && !it.prompt && !it.title) err(`${rel}: ${kind} ${it.id} missing question/prompt/title`)
      if (kind === 'interview') {
        // Module 0 was removed from Interview Prep in the 2026-11-12
        // second pass (its prompts moved to content/revision). An
        // interview question must never carry module-0 or the Revision
        // category again — the validator is the backstop.
        if (it.module && !['module-1', 'module-2', 'module-3', 'module-4', 'bonus-resume'].includes(it.module)) err(`${rel}: interview ${it.id} has invalid module ${it.module}`)
        if (it.category === 'Revision') err(`${rel}: interview ${it.id} still has category Revision — revision prompts belong in content/revision, not Interview Prep`)
        if (it.difficulty && !['Easy', 'Medium', 'Hard'].includes(it.difficulty)) err(`${rel}: interview ${it.id} has invalid difficulty ${it.difficulty}`)
      }
      if (kind === 'practice') {
        if (it.type && !['mcq', 'flashcard', 'coding', 'output', 'scenario'].includes(it.type)) err(`${rel}: practice ${it.id} has invalid type ${it.type}`)
        if (it.difficulty && !['Easy', 'Medium', 'Hard'].includes(it.difficulty)) err(`${rel}: practice ${it.id} has invalid difficulty ${it.difficulty}`)
        if ((it.type === 'mcq' || it.type === 'output') && it.options) {
          if (it.options.length < 2) err(`${rel}: practice ${it.id} has fewer than 2 options`)
          if (it.answerIndex === undefined || it.answerIndex < 0 || it.answerIndex >= it.options.length) err(`${rel}: practice ${it.id} has out-of-range answerIndex ${it.answerIndex}`)
        }
        if (it.type === 'flashcard' && (!it.front || !it.back)) err(`${rel}: practice ${it.id} flashcard missing front/back`)
      }
      if (it.topicId && !topicIds.has(it.topicId)) err(`${rel}: ${kind} ${it.id} references unknown topicId ${it.topicId}`)
      if (it.relatedTopics) for (const r of it.relatedTopics) if (!topicIds.has(r)) err(`${rel}: ${kind} ${it.id} references unknown related topic ${r}`)
    }
  }
  return ids
}
const interviewIds = loadJsonFiles(path.join(contentRoot, 'interview'), 'interview')
loadJsonFiles(path.join(contentRoot, 'practice'), 'practice')

// Revision prompts (content/revision): the former Module 0 one-minute
// prompts. Same shape as interview questions, but a separate namespace:
// unique ids, resolvable topicIds, and no id collision with interview
// questions (both namespaces share the LocalStorage review/bookmark keys).
{
  const revisionIds = new Set()
  for (const file of walk(path.join(contentRoot, 'revision')).filter(f => f.endsWith('.json'))) {
    const rel = path.relative(contentRoot, file)
    let data
    try { data = JSON.parse(fs.readFileSync(file, 'utf8')) } catch (e) { err(`${rel}: invalid JSON: ${e.message}`); continue }
    const items = Array.isArray(data) ? data : (data.questions || [])
    for (const it of items) {
      if (!it.id) { err(`${rel}: revision prompt missing id`); continue }
      if (revisionIds.has(it.id)) err(`Duplicate revision prompt id ${it.id} in ${rel}`)
      revisionIds.add(it.id)
      if (interviewIds.has(it.id)) err(`Revision prompt id ${it.id} in ${rel} collides with an interview question id`)
      if (!it.question && !it.title) err(`${rel}: revision ${it.id} missing question/title`)
      if (it.topicId && !topicIds.has(it.topicId)) err(`${rel}: revision ${it.id} references unknown topicId ${it.topicId}`)
    }
  }
  if (revisionIds.size === 0) warn('content/revision has no prompts — the Module 0 deck is empty')
}

// Paths reference check
try {
  const paths = JSON.parse(fs.readFileSync(path.join(contentRoot, 'paths.json'), 'utf8'))
  const pathIds = new Set()
  for (const p of paths) {
    if (!p.id || !p.title) err(`Path missing id/title: ${JSON.stringify(p)}`)
    if (p.id) {
      if (pathIds.has(p.id)) err(`Duplicate path id ${p.id}`)
      pathIds.add(p.id)
    }
    for (const tid of p.topicIds || []) if (!topicIds.has(tid)) err(`Path ${p.id} references unknown topic ${tid}`)
  }
} catch { warn('paths.json missing or invalid') }

if (warnings.length) console.log(`Warnings (${warnings.length}):\n- ${warnings.join('\n- ')}`)
if (errors.length) {
  console.error(`\nValidation FAILED with ${errors.length} error(s):\n- ${errors.join('\n- ')}`)
  process.exit(1)
}
console.log(`Validation OK: ${topicFiles.length} topic files, ${topicIds.size} unique topic ids, ${tracks.length} tracks`)
