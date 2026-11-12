import React, { useEffect, useMemo, useRef, useState } from 'react'
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { BookOpen, Coffee, Home, Library, Search, Settings, Target, Layers, GraduationCap, PenLine, FileText } from 'lucide-react'
import { contentIndex, getTopic, getTrack, useFullContent, useRevisionPrompts } from '../lib/content'
import { searchScore, topicUrl } from '../lib/utils'
import { useApp } from '../store/AppContext'

const NAV = [
  { to: '/', label: 'Home', icon: Home },
  { to: '/learn', label: 'Learn', icon: BookOpen },
  { to: '/interview', label: 'Interview Prep', icon: GraduationCap },
  { to: '/practice', label: 'Practice', icon: Target },
  { to: '/cheatsheets', label: 'Revision & Cheatsheets', icon: FileText },
  { to: '/library', label: 'My Library', icon: Library },
  { to: '/settings', label: 'Settings', icon: Settings },
]

export function Layout() {
  const [paletteOpen, setPaletteOpen] = useState(false)
  const [query, setQuery] = useState('')
  const location = useLocation()
  const navigate = useNavigate()
  const { storageError, dismissStorageError } = useApp()
  const paletteRef = useRef<HTMLDivElement>(null)
  const searchBtnRef = useRef<HTMLButtonElement>(null)

  // Dismissing the palette returns focus to the button that opened it;
  // navigating from it moves focus to the new page instead, so focus
  // is never left on an unmounted button (which drops it to <body>).
  const closePalette = () => {
    setPaletteOpen(false)
    requestAnimationFrame(() => searchBtnRef.current?.focus())
  }
  const navigateAndClose = (to: string) => {
    navigate(to)
    setPaletteOpen(false)
    setTimeout(() => document.getElementById('main-content')?.focus(), 0)
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setPaletteOpen(v => !v) }
      if (e.key === '/' && !(e.target instanceof HTMLInputElement) && !(e.target instanceof HTMLTextAreaElement)) { e.preventDefault(); setPaletteOpen(true) }
      if (e.key === 'Escape') closePalette()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Focus trap for the palette dialog: it has role="dialog" but Tab
  // used to walk straight out into the page behind it.
  useEffect(() => {
    if (!paletteOpen) return
    const el = paletteRef.current
    if (!el) return
    const onTab = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return
      const focusables = [...el.querySelectorAll<HTMLElement>('button, input, a[href], [tabindex]:not([tabindex="-1"])')]
        .filter(n => !n.hasAttribute('disabled') && n.offsetParent !== null)
      if (focusables.length === 0) return
      const first = focusables[0]
      const last = focusables[focusables.length - 1]
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus() }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus() }
    }
    document.addEventListener('keydown', onTab)
    return () => document.removeEventListener('keydown', onTab)
  }, [paletteOpen])

  // Sidebar shows only the active track's tree when on a learn page, otherwise all tracks collapsed
  const activeTrackId = useMemo(() => {
    const m = location.pathname.match(/^\/learn\/([^/]+)/)
    return m ? m[1] : null
  }, [location.pathname])

  // Heavy interview/practice data loads only when the palette is open,
  // so the app shell's initial bundle stays slim (2026-11-09 chunk fix).
  const { interviewQuestions, practiceItems, loaded: fullLoaded } = useFullContent(paletteOpen)
  const { prompts: revisionPrompts, loaded: revisionLoaded } = useRevisionPrompts(paletteOpen)
  const allLoaded = fullLoaded && revisionLoaded
  const results = useMemo(() => {
    if (!query.trim()) return []
    const q = query.trim()
    const scored: { label: string; detail: string; to: string; score: number }[] = []
    for (const t of contentIndex.topics) {
      const s = Math.max(searchScore(q, t.title), searchScore(q, t.summary), searchScore(q, t.tags.join(' ')))
      if (s > 0) scored.push({ label: t.title, detail: `${getTrack(t.track)?.title || t.track} · ${t.difficulty}`, to: topicUrl(t), score: s })
    }
    for (const qq of interviewQuestions) {
      const s = searchScore(q, qq.question + ' ' + qq.category)
      if (s > 0) scored.push({ label: qq.question, detail: `Interview · ${qq.category}`, to: `/interview/question/${qq.id}`, score: s })
    }
    for (const rp of revisionPrompts) {
      const s = searchScore(q, rp.question + ' ' + (rp.title || ''))
      if (s > 0) scored.push({ label: rp.question, detail: `One-minute revision · ${rp.topicId ? (getTopic(rp.topicId)?.title || rp.topicId) : 'General'}`, to: `/cheatsheets#rev-${rp.id}`, score: s })
    }
    for (const c of contentIndex.cheatsheets) {
      const s = searchScore(q, c.title)
      if (s > 0) scored.push({ label: c.title, detail: 'Cheatsheet', to: `/cheatsheets/${c.id}`, score: s })
    }
    for (const item of practiceItems.filter(i => i.type === 'mcq')) {
      const s = searchScore(q, (item.prompt || '') + ' ' + (item.title || ''))
      // Deep-link to the card itself: the old generic /practice?tab=mcq
      // landed at the top of a 60-question list and the user had to
      // hunt for the question they had just clicked.
      if (s > 0) scored.push({ label: item.prompt || item.title, detail: 'Practice MCQ', to: `/practice?tab=mcq#practice-${item.id}`, score: s })
    }
    return scored.sort((a, b) => b.score - a.score).slice(0, 20)
  }, [query, interviewQuestions, practiceItems, revisionPrompts])

  // First topic of the Beginner Roadmap, for the palette's Start here action.
  const beginnerFirstTopic = useMemo(() => {
    const path = contentIndex.paths.find(p => p.id === 'beginner-roadmap')
    return path ? getTopic(path.topicIds[0]) : undefined
  }, [])

  return (
    <div className="app-shell">
      {/* Skip link: without this, keyboard users Tab through the whole
          sidebar on every page before reaching the content. */}
      <a href="#main-content" className="skip-link">Skip to main content</a>
      <aside className="sidebar" aria-label="Primary navigation">
        <Link to="/" className="brand" style={{ textDecoration: 'none' }}><Coffee size={26} color="#0f766e" /> Bean<span>stack</span></Link>
        <p style={{ color: 'var(--muted)', fontSize: '0.9rem' }}>Learn Java, practise, and prepare for interviews — your progress is saved in this browser only.</p>
        <nav style={{ display: 'grid', gap: 2, marginTop: 12 }}>
          {NAV.map(n => (
            <NavLink key={n.to} to={n.to} end={n.to === '/'} className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}><n.icon size={17} /> {n.label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-tracks" style={{ marginTop: 20 }}>
          <h3 style={{ fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--muted)' }}><Layers size={14} style={{ verticalAlign: 'middle' }} /> Tracks</h3>
          {contentIndex.tracks.map(track => {
            const isActive = track.id === activeTrackId
            return (
              <div key={track.id} style={{ marginBottom: 10 }}>
                <NavLink to={`/learn/${track.id}`} className={({ isActive: navActive }) => `nav-link${navActive ? ' active' : ''}`} style={{ fontWeight: isActive ? 700 : 400 }}>
                  {track.title} {track.comingSoon && <span className="badge warn">Coming Soon</span>}
                </NavLink>
                {isActive && track.sections.map(sec => (
                  <div key={sec.id} style={{ marginLeft: 12 }}>
                    <div style={{ fontSize: '0.85rem', fontWeight: 600, marginTop: 6 }}>{sec.title}</div>
                    {contentIndex.topics.filter(t => t.track === track.id && t.section === sec.id).map(t => (
                      <NavLink key={t.id} to={topicUrl(t)} className={({ isActive: navActive }) => `nav-link${navActive ? ' active' : ''}`} style={{ fontSize: '0.9rem', paddingLeft: 10 }}>{t.title}</NavLink>
                    ))}
                    {contentIndex.topics.filter(t => t.track === track.id && t.section === sec.id).length === 0 && (
                      <div style={{ fontSize: '0.85rem', color: 'var(--muted)', paddingLeft: 10 }}>Planned — coming soon</div>
                    )}
                  </div>
                ))}
              </div>
            )
          })}
        </div>
      </aside>
      <div className="main">
        <header className="topbar">
          <button ref={searchBtnRef} className="btn secondary" onClick={() => setPaletteOpen(true)} aria-label="Open search and command palette" aria-haspopup="dialog">
            <Search size={17} /> Search <span className="kbd">Ctrl/Cmd+K</span>
          </button>
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, alignItems: 'center' }}>
            <Link to="/library" className="btn secondary small"><PenLine size={15} /> My Library</Link>
          </div>
        </header>
        {storageError && (
          <div className="save-error-banner" role="alert">
            <span><strong>Couldn&apos;t save your progress in this browser</strong> — storage is full or blocked. Your work is kept for this session only and will be lost if you close the tab. <Link to="/settings">Export your data now</Link>, then free up browser storage.</span>
            <button className="btn secondary small" onClick={dismissStorageError}>Dismiss</button>
          </div>
        )}
        <main className="container" id="main-content" tabIndex={-1}>
          <Outlet />
        </main>
      </div>
      {paletteOpen && (
        <div className="palette-backdrop" onClick={closePalette} role="presentation">
          <div ref={paletteRef} className="palette" role="dialog" aria-modal="true" aria-label="Search and command palette" onClick={e => e.stopPropagation()}>
            <input autoFocus className="input" placeholder="Search topics, interview questions, practice MCQs, cheatsheets…" aria-label="Search topics, interview questions, practice MCQs, and cheatsheets" value={query} onChange={e => setQuery(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && results[0]) { navigateAndClose(results[0].to) } }} />
            <div style={{ marginTop: 10, display: 'grid', gap: 4 }}>
              {query.trim() === '' && (
                <>
                  {beginnerFirstTopic && <button className="btn" style={{ justifyContent: 'flex-start' }} onClick={() => navigateAndClose(topicUrl(beginnerFirstTopic))}>Start here: {beginnerFirstTopic.title} (Beginner Roadmap)</button>}
                  <button className="btn secondary" style={{ justifyContent: 'flex-start' }} onClick={() => navigateAndClose('/learn')}>Go to Learn</button>
                  <button className="btn secondary" style={{ justifyContent: 'flex-start' }} onClick={() => navigateAndClose('/interview')}>Go to Interview Prep</button>
                  <button className="btn secondary" style={{ justifyContent: 'flex-start' }} onClick={() => navigateAndClose('/practice')}>Go to Practice</button>
                  <button className="btn secondary" style={{ justifyContent: 'flex-start' }} onClick={() => navigateAndClose('/cheatsheets')}>Go to Revision &amp; Cheatsheets</button>
                  <button className="btn secondary" style={{ justifyContent: 'flex-start' }} onClick={() => navigateAndClose('/library')}>Go to My Library</button>
                  <button className="btn secondary" style={{ justifyContent: 'flex-start' }} onClick={() => navigateAndClose('/search')}>Go to full Search page</button>
                  <button className="btn secondary" style={{ justifyContent: 'flex-start' }} onClick={() => navigateAndClose('/')}>Go to Home dashboard</button>
                </>
              )}
              {query.trim() !== '' && allLoaded && results.length > 0 && <p style={{ color: 'var(--muted)' }}>{results.length} result{results.length === 1 ? '' : 's'}{results.length === 20 ? ' (showing the top 20 — narrow your search for more)' : ''}.</p>}
              {results.map(r => (
                <button key={r.to + r.label} className="btn secondary" style={{ justifyContent: 'flex-start', textAlign: 'left' }} onClick={() => navigateAndClose(r.to)}>
                  <span><strong>{r.label}</strong><br /><span style={{ fontWeight: 400, color: 'var(--muted)', fontSize: '0.85rem' }}>{r.detail}</span></span>
                </button>
              ))}
              {query.trim() !== '' && !allLoaded && <p style={{ color: 'var(--muted)' }}>Loading interview questions and practice MCQs…</p>}
              {query.trim() !== '' && allLoaded && results.length === 0 && <p style={{ color: 'var(--muted)' }}>No matches yet. Try a broader term, or browse Learn — new content is added section by section.</p>}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
