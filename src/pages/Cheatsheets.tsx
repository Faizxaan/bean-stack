import React, { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { contentIndex, loadCheatsheetBody, stripFrontmatter } from '../lib/content'
import { MarkdownView } from '../components/MarkdownView'

export function CheatsheetsIndex() {
  return (
    <div>
      <h1>Revision &amp; Cheatsheets</h1>
      <p style={{ color: 'var(--muted)' }}>One combined, content-driven section: quick-reference tables, comparison tables, and print-friendly layouts. Use your browser&apos;s print function for a clean print version.</p>
      {contentIndex.cheatsheets.length === 0 && (
        <div className="card">
          <p>No cheatsheets yet in this batch. Cheatsheets are concise and consistent with the topic content they summarise — for example HashMap vs ConcurrentHashMap, or @Component vs @Bean — and they are added with each content batch.</p>
          <p>Meanwhile, every topic page has a Quick Revision Mode with definitions, key points, key code, common mistakes, interview questions, and a summary.</p>
          <Link className="btn secondary" to="/learn">Browse topics →</Link>
        </div>
      )}
      <div className="grid grid-2">
        {contentIndex.cheatsheets.map(c => (
          <div key={c.id} className="card">
            <h2 style={{ marginTop: 0 }}><Link to={`/cheatsheets/${c.id}`}>{c.title}</Link></h2>
            <p style={{ color: 'var(--muted)' }}>{c.summary} · {c.readingMinutes} min · {c.category}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

export function CheatsheetPage() {
  const { id } = useParams()
  const meta = contentIndex.cheatsheets.find(c => c.id === id)
  const [body, setBody] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  useEffect(() => {
    if (!meta) return
    loadCheatsheetBody(meta.file).then(raw => setBody(stripFrontmatter(raw))).catch(e => setError(String(e.message || e)))
  }, [meta])
  if (!meta) return <div><h1>Cheatsheet not found</h1><p>That cheatsheet does not exist yet.</p><Link to="/cheatsheets">← Back to Cheatsheets</Link></div>
  return (
    <div>
      <p><Link to="/cheatsheets">← Cheatsheets</Link> · <button className="btn secondary small" onClick={() => window.print()}>Print this cheatsheet</button></p>
      <h1>{meta.title}</h1>
      {error && <div className="card" role="alert">Could not load: {error}</div>}
      {!body && !error && <div className="skeleton" />}
      {body && <MarkdownView markdown={body} />}
    </div>
  )
}
