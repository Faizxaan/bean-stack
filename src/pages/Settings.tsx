import React, { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { contentIndex } from '../lib/content'
import { useApp } from '../store/AppContext'
import { localDateString, truncateImportErrors, validateImport } from '../lib/utils'
import { type UserData } from '../types'

const MAX_IMPORT_BYTES = 5_000_000
// An armed reset used to stay armed forever: arm it, walk away, and a
// later stray click could wipe data. It disarms itself after 15 s.
const CONFIRM_TIMEOUT_MS = 15_000

function ConfirmButton({ label, onConfirm, danger }: { label: string; onConfirm: () => void; danger?: boolean }) {
  const [armed, setArmed] = useState(false)
  const confirmRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!armed) return
    confirmRef.current?.focus()
    const t = setTimeout(() => setArmed(false), CONFIRM_TIMEOUT_MS)
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setArmed(false) }
    document.addEventListener('keydown', onKey)
    return () => { clearTimeout(t); document.removeEventListener('keydown', onKey) }
  }, [armed])

  // A destructive action must look destructive before it is armed, not
  // only after: "Reset everything" was a plain secondary button until
  // the second click, so nothing warned the user up front.
  if (!armed) return <button className={`btn small ${danger ? 'danger' : 'secondary'}`} onClick={() => setArmed(true)}>{label}</button>
  return (
    <span style={{ display: 'inline-flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
      <span role="alert">Are you sure? This cannot be undone — export first if you might want it back.</span>
      <button ref={confirmRef} className={`btn small ${danger ? 'danger' : ''}`} onClick={() => { onConfirm(); setArmed(false) }}>Yes, reset</button>
      <button className="btn secondary small" onClick={() => setArmed(false)}>Cancel</button>
    </span>
  )
}

function countSummary(d: Record<string, unknown>): { progress: number; notes: number; bookmarks: number; attempts: number } {
  const obj = (v: unknown) => (v && typeof v === 'object' && !Array.isArray(v) ? Object.keys(v as object).length : 0)
  const arr = (v: unknown) => (Array.isArray(v) ? v.length : 0)
  return {
    progress: obj(d.progress),
    notes: obj(d.notes),
    bookmarks: arr(d.bookmarks) + arr(d.questionBookmarks) + arr(d.flashcardBookmarks),
    attempts: arr(d.practiceAttempts),
  }
}

interface PendingImport {
  data: UserData
  warnings: string[]
  fileName: string
  summary: { progress: number; notes: number; bookmarks: number; attempts: number }
}

export function Settings() {
  const { data, setSettings, resetScope, replaceData, markExported } = useApp()
  const [importErrors, setImportErrors] = useState<string[]>([])
  const [importHiddenCount, setImportHiddenCount] = useState(0)
  const [importWarnings, setImportWarnings] = useState<string[]>([])
  const [importOk, setImportOk] = useState(false)
  const [exportError, setExportError] = useState<string | null>(null)
  const [pendingImport, setPendingImport] = useState<PendingImport | null>(null)
  const [resetMessage, setResetMessage] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const exportData = () => {
    setExportError(null)
    try {
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      // A dated filename, so a new export never silently overwrites
      // last week's backup in the Downloads folder.
      a.download = `beanstack-data-${localDateString()}.json`
      // The anchor must be in the document for the download to fire in
      // every browser, and the object URL must live until the download
      // has started — revoking it synchronously could cancel it.
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      setTimeout(() => URL.revokeObjectURL(url), 1000)
      markExported()
    } catch (e) {
      setExportError(`Export failed: ${e instanceof Error ? e.message : String(e)} — your data in this browser is unchanged.`)
    }
  }

  const onImportFile = async (file: File) => {
    setImportErrors([]); setImportHiddenCount(0); setImportWarnings([]); setImportOk(false); setPendingImport(null)
    // A multi-megabyte file (e.g. one bloated note) must be rejected
    // up front, not parsed into a DOM-sized error dump.
    if (file.size > MAX_IMPORT_BYTES) {
      setImportErrors([`Import file is too large (${(file.size / 1_000_000).toFixed(1)} MB; limit 5 MB). Trim large notes, export a fresh copy, and try again. Your current data was not changed.`])
      return
    }
    try {
      const text = await file.text()
      let parsed: unknown
      try { parsed = JSON.parse(text) } catch {
        setImportErrors(['Import failed: the file is not valid JSON. Fix the file (a JSON validator helps) or export a fresh copy from Settings, then try again. Your current data was not changed.'])
        return
      }
      const knownTopics = new Set(contentIndex.topics.map(t => t.id))
      // Include revision prompt ids: they share the questionBookmarks /
      // interviewReview keys, so an import carrying a Module 0 prompt's
      // saved state must validate, not be rejected as unknown.
      const knownQuestions = new Set([...contentIndex.interviewQuestionIds, ...contentIndex.revisionPromptIds])
      const knownPractice = new Set(contentIndex.practiceItemIds)
      const result = validateImport(parsed, knownTopics, knownQuestions, knownPractice)
      if (!result.ok) {
        const { shown, hidden } = truncateImportErrors(result.errors)
        setImportErrors(shown); setImportHiddenCount(hidden)
        return
      }
      // Import used to replace all data the moment a valid file was
      // picked — no confirmation, no way back. A validated file now
      // waits here until the user confirms the replacement, with an
      // export-first escape hatch. Only validated data ever reaches
      // replaceData, and it is sanitised again there (duplicates
      // removed, notes trimmed).
      setPendingImport({
        data: parsed as UserData,
        warnings: result.warnings.slice(0, 10),
        fileName: file.name,
        summary: countSummary(parsed as Record<string, unknown>),
      })
    } catch (e) {
      setImportErrors([`Import failed: ${e instanceof Error ? e.message : String(e)}. Your current data was not changed.`])
    }
  }

  const confirmImport = () => {
    if (!pendingImport) return
    replaceData(pendingImport.data)
    setImportWarnings(pendingImport.warnings)
    setPendingImport(null)
    setImportOk(true)
  }

  // A corrupt stored timestamp used to render "NaN days ago"; a
  // future-dated one (clock skew) used to render a negative count.
  const lastExportMs = data.lastExportedAt ? new Date(data.lastExportedAt).getTime() : NaN
  const lastExportDays = Number.isNaN(lastExportMs) ? null : Math.max(0, Math.floor((Date.now() - lastExportMs) / 86400000))
  const currentSummary = countSummary(data as unknown as Record<string, unknown>)
  const hasData = currentSummary.progress + currentSummary.notes + currentSummary.bookmarks + currentSummary.attempts > 0

  const resetWithMessage = (scope: 'progress' | 'bookmarks' | 'favorites' | 'notes' | 'practice' | 'all', message: string) => {
    resetScope(scope)
    setResetMessage(message)
  }

  return (
    <div>
      <nav className="breadcrumb" aria-label="Breadcrumb">
        <span className="breadcrumb-item"><Link to="/">Home</Link></span>
        <span className="breadcrumb-sep"> / </span>
        <span className="breadcrumb-item"><span className="breadcrumb-current" aria-current="page">Settings</span></span>
      </nav>
      <h1>Settings &amp; Data Safety</h1>
      <p style={{ color: 'var(--muted)' }}>All your Beanstack data lives in this browser&apos;s LocalStorage only. There is no account, no backend, and no sync. Export regularly — if the browser clears LocalStorage, unexported data is gone.</p>

      <div className="card" style={{ marginBottom: 16 }}>
        <h2>Reading preferences</h2>
        <label>Theme <select className="select" value={data.settings.theme} onChange={e => setSettings({ theme: e.target.value as UserData['settings']['theme'] })}><option value="system">System</option><option value="light">Light</option><option value="dark">Dark</option></select></label>
        <label style={{ display: 'block', marginTop: 10 }}>Font size <select className="select" value={data.settings.fontSize} onChange={e => setSettings({ fontSize: e.target.value as UserData['settings']['fontSize'] })}><option value="small">Small</option><option value="medium">Medium</option><option value="large">Large</option></select></label>
        <label style={{ display: 'block', marginTop: 10 }}>Reading width <select className="select" value={data.settings.width} onChange={e => setSettings({ width: e.target.value as UserData['settings']['width'] })}><option value="narrow">Narrow</option><option value="wide">Wide</option></select></label>
        <label style={{ display: 'block', marginTop: 10 }}><input type="checkbox" checked={data.settings.reducedMotion} onChange={e => setSettings({ reducedMotion: e.target.checked })} /> Respect reduced motion / disable animations</label>
        <p style={{ color: 'var(--muted)', fontSize: '0.9rem' }}>Theme also respects your system preference when set to System. Motion is kept subtle throughout Beanstack.</p>
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <h2>Export / Import</h2>
        <p>Export includes progress, bookmarks, favorites, notes, practice history, interview review, and settings. Import checks that every topic, question, and practice item in the file actually exists in Beanstack, and rejects files over 5 MB. A rejected import never changes your current data.</p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          <button className="btn" onClick={exportData}>Export all data as JSON</button>
          <button className="btn secondary" onClick={() => fileRef.current?.click()}>Import JSON…</button>
        </div>
        <input ref={fileRef} type="file" accept="application/json,.json" aria-label="Import JSON file" style={{ display: 'none' }} onChange={e => { const f = e.target.files?.[0]; if (f) void onImportFile(f); e.target.value = '' }} />
        {exportError && <p role="alert" style={{ color: 'var(--danger)' }}>{exportError}</p>}
        {pendingImport && (
          <div className="card" role="alertdialog" aria-label="Confirm import" style={{ marginTop: 12, background: 'var(--surface-2)' }}>
            <h3 style={{ marginTop: 0 }}>Replace your current data with “{pendingImport.fileName}”?</h3>
            <p style={{ margin: '0 0 8px' }}>
              The file contains {pendingImport.summary.progress} progress entries, {pendingImport.summary.notes} notes, {pendingImport.summary.bookmarks} bookmarks and {pendingImport.summary.attempts} practice attempts.
              Your current data has {currentSummary.progress} progress entries, {currentSummary.notes} notes, {currentSummary.bookmarks} bookmarks and {currentSummary.attempts} practice attempts — importing replaces it entirely, and there is no undo.
            </p>
            {hasData && <p style={{ margin: '0 0 12px' }}>If you have not exported recently, export your current data first so you can get it back.</p>}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              <button className="btn danger" onClick={confirmImport}>Yes, replace my data</button>
              <button className="btn secondary" onClick={exportData}>Export current data first</button>
              <button className="btn secondary" onClick={() => setPendingImport(null)}>Cancel — keep my current data</button>
            </div>
          </div>
        )}
        {importOk && <p role="status" style={{ color: 'var(--accent)' }}>Import succeeded and data was replaced.</p>}
        {importWarnings.length > 0 && <div role="status" style={{ color: 'var(--muted)' }}><p>Import adjustments (your data was still imported):</p><ul>{importWarnings.map((w, i) => <li key={i}>{w}</li>)}</ul></div>}
        {importErrors.length > 0 && <div role="alert" style={{ color: 'var(--danger)' }}><p>Import was rejected — your current data was not changed. Fix the file and try again, or export a fresh copy first:</p><ul>{importErrors.map((err, i) => <li key={i}>{err}</li>)}</ul>{importHiddenCount > 0 && <p>…and {importHiddenCount} more error(s) not shown. Fix the first few and re-import.</p>}</div>}
        <p style={{ color: 'var(--muted)' }}>
          {lastExportDays === null
            ? 'You have not exported yet — consider exporting after your first study session.'
            : lastExportDays === 0 ? 'Last exported today.'
            : lastExportDays >= 30
              ? `Backup reminder: last exported ${lastExportDays} days ago — export now, so a browser clear does not wipe ${currentSummary.progress} progress entries and ${currentSummary.notes} notes.`
              : `Backup reminder: last exported ${lastExportDays} day${lastExportDays === 1 ? '' : 's'} ago.`}
        </p>
      </div>

      <div className="card">
        <h2>Granular resets (each asks for confirmation)</h2>
        <p style={{ color: 'var(--muted)' }}>Each reset clears only what it names. Export first if you might want the data back — resets cannot be undone.</p>
        <div style={{ display: 'grid', gap: 10 }}>
          <div><ConfirmButton label="Reset progress" onConfirm={() => resetWithMessage('progress', 'Progress reset. Your bookmarks, notes and practice history are untouched.')} /> <span style={{ color: 'var(--muted)' }}>Clears which topics you marked Not started / In Progress / Completed.</span></div>
          <div><ConfirmButton label="Reset bookmarks" onConfirm={() => resetWithMessage('bookmarks', 'Bookmarks reset.')} /> <span style={{ color: 'var(--muted)' }}>Clears topic, interview-question, and flashcard bookmarks.</span></div>
          <div><ConfirmButton label="Reset favorites" onConfirm={() => resetWithMessage('favorites', 'Favorites reset.')} /> <span style={{ color: 'var(--muted)' }}>Clears favorited topics only.</span></div>
          <div><ConfirmButton label="Reset notes" onConfirm={() => resetWithMessage('notes', 'Notes reset.')} /> <span style={{ color: 'var(--muted)' }}>Deletes your personal notes on topic pages.</span></div>
          <div><ConfirmButton label="Reset practice history" onConfirm={() => resetWithMessage('practice', 'Practice history reset.')} /> <span style={{ color: 'var(--muted)' }}>Clears practice attempts, flashcard progress, and interview Confident / Needs review marks.</span></div>
          <div><ConfirmButton label="Reset everything (keeps settings)" onConfirm={() => resetWithMessage('all', 'Everything reset except your reading preferences. Export first next time if you might want it back.')} danger /> <span style={{ color: 'var(--muted)' }}>Clears all of the above. Your theme, font size, reading width, and motion settings stay as they are.</span></div>
        </div>
        {resetMessage && <p role="status" style={{ color: 'var(--accent)', marginTop: 12 }}>{resetMessage}</p>}
        <p style={{ color: 'var(--muted)', fontSize: '0.9rem', marginTop: 12 }}>Resetting everything keeps your reading preferences, but clears progress, bookmarks, favorites, notes, and practice history. Export first if you might want it back.</p>
      </div>
    </div>
  )
}
