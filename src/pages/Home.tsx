import React, { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { Bookmark, Calendar, Flame, ArrowRight, BookOpen, Layers } from 'lucide-react'
import { contentIndex, getTopic, orderedTopics } from '../lib/content'
import { useApp } from '../store/AppContext'
import { isDue, progressStats, studyStreak, topicUrl } from '../lib/utils'

export function Home() {
  const { data, setInterviewDate } = useApp()
  const completeTopics = contentIndex.topics.filter(t => t.status === 'complete')
  const stats = progressStats(data.progress, completeTopics.map(t => t.id))
  const streak = studyStreak(data.activityDates)
  const dueFlashcards = contentIndex.practiceItems.filter(i => i.type === 'flashcard').filter(i => {
    const st = data.flashcardStates[i.id]
    return !st || isDue(st.dueAt)
  }).length

  const continueTopic = data.recentlyViewed.map(id => getTopic(id)).find(Boolean)
  const todaysFocus = useMemo(() => {
    // Next topic on beginner path that is not completed, else highest-importance unstarted complete topic
    const path = contentIndex.paths.find(p => p.id === 'beginner-roadmap')
    if (path) {
      const next = path.topicIds.map(id => getTopic(id)).find(t => t && data.progress[t.id] !== 'completed')
      if (next) return next
    }
    return completeTopics.filter(t => data.progress[t.id] !== 'completed').sort((a, b) => b.importance - a.importance)[0]
  }, [data.progress, completeTopics])

  const interviewCountdown = data.interviewDate ? Math.max(0, Math.ceil((new Date(data.interviewDate).getTime() - Date.now()) / 86400000)) : null
  const notDoneImportant = completeTopics.filter(t => data.progress[t.id] !== 'completed').sort((a, b) => b.importance - a.importance).slice(0, 5)

  return (
    <div className="grid" style={{ gap: 18 }}>
      <div>
        <h1 style={{ margin: '0 0 4px' }}>Welcome back to Beanstack</h1>
        <p style={{ color: 'var(--muted)', margin: 0 }}>Learn Java, practice, revise, and track your progress — all in one place, stored only in this browser.</p>
      </div>

      <div className="grid grid-3">
        <div className="card"><div style={{ color: 'var(--muted)', fontSize: '0.85rem' }}>Topics completed</div><div style={{ fontSize: '1.8rem', fontWeight: 800 }}>{stats.completed} / {stats.total}</div><div className="progress-bar" style={{ marginTop: 8 }}><div style={{ width: `${stats.pct}%` }} /></div></div>
        <div className="card"><div style={{ color: 'var(--muted)', fontSize: '0.85rem' }}><Flame size={14} /> Study streak</div><div style={{ fontSize: '1.8rem', fontWeight: 800 }}>{streak} day{streak === 1 ? '' : 's'}</div><div style={{ color: 'var(--muted)', fontSize: '0.9rem' }}>{data.bookmarks.length} bookmarks · {data.favorites.length} favorites</div></div>
        <div className="card"><div style={{ color: 'var(--muted)', fontSize: '0.85rem' }}>Flashcards due today</div><div style={{ fontSize: '1.8rem', fontWeight: 800 }}>{dueFlashcards}</div><Link to="/practice?tab=flashcards">Review flashcards →</Link></div>
      </div>

      <div className="grid grid-2">
        <div className="card">
          <h2 style={{ marginTop: 0 }}>Today&apos;s focus</h2>
          {todaysFocus ? (
            <>
              <Link to={topicUrl(todaysFocus)}><strong>{todaysFocus.title}</strong></Link>
              <p style={{ color: 'var(--muted)' }}>{todaysFocus.summary || 'A key Java topic on your path.'} · {todaysFocus.readingMinutes} min · {'★'.repeat(todaysFocus.importance)}</p>
              <Link className="btn" to={topicUrl(todaysFocus)}>Continue learning <ArrowRight size={16} /></Link>
            </>
          ) : <p>All complete topics are done — great work. New content batches will add more topics here.</p>}
          {continueTopic && <p style={{ marginTop: 12 }}>Continue: <Link to={topicUrl(continueTopic)}>{continueTopic.title}</Link></p>}
        </div>
        <div className="card">
          <h2 style={{ marginTop: 0 }}><Calendar size={18} /> Interview countdown</h2>
          <p style={{ color: 'var(--muted)' }}>Set an interview date to surface the highest-importance topics still not done.</p>
          <input className="input" type="date" value={data.interviewDate || ''} onChange={e => setInterviewDate(e.target.value || null)} aria-label="Interview date" />
          {interviewCountdown !== null && <p><strong>{interviewCountdown} days</strong> to go. Highest-importance topics still to do:</p>}
          {interviewCountdown !== null && notDoneImportant.map(t => <div key={t.id}><Link to={topicUrl(t)}>{t.title}</Link> {'★'.repeat(t.importance)}</div>)}
        </div>
      </div>

      <div className="card">
        <h2 style={{ marginTop: 0 }}><Layers size={18} /> Tracks</h2>
        <div className="grid grid-2">
          {contentIndex.tracks.map(track => {
            const topics = contentIndex.topics.filter(t => t.track === track.id)
            const s = progressStats(data.progress, topics.map(t => t.id))
            return (
              <Link key={track.id} to={`/learn/${track.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                <div style={{ border: '1px solid var(--border)', borderRadius: 10, padding: 14 }}>
                  <strong>{track.title}</strong> {track.comingSoon && <span className="badge warn">Coming Soon</span>}
                  <p style={{ color: 'var(--muted)', margin: '6px 0' }}>{track.description}</p>
                  {topics.length > 0 ? <><div className="progress-bar"><div style={{ width: `${s.pct}%` }} /></div><small>{s.completed}/{s.total} complete</small></> : <small style={{ color: 'var(--muted)' }}>Planned sections are listed on the track page.</small>}
                </div>
              </Link>
            )
          })}
        </div>
      </div>

      <div className="grid grid-2">
        <div className="card">
          <h3 style={{ marginTop: 0 }}><Bookmark size={16} /> Recently viewed</h3>
          {data.recentlyViewed.length === 0 ? <p style={{ color: 'var(--muted)' }}>Nothing viewed yet. Open any topic from Learn and it will appear here, so you can pick up where you left off.</p> : data.recentlyViewed.slice(0, 5).map(id => { const t = getTopic(id); return t ? <div key={id}><Link to={topicUrl(t)}>{t.title}</Link></div> : null })}
        </div>
        <div className="card">
          <h3 style={{ marginTop: 0 }}><BookOpen size={16} /> Quick actions</h3>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            <Link className="btn secondary" to="/learn">Browse Learn</Link>
            <Link className="btn secondary" to="/interview">Interview Prep</Link>
            <Link className="btn secondary" to="/practice">Practice</Link>
            <Link className="btn secondary" to="/cheatsheets">Cheatsheets</Link>
          </div>
          <p style={{ color: 'var(--muted)', fontSize: '0.9rem', marginTop: 12 }}>Tip: press <span className="kbd">Ctrl/Cmd+K</span> anywhere to search, or <span className="kbd">/</span> to focus search.</p>
        </div>
      </div>
      <p style={{ color: 'var(--muted)', fontSize: '0.85rem' }}>Counts on this page are always derived from content — nothing is hardcoded. If a track shows no topics yet, its sections are planned placeholders, marked Coming Soon.</p>
    </div>
  )
}
