import { describe, expect, it } from 'vitest'
import { daysUntilLocal, localDateString, smoothScrollBehavior } from './utils'

// Worker 3 (visual / accessibility / data safety): the Home interview
// countdown used to parse a YYYY-MM-DD date as midnight UTC, which in
// IST is 05:30 local — the count could be off by a day around midnight.
describe('daysUntilLocal (interview countdown in local time)', () => {
  const shift = (days: number) => localDateString(new Date(Date.now() + days * 86400000))
  it('is 0 today, 1 tomorrow, -1 yesterday', () => {
    expect(daysUntilLocal(localDateString())).toBe(0)
    expect(daysUntilLocal(shift(1))).toBe(1)
    expect(daysUntilLocal(shift(-1))).toBe(-1)
    expect(daysUntilLocal(shift(30))).toBe(30)
  })
  it('returns null for missing or impossible dates, never NaN', () => {
    expect(daysUntilLocal(null)).toBeNull()
    expect(daysUntilLocal(undefined)).toBeNull()
    expect(daysUntilLocal('')).toBeNull()
    expect(daysUntilLocal('not-a-date')).toBeNull()
    expect(daysUntilLocal('2026-02-30')).toBeNull()
    expect(daysUntilLocal('2026-13-01')).toBeNull()
  })
})

describe('smoothScrollBehavior (reduced motion)', () => {
  it('returns "auto" with no DOM (never throws outside a browser)', () => {
    expect(smoothScrollBehavior()).toBe('auto')
  })
})

// Batch 2 (2026-11-14): diagrams — mobile readability and dark mode.
// The three SVGs are 790–964px wide with 14px labels, so shrinking one
// to a 360px phone made the text ~5px; each SVG now carries an opaque
// #f8fafc background rect (the SVGs load via <img>, so page CSS
// variables cannot reach them) and MarkdownView renders them in a
// 720px-minimum horizontal-scroll region with an enlarge link.
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

describe('diagrams (mobile readability + dark mode)', () => {
  const diagramsDir = join(fileURLToPath(new URL('.', import.meta.url)), '..', '..', 'public', 'diagrams')
  const svgs = readdirSync(diagramsDir).filter(f => f.endsWith('.svg'))
  it('every diagram SVG starts with an opaque light background rect', () => {
    expect(svgs.length).toBeGreaterThan(0)
    for (const f of svgs) {
      const svg = readFileSync(join(diagramsDir, f), 'utf8')
      // First painted element after the opening <svg> tag (comments aside).
      expect(svg).toMatch(/<svg[^>]*>\s*(<!--[\s\S]*?-->\s*)?<rect width="100%" height="100%" fill="#f8fafc"\/>/)
      // On #f8fafc the #475569 connector lines are 7.24:1; on the dark
      // page background (#0b1220) they were 2.47:1 — the opaque rect is
      // what makes the same SVG read in both themes.
      expect(svg).toContain('#475569')
    }
  })
  it('the scroll-region CSS keeps diagrams at a readable minimum width on phones', () => {
    const css = readFileSync(join(fileURLToPath(new URL('.', import.meta.url)), '..', '..', 'src', 'index.css'), 'utf8')
    expect(css).toMatch(/\.diagram-scroll\s*\{[^}]*overflow-x:\s*auto[^}]*\}/)
    expect(css).toMatch(/\.diagram-scroll img\s*\{[^}]*min-width:\s*720px[^}]*\}/)
    const view = readFileSync(join(fileURLToPath(new URL('.', import.meta.url)), '..', '..', 'src', 'components', 'MarkdownView.tsx'), 'utf8')
    expect(view).toContain('diagram-scroll')
    expect(view).toContain('Open diagram enlarged in a new tab')
  })
})
