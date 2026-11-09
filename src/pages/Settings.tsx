import React, { useRef, useState } from 'react'
import { contentIndex } from '../lib/content'
import { useApp } from '../store/AppContext'
import { truncateImportErrors, validateImport } from '../lib/utils'
import { EMPTY_USER_DATA, type UserData } from '../types'

const MAX_IMPORT_BYTES = 5_000_000

function ConfirmButton({ label, onConfirm, danger }: { label: string; onConfirm: () => void; danger?: boolean }) {
  const [armed, setArmed] = useState(false)
  if (!armed) return <button className="btn secondary small" onClick={() => setArmed(true)}>{label}</button>
  return (
    <span style={{ display: 'inline-flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
      <span role="alert">Are you sure?</span>
      <button className={`btn small ${danger ? 'danger' : ''}`} onClick={() => { onConfirm(); setArmed(false) }}>Yes, reset</button>
      <button className="btn secondary small" onClick={() => setArmed(false)}>Cancel</button>
    </span>
  )
}

export function Settings() {
  const { data, setSettings, resetScope, replaceData, markExported } = useApp()
  const [importErrors, setImportErrors] = useState<string[]>([])
  const [importHiddenCount, setImportHiddenCount] = useState(0)
  const [importWarnings, setImportWarnings] = useState<string[]>([])
  const [importOk, setImportOk] = useState(false)
  const [exportError, setExportError] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const exportData = () => {
    setExportError(null)
    try {
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url; a.download = 'beanstack-data.json'; a.click()
      URL.revokeObjectURL(url)
      markExported()
    } catch (e) {
      setExportError(`Export failed: ${e instanceof Error ? e.message : String(e)} — your data in this browser is unchanged.`)
    }
  }

  const onImportFile = async (file: File) => {
    setImportErrors([]); setImportHiddenCount(0); setImportWarnings([]); setImportOk(false)
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
      const knownQuestions = new Set(contentIndex.interviewQuestionIds)
      const knownPractice = new Set(contentIndex.practiceItemIds)
      const result = validateImport(parsed, knownTopics, knownQuestions, knownPractice)
      if (!result.ok) {
        const { shown, hidden } = truncateImportErrors(result.errors)
        setImportErrors(shown); setImportHiddenCount(hidden)
        return
      }
      // Only validated data ever reaches replaceData, and it is
      // sanitised again there (duplicates removed, notes trimmed).
      replaceData(parsed as UserData)
      setImportWarnings(result.warnings.slice(0, 10))
      setImportOk(true)
    } catch (e) {
      setImportErrors([`Import failed: ${e instanceof Error ? e.message : String(e)}. Your current data was not changed.`])
    }
  }

  // A corrupt stored timestamp used to render "NaN days ago".
  const lastExportMs = data.lastExportedAt ? new Date(data.lastExportedAt).getTime() : NaN
  const lastExportDays = Number.isNaN(lastExportMs) ? null : Math.floor((Date.now() - lastExportMs) / 86400000)

  return (
    <div>
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
        <p>Export includes progress, bookmarks, favorites, notes, practice history, interview review, and settings, with schema version {data.schemaVersion}. Import validates that referenced topic, question, and practice ids actually exist, and rejects files over 5 MB. A rejected import never changes your current data.</p>
        <button className="btn" onClick={exportData}>Export all data as JSON</button>
        <button className="btn secondary" style={{ marginLeft: 8 }} onClick={() => fileRef.current?.click()}>Import JSON…</button>
        <input ref={fileRef} type="file" accept="application/json,.json" aria-label="Import JSON file" style={{ display: 'none' }} onChange={e => { const f = e.target.files?.[0]; if (f) void onImportFile(f); e.target.value = '' }} />
        {exportError && <p role="alert" style={{ color: 'var(--danger)' }}>{exportError}</p>}
        {importOk && <p role="status" style={{ color: 'green' }}>Import succeeded and data was replaced.</p>}
        {importWarnings.length > 0 && <div role="status" style={{ color: 'var(--muted)' }}><p>Import adjustments (your data was still imported):</p><ul>{importWarnings.map((w, i) => <li key={i}>{w}</li>)}</ul></div>}
        {importErrors.length > 0 && <div role="alert" style={{ color: 'var(--danger)' }}><p>Import was rejected — your current data was not changed. Fix the file and try again, or export a fresh copy first:</p><ul>{importErrors.map((err, i) => <li key={i}>{err}</li>)}</ul>{importHiddenCount > 0 && <p>…and {importHiddenCount} more error(s) not shown. Fix the first few and re-import.</p>}</div>}
        <p style={{ color: 'var(--muted)' }}>
          {lastExportDays === null ? 'You have not exported yet — consider exporting after your first study session.' : lastExportDays === 0 ? 'Last exported today.' : `Backup reminder: last exported ${lastExportDays} day${lastExportDays === 1 ? '' : 's'} ago.`}
        </p>
      </div>

      <div className="card">
        <h2>Granular resets (each asks for confirmation)</h2>
        <div style={{ display: 'grid', gap: 10 }}>
          <div><ConfirmButton label="Reset progress" onConfirm={() => resetScope('progress')} /></div>
          <div><ConfirmButton label="Reset bookmarks" onConfirm={() => resetScope('bookmarks')} /></div>
          <div><ConfirmButton label="Reset favorites" onConfirm={() => resetScope('favorites')} /></div>
          <div><ConfirmButton label="Reset notes" onConfirm={() => resetScope('notes')} /></div>
          <div><ConfirmButton label="Reset practice history" onConfirm={() => resetScope('practice')} /></div>
          <div><ConfirmButton label="Reset everything (keeps settings)" onConfirm={() => resetScope('all')} danger /></div>
        </div>
        <p style={{ color: 'var(--muted)', fontSize: '0.9rem', marginTop: 12 }}>Resetting everything keeps your reading preferences, but clears progress, bookmarks, favorites, notes, and practice history. Export first if you might want it back.</p>
        <p style={{ color: 'var(--muted)', fontSize: '0.9rem' }}>Current data (for debugging import): schema v{EMPTY_USER_DATA.schemaVersion}, {Object.keys(data.progress).length} progress entries, {data.bookmarks.length} bookmarks.</p>
      </div>
    </div>
  )
}
