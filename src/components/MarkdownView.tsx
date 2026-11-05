import React, { useEffect } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import hljs from 'highlight.js/lib/common'
import 'highlight.js/styles/github-dark.css'

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
          h2: ({ children }) => {
            const id = slug(children)
            return <h2 id={id} data-heading={String(children ?? '')}>{children}</h2>
          },
          // Tables otherwise overflow narrow screens: the wrapper scrolls
          // horizontally instead of squeezing or clipping the table.
          table: ({ children }) => (
            <div className="table-scroll"><table>{children}</table></div>
          ),
        }}
      >{markdown}</ReactMarkdown>
    </div>
  )
}
