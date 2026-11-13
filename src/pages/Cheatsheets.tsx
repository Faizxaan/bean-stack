import React, { useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useParams } from 'react-router-dom'
import { Bookmark, Check, Eye, EyeOff } from 'lucide-react'
import { contentIndex, getTopic, loadCheatsheetBody, stripFrontmatter, useRevisionPrompts } from '../lib/content'
import { useApp } from '../store/AppContext'
import { MarkdownView } from '../components/MarkdownView'
import { topicUrl, smoothScrollBehavior } from '../lib/utils'
import type { RevisionPrompt } from '../types'

// One-minute revision deck: the 37 prompts formerly known as Module 0
// in Interview Prep (content/revision/one-minute.json). They are recap
// prompts, not interview questions — they were removed from Interview
// Prep in the 2026-11-12 second pass and moved here with the same ids,
// so saved review/bookmark state still resolves. Review state reuses
// the interviewReview/bookmark keys on purpose: the ids are the same.
function RevisionPromptCard({ prompt }: { prompt: RevisionPrompt }) {
  const { data, toggleList, setInterviewReview } = useApp()
  const [revealed, setRevealed] = useState(false)
  const status = data.interviewReview[prompt.id]
  const bookmarked = data.questionBookmarks.includes(prompt.id)
  const topic = prompt.topicId ? getTopic(prompt.topicId) : undefined
  return (
    <article className="card q-card" id={`rev-${prompt.id}`} aria-label={prompt.question}>
      <h3 className="q-question">{prompt.question}</h3>
      <p className="q-badges">
        <span className="badge accent">One-minute revision</span>{' '}
        <span className="badge">{prompt.difficulty || 'Medium'}</span>{' '}
        {topic && <span className="badge">Topic: {topic.title}</span>}{' '}
        {status === 'confident' && <span className="badge accent">✓ Confident</span>}
        {status === 'needs-review' && <span className="badge warn">Needs review</span>}
        {bookmarked && <span className="badge accent">Bookmarked</span>}
      </p>
      {revealed ? (
        <div className="q-answer">
          <h4>Short answer</h4>
          <p>{prompt.shortAnswer || 'No short answer yet.'}</p>
          {prompt.detailedAnswer && <><h4>Detail</h4><p style={{ whiteSpace: 'pre-wrap' }}>{prompt.detailedAnswer}</p></>}
        </div>
      ) : (
        <p className="q-try"><strong>Try it first.</strong> Recall the essentials in one minute, then reveal and compare.</p>
      )}
      <div className="q-actions">
        <button className="btn secondary small" onClick={() => setRevealed(!revealed)} aria-expanded={revealed}>
          {revealed ? <><EyeOff size={15} /> Hide answer</> : <><Eye size={15} /> Reveal answer</>}
        </button>
        <button
          className="btn secondary small"
          aria-pressed={status === 'confident'}
          onClick={() => setInterviewReview(prompt.id, 'confident')}
        >
          <Check size={15} /> Confident {status === 'confident' ? '✓' : ''}
        </button>
        <button
          className="btn secondary small"
          aria-pressed={status === 'needs-review'}
          onClick={() => setInterviewReview(prompt.id, 'needs-review')}
        >
          Needs review {status === 'needs-review' ? '✓' : ''}
        </button>
        <button className="btn secondary small" onClick={() => toggleList('questionBookmarks', prompt.id)} aria-pressed={bookmarked}>
          <Bookmark size={15} /> {bookmarked ? 'Bookmarked ✓' : 'Bookmark'}
        </button>
        {topic && <Link className="btn secondary small" to={topicUrl(topic)}>Learn topic →</Link>}
      </div>
    </article>
  )
}

function RevisionDeck() {
  const { prompts, loaded } = useRevisionPrompts()
  const location = useLocation()
  const topicOrder = useMemo(() => new Map(contentIndex.topics.map((t, i) => [t.id, i])), [])
  const groups = useMemo(() => {
    const byTopic = new Map<string, RevisionPrompt[]>()
    for (const p of prompts) {
      const key = p.topicId || 'general'
      if (!byTopic.has(key)) byTopic.set(key, [])
      byTopic.get(key)!.push(p)
    }
    return [...byTopic.entries()].sort(([a], [b]) => (topicOrder.get(a) ?? 999) - (topicOrder.get(b) ?? 999))
  }, [prompts, topicOrder])

  // Deep links from Search / the palette / Library use #rev-<id>.
  useEffect(() => {
    if (!loaded || !location.hash.startsWith('#rev-')) return
    document.getElementById(location.hash.slice(1))?.scrollIntoView({ behavior: smoothScrollBehavior(), block: 'start' })
  }, [loaded, location.hash])

  if (!loaded) return <div className="card"><p>Loading one-minute revision prompts…</p><div className="skeleton" /></div>
  if (prompts.length === 0) return null
  return (
    <section aria-label="One-minute revision" id="one-minute-revision" style={{ marginBottom: 24, scrollMarginTop: 76 }}>
      <h2 style={{ marginBottom: 4 }}>One-minute revision</h2>
      <p style={{ color: 'var(--muted)', marginTop: 0 }}>
        {prompts.length} quick recap prompts across {groups.length} topics. These used to be Module 0 in Interview Prep — they are
        one-minute recalls of the essentials, not interview questions, so they live here now. Your saved Confident / Needs review
        and bookmark state for them was kept.
      </p>
      {groups.map(([topicId, list]) => {
        const topic = getTopic(topicId)
        return (
          <div key={topicId} style={{ marginBottom: 16 }}>
            <h3 style={{ margin: '0 0 10px' }}>
              {topic ? <Link to={topicUrl(topic)}>{topic.title}</Link> : 'General'}
              <span className="badge" style={{ marginLeft: 8 }}>{list.length}</span>
            </h3>
            <div className="q-list">
              {list.map(p => <RevisionPromptCard key={p.id} prompt={p} />)}
            </div>
          </div>
        )
      })}
    </section>
  )
}

export function CheatsheetsIndex() {
  const location = useLocation()
  // Batch 3 (2026-11-13): the 37 one-minute revision cards used to
  // render before any cheatsheet on this page. The page is now two
  // tabs — Cheatsheets first, One-minute revision second — so the page
  // a user lands on is the cheatsheets they came for. Deep links keep
  // working: #rev-<id> (Search / palette / Library) and
  // #one-minute-revision open the revision tab; #cheatsheets opens
  // the cheatsheets tab. RevisionDeck's own effect still scrolls to
  // the #rev-<id> card once it loads.
  type CheatsheetTab = 'cheatsheets' | 'revision'
  const tabFromHash = (hash: string): CheatsheetTab =>
    hash.startsWith('#rev-') || hash === '#one-minute-revision' ? 'revision' : 'cheatsheets'
  const [tab, setTab] = useState<CheatsheetTab>(() => tabFromHash(location.hash))
  useEffect(() => { setTab(tabFromHash(location.hash)) }, [location.hash])
  // In-page jump links: switch the tab first, then scroll once the
  // panel has rendered — a plain anchor would scroll before the
  // target panel exists. The hash is kept in the URL so Back works.
  const jumpTo = (next: CheatsheetTab, id: string) => (e: React.MouseEvent) => {
    e.preventDefault()
    setTab(next)
    window.history.replaceState(null, '', `#${id}`)
    setTimeout(() => document.getElementById(id)?.scrollIntoView({ behavior: smoothScrollBehavior(), block: 'start' }), 0)
  }
  return (
    <div>
      <nav className="breadcrumb" aria-label="Breadcrumb">
        <span className="breadcrumb-item"><Link to="/">Home</Link></span>
        <span className="breadcrumb-sep"> / </span>
        <span className="breadcrumb-item"><span className="breadcrumb-current" aria-current="page">Revision &amp; Cheatsheets</span></span>
      </nav>
      <h1>Revision &amp; Cheatsheets</h1>
      <p style={{ color: 'var(--muted)' }}>Two ways to revise. <strong>One-minute revision</strong> is a set of quick recall prompts — try to answer each in about a minute, then reveal. <strong>Cheatsheets</strong> are one-page quick-reference tables for a topic. Use your browser&apos;s print function for a clean print version.</p>
      <div className="tabs" role="tablist" aria-label="Revision and cheatsheets">
        <button type="button" role="tab" id="tab-cheatsheets" aria-selected={tab === 'cheatsheets'} aria-controls="panel-cheatsheets" className="btn secondary" onClick={() => setTab('cheatsheets')}>Cheatsheets ({contentIndex.cheatsheets.length})</button>
        <button type="button" role="tab" id="tab-revision" aria-selected={tab === 'revision'} aria-controls="panel-revision" className="btn secondary" onClick={() => setTab('revision')}>One-minute revision</button>
      </div>
      {tab === 'cheatsheets' && (
        <div role="tabpanel" id="panel-cheatsheets" aria-labelledby="tab-cheatsheets">
          <h2 id="cheatsheets" style={{ marginBottom: 4, scrollMarginTop: 76 }}>Cheatsheets ({contentIndex.cheatsheets.length})</h2>
          <p style={{ color: 'var(--muted)', marginTop: 0 }}>Each cheatsheet summarises one topic area in a few minutes. Open one to read it, or print it before an interview. The one-minute revision prompts live on the other tab — <a href="#one-minute-revision" onClick={jumpTo('revision', 'one-minute-revision')}>open One-minute revision</a>.</p>
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
      )}
      {tab === 'revision' && (
        <div role="tabpanel" id="panel-revision" aria-labelledby="tab-revision">
          <RevisionDeck />
        </div>
      )}
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
  const idx = contentIndex.cheatsheets.findIndex(c => c.id === id)
  const nextSheet = idx >= 0 && idx < contentIndex.cheatsheets.length - 1 ? contentIndex.cheatsheets[idx + 1] : undefined
  const prevSheet = idx > 0 ? contentIndex.cheatsheets[idx - 1] : undefined
  return (
    <div>
      <nav className="breadcrumb" aria-label="Breadcrumb">
        <span className="breadcrumb-item"><Link to="/">Home</Link></span>
        <span className="breadcrumb-sep"> / </span>
        <span className="breadcrumb-item"><Link to="/cheatsheets">Revision &amp; Cheatsheets</Link></span>
        <span className="breadcrumb-sep"> / </span>
        <span className="breadcrumb-item"><span className="breadcrumb-current" aria-current="page">{meta.title}</span></span>
      </nav>
      <p><button className="btn secondary small" onClick={() => window.print()}>Print this cheatsheet</button></p>
      <h1>{meta.title}</h1>
      <p style={{ color: 'var(--muted)', marginTop: 0 }}>{meta.summary} · {meta.readingMinutes} min · {meta.category}</p>
      {error && <div className="card" role="alert">Could not load: {error}</div>}
      {!body && !error && <div className="skeleton" />}
      {body && <MarkdownView markdown={body} />}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 20 }}>
        <Link className="btn secondary" to="/cheatsheets">← All cheatsheets</Link>
        {prevSheet && <Link className="btn secondary" to={`/cheatsheets/${prevSheet.id}`}>← {prevSheet.title}</Link>}
        {nextSheet && <Link className="btn" to={`/cheatsheets/${nextSheet.id}`}>Next: {nextSheet.title} →</Link>}
        {!nextSheet && <Link className="btn secondary" to="/learn">Browse Learn →</Link>}
      </div>
    </div>
  )
}
