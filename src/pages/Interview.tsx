import React, { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Bookmark, Copy, Eye, EyeOff } from 'lucide-react'
import { getTopic, useInterviewQuestions } from '../lib/content'
import { useApp } from '../store/AppContext'
import { topicUrl } from '../lib/utils'

const MODULES = [
  { id: 'module-0', title: 'Module 0 — Revision Notes', level: 'Optional' },
  { id: 'module-1', title: 'Module 1 — 0–3 years', level: '0–3' },
  { id: 'module-2', title: 'Module 2 — 3–5 years', level: '3–5' },
  { id: 'module-3', title: 'Module 3 — 5–8 years', level: '5–8' },
  { id: 'module-4', title: 'Module 4 — 8–15 years', level: '8–15' },
  { id: 'bonus-resume', title: 'Bonus — Resume Tips & Templates', level: 'Bonus' },
]

export function InterviewIndex() {
  const [browseBy, setBrowseBy] = useState<'module' | 'topic'>('module')
  const [filterModule, setFilterModule] = useState('all')
  const [filterCategory, setFilterCategory] = useState('all')
  const [filterDifficulty, setFilterDifficulty] = useState('all')
  const { data } = useApp()
  const { questions: interviewQuestions, loaded } = useInterviewQuestions()
  const categories = [...new Set(interviewQuestions.map(q => q.category))].sort()
  const filtered = interviewQuestions.filter(q =>
    (filterModule === 'all' || q.module === filterModule) &&
    (filterCategory === 'all' || q.category === filterCategory) &&
    (filterDifficulty === 'all' || q.difficulty === filterDifficulty)
  )
  const byTopic = useMemo(() => {
    const map = new Map<string, typeof filtered>()
    for (const q of filtered) {
      const key = q.topicId || 'general'
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(q)
    }
    return map
  }, [filtered])

  return (
    <div>
      <h1>Interview Preparation</h1>
      <p style={{ color: 'var(--muted)' }}>Browse by module or by topic/technology. Each question has a short answer, a detailed answer, follow-ups, tips, and common mistakes. In self-test mode, answers stay hidden until you reveal them.</p>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
        <button className="btn secondary" aria-pressed={browseBy === 'module'} onClick={() => setBrowseBy('module')}>By Module {browseBy === 'module' ? '✓' : ''}</button>
        <button className="btn secondary" aria-pressed={browseBy === 'topic'} onClick={() => setBrowseBy('topic')}>By Topic / Technology {browseBy === 'topic' ? '✓' : ''}</button>
        <select className="select" style={{ width: 'auto' }} value={filterModule} onChange={e => setFilterModule(e.target.value)} aria-label="Filter by module"><option value="all">All modules</option>{MODULES.map(m => <option key={m.id} value={m.id}>{m.title}</option>)}</select>
        <select className="select" style={{ width: 'auto' }} value={filterCategory} onChange={e => setFilterCategory(e.target.value)} aria-label="Filter by category"><option value="all">All categories</option>{categories.map(c => <option key={c} value={c}>{c}</option>)}</select>
        <select className="select" style={{ width: 'auto' }} value={filterDifficulty} onChange={e => setFilterDifficulty(e.target.value)} aria-label="Filter by difficulty"><option value="all">All difficulties</option><option>Easy</option><option>Medium</option><option>Hard</option></select>
      </div>

      {!loaded && <div className="card"><p>Loading interview questions…</p></div>}
      {loaded && filtered.length === 0 && <div className="card"><p>No interview questions match those filters. Try clearing the filters, or browse Learn for topics.</p><button className="btn secondary" onClick={() => { setFilterModule('all'); setFilterCategory('all'); setFilterDifficulty('all') }}>Clear all filters</button></div>}

      {browseBy === 'module' ? (
        MODULES.map(mod => {
          const qs = filtered.filter(q => q.module === mod.id)
          if (filterModule !== 'all' && filterModule !== mod.id) return null
          if (qs.length === 0) return <div key={mod.id} className="card" style={{ marginBottom: 12 }}><h3 style={{ marginTop: 0 }}>{mod.title}</h3><p style={{ color: 'var(--muted)' }}>Questions for this module are planned and will be added in the interview content batch. Structure is ready — no component changes needed to add them.</p></div>
          return (
            <div key={mod.id} className="card" style={{ marginBottom: 12 }}>
              <h2 style={{ marginTop: 0 }}>{mod.title} <span className="badge">{qs.length} questions</span></h2>
              <ul>{qs.map(q => (
                <li key={q.id}><Link to={`/interview/question/${q.id}`}>{q.question}</Link> — {q.category} · {q.difficulty} {data.interviewReview[q.id] && <span className="badge">{data.interviewReview[q.id]}</span>} {data.questionBookmarks.includes(q.id) && <span className="badge">Bookmarked</span>}</li>
              ))}</ul>
            </div>
          )
        })
      ) : (
        [...byTopic.entries()].map(([topicId, qs]) => {
          const topic = getTopic(topicId)
          return (
            <div key={topicId} className="card" style={{ marginBottom: 12, overflowWrap: 'break-word' }}>
              <h3 style={{ marginTop: 0 }}>{topic ? topic.title : topicId === 'general' ? 'General' : 'Topic no longer available'}</h3>
              <ul>{qs.map(q => <li key={q.id}><Link to={`/interview/question/${q.id}`}>{q.question}</Link> — {q.category} · {q.difficulty}</li>)}</ul>
            </div>
          )
        })
      )}
    </div>
  )
}

export function InterviewQuestionPage() {
  const { questionId } = useParams()
  const { questions: interviewQuestions, loaded } = useInterviewQuestions()
  const q = interviewQuestions.find(x => x.id === questionId)
  const { data, toggleList, setInterviewReview } = useApp()
  const [revealed, setRevealed] = useState(false)
  const [copied, setCopied] = useState(false)
  const [copyFailed, setCopyFailed] = useState(false)
  if (!loaded) return <div><h1>Loading question…</h1><p>Fetching this interview question.</p></div>
  if (!q) return <div><h1>Question not found</h1><p>That question id does not exist in the current interview content. It may have been removed, or planned for a later batch — your other data is unaffected.</p><p><Link to="/interview">← Back to Interview Prep</Link> · <Link to="/search">Search questions</Link> · <Link to="/learn">Browse Learn</Link></p></div>
  const topic = q.topicId ? getTopic(q.topicId) : undefined
  const copy = async () => {
    setCopyFailed(false)
    try { await navigator.clipboard.writeText(`${q.question}\n\n${q.shortAnswer}`); setCopied(true); setTimeout(() => setCopied(false), 2000) } catch { setCopied(false); setCopyFailed(true) }
  }
  return (
    <div style={{ overflowWrap: 'break-word' }}>
      <p><Link to="/interview">← Interview Prep</Link></p>
      <h1>{q.question}</h1>
      <p style={{ color: 'var(--muted)' }}>{q.category} · {q.difficulty} · {MODULES.find(m => m.id === q.module)?.title || q.module}</p>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
        <button className="btn secondary small" onClick={() => setRevealed(!revealed)}>{revealed ? <><EyeOff size={15} /> Hide answer (self-test)</> : <><Eye size={15} /> Reveal answer</>}</button>
        <button className="btn secondary small" onClick={() => toggleList('questionBookmarks', q.id)}><Bookmark size={15} /> {data.questionBookmarks.includes(q.id) ? 'Bookmarked ✓' : 'Bookmark question'}</button>
        <button className="btn secondary small" onClick={copy}><Copy size={15} /> {copied ? 'Copied!' : 'Copy question + answer'}</button>
        {copyFailed && <span role="alert" style={{ color: 'var(--danger)', alignSelf: 'center' }}>Copy failed (clipboard blocked) — select the text manually instead.</span>}
        <button className="btn secondary small" onClick={() => setInterviewReview(q.id, 'confident')}>Mark Confident {data.interviewReview[q.id] === 'confident' ? '✓' : ''}</button>
        <button className="btn secondary small" onClick={() => setInterviewReview(q.id, 'needs-review')}>Needs review {data.interviewReview[q.id] === 'needs-review' ? '✓' : ''}</button>
      </div>
      {revealed ? (
        <div className="card">
          <h3>Short answer</h3><p>{q.shortAnswer}</p>
          {q.detailedAnswer && <><h3>Detailed answer</h3><p>{q.detailedAnswer}</p></>}
          {q.followUps && q.followUps.length > 0 && <><h3>Likely follow-ups</h3><ul>{q.followUps.map((f, i) => <li key={i}>{f}</li>)}</ul></>}
          {q.tips && q.tips.length > 0 && <><h3>Tips</h3><ul>{q.tips.map((f, i) => <li key={i}>{f}</li>)}</ul></>}
          {q.commonMistakes && q.commonMistakes.length > 0 && <><h3>Common mistakes</h3><ul>{q.commonMistakes.map((f, i) => <li key={i}>{f}</li>)}</ul></>}
        </div>
      ) : (
        <div className="card"><p style={{ color: 'var(--muted)' }}>Answer hidden for self-test. Reveal it when you are ready, then mark yourself Confident or Needs review.</p><p><strong>Short answer preview:</strong> Try answering in your own words first.</p></div>
      )}
      {topic && <p>Related topic: <Link to={topicUrl(topic)}>{topic.title}</Link></p>}
      {q.relatedTopics && q.relatedTopics.length > 0 && <p>Related topics: {q.relatedTopics.map(id => { const t = getTopic(id); return t ? <span key={id} style={{ marginRight: 8 }}><Link to={topicUrl(t)}>{t.title}</Link></span> : null })}</p>}
      <p><Link to={`/interview/question/${q.id}`} style={{ wordBreak: 'break-all' }}>Deep link to this question: /interview/question/{q.id}</Link></p>
    </div>
  )
}
