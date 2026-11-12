import React, { useEffect, useMemo, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { Bookmark, Check, ChevronDown, ChevronLeft, ChevronRight, Copy, Eye, EyeOff, GraduationCap, Search, X } from 'lucide-react'
import { contentIndex, getTopic, useInterviewQuestions } from '../lib/content'
import { useApp } from '../store/AppContext'
import { topicUrl } from '../lib/utils'
import {
  EMPTY_INTERVIEW_FILTERS,
  INTERVIEW_MODULES,
  areaSlug,
  categoryRank,
  filterQuestions,
  firstUnreviewed,
  groupQuestionsByArea,
  moduleMeta,
  prevNextQuestion,
  reviewStats,
} from '../lib/interview'
import type { InterviewQuestion } from '../types'
import type { AreaGroup } from '../lib/interview'

// Interview Prep, redesigned 2026-11-12 (UI only — no question, answer,
// id, category, difficulty, module or topicId was changed).
//
// Second pass, 2026-11-12: Module 0 is gone (its 37 one-minute prompts
// moved to content/revision and render under Revision & Cheatsheets),
// the 26 categories are consolidated into 10 broad areas (+ Resume on
// the bonus module only), and questions are grouped by broad area in
// learning order — not by 77 individual Learn topics, and not
// alphabetically by category (which used to put Behavioural first).
// Only the `category` field of content/interview/*.json was re-labelled;
// question text, answers, ids, topicIds and modules are unchanged.
// The deep-link route /interview/question/:id is kept, and prev/next on
// the question page now walks the whole module in display order.

const SORT_CTX = { topics: contentIndex.topics, tracks: contentIndex.tracks }

function ReviewBadge({ status }: { status?: 'confident' | 'needs-review' }) {
  if (status === 'confident') return <span className="badge accent">✓ Confident</span>
  if (status === 'needs-review') return <span className="badge warn">Needs review</span>
  return <span className="badge">Not yet reviewed</span>
}

function QuestionCard({
  q,
  selfTest,
  expanded,
  onToggle,
  showModule,
}: {
  q: InterviewQuestion
  selfTest: boolean
  expanded: boolean
  onToggle: () => void
  showModule?: boolean
}) {
  const { data, toggleList, setInterviewReview } = useApp()
  const status = data.interviewReview[q.id]
  const bookmarked = data.questionBookmarks.includes(q.id)
  const topic = q.topicId ? getTopic(q.topicId) : undefined
  const mod = moduleMeta(q.module)
  return (
    <article className="card q-card" aria-label={q.question}>
      <h3 className="q-question">{q.question}</h3>
      <p className="q-badges">
        <span className="badge">{q.category || 'General'}</span>{' '}
        <span className="badge">{q.difficulty || 'Medium'}</span>{' '}
        {showModule && <span className="badge">{mod?.title || q.module}</span>}{' '}
        {topic && <span className="badge">Topic: {topic.title}</span>}{' '}
        <ReviewBadge status={status} />{' '}
        {bookmarked && <span className="badge accent">Bookmarked</span>}
      </p>
      {!expanded && (
        selfTest ? (
          <p className="q-try"><strong>Try it first.</strong> Answer in your own words, then reveal the answer and compare.</p>
        ) : (
          <p className="q-preview"><strong>Short answer:</strong> {q.shortAnswer || 'No short answer yet.'}</p>
        )
      )}
      {expanded && (
        <div className="q-answer">
          <h4>Short answer</h4>
          <p>{q.shortAnswer || 'No short answer yet.'}</p>
          {q.detailedAnswer ? (
            <><h4>Detailed answer</h4><p style={{ whiteSpace: 'pre-wrap' }}>{q.detailedAnswer}</p></>
          ) : (
            <p style={{ color: 'var(--muted)' }}>No detailed answer yet — the short answer above is the key point.</p>
          )}
          {q.followUps && q.followUps.length > 0 && (
            <><h4>Likely follow-ups</h4><ul>{q.followUps.map((f, i) => <li key={i}>{f}</li>)}</ul></>
          )}
          {q.tips && q.tips.length > 0 && (
            <><h4>Tips</h4><ul>{q.tips.map((f, i) => <li key={i}>{f}</li>)}</ul></>
          )}
          {q.commonMistakes && q.commonMistakes.length > 0 && (
            <><h4>Common mistakes</h4><ul>{q.commonMistakes.map((f, i) => <li key={i}>{f}</li>)}</ul></>
          )}
          {(!q.followUps || q.followUps.length === 0) && (!q.tips || q.tips.length === 0) && (!q.commonMistakes || q.commonMistakes.length === 0) && (
            <p style={{ color: 'var(--muted)' }}>No follow-ups, tips, or common mistakes listed for this question.</p>
          )}
        </div>
      )}
      <div className="q-actions">
        <button className="btn secondary small" onClick={onToggle} aria-expanded={expanded}>
          {expanded ? <><EyeOff size={15} /> Hide answer</> : <><Eye size={15} /> {selfTest ? 'Reveal answer' : 'Show full answer'}</>}
        </button>
        <Link className="btn secondary small" to={`/interview/question/${q.id}`}>Open full page →</Link>
        <button
          className="btn secondary small"
          aria-pressed={status === 'confident'}
          onClick={() => setInterviewReview(q.id, 'confident')}
        >
          <Check size={15} /> Confident {status === 'confident' ? '✓' : ''}
        </button>
        <button
          className="btn secondary small"
          aria-pressed={status === 'needs-review'}
          onClick={() => setInterviewReview(q.id, 'needs-review')}
        >
          Needs review {status === 'needs-review' ? '✓' : ''}
        </button>
        <button className="btn secondary small" onClick={() => toggleList('questionBookmarks', q.id)} aria-pressed={bookmarked}>
          <Bookmark size={15} /> {bookmarked ? 'Bookmarked ✓' : 'Bookmark'}
        </button>
      </div>
    </article>
  )
}

function AreaGroupCard({
  group,
  selfTest,
  expandedIds,
  onToggleQuestion,
  open,
  onToggleOpen,
  showModule,
  nextArea,
  onJumpToArea,
}: {
  group: AreaGroup
  selfTest: boolean
  expandedIds: Set<string>
  onToggleQuestion: (id: string) => void
  open: boolean
  onToggleOpen: () => void
  showModule?: boolean
  nextArea?: AreaGroup
  onJumpToArea: (category: string) => void
}) {
  const { data } = useApp()
  const stats = reviewStats(group.questions, data.interviewReview, data.questionBookmarks)
  // Within an area, the Learn topic is only a small sub-heading when
  // the topic changes — never a separate collapsible section.
  let lastTopicId = ''
  return (
    <section className="card topic-group" id={`area-${areaSlug(group.category)}`} aria-label={group.category}>
      <div className="topic-group-head">
        <button className="topic-group-toggle" onClick={onToggleOpen} aria-expanded={open}>
          <ChevronDown size={18} style={{ transform: open ? 'rotate(180deg)' : 'none' }} />
          <span>
            <strong>{group.category}</strong>
            <span className="topic-group-count"> — {group.questions.length} question{group.questions.length === 1 ? '' : 's'} · {stats.reviewed} reviewed · {stats.confident} confident</span>
          </span>
        </button>
      </div>
      {open && (
        <div className="topic-group-body">
          <div className="progress-bar" aria-label={`${stats.pctReviewed}% reviewed in ${group.category}`}><div style={{ width: `${stats.pctReviewed}%` }} /></div>
          <div className="q-list">
            {group.questions.map(q => {
              const topic = q.topicId ? getTopic(q.topicId) : undefined
              const topicChanged = (q.topicId || '') !== lastTopicId
              lastTopicId = q.topicId || ''
              return (
                <React.Fragment key={q.id}>
                  {topicChanged && topic && (
                    <h4 className="area-topic-label">
                      <Link to={topicUrl(topic)}>{topic.title}</Link>
                      <span className="topic-group-track"> · Learn topic</span>
                    </h4>
                  )}
                  {topicChanged && !topic && <h4 className="area-topic-label">General</h4>}
                  <QuestionCard
                    q={q}
                    selfTest={selfTest}
                    expanded={expandedIds.has(q.id)}
                    onToggle={() => onToggleQuestion(q.id)}
                    showModule={showModule}
                  />
                </React.Fragment>
              )
            })}
          </div>
          {nextArea && (
            <p style={{ margin: '16px 0 0' }}>
              <button className="btn secondary" onClick={() => onJumpToArea(nextArea.category)}>
                Next area: {nextArea.category} ({nextArea.questions.length} questions) →
              </button>
            </p>
          )}
        </div>
      )}
    </section>
  )
}

export function InterviewIndex() {
  const [searchParams, setSearchParams] = useSearchParams()
  const view = searchParams.get('view') === 'topic' ? 'topic' : 'module'
  const selectedModule = searchParams.get('module')
  const areaParam = searchParams.get('area')
  const { data } = useApp()
  const { questions: interviewQuestions, loaded } = useInterviewQuestions()
  const [filters, setFilters] = useState(EMPTY_INTERVIEW_FILTERS)
  const [selfTest, setSelfTest] = useState(true)
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())
  const [openAreas, setOpenAreas] = useState<Set<string>>(new Set())

  const setParam = (patch: Record<string, string | null>) => {
    const next = new URLSearchParams(searchParams)
    for (const [k, v] of Object.entries(patch)) {
      if (v === null) next.delete(k)
      else next.set(k, v)
    }
    setSearchParams(next, { replace: true })
  }

  // Questions in scope: a selected module, or everything in area view.
  const scoped = useMemo(() => {
    if (view === 'topic') return interviewQuestions
    if (!selectedModule) return interviewQuestions
    return interviewQuestions.filter(q => q.module === selectedModule)
  }, [interviewQuestions, view, selectedModule])

  // Category filter lists only areas that actually have questions in
  // scope — previously it listed every category in the whole bank, so
  // a module view offered filters with zero questions in that module.
  const categories = useMemo(
    () => [...new Set(scoped.map(q => q.category))].sort((a, b) => categoryRank(a) - categoryRank(b)),
    [scoped],
  )

  const filtered = useMemo(
    () => filterQuestions(scoped, filters, data.interviewReview, data.questionBookmarks),
    [scoped, filters, data.interviewReview, data.questionBookmarks],
  )

  const groups = useMemo(
    () => groupQuestionsByArea(filtered, contentIndex.topics, contentIndex.tracks),
    [filtered],
  )

  const jumpToArea = (category: string) => {
    setOpenAreas(prev => new Set(prev).add(category))
    // Scroll after the group opens.
    setTimeout(() => document.getElementById(`area-${areaSlug(category)}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 0)
  }

  // Open the requested area (from a question page's "Back to area"
  // link), else the first area with unreviewed questions, else the
  // first area.
  useEffect(() => {
    if (groups.length === 0) return
    const wanted = areaParam && groups.some(g => areaSlug(g.category) === areaParam)
      ? groups.find(g => areaSlug(g.category) === areaParam)!.category
      : undefined
    const firstOpen = wanted || groups.find(g => g.questions.some(q => !data.interviewReview[q.id]))?.category || groups[0].category
    setOpenAreas(new Set([firstOpen]))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedModule, view, loaded, areaParam])

  const toggleQuestion = (id: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const clearFilters = () => setFilters(EMPTY_INTERVIEW_FILTERS)
  const filtersActive =
    filters.query !== '' || filters.difficulty !== 'all' || filters.category !== 'all' || filters.review !== 'all'
  const overall = reviewStats(interviewQuestions, data.interviewReview, data.questionBookmarks)
  const selectedMeta = selectedModule ? moduleMeta(selectedModule) : undefined
  const selectedStats = selectedMeta ? reviewStats(scoped, data.interviewReview, data.questionBookmarks) : null
  const nextUp = selectedMeta ? firstUnreviewed(scoped, data.interviewReview, SORT_CTX) : undefined

  const revealAll = () => setExpandedIds(new Set(filtered.map(q => q.id)))
  const hideAll = () => setExpandedIds(new Set())

  return (
    <div>
      <h1>Interview Preparation</h1>
      <p style={{ color: 'var(--muted)' }}>
        Pick your experience level, work through questions grouped by broad area, and test yourself before you reveal the answer.
        Every question has a short answer, a detailed answer, follow-ups, tips, and common mistakes.
      </p>

      {/* How to use this — the three steps a first-time user needs. */}
      <div className="card iv-howto" aria-label="How to use Interview Prep">
        <div className="iv-step"><span className="iv-step-num">1</span><div><strong>Pick your level</strong><p>Module 1 for 0–3 years, up to Module 4 for 8–15 years. The Bonus module is resume help, not interview questions.</p></div></div>
        <div className="iv-step"><span className="iv-step-num">2</span><div><strong>Pick a broad area</strong><p>Questions are grouped by area — Java, Spring, Microservices, System Design and more — in learning order, so you revise a topic and its questions together.</p></div></div>
        <div className="iv-step"><span className="iv-step-num">3</span><div><strong>Test yourself</strong><p>Answer in your own words first, then reveal. Mark each question Confident or Needs review — your progress is saved in this browser.</p></div></div>
      </div>
      <p style={{ color: 'var(--muted)', marginTop: -8 }}>
        Want a quick recap instead of interview questions? The one-minute revision prompts live under <Link to="/cheatsheets">Revision &amp; Cheatsheets</Link>.
      </p>

      {/* Overall progress — derived from stored reviews, never hardcoded. */}
      <div className="card iv-progress" aria-label="Your interview progress">
        <div>
          <strong>Your progress: {overall.reviewed} of {overall.total} questions reviewed</strong>
          <p style={{ color: 'var(--muted)', margin: '4px 0 0' }}>
            {overall.confident} confident · {overall.needsReview} need review · {overall.total - overall.reviewed} not yet reviewed · {overall.bookmarked} bookmarked
          </p>
        </div>
        <div className="progress-bar" aria-label={`${overall.pctReviewed}% of interview questions reviewed`}><div style={{ width: `${overall.pctReviewed}%` }} /></div>
      </div>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
        <button className="btn secondary" aria-pressed={view === 'module'} onClick={() => setParam({ view: 'module', module: null, area: null })}>By experience level {view === 'module' ? '✓' : ''}</button>
        <button className="btn secondary" aria-pressed={view === 'topic'} onClick={() => setParam({ view: 'topic', module: null, area: null })}>By area (all levels) {view === 'topic' ? '✓' : ''}</button>
      </div>

      {!loaded && <div className="card"><p>Loading interview questions…</p><div className="skeleton" style={{ height: 24, marginBottom: 10 }} /><div className="skeleton" /><div className="skeleton" style={{ marginTop: 8 }} /></div>}

      {loaded && view === 'module' && !selectedModule && (
        <>
          <div className="grid grid-2 module-grid">
            {INTERVIEW_MODULES.map(mod => {
              const qs = interviewQuestions.filter(q => q.module === mod.id)
              const stats = reviewStats(qs, data.interviewReview, data.questionBookmarks)
              const next = firstUnreviewed(qs, data.interviewReview, SORT_CTX)
              return (
                <article key={mod.id} className={`card module-card${mod.isResume ? ' resume' : ''}`}>
                  <p style={{ margin: 0 }}><span className="badge">{mod.level}</span>{mod.isResume && <span className="badge accent"> Resume, not a question module</span>}</p>
                  <h2 style={{ margin: '8px 0 4px' }}>{mod.title}</h2>
                  <p style={{ color: 'var(--muted)', marginTop: 0 }}>{mod.description}</p>
                  <p><strong>{qs.length} questions</strong> · {stats.reviewed} reviewed · {stats.confident} confident{stats.needsReview > 0 ? ` · ${stats.needsReview} need review` : ''}</p>
                  <div className="progress-bar" aria-label={`${stats.pctReviewed}% reviewed in ${mod.title}`}><div style={{ width: `${stats.pctReviewed}%` }} /></div>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 12 }}>
                    <button className="btn" onClick={() => setParam({ view: 'module', module: mod.id, area: null })}>
                      <GraduationCap size={16} /> {stats.reviewed === 0 ? 'Start' : stats.reviewed < qs.length ? 'Continue' : 'Review again'}
                    </button>
                    {next && <span style={{ alignSelf: 'center', color: 'var(--muted)', fontSize: '0.9rem' }}>Next up: {next.question.length > 60 ? `${next.question.slice(0, 60)}…` : next.question}</span>}
                  </div>
                </article>
              )
            })}
          </div>
          <p style={{ color: 'var(--muted)', fontSize: '0.9rem' }}>
            Counts are by each question&apos;s experience-level module. The same questions are also filed under topic files in the content
            (Databases, System Design, DSA, DevOps, Testing, Frontend, Behavioural) — so a module total is bigger than any single
            content file, e.g. Module 1 has {interviewQuestions.filter(q => q.module === 'module-1').length} questions while module-1.json holds fewer.
          </p>
        </>
      )}

      {loaded && (selectedModule || view === 'topic') && (
        <div>
          {selectedMeta && (
            <div className="card iv-module-head">
              <button className="btn secondary small" onClick={() => setParam({ view: 'module', module: null, area: null })}>← All modules</button>
              <h2 style={{ margin: '10px 0 4px' }}>{selectedMeta.title}</h2>
              <p style={{ color: 'var(--muted)', marginTop: 0 }}>{selectedMeta.description}</p>
              {selectedStats && (
                <p style={{ margin: '4px 0 8px' }}>
                  <strong>{selectedStats.reviewed} of {selectedStats.total} reviewed</strong> · {selectedStats.confident} confident · {selectedStats.needsReview} need review · {selectedStats.bookmarked} bookmarked
                </p>
              )}
              <div className="progress-bar" aria-label={`${selectedStats?.pctReviewed || 0}% reviewed in ${selectedMeta.title}`}><div style={{ width: `${selectedStats?.pctReviewed || 0}%` }} /></div>
              {nextUp && <p style={{ margin: '8px 0 0' }}>Next unreviewed question: <strong>{nextUp.question}</strong></p>}
            </div>
          )}
          {view === 'topic' && (
            <div className="card iv-module-head">
              <h2 style={{ margin: '0 0 4px' }}>Browse by area</h2>
              <p style={{ color: 'var(--muted)', margin: 0 }}>The same {interviewQuestions.length} questions, grouped by broad area — across all experience levels. Each question shows its module as a badge.</p>
            </div>
          )}

          {/* Filters that actually help: text, difficulty, area, review status, self-test. */}
          <div className="card iv-filters" aria-label="Filter interview questions">
            <label className="iv-filter">
              <span className="sr-only">Search interview questions</span>
              <span className="iv-search-wrap"><Search size={16} /><input className="input" type="search" placeholder="Search questions and answers…" value={filters.query} onChange={e => setFilters({ ...filters, query: e.target.value })} aria-label="Search interview questions" /></span>
            </label>
            <label className="iv-filter">Difficulty
              <select className="select" value={filters.difficulty} onChange={e => setFilters({ ...filters, difficulty: e.target.value })} aria-label="Filter by difficulty">
                <option value="all">All difficulties</option><option>Easy</option><option>Medium</option><option>Hard</option>
              </select>
            </label>
            <label className="iv-filter">Area
              <select className="select" value={filters.category} onChange={e => setFilters({ ...filters, category: e.target.value })} aria-label="Filter by area">
                <option value="all">All areas</option>{categories.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </label>
            <label className="iv-filter">Review status
              <select className="select" value={filters.review} onChange={e => setFilters({ ...filters, review: e.target.value as never })} aria-label="Filter by review status">
                <option value="all">All questions</option>
                <option value="not-reviewed">Not yet reviewed</option>
                <option value="needs-review">Needs review</option>
                <option value="confident">Confident</option>
                <option value="bookmarked">Bookmarked</option>
              </select>
            </label>
            <label className="iv-filter iv-toggle">
              <input type="checkbox" checked={selfTest} onChange={e => setSelfTest(e.target.checked)} /> Self-test mode
              <span className="iv-toggle-note">{selfTest ? 'Answers hidden until revealed' : 'Short answers shown'}</span>
            </label>
            <div className="iv-filter-actions">
              <button className="btn secondary small" onClick={revealAll}>Reveal all</button>
              <button className="btn secondary small" onClick={hideAll}>Hide all</button>
              {filtersActive && <button className="btn secondary small" onClick={clearFilters}><X size={15} /> Clear filters</button>}
            </div>
          </div>

          {filtered.length === 0 && (
            <div className="card iv-empty" role="status">
              <h3 style={{ marginTop: 0 }}>No questions match those filters</h3>
              <p style={{ color: 'var(--muted)' }}>
                {scoped.length === 0
                  ? 'This module has no questions yet.'
                  : 'Try a different search term, or clear the filters to see every question in this view.'}
              </p>
              <button className="btn" onClick={clearFilters}>Clear all filters</button>
              <Link className="btn secondary" to="/learn" style={{ marginLeft: 8 }}>Browse Learn instead</Link>
            </div>
          )}

          {groups.length > 1 && (
            <nav className="card iv-area-jump" aria-label="Jump to a broad area">
              <strong>Jump to area: </strong>
              {groups.map(g => (
                <button key={g.category} className="btn secondary small" onClick={() => jumpToArea(g.category)}>
                  {g.category} ({g.questions.length})
                </button>
              ))}
            </nav>
          )}

          {groups.map((group, i) => (
            <AreaGroupCard
              key={group.category}
              group={group}
              selfTest={selfTest}
              expandedIds={expandedIds}
              onToggleQuestion={toggleQuestion}
              open={openAreas.has(group.category)}
              onToggleOpen={() => setOpenAreas(prev => {
                const next = new Set(prev)
                if (next.has(group.category)) next.delete(group.category)
                else next.add(group.category)
                return next
              })}
              showModule={view === 'topic'}
              nextArea={groups[i + 1]}
              onJumpToArea={jumpToArea}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export function InterviewQuestionPage() {
  const { questionId } = useParams()
  const { questions: interviewQuestions, loaded } = useInterviewQuestions()
  const { data, toggleList, setInterviewReview } = useApp()
  const [revealed, setRevealed] = useState(false)
  const [copied, setCopied] = useState(false)
  const [copyFailed, setCopyFailed] = useState(false)

  const q = interviewQuestions.find(x => x.id === questionId)
  const { prev, next } = prevNextQuestion(interviewQuestions, questionId || '', SORT_CTX)

  useEffect(() => {
    window.scrollTo(0, 0)
    setRevealed(false)
    setCopied(false)
    setCopyFailed(false)
  }, [questionId])

  if (!loaded) return <div><h1>Loading question…</h1><p>Fetching this interview question.</p><div className="skeleton" style={{ height: 24, marginBottom: 10 }} /><div className="skeleton" /></div>
  if (!q) return <div><h1>Question not found</h1><p>That question id does not exist in the current interview content. It may have been removed, or planned for a later batch — your other data is unaffected.</p><p><Link to="/interview">← Back to Interview Prep</Link> · <Link to="/search">Search questions</Link> · <Link to="/learn">Browse Learn</Link></p></div>

  const topic = q.topicId ? getTopic(q.topicId) : undefined
  const mod = moduleMeta(q.module)
  const status = data.interviewReview[q.id]
  const bookmarked = data.questionBookmarks.includes(q.id)
  const copy = async () => {
    setCopyFailed(false)
    try {
      await navigator.clipboard.writeText(`${q.question}\n\n${q.shortAnswer}${q.detailedAnswer ? `\n\n${q.detailedAnswer}` : ''}`)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch { setCopied(false); setCopyFailed(true) }
  }

  return (
    <div style={{ overflowWrap: 'break-word' }}>
      <nav className="breadcrumb" aria-label="Breadcrumb">
        <span className="breadcrumb-item"><Link to="/interview">Interview Prep</Link></span>
        <span className="breadcrumb-sep">/</span>
        {mod && <><span className="breadcrumb-item"><Link to={`/interview?view=module&module=${mod.id}`}>{mod.title}</Link></span><span className="breadcrumb-sep">/</span></>}
        <span className="breadcrumb-item"><Link to={`/interview?view=module&module=${q.module}&area=${areaSlug(q.category)}`}>{q.category}</Link></span>
        <span className="breadcrumb-sep">/</span>
        <span className="breadcrumb-item"><span className="breadcrumb-current" aria-current="page">{q.question.length > 60 ? `${q.question.slice(0, 60)}…` : q.question}</span></span>
      </nav>

      <article className="card q-page">
        <h1 style={{ marginBottom: 4 }}>{q.question}</h1>
        <p className="q-badges">
          <span className="badge">{q.category || 'General'}</span>{' '}
          <span className="badge">{q.difficulty || 'Medium'}</span>{' '}
          {mod && <span className="badge">{mod.title}</span>}{' '}
          {topic && <span className="badge">Topic: {topic.title}</span>}{' '}
          <ReviewBadge status={status} />{' '}
          {bookmarked && <span className="badge accent">Bookmarked</span>}
        </p>

        <div className="q-actions">
          <button className="btn secondary small" onClick={() => setRevealed(!revealed)} aria-expanded={revealed}>
            {revealed ? <><EyeOff size={15} /> Hide answer</> : <><Eye size={15} /> Reveal answer</>}
          </button>
          <button className="btn secondary small" onClick={() => toggleList('questionBookmarks', q.id)} aria-pressed={bookmarked}>
            <Bookmark size={15} /> {bookmarked ? 'Bookmarked ✓' : 'Bookmark question'}
          </button>
          <button className="btn secondary small" onClick={copy}><Copy size={15} /> {copied ? 'Copied!' : 'Copy question + answer'}</button>
          {copyFailed && <span role="alert" style={{ color: 'var(--danger)', alignSelf: 'center' }}>Copy failed (clipboard blocked) — select the text manually instead.</span>}
          <button className="btn secondary small" aria-pressed={status === 'confident'} onClick={() => setInterviewReview(q.id, 'confident')}>Mark Confident {status === 'confident' ? '✓' : ''}</button>
          <button className="btn secondary small" aria-pressed={status === 'needs-review'} onClick={() => setInterviewReview(q.id, 'needs-review')}>Needs review {status === 'needs-review' ? '✓' : ''}</button>
        </div>

        {revealed ? (
          <div className="q-answer">
            <h3>Short answer</h3><p>{q.shortAnswer || 'No short answer yet.'}</p>
            {q.detailedAnswer ? (
              <><h3>Detailed answer</h3><p style={{ whiteSpace: 'pre-wrap' }}>{q.detailedAnswer}</p></>
            ) : (
              <p style={{ color: 'var(--muted)' }}>No detailed answer yet — the short answer above is the key point.</p>
            )}
            {q.followUps && q.followUps.length > 0 && <><h3>Likely follow-ups</h3><ul>{q.followUps.map((f, i) => <li key={i}>{f}</li>)}</ul></>}
            {q.tips && q.tips.length > 0 && <><h3>Tips</h3><ul>{q.tips.map((f, i) => <li key={i}>{f}</li>)}</ul></>}
            {q.commonMistakes && q.commonMistakes.length > 0 && <><h3>Common mistakes</h3><ul>{q.commonMistakes.map((f, i) => <li key={i}>{f}</li>)}</ul></>}
          </div>
        ) : (
          <div className="card" style={{ background: 'var(--surface-2)' }}>
            <p style={{ color: 'var(--muted)', margin: 0 }}><strong>Try it first.</strong> Answer in your own words, out loud or on paper, then reveal the answer and compare. Mark yourself Confident or Needs review afterwards.</p>
          </div>
        )}
      </article>

      {topic && (
        <div className="card" style={{ marginTop: 16 }}>
          <h3 style={{ marginTop: 0 }}>Study this topic in Learn</h3>
          <p style={{ color: 'var(--muted)' }}>{topic.summary || topic.title}</p>
          <Link className="btn secondary" to={topicUrl(topic)}>Open {topic.title} →</Link>
        </div>
      )}
      {q.relatedTopics && q.relatedTopics.length > 0 && (
        <div className="card" style={{ marginTop: 16 }}>
          <h3 style={{ marginTop: 0 }}>Related topics</h3>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {q.relatedTopics.map(id => {
              const t = getTopic(id)
              return t ? <Link key={id} className="btn secondary small" to={topicUrl(t)}>{t.title}</Link> : null
            })}
          </div>
        </div>
      )}

      <div className="topic-nav-bottom" aria-label="Previous and next question">
        {prev
          ? <Link className="btn secondary" to={`/interview/question/${prev.id}`}><ChevronLeft size={16} /> Previous: {prev.question.length > 50 ? `${prev.question.slice(0, 50)}…` : prev.question}</Link>
          : <span />}
        {next
          ? <Link className="btn secondary" to={`/interview/question/${next.id}`}>Next: {next.question.length > 50 ? `${next.question.slice(0, 50)}…` : next.question} <ChevronRight size={16} /></Link>
          : <span />}
      </div>
      <p style={{ marginTop: 16 }}>
        <Link to={`/interview?view=module&module=${q.module}&area=${areaSlug(q.category)}`}>← Back to {q.category} in {mod?.title || 'this module'}</Link>
      </p>
    </div>
  )
}
