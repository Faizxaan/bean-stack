# DECISIONS.md — Decisions made while building Beanstack

Recorded so a later session (or a reviewer) can see why things are the way they are, without re-litigating them.

## 2026-11-04 — Foundations

- **Styling: custom CSS instead of Tailwind.** The prompt allows any styling approach (Tailwind is welcome, not required). A small custom CSS design system (variables, light/dark themes, responsive grid) was chosen for build reliability and to keep the initial bundle simple. The design system is coherent and applied consistently; switching to Tailwind later is possible but not required.
- **Content location: `content/` at repo root, not `src/content/`.** This makes "content is completely separate from UI code" literal and visible. Vite lazy-loads Markdown bodies from `/content/**/*.md` with `?raw`, so each topic becomes its own chunk.
- **Content index: generated JSON, committed.** `scripts/build-content-index.mjs` scans `content/` and writes `src/generated/content-index.json`. The app imports that index for navigation/search; topic bodies are lazy-loaded separately. The generated file is committed so a plain `npm install && npm run build` works without a prebuild step, and so reviewers can inspect the index. Never edit it by hand — regenerate it.
- **Structured data as JSON, prose as Markdown.** Topics and cheatsheets are Markdown with frontmatter (preferred format). Interview questions and practice items are JSON, because their fields (options, answer index, follow-ups, Leitner state) are structured data, not prose. Both live in `content/` and are validated by the same script, satisfying "cheatsheets, interview material and practice data all live in this same content system".
- **Tracks grouped by domain, but tracks are the primary navigation unit.** Domains (Java Ecosystem, Frontend, Data, Design, Coding, Platform, Quality, Career) are metadata in `tracks.json` for future grouping; the sidebar and Learn pages navigate by track, which keeps navigation clean as the app grows.
- **Framer Motion used only for a subtle page fade.** No elaborate animations. Reduced-motion preference is respected via Settings and CSS.
- **Syntax highlighting: highlight.js + react-markdown + remark-gfm.** Well-maintained libraries; no custom Markdown parser was written, as required.
- **State: React Context + LocalStorage only.** No Redux/MobX. Storage key `beanstack-user-data-v1`, schema version 1. Export/import validates referenced ids against the current content index.
- **Section ids are globally unique.** This simplifies validation of prerequisites/related references and section lookups. Track + section together still define the URL.
- **Placeholder tracks show planned sections, not empty pages.** Every placeholder track has sections with `plannedTopics`, so its page is useful and clearly marked "Coming Soon".
- **Main bundle warning accepted for v1.** The production build warns about an 820 KB main chunk (React + router + markdown + highlighting). Content chunks are already split per topic. Vendor chunk-splitting is a polish item in PROGRESS.md, not a blocker, because the warning does not fail the build and initial content load is lazy.

## Continuation decisions (2026-11-04 — interview, practice, cheatsheets, polish)

- **Interview modules completed by content only, no component changes.** Modules 2–4, full Module 0, and full Bonus Resume were added as JSON under `content/interview/`; the existing Interview UI (browse by module/topic, self-test, bookmarks, deep links) needed no changes. Questions are flat per module with a `category` field; grouping into UI question groups is still an optional future item.
- **Practice/cheatsheets expanded by content only.** practice-2/practice-3 and 8 new cheatsheets follow the existing JSON/Markdown formats and validation rules; no UI changes were needed except the flashcard keyboard fix below.
- **Placeholder non-Java tracks deliberately NOT filled in this run.** Per the parent instruction for this continuation, Frontend, Databases, System Design, DSA & Coding, DevOps & Cloud, Testing, and Behavioral & Projects stay Coming Soon, even though the earlier PROGRESS order listed them as next. Filling them remains content/config-only work for a later run.
- **Vendor chunk-splitting + lazy pages instead of raising the chunk warning limit.** `vite.config.ts` now uses `manualChunks` for react, markdown/highlight, motion, and icons, and `src/App.tsx` lazy-loads page components. Main chunk: 1,006 KB → 442 KB, warning cleared. This supersedes the earlier "main bundle warning accepted" note.
- **Flashcard keyboard fix.** The flashcard flip was a clickable `div` with `role="button"` but no keyboard handling; it now has `tabIndex={0}` and Enter/Space toggling. Other interactive elements were already native buttons/selects/inputs.
- **Push discipline for this run.** New/changed files are validated locally and prepared in a fresh manifest outside the source dir, but no GitHub push was attempted in this run, because prior push approvals timed out when the user was absent. Nothing in this run may be claimed as pushed without a new confirmed commit SHA.

## Content decisions (sample batch, 2026-11-04)

- Sample content proves every feature end to end: 13 topics (6 Core Java, 3 Advanced Java, 4 Spring & Spring Boot), 2 cheatsheets, 11 interview questions, 16 practice items, 3 learning paths.
- Java version target: current LTS Java (21 at time of writing, with 8/11/17/21 differences called out where interviews ask about them). Spring Boot: current stable, with auto-configuration imports path noted as in current Spring Boot.
- Code examples in sample topics were written to be correct by construction (simple, deterministic programs). Full compile-checking of every snippet is a remaining verification step listed in PROGRESS.md; snippets that depend on Spring/Jakarta APIs are presented as framework code, not standalone-compilable programs, and are labelled as such by context.
