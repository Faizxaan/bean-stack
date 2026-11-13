import React, { useEffect, useRef, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import hljs from 'highlight.js/lib/common'
import { Copy } from 'lucide-react'
import 'highlight.js/styles/github-dark.css'

// One code block with a Copy button (Batch 3, 2026-11-13). The button
// copies the block's plain text — read from the <code> element's
// textContent, so highlight.js's <span> markup never leaks into the
// clipboard — and shows Copied / Copy failed feedback for 2.5s. The
// <pre> keeps its tabIndex={0} keyboard scrolling, and the button is
// a separate tab stop that does not sit inside the <pre>, so neither
// the static-SVG diagrams (plain <img>, untouched here) nor the
// highlighting pass (which queries 'pre code') is affected. The
// clipboard write mirrors Learn.tsx's copyTopicLink: navigator.clipboard
// when available, textarea + execCommand fallback otherwise.
function CodeBlock({ children }: { children: React.ReactNode }) {
  const preRef = useRef<HTMLPreElement>(null)
  const [state, setState] = useState<'idle' | 'copied' | 'failed'>('idle')
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current) }, [])

  const copy = async () => {
    const text = preRef.current?.querySelector('code')?.textContent ?? preRef.current?.textContent ?? ''
    let ok = false
    try {
      if (navigator.clipboard && window.isSecureContext) { await navigator.clipboard.writeText(text); ok = true }
    } catch { /* fall through to textarea fallback */ }
    if (!ok) {
      try {
        const ta = document.createElement('textarea')
        ta.value = text
        ta.style.position = 'fixed'; ta.style.opacity = '0'
        document.body.appendChild(ta); ta.select()
        ok = document.execCommand('copy')
        document.body.removeChild(ta)
      } catch { ok = false }
    }
    setState(ok ? 'copied' : 'failed')
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => setState('idle'), 2500)
  }

  return (
    <div className="code-block">
      <pre ref={preRef} tabIndex={0}>{children}</pre>
      <button type="button" className="code-copy-btn" onClick={copy} aria-label="Copy code block" aria-live="polite">
        <Copy size={13} aria-hidden="true" /> {state === 'copied' ? 'Copied ✓' : state === 'failed' ? 'Copy failed' : 'Copy'}
      </button>
    </div>
  )
}

export function MarkdownView({ markdown }: { markdown: string }) {
  useEffect(() => {
    // Highlight code blocks after render; react-markdown renders <pre><code class="language-java">
    document.querySelectorAll('pre code').forEach((el) => {
      if (!(el as HTMLElement).dataset.highlighted) {
        hljs.highlightElement(el as HTMLElement)
      }
    })
  }, [markdown])
  const slug = (text: React.ReactNode) => String(text ?? '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
  return (
    <div className="topic-body" id="top">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          // tabIndex -1: TOC links move focus here (Learn.tsx), so a
          // keyboard user lands on the heading they jumped to instead
          // of staying on the TOC link while the viewport moves.
          h2: ({ children }) => {
            const id = slug(children)
            return <h2 id={id} tabIndex={-1} data-heading={String(children ?? '')}>{children}</h2>
          },
          // A pre with a long line is a scrollable region; without a
          // tab stop a keyboard user can never scroll it. The copy
          // button lives beside the pre (see CodeBlock), not in it.
          pre: ({ children }) => <CodeBlock>{children}</CodeBlock>,
          // Tables otherwise overflow narrow screens: the wrapper scrolls
          // horizontally instead of squeezing or clipping the table.
          // A wide table is a scrollable region; without a tab stop a
          // keyboard user can never scroll it (same reason the <pre>
          // has tabIndex 0). role + aria-label announce the region.
          table: ({ children }) => (
            <div className="table-scroll" tabIndex={0} role="region" aria-label="Scrollable table"><table>{children}</table></div>
          ),
        }}
      >{markdown}</ReactMarkdown>
    </div>
  )
}
