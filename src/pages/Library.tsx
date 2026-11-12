import React from 'react'
import { Link } from 'react-router-dom'
import { contentIndex, getTopic, useFullContent, useRevisionPrompts } from '../lib/content'
import { useApp } from '../store/AppContext'
import { accuracyByTopic, studyStreak, topicUrl } from '../lib/utils'

export function Library() {
  const { data } = useApp()
  const { interviewQuestions, practiceItems, loaded } = useFullContent()
  const { prompts: revisionPrompts, loaded: revisionLoaded } = useRevisionPrompts()
  const allLoaded = loaded && revisionLoaded
  const completed = Object.values(data.progress).filter(v => v === 'completed').length
  const inProgress = Object.values(data.progress).filter(v => v === 'in-progress').length
  const accuracy = accuracyByTopic(data.practiceAttempts, practiceItems)
  const overall = accuracy.reduce((acc, a) => ({ correct: acc.correct + a.correct, total: acc.total + a.total }), { correct: 0, total: 0 })
  const streak = studyStreak(data.activityDates)
  // The backup reminder lived only in Settings, which a user may never
  // open — while this page is where the data at risk is displayed. Show
  // it here when there is anything worth losing and no recent export.
  const lastExportMs = data.lastExportedAt ? new Date(data.lastExportedAt).getTime() : NaN
  const lastExportDays = Number.isNaN(lastExportMs) ? null : Math.max(0, Math.floor((Date.now() - lastExportMs) / 86400000))
  const hasSavedData = Object.keys(data.progress).length > 0 || data.bookmarks.length > 0 || Object.keys(data.notes).length > 0 || data.practiceAttempts.length > 0
  const backupStale = hasSavedData && (lastExportDays === null || lastExportDays >= 30)
  // A saved id whose topic was removed must not silently vanish while
  // the stat card above still counts it — show a placeholder row.
  const renderTopicList = (ids: string[]) => ids.length === 0 ? <p style={{ color: 'var(--muted)' }}>Nothing here yet. Use Bookmark or Favorite on a topic page, and it will appear here.</p> : ids.map(id => { const t = getTopic(id); return t ? <div key={id}><Link to={topicUrl(t)}>{t.title}</Link></div> : <div key={id} style={{ color: 'var(--muted)' }}>This saved topic is no longer available.</div> })
  return (
    <div style={{ overflowWrap: 'break-word' }}>
      <nav className="breadcrumb" aria-label="Breadcrumb">
        <span className="breadcrumb-item"><Link to="/">Home</Link></span>
        <span className="breadcrumb-sep"> / </span>
        <span className="breadcrumb-item"><span className="breadcrumb-current" aria-current="page">My Library</span></span>
      </nav>
      <h1>My Library</h1>
      <p style={{ color: 'var(--muted)' }}>Bookmarks (things to revisit) and Favorites (things that matter most) are separate. Both apply to topics; bookmarks also apply to questions and flashcards. Everything here is saved in this browser only.</p>
      {backupStale && (
        <p role="status" style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 12px' }}>
          {lastExportDays === null
            ? <>You have not exported your data yet. If this browser clears its storage, everything on this page is gone — <Link to="/settings">export a backup in Settings</Link>.</>
            : <>Last exported {lastExportDays} days ago. <Link to="/settings">Export a fresh backup in Settings</Link> so a browser clear does not wipe your progress.</>}
        </p>
      )}
      {!allLoaded && <p style={{ color: 'var(--muted)' }}>Loading bookmarked questions and flashcards…</p>}
      <div className="grid grid-3">
        <div className="card"><strong>Completed</strong><div style={{ fontSize: '1.6rem' }}>{completed} / {contentIndex.topics.length}</div><small style={{ color: 'var(--muted)' }}>topics finished</small></div>
        <div className="card"><strong>In progress</strong><div style={{ fontSize: '1.6rem' }}>{inProgress}</div><small style={{ color: 'var(--muted)' }}>topics started but not finished</small></div>
        <div className="card"><strong>Study streak</strong><div style={{ fontSize: '1.6rem' }}>{streak} day{streak === 1 ? '' : 's'}</div><small style={{ color: 'var(--muted)' }}>consecutive study days</small></div>
        <div className="card"><strong>Bookmarks</strong><div style={{ fontSize: '1.6rem' }}>{data.bookmarks.length}</div><small style={{ color: 'var(--muted)' }}>topics saved to revisit</small></div>
        <div className="card"><strong>Favorites</strong><div style={{ fontSize: '1.6rem' }}>{data.favorites.length}</div><small style={{ color: 'var(--muted)' }}>topics that matter most to you</small></div>
        <div className="card"><strong>Practice accuracy</strong><div style={{ fontSize: '1.6rem' }}>{overall.total ? `${Math.round((overall.correct / overall.total) * 100)}%` : '—'}</div><small>{overall.total ? `${overall.correct}/${overall.total} attempts correct (MCQs and output questions only)` : 'No attempts yet — answer a question in Practice to see your accuracy here.'}</small></div>
      </div>
      <div className="grid grid-2" style={{ marginTop: 16 }}>
        <div className="card"><h2>Bookmarks — topics to revisit</h2>{renderTopicList(data.bookmarks)}</div>
        <div className="card"><h2>Favorites — topics that matter most</h2>{renderTopicList(data.favorites)}</div>
        <div className="card"><h2>Bookmarked questions</h2>{data.questionBookmarks.length === 0 ? <p style={{ color: 'var(--muted)' }}>No bookmarked questions yet. Bookmark a question in Interview Prep (or a one-minute revision prompt) and it will appear here.</p> : data.questionBookmarks.map(id => {
          const q = interviewQuestions.find(x => x.id === id)
          if (q) return <div key={id}><Link to={`/interview/question/${q.id}`}>{q.question}</Link></div>
          // A bookmarked one-minute revision prompt (former Module 0)
          // resolves to the Revision deck, not Interview Prep.
          const rp = revisionPrompts.find(x => x.id === id)
          if (rp) return <div key={id}><Link to={`/cheatsheets#rev-${rp.id}`}>{rp.question}</Link> <span style={{ color: 'var(--muted)' }}>(one-minute revision)</span></div>
          return <div key={id} style={{ color: 'var(--muted)' }}>This bookmarked question is no longer available.</div>
        })}</div>
        <div className="card"><h2>Bookmarked flashcards</h2>{data.flashcardBookmarks.length === 0 ? <p style={{ color: 'var(--muted)' }}>No bookmarked flashcards yet. Bookmark a flashcard in Practice and it will appear here.</p> : data.flashcardBookmarks.map(id => { const f = practiceItems.find(x => x.id === id); return f ? <div key={id}><Link to={`/practice?tab=flashcard#practice-${f.id}`}>{f.title}</Link> <span style={{ color: 'var(--muted)' }}>(opens in Practice → Flashcards)</span></div> : <div key={id} style={{ color: 'var(--muted)' }}>This bookmarked flashcard is no longer available.</div> })}</div>
        <div className="card"><h2>Personal notes</h2>{Object.keys(data.notes).length === 0 ? <p style={{ color: 'var(--muted)' }}>No notes yet. Add a note on any topic page — helpful guidance: write what clicked, what confused you, or your own example in your own words.</p> : Object.entries(data.notes).filter(([, v]) => typeof v === 'string' && v.trim()).map(([id, text]) => { const t = getTopic(id); return <div key={id}><strong>{t ? <Link to={topicUrl(t)}>{t.title}</Link> : 'Note for a removed topic'}</strong><p>{text.slice(0, 200)}{text.length > 200 ? '…' : ''}</p></div> })}</div>
        <div className="card"><h2>Continue learning &amp; recently viewed</h2>{data.recentlyViewed.length === 0 ? <p style={{ color: 'var(--muted)' }}>Open a topic to start your recent list. <Link to="/learn">Browse Learn</Link> and start with the Beginner Roadmap.</p> : data.recentlyViewed.slice(0, 10).map(id => { const t = getTopic(id); return t ? <div key={id}><Link to={topicUrl(t)}>{t.title}</Link></div> : <div key={id} style={{ color: 'var(--muted)' }}>A recently viewed topic is no longer available.</div> })}</div>
      </div>
    </div>
  )
}
