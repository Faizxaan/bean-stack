import React, { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { contentIndex, getTopic, getTrack } from '../lib/content'
import { searchScore } from '../lib/utils'
import { topicUrl } from '../lib/utils'

export function SearchPage() {
  const [q, setQ] = useState('')
  const results = useMemo(() => {
    if (!q.trim()) return []
    const scored: { label: string; detail: string; to: string; score: number }[] = []
    for (const t of contentIndex.topics) {
      const s = Math.max(searchScore(q, t.title), searchScore(q, t.summary), searchScore(q, t.tags.join(' ')))
      if (s > 0) scored.push({ label: t.title, detail: `Topic · ${getTrack(t.track)?.title || t.track} · ${t.difficulty}`, to: topicUrl(t), score: s })
    }
    for (const qq of contentIndex.interviewQuestions) {
      const s = searchScore(q, qq.question + ' ' + qq.category)
      if (s > 0) scored.push({ label: qq.question, detail: `Interview · ${qq.category}`, to: `/interview/question/${qq.id}`, score: s })
    }
    for (const item of contentIndex.practiceItems.filter(i => i.type === 'mcq')) {
      const s = searchScore(q, (item.prompt || '') + ' ' + (item.title || ''))
      if (s > 0) scored.push({ label: item.prompt || item.title, detail: `Practice MCQ · ${item.topicId ? (getTopic(item.topicId)?.title || item.topicId) : 'General'}`, to: '/practice?tab=mcq', score: s })
    }
    for (const c of contentIndex.cheatsheets) {
      const s = searchScore(q, c.title)
      if (s > 0) scored.push({ label: c.title, detail: 'Cheatsheet', to: `/cheatsheets/${c.id}`, score: s })
    }
    return scored.sort((a, b) => b.score - a.score).slice(0, 50)
  }, [q])
  return (
    <div>
      <h1>Search</h1>
      <input className="input" autoFocus placeholder="Search topics, interview questions, MCQs and cheatsheets…" value={q} onChange={e => setQ(e.target.value)} aria-label="Search" />
      <p style={{ color: 'var(--muted)' }}>Searches topics, interview questions, practice MCQs, and cheatsheets. Press Ctrl/Cmd+K anywhere for the command palette.</p>
      {q.trim() === '' && <div className="card">Type a term above — for example “streams”, “JPA”, or “system design” — or browse <Link to="/learn">Learn</Link>.</div>}
      {q.trim() !== '' && results.length === 0 && <div className="card">No results for “{q}”. Try a broader term, or browse <Link to="/learn">Learn</Link>.</div>}
      <div className="grid" style={{ marginTop: 12 }}>{results.map(r => <div key={r.to + r.label} className="card"><Link to={r.to}><strong>{r.label}</strong></Link><div style={{ color: 'var(--muted)', fontSize: '0.9rem' }}>{r.detail}</div></div>)}</div>
    </div>
  )
}

export function NotFound() {
  return (
    <div>
      <h1>Page not found</h1>
      <p>That page does not exist in Beanstack. It has not been redirected — you are seeing Beanstack&apos;s own 404 page.</p>
      <p>Try:</p>
      <ul>
        <li><Link to="/">Home dashboard</Link></li>
        <li><Link to="/learn">Learn — tracks and topics</Link></li>
        <li><Link to="/search">Search</Link></li>
      </ul>
    </div>
  )
}
