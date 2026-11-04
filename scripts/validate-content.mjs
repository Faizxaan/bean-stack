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
    sectionIds.add(s.id)
    if (s.track && s.track !== t.id) warn(`Section ${s.id} track field mismatch`)
  }
  if (t.status && !['complete', 'placeholder', 'draft'].includes(t.status)) err(`Track ${t.id} has invalid status ${t.status}`)
}

// Topics
const topicFiles = walk(path.join(contentRoot, 'topics')).filter(f => f.endsWith('.md'))
const topicIds = new Map()
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
for (const file of walk(path.join(contentRoot, 'cheatsheets')).filter(f => f.endsWith('.md'))) {
  const rel = path.relative(contentRoot, file)
  const { data, body, error } = parseMarkdownFile(file)
  if (error || !data?.id || !data?.title) err(`${rel}: cheatsheet missing id/title or frontmatter error`)
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
      if (it.topicId && !topicIds.has(it.topicId)) err(`${rel}: ${kind} ${it.id} references unknown topicId ${it.topicId}`)
      if (it.relatedTopics) for (const r of it.relatedTopics) if (!topicIds.has(r)) err(`${rel}: ${kind} ${it.id} references unknown related topic ${r}`)
    }
  }
  return ids
}
loadJsonFiles(path.join(contentRoot, 'interview'), 'interview')
loadJsonFiles(path.join(contentRoot, 'practice'), 'practice')

// Paths reference check
try {
  const paths = JSON.parse(fs.readFileSync(path.join(contentRoot, 'paths.json'), 'utf8'))
  for (const p of paths) {
    if (!p.id || !p.title) err(`Path missing id/title: ${JSON.stringify(p)}`)
    for (const tid of p.topicIds || []) if (!topicIds.has(tid)) err(`Path ${p.id} references unknown topic ${tid}`)
  }
} catch { warn('paths.json missing or invalid') }

if (warnings.length) console.log(`Warnings (${warnings.length}):\n- ${warnings.join('\n- ')}`)
if (errors.length) {
  console.error(`\nValidation FAILED with ${errors.length} error(s):\n- ${errors.join('\n- ')}`)
  process.exit(1)
}
console.log(`Validation OK: ${topicFiles.length} topic files, ${topicIds.size} unique topic ids, ${tracks.length} tracks`)
