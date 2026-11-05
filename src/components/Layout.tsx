import React, { useEffect, useMemo, useState } from 'react'
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { BookOpen, Coffee, Home, Library, Search, Settings, Target, Layers, GraduationCap, PenLine, FileText } from 'lucide-react'
import { contentIndex, getTrack } from '../lib/content'
import { searchScore, topicUrl } from '../lib/utils'

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

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setPaletteOpen(v => !v) }
      if (e.key === '/' && !(e.target instanceof HTMLInputElement) && !(e.target instanceof HTMLTextAreaElement)) { e.preventDefault(); setPaletteOpen(true) }
      if (e.key === 'Escape') setPaletteOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  // Sidebar shows only the active track's tree when on a learn page, otherwise all tracks collapsed
  const activeTrackId = useMemo(() => {
    const m = location.pathname.match(/^\/learn\/([^/]+)/)
    return m ? m[1] : null
  }, [location.pathname])

  const results = useMemo(() => {
    if (!query.trim()) return []
    const q = query.trim()
    const scored: { label: string; detail: string; to: string; score: number }[] = []
    for (const t of contentIndex.topics) {
      const s = Math.max(searchScore(q, t.title), searchScore(q, t.summary), searchScore(q, t.tags.join(' ')))
      if (s > 0) scored.push({ label: t.title, detail: `${getTrack(t.track)?.title || t.track} · ${t.difficulty}`, to: topicUrl(t), score: s })
    }
    for (const qq of contentIndex.interviewQuestions) {
      const s = searchScore(q, qq.question + ' ' + qq.category)
      if (s > 0) scored.push({ label: qq.question, detail: `Interview · ${qq.category}`, to: `/interview/question/${qq.id}`, score: s })
    }
    for (const c of contentIndex.cheatsheets) {
      const s = searchScore(q, c.title)
      if (s > 0) scored.push({ label: c.title, detail: 'Cheatsheet', to: `/cheatsheets/${c.id}`, score: s })
    }
    for (const item of contentIndex.practiceItems.filter(i => i.type === 'mcq')) {
      const s = searchScore(q, (item.prompt || '') + ' ' + (item.title || ''))
      if (s > 0) scored.push({ label: item.prompt || item.title, detail: 'Practice MCQ', to: '/practice?tab=mcq', score: s })
    }
    return scored.sort((a, b) => b.score - a.score).slice(0, 20)
  }, [query])

  return (
    <div className="app-shell">
      <aside className="sidebar" aria-label="Primary navigation">
        <Link to="/" className="brand" style={{ textDecoration: 'none' }}><Coffee size={26} color="#0f766e" /> Bean<span>stack</span></Link>
        <p style={{ color: 'var(--muted)', fontSize: '0.9rem' }}>Java full stack wiki &amp; interview prep. Frontend only — your data stays in this browser.</p>
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
          <button className="btn secondary" onClick={() => setPaletteOpen(true)} aria-label="Open search and command palette">
            <Search size={17} /> Search <span className="kbd">Ctrl/Cmd+K</span>
          </button>
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, alignItems: 'center' }}>
            <Link to="/library" className="btn secondary small"><PenLine size={15} /> My Library</Link>
          </div>
        </header>
        <main className="container">
          <Outlet />
        </main>
      </div>
      {paletteOpen && (
        <div className="palette-backdrop" onClick={() => setPaletteOpen(false)} role="presentation">
          <div className="palette" role="dialog" aria-label="Search and command palette" onClick={e => e.stopPropagation()}>
            <input autoFocus className="input" placeholder="Search topics, interview questions, practice MCQs, cheatsheets…  ( / focuses search )" aria-label="Search topics, interview questions, practice MCQs, and cheatsheets" value={query} onChange={e => setQuery(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && results[0]) { navigate(results[0].to); setPaletteOpen(false) } }} />
            <div style={{ marginTop: 10, display: 'grid', gap: 4 }}>
              {query.trim() === '' && (
                <>
                  <button className="btn secondary" style={{ justifyContent: 'flex-start' }} onClick={() => { navigate('/learn'); setPaletteOpen(false) }}>Go to Learn</button>
                  <button className="btn secondary" style={{ justifyContent: 'flex-start' }} onClick={() => { navigate('/interview'); setPaletteOpen(false) }}>Go to Interview Prep</button>
                  <button className="btn secondary" style={{ justifyContent: 'flex-start' }} onClick={() => { navigate('/practice'); setPaletteOpen(false) }}>Go to Practice</button>
                  <button className="btn secondary" style={{ justifyContent: 'flex-start' }} onClick={() => { navigate('/cheatsheets'); setPaletteOpen(false) }}>Go to Revision &amp; Cheatsheets</button>
                  <button className="btn secondary" style={{ justifyContent: 'flex-start' }} onClick={() => { navigate('/library'); setPaletteOpen(false) }}>Go to My Library</button>
                  <button className="btn secondary" style={{ justifyContent: 'flex-start' }} onClick={() => { navigate('/search'); setPaletteOpen(false) }}>Go to full Search page</button>
                  <button className="btn secondary" style={{ justifyContent: 'flex-start' }} onClick={() => { navigate('/'); setPaletteOpen(false) }}>Go to Home dashboard</button>
                </>
              )}
              {results.map(r => (
                <button key={r.to + r.label} className="btn secondary" style={{ justifyContent: 'flex-start', textAlign: 'left' }} onClick={() => { navigate(r.to); setPaletteOpen(false) }}>
                  <span><strong>{r.label}</strong><br /><span style={{ fontWeight: 400, color: 'var(--muted)', fontSize: '0.85rem' }}>{r.detail}</span></span>
                </button>
              ))}
              {query.trim() !== '' && results.length === 0 && <p style={{ color: 'var(--muted)' }}>No matches yet. Try a broader term, or browse Learn — new content is added section by section.</p>}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
