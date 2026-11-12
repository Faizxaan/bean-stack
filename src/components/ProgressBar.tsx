import React from 'react'

// One progress-bar implementation for the whole app. The bars used to
// be bare <div>s — some with an aria-label but no role, some with
// neither — so screen readers announced nothing at all about progress.
// role="progressbar" + aria-valuenow makes the percentage perceivable,
// and the visible text next to each bar already states it for sighted
// users, so the label is the only thing the bar itself needs.
export function ProgressBar({ pct, label, className }: { pct: number; label: string; className?: string }) {
  const value = Number.isFinite(pct) ? Math.min(100, Math.max(0, Math.round(pct))) : 0
  return (
    <div
      className={`progress-bar${className ? ` ${className}` : ''}`}
      role="progressbar"
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label}
    >
      <div style={{ width: `${value}%` }} />
    </div>
  )
}
