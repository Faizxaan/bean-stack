import React, { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Bookmark, Star, ArrowLeft, ArrowRight, ArrowUp, Clock, ChevronDown, ChevronLeft, ChevronRight, Link2 } from 'lucide-react'
import { contentIndex, extractSection, getTopic, getTrack, loadTopicBody, orderedTopics, prevNextTopic, stripFrontmatter, topicsForSection } from '../lib/content'
import { useApp } from '../store/AppContext'
import { MarkdownView } from '../components/MarkdownView'
import { progressStats, topicUrl, formatDate, smoothScrollBehavior } from '../lib/utils'
import { MAX_NOTE_LENGTH } from '../lib/utils'
import { ProgressBar } from '../components/ProgressBar'

// Shared breadcrumb: Home / Learn [/ Track [/ Topic]]. The current page is
// plain text with aria-current, never a link to itself.
function Breadcrumb({ items }: { items: { label: string; to?: string }[] }) {
  return (
    <nav aria-label="Breadcrumb" className="breadcrumb">
      {items.map((item, i) => (
        <span key={i} className="breadcrumb-item">
          {i > 0 && <span aria-hidden="true" className="breadcrumb-sep"> / </span>}
          {item.to ? <Link to={item.to}>{item.label}</Link> : <span aria-current="page" className="breadcrumb-current">{item.label}</span>}
        </span>
      ))}
    </nav>
  )
}

function userStatusLabel(status: string | undefined) {
  if (status === 'completed') return '✓ Completed'
  if (status === 'in-progress') return 'In progress'
  return 'Not started'
}

export function LearnIndex() {
  const { data } = useApp()
  // Next uncompleted topic in a track, in track order — the resume target.
  // Falls back to the first topic when the track is fully complete.
  const nextUpForTrack = (trackId: string) => {
    const list = orderedTopics(trackId)
    return list.find(t => data.progress[t.id] !== 'completed') || list[0]
  }
  return (
    <div>
      <Breadcrumb items={[{ label: 'Home', to: '/' }, { label: 'Learn' }]} />
      <h1>Learn</h1>
      <p style={{ color: 'var(--muted)' }}>Tracks, sections, and topics — {contentIndex.tracks.length} tracks, {contentIndex.topics.length} topics. Progress below is your own, derived from your saved progress, not from the content.</p>
      <p style={{ color: 'var(--muted)' }}>
        <strong>New here? Start with the Beginner Roadmap</strong> in the paths section below — it takes you through six topics in order, starting with JDK, JRE &amp; JVM.
        A <strong>track</strong> is one subject area (for example Core Java); a <strong>path</strong> is a short ordered list of topics across tracks for one goal (for example a job interview).
        Stars (★★★★★) show how often interviewers ask about a topic — five stars means it comes up most.
      </p>
      <div className="grid grid-2">
        {contentIndex.tracks.map(track => {
          const topics = orderedTopics(track.id)
          const s = progressStats(data.progress, topics.map(t => t.id))
          const nextUp = nextUpForTrack(track.id)
          return (
            <div key={track.id} className="card">
              <h2 style={{ marginTop: 0 }}><Link to={`/learn/${track.id}`}>{track.title}</Link> {track.comingSoon && <span className="badge warn">Coming Soon</span>}</h2>
              <p style={{ color: 'var(--muted)' }}>{track.description}</p>
              {topics.length > 0 && (
                <div style={{ marginBottom: 10 }}>
                  <ProgressBar pct={s.pct} label={`${s.pct}% complete in ${track.title}`} />
                  <small>{s.completed}/{s.total} complete{s.inProgress > 0 ? ` · ${s.inProgress} in progress` : ''} · {s.pct}%</small>
                </div>
              )}
              <ul>{track.sections.map(s2 => <li key={s2.id}>{s2.title}{s2.description ? ` — ${s2.description}` : ''}</li>)}</ul>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
                <Link className="btn secondary" to={`/learn/${track.id}`}>Open track →</Link>
                {nextUp && <Link className="btn" to={topicUrl(nextUp)}>{s.completed === 0 && s.inProgress === 0 ? 'Start: ' : s.completed === s.total ? 'Review: ' : 'Continue: '}{nextUp.title} →</Link>}
              </div>
            </div>
          )
        })}
      </div>
      <div className="card" style={{ marginTop: 16 }}>
        <h2 style={{ marginTop: 0 }}>Curated learning paths</h2>
        {contentIndex.paths.map(p => {
          const s = progressStats(data.progress, p.topicIds)
          const nextUp = p.topicIds.map(id => getTopic(id)).find(t => t && data.progress[t.id] !== 'completed')
          return (
            <div key={p.id} style={{ marginBottom: 20 }}>
              <strong>{p.title}</strong> — {p.description}
              <div style={{ marginTop: 6 }}>
                <ProgressBar pct={s.pct} label={`${s.pct}% complete in ${p.title}`} />
                <small>{s.completed}/{s.total} complete · {s.pct}%{nextUp ? <> · Next up: <Link to={topicUrl(nextUp)}>{nextUp.title}</Link></> : ' · All complete — nice work.'}</small>
              </div>
              <ol>{p.topicIds.map(id => { const t = getTopic(id); return t ? <li key={id}><Link to={topicUrl(t)}>{t.title}</Link>{data.progress[t.id] === 'completed' ? ' ✓' : ''}</li> : null })}</ol>
              {p.id === 'beginner-roadmap' && nextUp && <p><Link className="btn" to={topicUrl(nextUp)}>Start here: {nextUp.title} →</Link></p>}
            </div>
          )
        })}
        {contentIndex.paths.length === 0 && <p style={{ color: 'var(--muted)' }}>Learning paths are built from prerequisites and tags as content grows. Check back after the next content batch.</p>}
      </div>
    </div>
  )
}

export function TrackPage() {
  const { trackId } = useParams()
  const { data } = useApp()
  const track = trackId ? getTrack(trackId) : undefined
  if (!track) return <div><h1>Track not found</h1><p>This track does not exist. Use Learn to browse available tracks.</p><Link to="/learn">← Back to Learn</Link></div>
  const allTopics = orderedTopics(track.id)
  const stats = progressStats(data.progress, allTopics.map(t => t.id))
  const nextUp = allTopics.find(t => data.progress[t.id] !== 'completed')
  return (
    <div>
      <Breadcrumb items={[{ label: 'Home', to: '/' }, { label: 'Learn', to: '/learn' }, { label: track.title }]} />
      <h1>{track.title} {track.comingSoon && <span className="badge warn">Coming Soon</span>}</h1>
      <p style={{ color: 'var(--muted)' }}>{track.description}</p>
      <p style={{ color: 'var(--muted)', fontSize: '0.9rem' }}>Work through the sections in order. Stars (★★★★★) show how often interviewers ask about a topic — five stars means it comes up most. “Not started / In progress / Completed” is your own progress; every topic here is ready to read.</p>
      {allTopics.length > 0 && (
        <div className="card" style={{ marginBottom: 16 }}>
          <ProgressBar pct={stats.pct} label={`${stats.pct}% complete in ${track.title}`} />
          <p style={{ margin: '8px 0 0' }}>{stats.completed}/{stats.total} complete{stats.inProgress > 0 ? ` · ${stats.inProgress} in progress` : ''} · {stats.pct}%</p>
          {nextUp
            ? <Link className="btn" to={topicUrl(nextUp)}>{stats.completed === 0 && stats.inProgress === 0 ? 'Start learning: ' : 'Continue: '}{nextUp.title} →</Link>
            : <p style={{ margin: '8px 0 0' }}>All topics complete — pick any topic below to revise, or <Link to="/learn">browse another track</Link>.</p>}
        </div>
      )}
      {track.comingSoon && <div className="card" style={{ background: 'var(--accent-soft)' }}><strong>Coming Soon</strong><p>This track is a polished placeholder. Its planned sections are below, and it can be filled later with content only — no component changes needed.</p></div>}
      <div className="grid" style={{ marginTop: 16 }}>
        {track.sections.map(sec => {
          const topics = topicsForSection(track.id, sec.id)
          const secStats = progressStats(data.progress, topics.map(t => t.id))
          return (
            <div key={sec.id} className="card">
              <h2 style={{ marginTop: 0 }}>{sec.title}{topics.length > 0 && <small style={{ color: 'var(--muted)', fontWeight: 400, marginLeft: 8 }}>{secStats.completed}/{secStats.total} complete</small>}</h2>
              {sec.description && <p style={{ color: 'var(--muted)' }}>{sec.description}</p>}
              {topics.length === 0 ? (
                <div>
                  <p style={{ color: 'var(--muted)' }}>Planned topics:</p>
                  <ul>{(sec.plannedTopics || []).map(t => <li key={t}>{t}</li>)}</ul>
                  {(!sec.plannedTopics || sec.plannedTopics.length === 0) && <p style={{ color: 'var(--muted)' }}>Content for this section is planned and will appear here.</p>}
                </div>
              ) : (
                <ul>{topics.map(t => {
                  const st = data.progress[t.id]
                  return (
                    <li key={t.id}><Link to={topicUrl(t)}>{t.title}</Link> — {t.difficulty} · <span title="How often interviewers ask about this topic"><span aria-hidden="true">{'★'.repeat(t.importance)}{'☆'.repeat(5 - t.importance)}</span><span className="sr-only">Importance {t.importance} of 5</span></span> · {t.readingMinutes} min · <span style={{ color: st === 'completed' ? 'var(--accent)' : 'var(--muted)', fontSize: '0.9rem' }}>{userStatusLabel(st)}</span></li>
                  )
                })}</ul>
              )}
            </div>
          )
        })}
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 20, alignItems: 'center' }}>
        <Link className="btn secondary" to="/learn">← Back to Learn</Link>
        {nextUp && <Link className="btn" to={topicUrl(nextUp)}>Continue: {nextUp.title} →</Link>}
        {!nextUp && allTopics.length > 0 && <Link className="btn secondary" to={topicUrl(allTopics[0])}>Revise from the first topic →</Link>}
      </div>
    </div>
  )
}

function Section({ title, children, defaultOpen = true }: { title: string; children: React.ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen)
  const panelId = `section-${title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}`
  return (
    <section style={{ marginBottom: 8 }}>
      <button className="btn secondary" style={{ width: '100%', justifyContent: 'space-between' }} onClick={() => setOpen(!open)} aria-expanded={open} aria-controls={panelId}>
        <span>{title}</span><ChevronDown size={16} style={{ transform: open ? 'rotate(180deg)' : 'none' }} />
      </button>
      {open && <div id={panelId} style={{ padding: '8px 4px' }}>{children}</div>}
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
  const [copied, setCopied] = useState<'idle' | 'copied' | 'failed'>('idle')
  const [showBackToTop, setShowBackToTop] = useState(false)
  const copyTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => () => { if (copyTimer.current) clearTimeout(copyTimer.current) }, [])

  // Back-to-top appears only after scrolling past the first screen of a
  // long topic; it is a real button, not an anchor, so it never adds a hash.
  useEffect(() => {
    const onScrollTop = () => setShowBackToTop(window.scrollY > 600)
    window.addEventListener('scroll', onScrollTop, { passive: true })
    onScrollTop()
    return () => window.removeEventListener('scroll', onScrollTop)
  }, [])

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: smoothScrollBehavior() })
  }

  const copyTopicLink = async () => {
    if (!topic) return
    const url = `${window.location.origin}${topicUrl(topic)}`
    let ok = false
    try {
      if (navigator.clipboard && window.isSecureContext) { await navigator.clipboard.writeText(url); ok = true }
    } catch { /* fall through to textarea fallback */ }
    if (!ok) {
      try {
        const ta = document.createElement('textarea')
        ta.value = url
        ta.style.position = 'fixed'; ta.style.opacity = '0'
        document.body.appendChild(ta); ta.select()
        ok = document.execCommand('copy')
        document.body.removeChild(ta)
      } catch { ok = false }
    }
    setCopied(ok ? 'copied' : 'failed')
    if (copyTimer.current) clearTimeout(copyTimer.current)
    copyTimer.current = setTimeout(() => setCopied('idle'), 2500)
  }

  useEffect(() => {
    if (!topic) return
    markViewed(topic.id)
    window.scrollTo(0, 0)
    setBody(null); setError(null)
    loadTopicBody(topic).then(raw => setBody(stripFrontmatter(raw))).catch(e => setError(String(e.message || e)))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [topicId])

  // Revision body first: the TOC must list only the headings actually
  // rendered. Previously it always listed the full body, so in Quick
  // Revision Mode most TOC links pointed at headings that were not on
  // the page and did nothing.
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

  const displayedBody = revisionMode ? revisionBody : (body || '')
  const headings = useMemo(() => {
    if (!displayedBody) return []
    return displayedBody.split('\n').filter(l => l.startsWith('## ')).map(l => l.replace('## ', '').trim())
  }, [displayedBody])

  useEffect(() => {
    const onScroll = () => {
      // Simple scroll-spy: find last heading above viewport. The id must
      // match MarkdownView exactly (bare slug, no 'heading-' prefix, dashes
      // trimmed) — the old 'heading-' prefix matched no element, so the
      // active TOC entry never updated on scroll, only on click.
      const els = headings.map(h => document.getElementById(h.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''))).filter(Boolean) as HTMLElement[]
      let current = ''
      for (const el of els) if (el.getBoundingClientRect().top < 120) current = el.dataset.heading || ''
      if (current) setActiveHeading(current)
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [headings])

  if (!topic) return <div><h1>Topic not found</h1><p>That topic does not exist in this content set. It may be a planned placeholder — check its track page.</p><Link to="/learn">← Back to Learn</Link></div>
  if (topic.track !== trackId || topic.section !== sectionId) return <div><h1>Topic not found</h1><p>This topic exists, but not at this track/section address — the URL does not match the topic. Use the link below to reach it at its correct address.</p><p><Link to={topicUrl(topic)}>Go to {topic.title} →</Link></p><p><Link to="/learn">← Back to Learn</Link></p></div>
  const { prev, next } = prevNextTopic(topic)
  const status = data.progress[topic.id] || 'not-started'
  const isBookmarked = data.bookmarks.includes(topic.id)
  const isFavorite = data.favorites.includes(topic.id)
  const track = getTrack(topic.track)
  return (
    <div>
      <Breadcrumb items={[{ label: 'Home', to: '/' }, { label: 'Learn', to: '/learn' }, { label: track?.title || topic.track, to: `/learn/${topic.track}` }, { label: topic.title }]} />
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
        <span title="Interview importance"><Star size={14} aria-hidden="true" /> <span aria-hidden="true">{'★'.repeat(topic.importance)}{'☆'.repeat(5 - topic.importance)}</span><span className="sr-only">Importance {topic.importance} of 5</span></span> {' '}
        <span><Clock size={14} /> {topic.readingMinutes} min</span> {' '}
        {topic.lastUpdated && <span>Updated {formatDate(topic.lastUpdated)}</span>}
      </p>
      {topic.tags.length > 0 && <p>{topic.tags.map(t => <span key={t} className="badge" style={{ marginRight: 6 }}>{t}</span>)}</p>}

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, margin: '12px 0' }}>
        <label>Progress: <select className="select" style={{ width: 'auto' }} value={status} onChange={e => setProgress(topic.id, e.target.value as never)} aria-label="Topic progress">
          <option value="not-started">Not Started</option><option value="in-progress">In Progress</option><option value="completed">Completed</option>
        </select></label>
        <button className="btn secondary small" onClick={() => toggleList('bookmarks', topic.id)}><Bookmark size={15} /> {isBookmarked ? 'Bookmarked ✓' : 'Bookmark'}</button>
        <button className="btn secondary small" onClick={() => toggleList('favorites', topic.id)}><Star size={15} /> {isFavorite ? 'Favorite ✓' : 'Favorite'}</button>
        <button className="btn secondary small" onClick={() => setRevisionMode(!revisionMode)}>{revisionMode ? 'Full study view' : 'Quick Revision Mode'}</button>
        <button className="btn secondary small" onClick={copyTopicLink} aria-live="polite"><Link2 size={15} /> {copied === 'copied' ? 'Link copied ✓' : copied === 'failed' ? 'Copy failed — copy the URL from the address bar' : 'Copy link'}</button>
      </div>
      {revisionMode && <p style={{ color: 'var(--muted)', fontSize: '0.9rem', marginTop: 0 }}>Quick Revision Mode shows only the short version — Overview, Key Concepts, Common Mistakes, Interview Questions and Revision Summary. Switch back to Full study view for the complete topic, including code examples.</p>}
      {!revisionMode && <p style={{ color: 'var(--muted)', fontSize: '0.9rem', marginTop: 0 }}>Quick Revision Mode shows a short version of this topic for revising before an interview. The stars above show how often interviewers ask about this topic.</p>}

      <div className="topic-layout">
        <div>
          {error && <div className="card" role="alert">Could not load this topic: {error}</div>}
          {!body && !error && <div><div className="skeleton" style={{ height: 24, marginBottom: 10 }} /><div className="skeleton" /><div className="skeleton" style={{ marginTop: 8 }} /></div>}
          {body && <MarkdownView markdown={revisionMode ? revisionBody : body} />}

          <Section title="Personal notes">
            <p style={{ color: 'var(--muted)', fontSize: '0.9rem' }}>Write what clicked, what confused you, or a link to your own example. Notes are saved in this browser only, as you type — there is no Save button.</p>
            <textarea className="textarea" rows={5} maxLength={MAX_NOTE_LENGTH} value={data.notes[topic.id] || ''} onChange={e => setNote(topic.id, e.target.value)} placeholder="Your notes for this topic…" aria-label="Personal notes for this topic" />
            <p style={{ color: 'var(--muted)', fontSize: '0.85rem', margin: '4px 0 0' }}>{(data.notes[topic.id] || '').length.toLocaleString()} / {MAX_NOTE_LENGTH.toLocaleString()} characters · Saved as you type</p>
          </Section>

          <Section title="Prerequisites & related topics">
            <p><strong>Prerequisites:</strong> {topic.prerequisites.length ? topic.prerequisites.map(id => { const t = getTopic(id); return t ? <span key={id} style={{ marginRight: 8 }}><Link to={topicUrl(t)}>{t.title}</Link></span> : id }) : 'None listed — this is a good starting point.'}</p>
            <p><strong>Related:</strong> {topic.related.length ? topic.related.map(id => { const t = getTopic(id); return t ? <span key={id} style={{ marginRight: 8 }}><Link to={topicUrl(t)}>{t.title}</Link></span> : id }) : 'None listed yet.'}</p>
          </Section>

          <div className="topic-nav-bottom">
            {prev ? <Link to={topicUrl(prev)}><ArrowLeft size={15} /> {prev.title}</Link> : <span />}
            {next ? <Link to={topicUrl(next)}>{next.title} <ArrowRight size={15} /></Link> : <span />}
          </div>
          <div className="topic-bottom-actions">
            <Link className="btn secondary small" to={`/learn/${topic.track}`}>← Back to {track?.title || 'track'}</Link>
            <button className="btn secondary small" onClick={scrollToTop}><ArrowUp size={15} /> Back to top</button>
            {next && <Link className="btn" to={topicUrl(next)}>Next: {next.title} →</Link>}
            {!next && <Link className="btn secondary" to="/learn">Browse another track →</Link>}
          </div>
        </div>
        <aside className="toc" aria-label="Table of contents">
          <strong>On this page</strong>
          {headings.map(h => {
            const id = h.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
            return <a key={h} href={`#${id}`} onClick={e => { e.preventDefault(); setActiveHeading(h); const el = document.getElementById(id); el?.scrollIntoView({ behavior: smoothScrollBehavior(), block: 'start' }); el?.focus({ preventScroll: true }) }} className={activeHeading === h ? 'active' : ''}>{h}</a>
          })}
          {headings.length === 0 && <p style={{ color: 'var(--muted)', fontSize: '0.9rem' }}>Headings will appear here when content loads.</p>}
          <div style={{ marginTop: 16 }}>
            <strong>Learning path</strong>
            <p style={{ fontSize: '0.9rem', color: 'var(--muted)' }}>{prev ? `Previous: ${prev.title}` : 'First topic in this track'}<br />Current: {topic.title}<br />{next ? `Next: ${next.title}` : 'Last topic in this track'}</p>
          </div>
        </aside>
      </div>
      {showBackToTop && (
        <button className="back-to-top" onClick={scrollToTop} aria-label="Back to top"><ArrowUp size={18} /> Back to top</button>
      )}
    </div>
  )
}

export function LearnRoutes() { return null }
