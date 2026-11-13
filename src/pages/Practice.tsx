import React, { useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useSearchParams } from 'react-router-dom'
import { contentIndex, getTopic, getTrack, usePracticeItems } from '../lib/content'
import type { PracticeItem } from '../types'
import { useApp } from '../store/AppContext'
import { accuracyByTopic, filterByTrackSection, isDue, pickMockQuestions, smoothScrollBehavior, topicUrl, weakTopics } from '../lib/utils'
import { ProgressBar } from '../components/ProgressBar'

function McqCard({ item }: { item: PracticeItem }) {
  const { recordAttempt } = useApp()
  const [selected, setSelected] = useState<number | null>(null)
  const [checked, setChecked] = useState(false)
  const topic = item.topicId ? getTopic(item.topicId) : undefined
  const options = item.options || []
  const answerValid = typeof item.answerIndex === 'number' && item.answerIndex >= 0 && item.answerIndex < options.length
  // No options, or an out-of-range answer key, used to render a card
  // whose Check button could never be enabled / never be right — a
  // stuck card. Say so plainly instead of rendering a dead control.
  if (options.length === 0 || !answerValid) {
    return (
      <div className="card" id={`practice-${item.id}`} style={{ marginBottom: 12, overflowWrap: 'break-word' }}>
        <h3 className="practice-title">{item.title}</h3>
        <p>{item.prompt}</p>
        <p style={{ color: 'var(--muted)' }}>This question cannot be answered yet: {options.length === 0 ? 'it has no options.' : 'its answer key is missing.'} It is not counted in your accuracy.</p>
        {topic && <p>Related topic: <Link to={topicUrl(topic)}>{topic.title}</Link></p>}
      </div>
    )
  }
  return (
    <div className="card" id={`practice-${item.id}`} style={{ marginBottom: 12, overflowWrap: 'break-word' }}>
      <h3 className="practice-title">{item.title}</h3>
      <p>{item.prompt}</p>
      {item.code && <pre tabIndex={0} style={{ background: '#0f172a', color: '#e2e8f0', padding: 12, borderRadius: 8, overflowX: 'auto', maxWidth: '100%' }}>{item.code}</pre>}
      <div role="radiogroup" aria-label={item.title}>
        {(item.options || []).map((opt, i) => (
          <label key={i} style={{ display: 'block', margin: '6px 0', padding: '6px 0' }}>
            <input type="radio" name={item.id} checked={selected === i} onChange={() => setSelected(i)} disabled={checked} /> {opt}
          </label>
        ))}
      </div>
      {!checked ? (
        <button className="btn small" disabled={selected === null} onClick={() => { if (selected !== null) { setChecked(true); recordAttempt(item.id, selected === item.answerIndex) } }}>Check answer</button>
      ) : (
        <div>
          <p><strong>{selected === item.answerIndex ? 'Correct ✓' : 'Not quite — retry to learn it.'}</strong></p>
          {item.explanation && <p>{item.explanation}</p>}
          <button className="btn secondary small" onClick={() => { setChecked(false); setSelected(null) }}>Retry</button>
          {topic && <span style={{ marginLeft: 10 }}>Related topic: <Link to={topicUrl(topic)}>{topic.title}</Link></span>}
        </div>
      )}
    </div>
  )
}

// Batch 3 (2026-11-13): the deck view passes flipped/onFlip so one
// Flip button and Prev/Next can drive the card; without them the card
// keeps its own internal flip state exactly as before.
function FlashcardCard({ item, flipped: controlledFlipped, onFlip }: { item: PracticeItem; flipped?: boolean; onFlip?: () => void }) {
  const { data, setFlashcardBox, toggleList } = useApp()
  const [internalFlipped, setInternalFlipped] = useState(false)
  const flipped = controlledFlipped ?? internalFlipped
  const flip = () => { if (onFlip) onFlip(); else setInternalFlipped(v => !v) }
  const state = data.flashcardStates[item.id]
  const dueLabel = !state ? ' · due today' : Number.isNaN(new Date(state.dueAt).getTime()) ? ' · due today' : ` · due ${new Date(state.dueAt).toLocaleDateString()}`
  return (
    <div className="card" id={`practice-${item.id}`} style={{ marginBottom: 12, overflowWrap: 'break-word' }}>
      <h3 className="practice-title">{item.title}</h3>
      <div style={{ minHeight: 80, padding: 12, border: '1px solid var(--border)', borderRadius: 8, margin: '10px 0', cursor: 'pointer' }} onClick={flip} onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); flip() } }} tabIndex={0} role="button" aria-label={`Flip flashcard: ${item.title} — currently showing ${flipped ? 'back' : 'front'}`}>
        {flipped ? (item.back || 'Back not provided for this flashcard yet.') : (item.front || 'Front not provided for this flashcard yet.')}
        <div style={{ color: 'var(--muted)', fontSize: '0.85rem', marginTop: 8 }}>{flipped ? 'Back — click or press Enter to flip back' : 'Front — click or press Enter to flip'}</div>
      </div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button className="btn secondary small" onClick={() => setFlashcardBox(item.id, 1)}>Forgot — back to Box 1</button>
        <button className="btn secondary small" onClick={() => setFlashcardBox(item.id, Math.min(5, (state?.box || 1) + 1))}>Got it — move up a box</button>
        <button className="btn secondary small" onClick={() => toggleList('flashcardBookmarks', item.id)}>{data.flashcardBookmarks.includes(item.id) ? 'Bookmarked ✓' : 'Bookmark flashcard'}</button>
        <span className="badge">Box {state?.box || 1}{dueLabel}</span>
      </div>
    </div>
  )
}

function CodingCard({ item }: { item: PracticeItem }) {
  const [showSolution, setShowSolution] = useState(false)
  const [showHints, setShowHints] = useState(false)
  const topic = item.topicId ? getTopic(item.topicId) : undefined
  return (
    <div className="card" style={{ marginBottom: 12, overflowWrap: 'break-word' }}>
      <h3 className="practice-title">{item.title}</h3>
      <p>{item.description || item.prompt}</p>
      {item.examples && item.examples.length > 0 && <><strong>Examples</strong><ul>{item.examples.map((e, i) => <li key={i}><code>{e}</code></li>)}</ul></>}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {item.hints && item.hints.length > 0 && <button className="btn secondary small" onClick={() => setShowHints(!showHints)} aria-expanded={showHints}>{showHints ? 'Hide hints' : 'Show hints'}</button>}
        <button className="btn small" onClick={() => setShowSolution(!showSolution)} aria-expanded={showSolution}>{showSolution ? 'Hide model solution' : 'Reveal model solution'}</button>
      </div>
      <p style={{ color: 'var(--muted)', fontSize: '0.9rem' }}>Self-checked: compare your approach with the model solution. Coding and scenario questions are not scored and do not count towards your accuracy — only MCQs and output questions do.</p>
      {showHints && (!item.hints || item.hints.length === 0) && <p style={{ color: 'var(--muted)' }}>No hints provided for this question yet.</p>}
      {showHints && item.hints && <ul>{item.hints.map((h, i) => <li key={i}>{h}</li>)}</ul>}
      {showSolution && !item.solution && <p style={{ color: 'var(--muted)' }}>No model solution provided for this question yet.</p>}
      {showSolution && item.solution && <pre tabIndex={0} style={{ background: '#0f172a', color: '#e2e8f0', padding: 12, borderRadius: 8, overflowX: 'auto', maxWidth: '100%' }}>{item.solution}</pre>}
      {topic && <p>Related topic: <Link to={topicUrl(topic)}>{topic.title}</Link></p>}
    </div>
  )
}

const PRACTICE_TABS = ['mcq', 'flashcard', 'coding', 'output', 'scenario', 'mock'] as const
type PracticeTab = typeof PRACTICE_TABS[number]

export function Practice() {
  const [params] = useSearchParams()
  const location = useLocation()
  // An unknown ?tab= value used to render the tab bar with nothing
  // below it. Fall back to MCQs instead of a blank section.
  const paramTab = params.get('tab')
  const initialTab: PracticeTab = (PRACTICE_TABS as readonly string[]).includes(paramTab || '') ? (paramTab as PracticeTab) : 'mcq'
  const [tab, setTab] = useState<PracticeTab>(initialTab)
  const [retryWrongOnly, setRetryWrongOnly] = useState(false)
  const [dueOnly, setDueOnly] = useState(false)
  // Batch 3 (2026-11-13): track/section filters, applied to every tab's
  // list (and to the mock pool — a mock drawn while filtered practises
  // that track/section). Changing the track resets the section.
  const [trackFilter, setTrackFilter] = useState('all')
  const [sectionFilter, setSectionFilter] = useState('all')
  // Batch 3 (2026-11-13): one-card flashcard deck (see the flashcards
  // render below). deckFlipped resets on every card change.
  const [deckIndex, setDeckIndex] = useState(0)
  const [deckFlipped, setDeckFlipped] = useState(false)
  const [mock, setMock] = useState<{ items: PracticeItem[]; answers: Record<string, number>; finished: boolean; startedAt: number } | null>(null)
  // Ids of the previous mock, session-only: the next mock avoids them
  // while the pool allows (60 MCQs, so 50 fresh remain after one mock).
  // No new LocalStorage field was added for this — a persisted field
  // would mean a UserData schema change (sanitise + import validation)
  // for a nicety, and the shuffle already randomises across reloads.
  const [prevMockIds, setPrevMockIds] = useState<string[]>([])
  const { data, recordAttempt } = useApp()
  const { items: practiceItems, loaded } = usePracticeItems()
  // Track/section scope: derived from each item's topicId (getTopic),
  // so no new taxonomy — a track is a Learn track, a section is one
  // of its Learn sections. Counts in the tab bar and the due/wrong
  // filters below all read from this scoped list.
  const scopedItems = useMemo(
    () => filterByTrackSection(practiceItems, trackFilter, sectionFilter, id => {
      const t = getTopic(id)
      return t ? { track: t.track, section: t.section } : undefined
    }),
    [practiceItems, trackFilter, sectionFilter],
  )
  const byType = (t: string) => scopedItems.filter(i => i.type === t)
  // Filter options stay stable while filtering (derived from the full
  // set, not the scoped one), so picking a track never removes the
  // other tracks from the list.
  const tracksInPractice = useMemo(
    () => contentIndex.tracks.filter(tr => practiceItems.some(i => getTopic(i.topicId || '')?.track === tr.id)),
    [practiceItems],
  )
  const sectionsInTrack = useMemo(
    () => {
      const track = trackFilter === 'all' ? undefined : getTrack(trackFilter)
      if (!track) return []
      return track.sections.filter(sec => practiceItems.some(i => {
        const t = getTopic(i.topicId || '')
        return t?.track === track.id && t.section === sec.id
      }))
    },
    [practiceItems, trackFilter],
  )
  const accuracy = accuracyByTopic(data.practiceAttempts, practiceItems)
  const weak = weakTopics(data.practiceAttempts, practiceItems)
  // Only wrong answers for items that still exist are retryable.
  const knownPractice = new Set(practiceItems.map(i => i.id))
  const wrongIds = [...new Set(data.practiceAttempts.filter(a => !a.correct && knownPractice.has(a.itemId)).map(a => a.itemId))]
  // The retry count on a tab must count only that tab's questions:
  // the old shared count could say "Retry wrong only (3)" on the MCQ
  // tab when all 3 wrong answers were output questions, and then show
  // an empty list.
  const wrongMcqIds = wrongIds.filter(id => byType('mcq').some(i => i.id === id))
  const wrongOutputIds = wrongIds.filter(id => byType('output').some(i => i.id === id))
  const dueFlashcards = byType('flashcard').filter(i => { const st = data.flashcardStates[i.id]; return !st || isDue(st.dueAt) })
  const flashcardsShown = dueOnly ? dueFlashcards : byType('flashcard')
  const mcqsShown = retryWrongOnly ? byType('mcq').filter(i => wrongMcqIds.includes(i.id)) : byType('mcq')
  const outputsShown = retryWrongOnly ? byType('output').filter(i => wrongOutputIds.includes(i.id)) : byType('output')

  const startMock = () => {
    // A mock used to be the first 10 MCQs in file order, every time.
    // Draw a fresh random set instead, avoiding the previous mock's
    // questions while the pool allows; recording/review on Finish is
    // unchanged (see finishMock below).
    const mcqs = pickMockQuestions(byType('mcq'), 10, prevMockIds)
    if (mcqs.length === 0) return
    setPrevMockIds(mcqs.map(i => i.id))
    setMock({ items: mcqs, answers: {}, finished: false, startedAt: Date.now() })
  }
  const mockScore = mock ? mock.items.filter(i => mock.answers[i.id] === i.answerIndex).length : 0
  const mockAnswered = mock ? Object.keys(mock.answers).length : 0
  // Finishing a mock records each answered question as a practice
  // attempt, so mock answers count towards accuracy and "retry wrong"
  // — previously a finished mock vanished without a trace.
  const finishMock = () => {
    if (!mock) return
    for (const item of mock.items) {
      const chosen = mock.answers[item.id]
      if (typeof chosen === 'number') recordAttempt(item.id, chosen === item.answerIndex)
    }
    setMock({ ...mock, finished: true })
  }

  // Deck position: clamp when the list shrinks (due-only toggle, or a
  // track/section filter), and always show the front of a new card.
  const goToCard = (i: number) => {
    setDeckIndex(Math.max(0, Math.min(i, Math.max(0, flashcardsShown.length - 1))))
    setDeckFlipped(false)
  }
  useEffect(() => {
    setDeckIndex(i => Math.min(i, Math.max(0, flashcardsShown.length - 1)))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flashcardsShown.length])

  // Deep links from Search / the command palette use
  // #practice-<itemId>. Scroll to that card once its tab has loaded —
  // without this, a search result landed at the top of a long list and
  // the user had to hunt for the question they had just clicked.
  // In the flashcard deck only one card is rendered, so a deep link
  // first moves the deck to that card (Library links here) and the
  // scroll then lands on it.
  useEffect(() => {
    if (!loaded || !location.hash.startsWith('#practice-')) return
    if (tab === 'flashcard') {
      const idx = flashcardsShown.findIndex(i => `practice-${i.id}` === location.hash.slice(1))
      if (idx >= 0) setDeckIndex(idx)
    }
    const t = setTimeout(() => document.getElementById(location.hash.slice(1))?.scrollIntoView({ behavior: smoothScrollBehavior(), block: 'start' }), 50)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded, location.hash, tab])

  return (
    <div>
      <nav className="breadcrumb" aria-label="Breadcrumb">
        <span className="breadcrumb-item"><Link to="/">Home</Link></span>
        <span className="breadcrumb-sep"> / </span>
        <span className="breadcrumb-item"><span className="breadcrumb-current" aria-current="page">Practice</span></span>
      </nav>
      <h1>Practice</h1>
      <p style={{ color: 'var(--muted)' }}>Attempts are saved in this browser, so you can see accuracy per topic, weak areas, and retry what you got wrong. Only MCQs and output questions are scored — coding and scenario questions are self-checked against a model solution.</p>
      {!loaded && <div className="card"><p>Loading practice questions…</p></div>}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }} role="group" aria-label="Practice sections">
        {PRACTICE_TABS.map(t => (
          <button key={t} className="btn secondary" aria-pressed={tab === t} onClick={() => setTab(t)}>{t === 'mcq' ? `MCQs (${byType('mcq').length})` : t === 'flashcard' ? `Flashcards (${dueFlashcards.length} due of ${byType('flashcard').length})` : t === 'coding' ? `Coding (${byType('coding').length})` : t === 'output' ? `Output-Based (${byType('output').length})` : t === 'scenario' ? `Scenario-Based (${byType('scenario').length})` : `Mock Interview (${Math.min(10, byType('mcq').length)} questions)`} {tab === t ? '✓' : ''}</button>
        ))}
      </div>
      {/* Track/section filters (Batch 3): narrow every tab to one Learn
          track, optionally one section — derived from each item's
          topicId, so a filter can never offer a track/section with no
          practice items. The mock pool follows the filter too. */}
      <div className="card iv-filters" aria-label="Filter practice by track and section">
        <label className="iv-filter">Track
          <select className="select" value={trackFilter} onChange={e => { setTrackFilter(e.target.value); setSectionFilter('all') }} aria-label="Filter practice by track">
            <option value="all">All tracks ({practiceItems.length} items)</option>
            {tracksInPractice.map(tr => <option key={tr.id} value={tr.id}>{tr.title} ({practiceItems.filter(i => getTopic(i.topicId || '')?.track === tr.id).length})</option>)}
          </select>
        </label>
        <label className="iv-filter">Section
          <select className="select" value={sectionFilter} disabled={trackFilter === 'all'} onChange={e => setSectionFilter(e.target.value)} aria-label="Filter practice by section">
            <option value="all">All sections</option>
            {sectionsInTrack.map(sec => <option key={sec.id} value={sec.id}>{sec.title} ({practiceItems.filter(i => { const t = getTopic(i.topicId || ''); return t?.track === trackFilter && t.section === sec.id }).length})</option>)}
          </select>
        </label>
        {(trackFilter !== 'all' || sectionFilter !== 'all') && (
          <div className="iv-filter-actions">
            <span style={{ color: 'var(--muted)', alignSelf: 'center' }}>Showing {scopedItems.length} of {practiceItems.length} items</span>
            <button className="btn secondary small" onClick={() => { setTrackFilter('all'); setSectionFilter('all') }}>Clear track filter</button>
          </div>
        )}
      </div>
      {(tab === 'mcq' || tab === 'output') && (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
          <button className="btn secondary small" aria-pressed={retryWrongOnly} onClick={() => setRetryWrongOnly(!retryWrongOnly)}>
            {retryWrongOnly ? 'Show all questions' : `Retry wrong only (${tab === 'mcq' ? wrongMcqIds.length : wrongOutputIds.length})`}
          </button>
          {retryWrongOnly && (tab === 'mcq' ? wrongMcqIds.length === 0 : wrongOutputIds.length === 0) && <span style={{ color: 'var(--muted)', alignSelf: 'center' }}>You have no wrong answers to retry yet in this section — answer some questions first.</span>}
        </div>
      )}
      {tab === 'flashcard' && (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
          <button className="btn secondary small" aria-pressed={dueOnly} onClick={() => setDueOnly(!dueOnly)}>
            {dueOnly ? 'Show all flashcards' : `Due today only (${dueFlashcards.length})`}
          </button>
        </div>
      )}
      {tab === 'flashcard' && <p style={{ color: 'var(--muted)', fontSize: '0.9rem' }}>Flashcards use Leitner boxes: a card you get right moves up a box and comes back later (Box 1: tomorrow, Box 2: in 3 days, Box 3: in 7 days, Box 4: in 14 days, Box 5: in 30 days). A card you forget goes back to Box 1. New cards count as due until you have tried them once.</p>}

      {data.practiceAttempts.length > 0 && (
        <div className="card" style={{ marginBottom: 16 }}>
          <h2 className="practice-section-title">Your accuracy</h2>
          <ul>{accuracy.map(a => { const t = getTopic(a.topicId); return <li key={a.topicId}>{t ? t.title : a.topicId === 'general' ? 'General' : 'Removed topic'}: {a.correct}/{a.total} ({a.pct}%)</li> })}</ul>
          {weak.length > 0 && <p><strong>Weak areas to revisit:</strong> {weak.map(w => { const t = getTopic(w.topicId); return t ? t.title : w.topicId === 'general' ? 'General' : 'Removed topic' }).join(', ')}</p>}
          {wrongIds.length > 0 && <p>Retry what you got wrong: {wrongIds.length} item(s) — use “Retry wrong only” in MCQs / Output questions.</p>}
        </div>
      )}

      {tab === 'mock' && (
        <div>
          {!mock && <div className="card"><p>Mock interview: 10 MCQs drawn at random from the current practice set — a new set each time, avoiding the previous mock&apos;s questions when the pool allows. There is no time limit — answer at your own pace — and you will see a scored summary plus a review of every answer at the end. Your mock answers count towards your accuracy and “retry wrong”.</p>{byType('mcq').length === 0 ? <p style={{ color: 'var(--muted)' }}>No MCQs are available yet, so a mock interview cannot start. Try the other practice sections, or browse Learn.</p> : <button className="btn" onClick={startMock}>Start mock interview ({Math.min(10, byType('mcq').length)} questions)</button>}</div>}
          {mock && mock.items.length === 0 && <div className="card"><p>No questions in this mock interview.</p><button className="btn secondary" onClick={() => setMock(null)}>Back to mock setup</button></div>}
          {mock && !mock.finished && (
            <div>
              <p style={{ color: 'var(--muted)' }}>You have answered {mockAnswered} of {mock.items.length} questions. Answer all of them, then press “Finish &amp; see score”.</p>
              {mock.items.map((item, qi) => (
                <div key={item.id} className="card" style={{ marginBottom: 12 }}>
                  <h3 className="practice-title">Question {qi + 1} of {mock.items.length}: {item.title}</h3><p>{item.prompt}</p>
                  <div role="radiogroup" aria-label={`Mock question ${qi + 1}: ${item.title}`}>
                    {(item.options || []).map((opt, i) => (
                      <label key={i} style={{ display: 'block', margin: '6px 0', padding: '6px 0' }}><input type="radio" name={item.id} checked={mock.answers[item.id] === i} onChange={() => setMock(m => m ? { ...m, answers: { ...m.answers, [item.id]: i } } : m)} /> {opt}</label>
                    ))}
                  </div>
                </div>
              ))}
              <button className="btn" onClick={finishMock}>Finish &amp; see score</button>
            </div>
          )}
          {mock && mock.finished && (
            <div className="card">
              <h2>Mock summary</h2>
              <p>Score: {mockScore} / {mock.items.length} ({mock.items.length ? Math.round((mockScore / mock.items.length) * 100) : 0}%)</p>
              <p>Time: {Math.round((Date.now() - mock.startedAt) / 1000)} seconds (self-paced — there is no time limit)</p>
              <h3>Review your answers</h3>
              {mock.items.map((item, qi) => {
                const chosen = mock.answers[item.id]
                const correct = chosen === item.answerIndex
                const topic = item.topicId ? getTopic(item.topicId) : undefined
                return (
                  <div key={item.id} style={{ borderTop: '1px solid var(--border)', paddingTop: 10, marginTop: 10 }}>
                    <p style={{ margin: '0 0 4px' }}><strong>Question {qi + 1}: {correct ? 'Correct ✓' : 'Not correct'}</strong> — {item.prompt}</p>
                    <p style={{ margin: '0 0 4px' }}>Your answer: {typeof chosen === 'number' ? item.options?.[chosen] : 'No answer given'}</p>
                    {!correct && <p style={{ margin: '0 0 4px' }}>Correct answer: {typeof item.answerIndex === 'number' ? item.options?.[item.answerIndex] : '—'}</p>}
                    {item.explanation && <p style={{ color: 'var(--muted)', margin: '0 0 4px' }}>{item.explanation}</p>}
                    {topic && <p style={{ margin: 0 }}>Revise: <Link to={topicUrl(topic)}>{topic.title}</Link></p>}
                  </div>
                )
              })}
              <p style={{ marginTop: 16 }}><button className="btn secondary" onClick={() => setMock(null)}>Start another mock</button> <Link className="btn secondary" to="/practice?tab=mcq">Practise MCQs</Link></p>
            </div>
          )}
        </div>
      )}

      {tab === 'mcq' && (mcqsShown.length ? mcqsShown.map(i => <McqCard key={i.id} item={i} />) : <div className="card">{retryWrongOnly ? <><p>No wrong MCQs to retry — nice work. Switch the filter off to practise everything again.</p><button className="btn secondary" onClick={() => setRetryWrongOnly(false)}>Show all MCQs</button></> : (trackFilter !== 'all' || sectionFilter !== 'all') ? <><p>No MCQs in this track / section. Clear the filter to see the full set.</p><button className="btn secondary" onClick={() => { setTrackFilter('all'); setSectionFilter('all') }}>Clear track filter</button></> : 'No MCQs yet in this batch. They are added with each practice batch, linked to topics.'}</div>)}
      {/* One-card deck (Batch 3): the flashcards tab used to render all
          47 cards as one long scroll. Now it shows one card at a time
          with Prev / Next / Flip and a progress counter. Leitner is
          untouched — the card's own Forgot / Got it buttons still call
          setFlashcardBox, due-today counts still come from isDue, and
          flipping is still click or Enter/Space on the card itself.
          Arrow keys move between cards only while focus is in the deck. */}
      {tab === 'flashcard' && flashcardsShown.length > 0 && (
        <div
          onKeyDown={e => {
            if (e.key === 'ArrowLeft') { e.preventDefault(); goToCard(deckIndex - 1) }
            else if (e.key === 'ArrowRight') { e.preventDefault(); goToCard(deckIndex + 1) }
          }}
        >
          <p role="status" style={{ color: 'var(--muted)', margin: '0 0 8px' }}>
            Card {deckIndex + 1} of {flashcardsShown.length}
            {dueOnly ? ` · due today (${dueFlashcards.length} due)` : ` · ${dueFlashcards.length} due today`}
            {trackFilter !== 'all' ? ` · ${getTrack(trackFilter)?.title || trackFilter}` : ''}
          </p>
          <ProgressBar pct={Math.round(((deckIndex + 1) / flashcardsShown.length) * 100)} label={`Flashcard ${deckIndex + 1} of ${flashcardsShown.length}`} />
          <div style={{ marginTop: 12 }}>
            <FlashcardCard key={flashcardsShown[deckIndex].id} item={flashcardsShown[deckIndex]} flipped={deckFlipped} onFlip={() => setDeckFlipped(v => !v)} />
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            <button className="btn secondary" disabled={deckIndex === 0} onClick={() => goToCard(deckIndex - 1)}>← Previous card</button>
            <button className="btn secondary" onClick={() => setDeckFlipped(v => !v)} aria-label={deckFlipped ? 'Flip card to front' : 'Flip card to back'}>{deckFlipped ? 'Flip to front' : 'Flip card'}</button>
            <button className="btn secondary" disabled={deckIndex >= flashcardsShown.length - 1} onClick={() => goToCard(deckIndex + 1)}>Next card →</button>
            <span style={{ color: 'var(--muted)', fontSize: '0.9rem' }}>Tip: ← / → move between cards while focus is in the deck; Enter or Space flips the card.</span>
          </div>
        </div>
      )}
      {tab === 'flashcard' && flashcardsShown.length === 0 && <div className="card">{dueOnly ? <><p>Nothing due today — the Leitner deck is caught up. Come back tomorrow, or review the full deck now.</p><button className="btn secondary" onClick={() => setDueOnly(false)}>Show all flashcards</button></> : (trackFilter !== 'all' || sectionFilter !== 'all') ? <><p>No flashcards in this track / section. Clear the filter to see the full deck.</p><button className="btn secondary" onClick={() => { setTrackFilter('all'); setSectionFilter('all') }}>Clear track filter</button></> : 'No flashcards yet. Flashcards are atomic and use Leitner boxes once added.'}</div>}
      {tab === 'coding' && (byType('coding').length ? byType('coding').map(i => <CodingCard key={i.id} item={i} />) : <div className="card">No coding questions yet in this batch.</div>)}
      {tab === 'output' && (outputsShown.length ? outputsShown.map(i => <McqCard key={i.id} item={i} />) : <div className="card">{retryWrongOnly ? <><p>No wrong output questions to retry.</p><button className="btn secondary" onClick={() => setRetryWrongOnly(false)}>Show all output questions</button></> : (trackFilter !== 'all' || sectionFilter !== 'all') ? <><p>No output questions in this track / section. Clear the filter to see the full set.</p><button className="btn secondary" onClick={() => { setTrackFilter('all'); setSectionFilter('all') }}>Clear track filter</button></> : 'No output-based questions yet. Output questions work like MCQs: read the code, predict the output, check the explanation.'}</div>)}
      {tab === 'scenario' && (byType('scenario').length ? byType('scenario').map(i => <CodingCard key={i.id} item={i} />) : <div className="card">No scenario-based questions yet. Scenario questions give a real-world situation and a revealable model approach.</div>)}
    </div>
  )
}
