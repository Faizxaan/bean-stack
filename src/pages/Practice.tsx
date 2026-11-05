import React, { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { contentIndex, getTopic } from '../lib/content'
import { useApp } from '../store/AppContext'
import { accuracyByTopic, isDue, topicUrl, weakTopics } from '../lib/utils'

function McqCard({ item }: { item: typeof contentIndex.practiceItems[number] }) {
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
      <div className="card" style={{ marginBottom: 12, overflowWrap: 'break-word' }}>
        <strong>{item.title}</strong>
        <p>{item.prompt}</p>
        <p style={{ color: 'var(--muted)' }}>This question cannot be answered yet: {options.length === 0 ? 'it has no options.' : 'its answer key is missing.'} It is not counted in your accuracy.</p>
        {topic && <p>Related topic: <Link to={topicUrl(topic)}>{topic.title}</Link></p>}
      </div>
    )
  }
  return (
    <div className="card" style={{ marginBottom: 12, overflowWrap: 'break-word' }}>
      <strong>{item.title}</strong>
      <p>{item.prompt}</p>
      {item.code && <pre style={{ background: '#0f172a', color: '#e2e8f0', padding: 12, borderRadius: 8, overflowX: 'auto' }}>{item.code}</pre>}
      {(item.options || []).map((opt, i) => (
        <label key={i} style={{ display: 'block', margin: '6px 0' }}>
          <input type="radio" name={item.id} checked={selected === i} onChange={() => setSelected(i)} disabled={checked} /> {opt}
        </label>
      ))}
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

function FlashcardCard({ item }: { item: typeof contentIndex.practiceItems[number] }) {
  const { data, setFlashcardBox, toggleList } = useApp()
  const [flipped, setFlipped] = useState(false)
  const state = data.flashcardStates[item.id]
  const dueLabel = !state ? ' · due today' : Number.isNaN(new Date(state.dueAt).getTime()) ? ' · due today' : ` · due ${new Date(state.dueAt).toLocaleDateString()}`
  return (
    <div className="card" style={{ marginBottom: 12, overflowWrap: 'break-word' }}>
      <strong>{item.title}</strong>
      <div style={{ minHeight: 80, padding: 12, border: '1px solid var(--border)', borderRadius: 8, margin: '10px 0', cursor: 'pointer' }} onClick={() => setFlipped(!flipped)} onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setFlipped(!flipped) } }} tabIndex={0} role="button" aria-label={`Flip flashcard: ${item.title}`}>
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

function CodingCard({ item }: { item: typeof contentIndex.practiceItems[number] }) {
  const [showSolution, setShowSolution] = useState(false)
  const [showHints, setShowHints] = useState(false)
  const topic = item.topicId ? getTopic(item.topicId) : undefined
  return (
    <div className="card" style={{ marginBottom: 12, overflowWrap: 'break-word' }}>
      <strong>{item.title}</strong>
      <p>{item.description || item.prompt}</p>
      {item.examples && item.examples.length > 0 && <><strong>Examples</strong><ul>{item.examples.map((e, i) => <li key={i}><code>{e}</code></li>)}</ul></>}
      <div style={{ display: 'flex', gap: 8 }}>
        <button className="btn secondary small" onClick={() => setShowHints(!showHints)} aria-expanded={showHints}>{showHints ? 'Hide hints' : 'Show hints'}</button>
        <button className="btn small" onClick={() => setShowSolution(!showSolution)} aria-expanded={showSolution}>{showSolution ? 'Hide model solution' : 'Reveal model solution'}</button>
      </div>
      {showHints && (!item.hints || item.hints.length === 0) && <p style={{ color: 'var(--muted)' }}>No hints provided for this question yet.</p>}
      {showHints && item.hints && <ul>{item.hints.map((h, i) => <li key={i}>{h}</li>)}</ul>}
      {showSolution && !item.solution && <p style={{ color: 'var(--muted)' }}>No model solution provided for this question yet.</p>}
      {showSolution && item.solution && <pre style={{ background: '#0f172a', color: '#e2e8f0', padding: 12, borderRadius: 8, overflowX: 'auto' }}>{item.solution}</pre>}
      {topic && <p>Related topic: <Link to={topicUrl(topic)}>{topic.title}</Link></p>}
    </div>
  )
}

const PRACTICE_TABS = ['mcq', 'flashcard', 'coding', 'output', 'scenario', 'mock'] as const
type PracticeTab = typeof PRACTICE_TABS[number]

export function Practice() {
  const [params] = useSearchParams()
  // An unknown ?tab= value used to render the tab bar with nothing
  // below it. Fall back to MCQs instead of a blank section.
  const paramTab = params.get('tab')
  const initialTab: PracticeTab = (PRACTICE_TABS as readonly string[]).includes(paramTab || '') ? (paramTab as PracticeTab) : 'mcq'
  const [tab, setTab] = useState<PracticeTab>(initialTab)
  const [retryWrongOnly, setRetryWrongOnly] = useState(false)
  const [dueOnly, setDueOnly] = useState(false)
  const [mock, setMock] = useState<{ items: typeof contentIndex.practiceItems; answers: Record<string, number>; finished: boolean; startedAt: number } | null>(null)
  const { data } = useApp()
  const byType = (t: string) => contentIndex.practiceItems.filter(i => i.type === t)
  const accuracy = accuracyByTopic(data.practiceAttempts, contentIndex.practiceItems)
  const weak = weakTopics(data.practiceAttempts, contentIndex.practiceItems)
  // Only wrong answers for items that still exist are retryable.
  const knownPractice = new Set(contentIndex.practiceItems.map(i => i.id))
  const wrongIds = [...new Set(data.practiceAttempts.filter(a => !a.correct && knownPractice.has(a.itemId)).map(a => a.itemId))]
  const dueFlashcards = byType('flashcard').filter(i => { const st = data.flashcardStates[i.id]; return !st || isDue(st.dueAt) })
  const flashcardsShown = dueOnly ? dueFlashcards : byType('flashcard')
  const mcqsShown = retryWrongOnly ? byType('mcq').filter(i => wrongIds.includes(i.id)) : byType('mcq')
  const outputsShown = retryWrongOnly ? byType('output').filter(i => wrongIds.includes(i.id)) : byType('output')

  const startMock = () => {
    const mcqs = byType('mcq').slice(0, 10)
    if (mcqs.length === 0) return
    setMock({ items: mcqs, answers: {}, finished: false, startedAt: Date.now() })
  }
  const mockScore = mock ? mock.items.filter(i => mock.answers[i.id] === i.answerIndex).length : 0

  return (
    <div>
      <h1>Practice</h1>
      <p style={{ color: 'var(--muted)' }}>Attempts are saved in this browser, so you can see accuracy per topic, weak areas, and retry what you got wrong.</p>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }} role="group" aria-label="Practice sections">
        {PRACTICE_TABS.map(t => (
          <button key={t} className="btn secondary" aria-pressed={tab === t} onClick={() => setTab(t)}>{t === 'mcq' ? 'MCQs' : t === 'flashcard' ? `Flashcards (${dueFlashcards.length} due)` : t === 'coding' ? 'Coding' : t === 'output' ? 'Output-Based' : t === 'scenario' ? 'Scenario-Based' : 'Mock Interview'} {tab === t ? '✓' : ''}</button>
        ))}
      </div>
      {(tab === 'mcq' || tab === 'output') && (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
          <button className="btn secondary small" aria-pressed={retryWrongOnly} onClick={() => setRetryWrongOnly(!retryWrongOnly)}>
            {retryWrongOnly ? 'Show all questions' : `Retry wrong only (${wrongIds.length})`}
          </button>
          {retryWrongOnly && wrongIds.length === 0 && <span style={{ color: 'var(--muted)', alignSelf: 'center' }}>You have no wrong answers to retry yet — answer some questions first.</span>}
        </div>
      )}
      {tab === 'flashcard' && (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
          <button className="btn secondary small" aria-pressed={dueOnly} onClick={() => setDueOnly(!dueOnly)}>
            {dueOnly ? 'Show all flashcards' : `Due today only (${dueFlashcards.length})`}
          </button>
        </div>
      )}

      {data.practiceAttempts.length > 0 && (
        <div className="card" style={{ marginBottom: 16 }}>
          <strong>Your accuracy</strong>
          <ul>{accuracy.map(a => { const t = getTopic(a.topicId); return <li key={a.topicId}>{t ? t.title : a.topicId === 'general' ? 'General' : 'Removed topic'}: {a.correct}/{a.total} ({a.pct}%)</li> })}</ul>
          {weak.length > 0 && <p><strong>Weak areas to revisit:</strong> {weak.map(w => { const t = getTopic(w.topicId); return t ? t.title : w.topicId === 'general' ? 'General' : 'Removed topic' }).join(', ')}</p>}
          {wrongIds.length > 0 && <p>Retry what you got wrong: {wrongIds.length} item(s) — use “Retry wrong only” in MCQs / Output questions.</p>}
        </div>
      )}

      {tab === 'mock' && (
        <div>
          {!mock && <div className="card"><p>Mock interview: choose this mode once core practice is solid. It uses MCQs from the current practice set, timed by your own pace, with a scored summary at the end.</p>{byType('mcq').length === 0 ? <p style={{ color: 'var(--muted)' }}>No MCQs are available yet, so a mock interview cannot start. Try the other practice sections, or browse Learn.</p> : <button className="btn" onClick={startMock}>Start mock interview ({Math.min(10, byType('mcq').length)} questions)</button>}</div>}
          {mock && mock.items.length === 0 && <div className="card"><p>No questions in this mock interview.</p><button className="btn secondary" onClick={() => setMock(null)}>Back to mock setup</button></div>}
          {mock && !mock.finished && (
            <div>
              {mock.items.map(item => (
                <div key={item.id} className="card" style={{ marginBottom: 12 }}>
                  <strong>{item.title}</strong><p>{item.prompt}</p>
                  {(item.options || []).map((opt, i) => (
                    <label key={i} style={{ display: 'block', margin: '6px 0' }}><input type="radio" name={item.id} checked={mock.answers[item.id] === i} onChange={() => setMock(m => m ? { ...m, answers: { ...m.answers, [item.id]: i } } : m)} /> {opt}</label>
                  ))}
                </div>
              ))}
              <button className="btn" onClick={() => setMock(m => m ? { ...m, finished: true } : m)}>Finish &amp; see score</button>
            </div>
          )}
          {mock && mock.finished && (
            <div className="card">
              <h2>Mock summary</h2>
              <p>Score: {mockScore} / {mock.items.length} ({mock.items.length ? Math.round((mockScore / mock.items.length) * 100) : 0}%)</p>
              <p>Time: {Math.round((Date.now() - mock.startedAt) / 1000)} seconds (self-paced timer)</p>
              <button className="btn secondary" onClick={() => setMock(null)}>Start another mock</button>
            </div>
          )}
        </div>
      )}

      {tab === 'mcq' && (mcqsShown.length ? mcqsShown.map(i => <McqCard key={i.id} item={i} />) : <div className="card">{retryWrongOnly ? <><p>No wrong MCQs to retry — nice work. Switch the filter off to practise everything again.</p><button className="btn secondary" onClick={() => setRetryWrongOnly(false)}>Show all MCQs</button></> : 'No MCQs yet in this batch. They are added with each practice batch, linked to topics.'}</div>)}
      {tab === 'flashcard' && (flashcardsShown.length ? flashcardsShown.map(i => <FlashcardCard key={i.id} item={i} />) : <div className="card">{dueOnly ? <><p>Nothing due today — the Leitner deck is caught up. Come back tomorrow, or review the full deck now.</p><button className="btn secondary" onClick={() => setDueOnly(false)}>Show all flashcards</button></> : 'No flashcards yet. Flashcards are atomic and use Leitner boxes once added.'}</div>)}
      {tab === 'coding' && (byType('coding').length ? byType('coding').map(i => <CodingCard key={i.id} item={i} />) : <div className="card">No coding questions yet in this batch.</div>)}
      {tab === 'output' && (outputsShown.length ? outputsShown.map(i => <McqCard key={i.id} item={i} />) : <div className="card">{retryWrongOnly ? <><p>No wrong output questions to retry.</p><button className="btn secondary" onClick={() => setRetryWrongOnly(false)}>Show all output questions</button></> : 'No output-based questions yet. Output questions work like MCQs: read the code, predict the output, check the explanation.'}</div>)}
      {tab === 'scenario' && (byType('scenario').length ? byType('scenario').map(i => <CodingCard key={i.id} item={i} />) : <div className="card">No scenario-based questions yet. Scenario questions give a real-world situation and a revealable model approach.</div>)}
    </div>
  )
}
