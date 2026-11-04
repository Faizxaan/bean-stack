import fs from 'node:fs'
import yaml from 'js-yaml'

export function parseMarkdownFile(filePath) {
  const raw = fs.readFileSync(filePath, 'utf8')
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/)
  if (!match) {
    return { data: null, body: raw, raw, error: 'missing frontmatter block' }
  }
  let data = null
  let error = null
  try {
    data = yaml.load(match[1]) || {}
  } catch (e) {
    error = `invalid frontmatter YAML: ${e.message}`
  }
  return { data, body: match[2] || '', raw, error }
}

export function walk(dir, out = []) {
  if (!fs.existsSync(dir)) return out
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = `${dir}/${entry.name}`
    if (entry.isDirectory()) walk(p, out)
    else out.push(p)
  }
  return out.sort()
}

export function readingMinutes(body) {
  const words = (body || '').replace(/```[\s\S]*?```/g, ' ').replace(/[#>*`\[\]()!-]/g, ' ').split(/\s+/).filter(Boolean).length
  return Math.max(1, Math.ceil(words / 200))
}

export function slugFromPath(root, file) {
  return file.replace(root + '/', '').replace(/\.md$/, '')
}
