import React from 'react'
import { Link } from 'react-router-dom'
import { contentIndex, getTopic } from '../lib/content'
import { useApp } from '../store/AppContext'
import { accuracyByTopic, studyStreak, topicUrl } from '../lib/utils'

export function Library() {
  const { data } = useApp()
  const completed = Object.values(data.progress).filter(v => v === 'completed').length
  const inProgress = Object.values(data.progress).filter(v => v === 'in-progress').length
  const accuracy = accuracyByTopic(data.practiceAttempts, contentIndex.practiceItems)
  const overall = accuracy.reduce((acc, a) => ({ correct: acc.correct + a.correct, total: acc.total + a.total }), { correct: 0, total: 0 })
  const streak = studyStreak(data.activityDates)
  const renderTopicList = (ids: string[]) => ids.length === 0 ? <p style={{ color: 'var(--muted)' }}>Nothing here yet. Use Bookmark or Favorite on a topic page, and it will appear here.</p> : ids.map(id => { const t = getTopic(id); return t ? <div key={id}><Link to={topicUrl(t)}>{t.title}</Link></div> : null })
  return (
    <div>
      <h1>My Library</h1>
      <p style={{ color: 'var(--muted)' }}>Bookmarks (things to revisit) and Favorites (things that matter most) are separate. Both apply to topics; bookmarks also apply to questions and flashcards.</p>
      <div className="grid grid-3">
        <div className="card"><strong>Completed</strong><div style={{ fontSize: '1.6rem' }}>{completed}</div></div>
        <div className="card"><strong>In progress</strong><div style={{ fontSize: '1.6rem' }}>{inProgress}</div></div>
        <div className="card"><strong>Study streak</strong><div style={{ fontSize: '1.6rem' }}>{streak} days</div></div>
        <div className="card"><strong>Bookmarks</strong><div style={{ fontSize: '1.6rem' }}>{data.bookmarks.length}</div></div>
        <div className="card"><strong>Favorites</strong><div style={{ fontSize: '1.6rem' }}>{data.favorites.length}</div></div>
        <div className="card"><strong>Practice accuracy</strong><div style={{ fontSize: '1.6rem' }}>{overall.total ? `${Math.round((overall.correct / overall.total) * 100)}%` : '—'}</div><small>{overall.correct}/{overall.total} attempts</small></div>
      </div>
      <div className="grid grid-2" style={{ marginTop: 16 }}>
        <div className="card"><h2>Bookmarks — topics to revisit</h2>{renderTopicList(data.bookmarks)}</div>
        <div className="card"><h2>Favorites — topics that matter most</h2>{renderTopicList(data.favorites)}</div>
        <div className="card"><h2>Bookmarked questions</h2>{data.questionBookmarks.length === 0 ? <p style={{ color: 'var(--muted)' }}>No bookmarked questions yet.</p> : data.questionBookmarks.map(id => { const q = contentIndex.interviewQuestions.find(x => x.id === id); return q ? <div key={id}><Link to={`/interview/question/${q.id}`}>{q.question}</Link></div> : null })}</div>
        <div className="card"><h2>Bookmarked flashcards</h2>{data.flashcardBookmarks.length === 0 ? <p style={{ color: 'var(--muted)' }}>No bookmarked flashcards yet.</p> : data.flashcardBookmarks.map(id => { const f = contentIndex.practiceItems.find(x => x.id === id); return f ? <div key={id}>{f.title}</div> : null })}</div>
        <div className="card"><h2>Personal notes</h2>{Object.keys(data.notes).length === 0 ? <p style={{ color: 'var(--muted)' }}>No notes yet. Add a note on any topic page — helpful guidance: write what clicked, what confused you, or your own example in your own words.</p> : Object.entries(data.notes).filter(([, v]) => v.trim()).map(([id, text]) => { const t = getTopic(id); return <div key={id}><strong>{t ? t.title : id}</strong><p>{text.slice(0, 200)}</p></div> })}</div>
        <div className="card"><h2>Continue learning &amp; recently viewed</h2>{data.recentlyViewed.length === 0 ? <p style={{ color: 'var(--muted)' }}>Open a topic to start your recent list.</p> : data.recentlyViewed.slice(0, 10).map(id => { const t = getTopic(id); return t ? <div key={id}><Link to={topicUrl(t)}>{t.title}</Link></div> : null })}</div>
      </div>
    </div>
  )
}
