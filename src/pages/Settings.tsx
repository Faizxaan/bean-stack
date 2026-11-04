import React, { useRef, useState } from 'react'
import { contentIndex } from '../lib/content'
import { useApp } from '../store/AppContext'
import { validateImport } from '../lib/utils'
import { EMPTY_USER_DATA, type UserData } from '../types'

function ConfirmButton({ label, onConfirm, danger }: { label: string; onConfirm: () => void; danger?: boolean }) {
  const [armed, setArmed] = useState(false)
  if (!armed) return <button className="btn secondary small" onClick={() => setArmed(true)}>{label}</button>
  return (
    <span style={{ display: 'inline-flex', gap: 8, alignItems: 'center' }}>
      <span>Are you sure?</span>
      <button className={`btn small ${danger ? 'danger' : ''}`} onClick={() => { onConfirm(); setArmed(false) }}>Yes, reset</button>
      <button className="btn secondary small" onClick={() => setArmed(false)}>Cancel</button>
    </span>
  )
}

export function Settings() {
  const { data, setSettings, resetScope, replaceData, markExported } = useApp()
  const [importError, setImportError] = useState<string | null>(null)
  const [importOk, setImportOk] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const exportData = () => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = 'beanstack-data.json'; a.click()
    URL.revokeObjectURL(url)
    markExported()
  }

  const onImportFile = async (file: File) => {
    setImportError(null); setImportOk(false)
    try {
      const text = await file.text()
      const parsed = JSON.parse(text) as UserData
      const knownTopics = new Set(contentIndex.topics.map(t => t.id))
      const knownQuestions = new Set(contentIndex.interviewQuestions.map(q => q.id))
      const result = validateImport(parsed, knownTopics, knownQuestions)
      if (!result.ok) { setImportError(result.errors.join('; ')); return }
      replaceData(parsed)
      setImportOk(true)
    } catch (e) {
      setImportError(`Import failed: ${e instanceof Error ? e.message : String(e)}`)
    }
  }

  const lastExportDays = data.lastExportedAt ? Math.floor((Date.now() - new Date(data.lastExportedAt).getTime()) / 86400000) : null

  return (
    <div>
      <h1>Settings &amp; Data Safety</h1>
      <p style={{ color: 'var(--muted)' }}>All your Beanstack data lives in this browser&apos;s LocalStorage only. There is no account, no backend, and no sync. Export regularly — if the browser clears LocalStorage, unexported data is gone.</p>

      <div className="card" style={{ marginBottom: 16 }}>
        <h2>Reading preferences</h2>
        <label>Theme <select className="select" value={data.settings.theme} onChange={e => setSettings({ theme: e.target.value as never })}><option value="system">System</option><option value="light">Light</option><option value="dark">Dark</option></select></label>
        <label style={{ display: 'block', marginTop: 10 }}>Font size <select className="select" value={data.settings.fontSize} onChange={e => setSettings({ fontSize: e.target.value as never })}><option value="small">Small</option><option value="medium">Medium</option><option value="large">Large</option></select></label>
        <label style={{ display: 'block', marginTop: 10 }}>Reading width <select className="select" value={data.settings.width} onChange={e => setSettings({ width: e.target.value as never })}><option value="narrow">Narrow</option><option value="wide">Wide</option></select></label>
        <label style={{ display: 'block', marginTop: 10 }}><input type="checkbox" checked={data.settings.reducedMotion} onChange={e => setSettings({ reducedMotion: e.target.checked })} /> Respect reduced motion / disable animations</label>
        <p style={{ color: 'var(--muted)', fontSize: '0.9rem' }}>Theme also respects your system preference when set to System. Motion is kept subtle throughout Beanstack.</p>
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <h2>Export / Import</h2>
        <p>Export includes progress, bookmarks, favorites, notes, practice history, interview review, and settings, with schema version {data.schemaVersion}. Import validates that referenced topic and question ids actually exist.</p>
        <button className="btn" onClick={exportData}>Export all data as JSON</button>
        <button className="btn secondary" style={{ marginLeft: 8 }} onClick={() => fileRef.current?.click()}>Import JSON…</button>
        <input ref={fileRef} type="file" accept="application/json,.json" style={{ display: 'none' }} onChange={e => { const f = e.target.files?.[0]; if (f) onImportFile(f) }} />
        {importOk && <p role="status" style={{ color: 'green' }}>Import succeeded and data was replaced.</p>}
        {importError && <p role="alert" style={{ color: 'var(--danger)' }}>{importError}</p>}
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
