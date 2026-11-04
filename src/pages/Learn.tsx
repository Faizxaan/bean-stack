import React, { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Bookmark, Star, ArrowLeft, ArrowRight, Clock, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react'
import { contentIndex, extractSection, getTopic, getTrack, loadTopicBody, orderedTopics, prevNextTopic, stripFrontmatter, topicsForSection } from '../lib/content'
import { useApp } from '../store/AppContext'
import { MarkdownView } from '../components/MarkdownView'
import { topicUrl } from '../lib/utils'

export function LearnIndex() {
  return (
    <div>
      <h1>Learn</h1>
      <p style={{ color: 'var(--muted)' }}>Tracks, sections, and topics. Java is built out first; other tracks are polished placeholders with planned sections, marked Coming Soon.</p>
      <div className="grid grid-2">
        {contentIndex.tracks.map(track => (
          <div key={track.id} className="card">
            <h2 style={{ marginTop: 0 }}><Link to={`/learn/${track.id}`}>{track.title}</Link> {track.comingSoon && <span className="badge warn">Coming Soon</span>}</h2>
            <p style={{ color: 'var(--muted)' }}>{track.description}</p>
            <ul>{track.sections.map(s => <li key={s.id}>{s.title}{s.description ? ` — ${s.description}` : ''}</li>)}</ul>
            <Link className="btn secondary" to={`/learn/${track.id}`}>Open track →</Link>
          </div>
        ))}
      </div>
      <div className="card" style={{ marginTop: 16 }}>
        <h2 style={{ marginTop: 0 }}>Curated learning paths</h2>
        {contentIndex.paths.map(p => (
          <div key={p.id} style={{ marginBottom: 12 }}>
            <strong>{p.title}</strong> — {p.description}
            <ol>{p.topicIds.map(id => { const t = getTopic(id); return t ? <li key={id}><Link to={topicUrl(t)}>{t.title}</Link></li> : null })}</ol>
          </div>
        ))}
        {contentIndex.paths.length === 0 && <p style={{ color: 'var(--muted)' }}>Learning paths are built from prerequisites and tags as content grows. Check back after the next content batch.</p>}
      </div>
    </div>
  )
}

export function TrackPage() {
  const { trackId } = useParams()
  const track = trackId ? getTrack(trackId) : undefined
  if (!track) return <div><h1>Track not found</h1><p>This track does not exist. Use Learn to browse available tracks.</p><Link to="/learn">← Back to Learn</Link></div>
  return (
    <div>
      <p><Link to="/learn">← Learn</Link></p>
      <h1>{track.title} {track.comingSoon && <span className="badge warn">Coming Soon</span>}</h1>
      <p style={{ color: 'var(--muted)' }}>{track.description}</p>
      {track.comingSoon && <div className="card" style={{ background: 'var(--accent-soft)' }}><strong>Coming Soon</strong><p>This track is a polished placeholder. Its planned sections are below, and it can be filled later with content only — no component changes needed.</p></div>}
      <div className="grid" style={{ marginTop: 16 }}>
        {track.sections.map(sec => {
          const topics = topicsForSection(track.id, sec.id)
          return (
            <div key={sec.id} className="card">
              <h2 style={{ marginTop: 0 }}>{sec.title}</h2>
              {sec.description && <p style={{ color: 'var(--muted)' }}>{sec.description}</p>}
              {topics.length === 0 ? (
                <div>
                  <p style={{ color: 'var(--muted)' }}>Planned topics:</p>
                  <ul>{(sec.plannedTopics || []).map(t => <li key={t}>{t}</li>)}</ul>
                  {(!sec.plannedTopics || sec.plannedTopics.length === 0) && <p style={{ color: 'var(--muted)' }}>Content for this section is planned and will appear here.</p>}
                </div>
              ) : (
                <ul>{topics.map(t => (
                  <li key={t.id}><Link to={topicUrl(t)}>{t.title}</Link> — {t.difficulty} · {'★'.repeat(t.importance)} · {t.readingMinutes} min · <span className="badge">{t.status}</span></li>
                ))}</ul>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function Section({ title, children, defaultOpen = true }: { title: string; children: React.ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <section style={{ marginBottom: 8 }}>
      <button className="btn secondary" style={{ width: '100%', justifyContent: 'space-between' }} onClick={() => setOpen(!open)} aria-expanded={open}>
        <span>{title}</span><ChevronDown size={16} style={{ transform: open ? 'rotate(180deg)' : 'none' }} />
      </button>
      {open && <div style={{ padding: '8px 4px' }}>{children}</div>}
    </section>
  )
}

export function TopicPage() {
  const { trackId, sectionId, topicId } = useParams()
  const topic = topicId ? getTopic(topicId) : undefined
  const { data, setProgress, toggleList, setNote, markViewed } = useApp()
  const [body, setBody] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [revisionMode, setRevisionMode] = useState(false)
  const [activeHeading, setActiveHeading] = useState('')

  useEffect(() => {
    if (!topic) return
    markViewed(topic.id)
    window.scrollTo(0, 0)
    setBody(null); setError(null)
    loadTopicBody(topic).then(raw => setBody(stripFrontmatter(raw))).catch(e => setError(String(e.message || e)))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [topicId])

  const headings = useMemo(() => {
    if (!body) return []
    return body.split('\n').filter(l => l.startsWith('## ')).map(l => l.replace('## ', '').trim())
  }, [body])

  useEffect(() => {
    const onScroll = () => {
      // Simple scroll-spy: find last heading above viewport
      const els = headings.map(h => document.getElementById(`heading-${h.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}`)).filter(Boolean) as HTMLElement[]
      let current = ''
      for (const el of els) if (el.getBoundingClientRect().top < 120) current = el.dataset.heading || ''
      if (current) setActiveHeading(current)
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [headings])

  if (!topic) return <div><h1>Topic not found</h1><p>That topic does not exist in this content set. It may be a planned placeholder — check its track page.</p><Link to="/learn">← Back to Learn</Link></div>
  const { prev, next } = prevNextTopic(topic)
  const status = data.progress[topic.id] || 'not-started'
  const isBookmarked = data.bookmarks.includes(topic.id)
  const isFavorite = data.favorites.includes(topic.id)
  const track = getTrack(topic.track)

  const revisionBody = useMemo(() => {
    if (!body) return ''
    const keep = ['Overview', 'Key Concepts', 'Common Mistakes', 'Interview Questions', 'Revision Summary']
    const parts: string[] = []
    for (const h of keep) {
      const sec = extractSection(body, h)
      if (sec) parts.push(`## ${h}\n\n${sec}`)
    }
    return parts.join('\n\n') || body
  }, [body])

  // Inject heading ids by rendering markdown with custom heading handling is complex;
  // instead, TOC links scroll via text search fallback: we render headings as anchors in MarkdownView? Keep TOC as jump list that sets active on click.
  return (
    <div>
      <p style={{ color: 'var(--muted)' }}><Link to="/learn">Learn</Link> / <Link to={`/learn/${topic.track}`}>{track?.title || topic.track}</Link> / {topic.title}</p>
      {/* Clickable topic navigation: left arrow = previous topic in this track, right arrow = next topic.
          Deliberately click-only, not keyboard arrow keys, so it never conflicts with scrolling or text selection. */}
      <nav className="topic-nav-top" aria-label="Previous and next topic">
        {prev
          ? <Link className="btn secondary small" to={topicUrl(prev)} aria-label={`Previous topic: ${prev.title}`}><ArrowLeft size={15} /><span className="topic-nav-label">Previous: {prev.title}</span></Link>
          : <span className="btn secondary small" aria-disabled="true" style={{ opacity: 0.5 }}><ArrowLeft size={15} /><span className="topic-nav-label">No previous topic</span></span>}
        {next
          ? <Link className="btn secondary small" to={topicUrl(next)} aria-label={`Next topic: ${next.title}`}><span className="topic-nav-label">Next: {next.title}</span> <ArrowRight size={15} /></Link>
          : <span className="btn secondary small" aria-disabled="true" style={{ opacity: 0.5 }}><span className="topic-nav-label">No next topic</span> <ArrowRight size={15} /></span>}
      </nav>
      <nav className="topic-arrows" aria-label="Previous and next topic">
        {prev
          ? <Link className="topic-arrow prev" to={topicUrl(prev)} aria-label={`Previous topic: ${prev.title}`} title={prev.title}><ChevronLeft size={24} /><span className="sr-only">Previous topic: {prev.title}</span></Link>
          : <span className="topic-arrow prev disabled" aria-hidden="true"><ChevronLeft size={24} /></span>}
        {next
          ? <Link className="topic-arrow next" to={topicUrl(next)} aria-label={`Next topic: ${next.title}`} title={next.title}><ChevronRight size={24} /><span className="sr-only">Next topic: {next.title}</span></Link>
          : <span className="topic-arrow next disabled" aria-hidden="true"><ChevronRight size={24} /></span>}
      </nav>
      <h1 style={{ marginBottom: 4 }}>{topic.title}</h1>
      <p style={{ color: 'var(--muted)', marginTop: 0 }}>
        <span className="badge">{topic.difficulty}</span> {' '}
        <span title="Interview importance"><Star size={14} /> {'★'.repeat(topic.importance)}{'☆'.repeat(5 - topic.importance)}</span> {' '}
        <span><Clock size={14} /> {topic.readingMinutes} min</span> {' '}
        <span className="badge">{topic.status}</span> {' '}
        {topic.lastUpdated && <span>Updated {topic.lastUpdated}</span>}
      </p>
      {topic.tags.length > 0 && <p>{topic.tags.map(t => <span key={t} className="badge" style={{ marginRight: 6 }}>{t}</span>)}</p>}

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, margin: '12px 0' }}>
        <label>Progress: <select className="select" style={{ width: 'auto' }} value={status} onChange={e => setProgress(topic.id, e.target.value as never)} aria-label="Topic progress">
          <option value="not-started">Not Started</option><option value="in-progress">In Progress</option><option value="completed">Completed</option>
        </select></label>
        <button className="btn secondary small" onClick={() => toggleList('bookmarks', topic.id)}><Bookmark size={15} /> {isBookmarked ? 'Bookmarked ✓' : 'Bookmark'}</button>
        <button className="btn secondary small" onClick={() => toggleList('favorites', topic.id)}><Star size={15} /> {isFavorite ? 'Favorite ✓' : 'Favorite'}</button>
        <button className="btn secondary small" onClick={() => setRevisionMode(!revisionMode)}>{revisionMode ? 'Full study view' : 'Quick Revision Mode'}</button>
      </div>

      <div className="grid" style={{ gridTemplateColumns: 'minmax(0,1fr) 220px', gap: 20 }}>
        <div>
          {error && <div className="card" role="alert">Could not load this topic: {error}</div>}
          {!body && !error && <div><div className="skeleton" style={{ height: 24, marginBottom: 10 }} /><div className="skeleton" /><div className="skeleton" style={{ marginTop: 8 }} /></div>}
          {body && <MarkdownView markdown={revisionMode ? revisionBody : body} />}

          <Section title="Personal notes">
            <p style={{ color: 'var(--muted)', fontSize: '0.9rem' }}>Write what clicked, what confused you, or a link to your own example. Notes are saved in this browser only.</p>
            <textarea className="textarea" rows={5} value={data.notes[topic.id] || ''} onChange={e => setNote(topic.id, e.target.value)} placeholder="Your notes for this topic…" aria-label="Personal notes for this topic" />
          </Section>

          <Section title="Prerequisites & related topics">
            <p><strong>Prerequisites:</strong> {topic.prerequisites.length ? topic.prerequisites.map(id => { const t = getTopic(id); return t ? <span key={id} style={{ marginRight: 8 }}><Link to={topicUrl(t)}>{t.title}</Link></span> : id }) : 'None listed — this is a good starting point.'}</p>
            <p><strong>Related:</strong> {topic.related.length ? topic.related.map(id => { const t = getTopic(id); return t ? <span key={id} style={{ marginRight: 8 }}><Link to={topicUrl(t)}>{t.title}</Link></span> : id }) : 'None listed yet.'}</p>
          </Section>

          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 20 }}>
            {prev ? <Link to={topicUrl(prev)}><ArrowLeft size={15} /> {prev.title}</Link> : <span />}
            {next ? <Link to={topicUrl(next)}>{next.title} <ArrowRight size={15} /></Link> : <span />}
          </div>
        </div>
        <aside className="toc" aria-label="Table of contents">
          <strong>On this page</strong>
          {headings.map(h => {
            const id = h.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
            return <a key={h} href={`#${id}`} onClick={() => setActiveHeading(h)} className={activeHeading === h ? 'active' : ''}>{h}</a>
          })}
          {headings.length === 0 && <p style={{ color: 'var(--muted)', fontSize: '0.9rem' }}>Headings will appear here when content loads.</p>}
          <div style={{ marginTop: 16 }}>
            <strong>Learning path</strong>
            <p style={{ fontSize: '0.9rem', color: 'var(--muted)' }}>{prev ? `Previous: ${prev.title}` : 'First topic in this track'}<br />Current: {topic.title}<br />{next ? `Next: ${next.title}` : 'Last topic in this track'}</p>
          </div>
        </aside>
      </div>
    </div>
  )
}

export function LearnRoutes() { return null }
