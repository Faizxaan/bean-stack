import React, { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { Bookmark, Calendar, Flame, ArrowRight, BookOpen, Layers } from 'lucide-react'
import { contentIndex, getTopic, orderedTopics, usePracticeItems } from '../lib/content'
import { useApp } from '../store/AppContext'
import { daysUntilLocal, isDue, progressStats, studyStreak, topicUrl } from '../lib/utils'
import { ProgressBar } from '../components/ProgressBar'

export function Home() {
  const { data, setInterviewDate } = useApp()
  const { items: practiceItems, loaded: practiceLoaded } = usePracticeItems()
  const completeTopics = contentIndex.topics.filter(t => t.status === 'complete')
  const stats = progressStats(data.progress, completeTopics.map(t => t.id))
  const streak = studyStreak(data.activityDates)
  const dueFlashcards = practiceItems.filter(i => i.type === 'flashcard').filter(i => {
    const st = data.flashcardStates[i.id]
    return !st || isDue(st.dueAt)
  }).length
  const totalFlashcards = practiceItems.filter(i => i.type === 'flashcard').length
  // A first visit is not a "welcome back": nothing has been viewed,
  // nothing is completed, and no practice has been attempted yet.
  const isFirstVisit =
    data.recentlyViewed.length === 0 &&
    stats.completed === 0 &&
    stats.inProgress === 0 &&
    data.practiceAttempts.length === 0 &&
    data.bookmarks.length === 0

  // Resume target: the most recently viewed topic that is not finished yet;
  // fall back to the most recently viewed topic (a completed topic revisits).
  const viewedTopics = data.recentlyViewed.map(id => getTopic(id)).filter(Boolean)
  const continueTopic = viewedTopics.find(t => t && data.progress[t.id] !== 'completed') || viewedTopics[0]
  const continueTrack = continueTopic ? contentIndex.tracks.find(t => t.id === continueTopic.track) : undefined
  const todaysFocus = useMemo(() => {
    // Next topic on beginner path that is not completed, else highest-importance unstarted complete topic
    const path = contentIndex.paths.find(p => p.id === 'beginner-roadmap')
    if (path) {
      const next = path.topicIds.map(id => getTopic(id)).find(t => t && data.progress[t.id] !== 'completed')
      if (next) return next
    }
    return completeTopics.filter(t => data.progress[t.id] !== 'completed').sort((a, b) => b.importance - a.importance)[0]
  }, [data.progress, completeTopics])

  const interviewCountdown = daysUntilLocal(data.interviewDate)
  const interviewPast = interviewCountdown !== null && interviewCountdown < 0
  const notDoneImportant = completeTopics.filter(t => data.progress[t.id] !== 'completed').sort((a, b) => b.importance - a.importance).slice(0, 5)
  const beginnerPath = contentIndex.paths.find(p => p.id === 'beginner-roadmap')
  const firstBeginnerTopic = beginnerPath ? getTopic(beginnerPath.topicIds[0]) : undefined

  return (
    <div className="grid" style={{ gap: 18 }}>
      <div>
        <h1 style={{ margin: '0 0 4px' }}>{isFirstVisit ? 'Welcome to Beanstack' : 'Welcome back to Beanstack'}</h1>
        <p style={{ color: 'var(--muted)', margin: 0 }}>Learn Java, practice, revise, and track your progress — all in one place, stored only in this browser.</p>
        <p style={{ color: 'var(--muted)', margin: '8px 0 0' }}>
          {contentIndex.topics.length} topics · {contentIndex.cheatsheets.length} cheatsheets · {contentIndex.interviewQuestionIds.length} interview questions · {contentIndex.practiceItemIds.length} practice items.
          Stars (★★★★★) show how often interviewers ask about a topic — five stars means it comes up most.
        </p>
      </div>

      {isFirstVisit && firstBeginnerTopic && (
        <div className="card" style={{ borderColor: 'var(--accent)' }}>
          <h2 style={{ marginTop: 0 }}>Start here — your first 3 steps</h2>
          <ol style={{ margin: '0 0 12px', paddingLeft: 20 }}>
            <li style={{ marginBottom: 6 }}><strong>Learn:</strong> start with the <Link to="/learn">Beginner Roadmap</Link> — first topic is <Link to={topicUrl(firstBeginnerTopic)}>{firstBeginnerTopic.title}</Link> ({firstBeginnerTopic.readingMinutes} min). Work through the topics in order; mark each one In Progress, then Completed.</li>
            <li style={{ marginBottom: 6 }}><strong>Practice:</strong> after a topic, try its <Link to="/practice">MCQs and flashcards</Link> to check what stuck.</li>
            <li><strong>Interview Prep:</strong> when you have a few topics done, open <Link to="/interview">Interview Prep</Link>, pick the module that matches your experience, and test yourself before revealing each answer.</li>
          </ol>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            <Link className="btn" to={topicUrl(firstBeginnerTopic)}>Start: {firstBeginnerTopic.title} <ArrowRight size={16} /></Link>
            <Link className="btn secondary" to="/learn">See all tracks</Link>
          </div>
        </div>
      )}

      {continueTopic && (
        <div className="card" style={{ borderColor: 'var(--accent)' }}>
          <h2 style={{ marginTop: 0 }}>Continue where you left off</h2>
          <p style={{ margin: '0 0 10px' }}>
            <Link to={topicUrl(continueTopic)}><strong>{continueTopic.title}</strong></Link>
            <span style={{ color: 'var(--muted)' }}> · {continueTrack?.title || continueTopic.track} · {continueTopic.readingMinutes} min{data.progress[continueTopic.id] === 'completed' ? ' · Completed — revisit to revise' : data.progress[continueTopic.id] === 'in-progress' ? ' · In progress' : ''}</span>
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            <Link className="btn" to={topicUrl(continueTopic)}>Resume {continueTopic.title} <ArrowRight size={16} /></Link>
            <Link className="btn secondary" to={`/learn/${continueTopic.track}`}>Back to {continueTrack?.title || 'track'}</Link>
          </div>
        </div>
      )}

      <div className="grid grid-3">
        <div className="card"><div style={{ color: 'var(--muted)', fontSize: '0.85rem' }}>Topics completed</div><div style={{ fontSize: '1.8rem', fontWeight: 800 }}>{stats.completed} / {stats.total}</div><div style={{ marginTop: 8 }}><ProgressBar pct={stats.pct} label={`${stats.pct}% of complete topics done`} /></div><div style={{ color: 'var(--muted)', fontSize: '0.9rem', marginTop: 6 }}>{stats.inProgress > 0 ? `${stats.inProgress} in progress` : isFirstVisit ? 'Nothing started yet — start with the Beginner Roadmap above.' : 'Keep going — your next topic is under Today’s focus.'}</div></div>
        <div className="card"><div style={{ color: 'var(--muted)', fontSize: '0.85rem' }}><Flame size={14} /> Study streak</div><div style={{ fontSize: '1.8rem', fontWeight: 800 }}>{streak} day{streak === 1 ? '' : 's'}</div><div style={{ color: 'var(--muted)', fontSize: '0.9rem' }}>{streak === 0 ? 'Study on consecutive days to build a streak — opening a topic or answering a question counts as a study day.' : 'Consecutive days you have studied. Keep it going tomorrow.'}</div></div>
        <div className="card"><div style={{ color: 'var(--muted)', fontSize: '0.85rem' }}>Flashcards ready to review</div><div style={{ fontSize: '1.8rem', fontWeight: 800 }}>{practiceLoaded ? dueFlashcards : '…'}</div><div style={{ color: 'var(--muted)', fontSize: '0.9rem' }}>{practiceLoaded && Object.keys(data.flashcardStates).length === 0 ? `All ${totalFlashcards} flashcards count as due until you have tried them once — start with a few, not all ${totalFlashcards}.` : 'Cards you have not got right yet, or whose review is due.'}</div><Link to="/practice?tab=flashcards">Review flashcards →</Link></div>
      </div>

      <div className="grid grid-2">
        <div className="card">
          <h2 style={{ marginTop: 0 }}>Today&apos;s focus</h2>
          {todaysFocus ? (
            <>
              <Link to={topicUrl(todaysFocus)}><strong>{todaysFocus.title}</strong></Link>
              <p style={{ color: 'var(--muted)' }}>{todaysFocus.summary || 'A key Java topic on your path.'} · {todaysFocus.readingMinutes} min · <span aria-hidden="true">{'★'.repeat(todaysFocus.importance)}{'☆'.repeat(5 - todaysFocus.importance)}</span><span className="sr-only">Importance {todaysFocus.importance} of 5</span> <span style={{ fontSize: '0.85rem' }}>(stars = how often interviewers ask this)</span></p>
              <Link className="btn" to={topicUrl(todaysFocus)}>{data.progress[todaysFocus.id] === 'in-progress' ? 'Continue learning' : 'Start learning'} <ArrowRight size={16} /></Link>
              <p style={{ color: 'var(--muted)', fontSize: '0.9rem', marginBottom: 0 }}>After this topic, your next step is its Practice questions, then the next topic on the Beginner Roadmap.</p>
            </>
          ) : <p>All complete topics are done — great work. New content batches will add more topics here.</p>}
        </div>
        <div className="card">
          <h2 style={{ marginTop: 0 }}><Calendar size={18} /> Interview countdown</h2>
          <p style={{ color: 'var(--muted)' }}>Set an interview date to surface the highest-importance topics still not done. Optional — leave it blank if you have no interview lined up.</p>
          <label htmlFor="interview-date" style={{ fontWeight: 600 }}>Your interview date (optional)</label>
          <input id="interview-date" className="input" type="date" value={data.interviewDate || ''} onChange={e => setInterviewDate(e.target.value || null)} aria-label="Interview date" />
          {data.interviewDate && <p><button className="btn secondary small" onClick={() => setInterviewDate(null)}>Clear interview date</button></p>}
          {interviewCountdown !== null && !interviewPast && <p><strong>{interviewCountdown === 0 ? 'Today' : `${interviewCountdown} day${interviewCountdown === 1 ? '' : 's'}`}</strong> to go. Highest-importance topics still to do:</p>}
          {interviewCountdown !== null && interviewPast && <p><strong>That date has passed.</strong> Set a new interview date above, or clear it. Highest-importance topics still to do:</p>}
          {interviewCountdown !== null && notDoneImportant.map(t => <div key={t.id}><Link to={topicUrl(t)}>{t.title}</Link> <span aria-hidden="true">{'★'.repeat(t.importance)}{'☆'.repeat(5 - t.importance)}</span><span className="sr-only">Importance {t.importance} of 5</span></div>)}
        </div>
      </div>

      <div className="card">
        <h2 style={{ marginTop: 0 }}><Layers size={18} /> Tracks</h2>
        <p style={{ color: 'var(--muted)', marginTop: 0 }}>A track is a subject area, in the order you should learn it — start with Core Java if you are new, then Advanced Java and Spring &amp; Spring Boot. Open a track to see its topics in order.</p>
        <div className="grid grid-2">
          {contentIndex.tracks.map(track => {
            const topics = contentIndex.topics.filter(t => t.track === track.id)
            const s = progressStats(data.progress, topics.map(t => t.id))
            const nextUp = orderedTopics(track.id).find(t => data.progress[t.id] !== 'completed')
            return (
              <Link key={track.id} to={`/learn/${track.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                <div style={{ border: '1px solid var(--border)', borderRadius: 10, padding: 14 }}>
                  <strong>{track.title}</strong> {track.comingSoon && <span className="badge warn">Coming Soon</span>}
                  <p style={{ color: 'var(--muted)', margin: '6px 0' }}>{track.description}</p>
                  {topics.length > 0 ? <><ProgressBar pct={s.pct} label={`${s.pct}% complete in ${track.title}`} /><small>{s.completed}/{s.total} complete{nextUp ? ` · Next: ${nextUp.title}` : ' · All complete'}</small></> : <small style={{ color: 'var(--muted)' }}>Planned sections are listed on the track page.</small>}
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
          <p style={{ color: 'var(--muted)', fontSize: '0.9rem', marginBottom: 0 }}>{data.bookmarks.length} bookmarks · {data.favorites.length} favorites — see them all in <Link to="/library">My Library</Link>.</p>
        </div>
        <div className="card">
          <h3 style={{ marginTop: 0 }}><BookOpen size={16} /> Quick actions</h3>
          <p style={{ color: 'var(--muted)', marginTop: 0, fontSize: '0.9rem' }}>Learn teaches a topic · Practice tests it · Interview Prep rehearses interview answers · Cheatsheets are for quick revision.</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            <Link className="btn secondary" to="/learn">Browse Learn</Link>
            <Link className="btn secondary" to="/interview">Interview Prep</Link>
            <Link className="btn secondary" to="/practice">Practice</Link>
            <Link className="btn secondary" to="/cheatsheets">Cheatsheets</Link>
          </div>
          <p style={{ color: 'var(--muted)', fontSize: '0.9rem', marginTop: 12 }}>Tip: press <span className="kbd">Ctrl/Cmd+K</span> anywhere to search, or <span className="kbd">/</span> to focus search.</p>
        </div>
      </div>
    </div>
  )
}
