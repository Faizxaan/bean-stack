# PROGRESS.md — Beanstack build log

This file is the resume point if a session is interrupted or its context is reset. Read it first, then run validation and the build before continuing.

## Current state (2026-11-12, after Interview Prep redesign — ready to push)

- **Local directory:** `~/workspace/beanstack` (persistent, not /tmp)
- **GitHub repo:** Faizxaan/bean-stack, branch `main`
- **Repo before this work:** only `README.md` (12 bytes, initial commit `d5aa0d451ed5b6a3882979afcff08cccd2efbb92` on 2026-11-03). No other code existed to replace.
- **App status:** Fully functional end-to-end SPA. Production build, type-check, validation script, and unit tests all pass with no chunk-size warning (see Verification below).
- **Content status:** 96 topics validated, 19 cheatsheets, 366 interview questions, 183 practice items, 10 tracks (none Coming Soon), 6 paths. Interview modules 0–4 and Bonus Resume are complete; all 7 former placeholder tracks are now filled with full content (see Completed — completion run below).
- **Push status:** See "Push log" at the bottom. Confirmed pushes on `main`, in order: `81f00e1e…` (foundation + Java), `58f7c452…` (interview/practice/cheatsheets/polish), `666e536d…` (complete all tracks), `c5c4fd2c…` (PROGRESS log sync), `e4be9bdd…` (clickable topic arrows), `5b899e8e…` (critic audit), `d87d9ac0…` (PROGRESS log sync), `89459fe1…` (Desktop Modules interview import, 93 new questions), `ee0da341…` (PROGRESS log sync), `54378363…` (Module 0 topic gaps + chunk split), `3167e995…` (PROGRESS log sync), `85f02d76…` (Interview Prep redesign, UI only).
- **Push permission (2026-11-12):** Faizan said do NOT ask for approval before pushing Beanstack to GitHub; once tested from Jarvis's side, push directly — he has given permission. No approval widget for Beanstack pushes; push, verify the head, and report the commit SHA.

## Completed

### Foundations and content pipeline
- [x] Vite + React 19 + TypeScript + React Router 7 scaffold, `vercel.json` SPA rewrites
- [x] Content architecture: `content/` (Markdown with frontmatter + JSON) separate from `src/` UI
- [x] `scripts/build-content-index.mjs` — generates `src/generated/content-index.json` from folder/file structure
- [x] `scripts/validate-content.mjs` — duplicate ids, missing metadata, broken prerequisite/related ids, empty sections, malformed files, invalid JSON references
- [x] `CONTENT_GUIDE.md`, `DECISIONS.md`, `README.md` (setup, architecture, adding content, deployment)
- [x] Lazy-loaded topic/cheatsheet Markdown bodies via Vite `import.meta.glob` (`?raw`) — each topic is its own chunk
- [x] Light unit tests (Vitest, pure logic only): progress, search, import validation, spaced repetition, streak, accuracy/weak areas — 10 tests passing

### App phases
- [x] Layout, navigation, sidebar (active track tree only), breadcrumbs, command palette (Ctrl/Cmd+K, `/` focuses search), in-place 404
- [x] Home dashboard: continue learning, today's focus, track progress, flashcards due, recently viewed, bookmarks, statistics, quick actions, interview-date countdown
- [x] Learn: tracks, track pages (including Coming Soon placeholders with planned sections), topic pages with all standard sections, progress status, Quick Revision Mode, prev/next, sticky TOC with scroll-spy, personal notes, prerequisites/related
- [x] Interview Prep: Modules 0–4 + Bonus listed, browse by module and by topic, self-test hide/reveal, Confident/Needs review, copy, bookmark, deep links
- [x] Interview Prep redesign (2026-11-12, UI only — no content changed): the old link-list page was replaced with module cards (level, description, question count, progress, Start/Continue), a 3-step "How to use this" strip, overall review progress, questions grouped by Learn topic then category as question cards with inline answers (self-test mode hides answers until revealed, Reveal all / Hide all), filters (text search, difficulty, category, review status incl. bookmarked), and a rich question page with breadcrumb, prev/next within the topic group, related Learn topics, copy, bookmark and review actions. Pure grouping/filtering logic lives in `src/lib/interview.ts` with 7 new unit tests. Deep links `/interview/question/:id`, sidebar, command palette and Library bookmarks all still work. See DECISIONS.md.
- [x] Practice: MCQs, flashcards (Leitner boxes, due today), coding, output-based, scenario-based, persisted attempts, per-topic accuracy, weak areas, retry wrong, mock interview mode
- [x] Revision & Cheatsheets: content-driven list, comparison tables, print-friendly layout (print CSS hides nav)
- [x] My Library: bookmarks vs favorites separate, question/flashcard bookmarks, notes, recently viewed, statistics (completed, in progress, bookmarks, favorites, accuracy, streak)
- [x] Settings & Data Safety: theme, font size, width, reduced motion, export/import JSON (schema v1, validation against known ids), granular confirmed resets, backup reminder, safe storage access
- [x] Accessibility basics: keyboard navigation, visible focus, ARIA labels on dialogs/inputs, semantic headings; responsive layout (sidebar stacks on mobile)
- [x] Vercel-ready: `vercel.json` rewrites, clean production build

### Sample content batch (proves every feature end to end)
- [x] Tracks: 10 tracks defined (3 Java tracks + 7 placeholder tracks with planned sections)
- [x] Learning paths: Beginner Roadmap, Last-Minute Revision Path, Spring Boot Crash Path
- [x] Topics (13, all status `complete`, validated):
  - Core Java (6): JDK/JRE/JVM, OOP Principles, Strings, Collections Framework, Exception Handling & Generics, Streams/Lambdas
  - Advanced Java (3): Concurrency Basics, Garbage Collection / JVM Memory, Design Patterns & SOLID
  - Spring & Spring Boot (4): Spring IoC/DI, Spring Boot Auto-Configuration, Spring MVC & REST, Spring Data JPA
- [x] Cheatsheets (2): Collections, Spring Annotations
- [x] Interview questions (11): Module 0 (2), Module 1 (8), Bonus Resume (1)
- [x] Practice items (16): MCQs (6), flashcards (4), coding (2), output-based (2), scenario-based (2)

### Java content batches (three parallel batches, all validated together)
- [x] Core Java remaining (9): Language Basics & Syntax, Variables/Operators/Control Flow, Wrapper Classes, Enums & Annotations, Date/Time & Regex, Collections Deep Dive, Generics Deep Dive, File I/O & NIO, Functional Interfaces & Optional
- [x] Advanced Java remaining (6): Executors & CompletableFuture, Java Memory Model, Reflection & Serialization, JDBC & Networking, Modern Java Features, Performance & Best Practices
- [x] Spring remaining (6): Bean Scopes & Lifecycle, Configuration & Profiles, Validation & Exception Handling, Security & JWT, Logging/Testing/Docs, Actuator/Microservices/Deployment
- [x] One correction applied in review: `@MockBean` in the testing topic updated to `@MockitoBean` (Spring Boot 3.4+) with a note that older code uses `@MockBean`.
- [x] Caveat carried forward: no JDK is installed in this environment, so Java snippets were manually reviewed for correctness, not compiled with `javac`. A systematic compile pass remains open (see polish list).

## Completed — continuation run (2026-11-04, interview/practice/cheatsheets + polish)

- [x] Interview modules 2, 3, 4: 14 questions each (42 total), all 13 categories in every module (Java, Collections, Streams, Concurrency, JVM, Spring Framework, Spring Boot, Spring MVC, Spring Data JPA, Microservices, SQL, Coding, Scenario-based). Module 2: 11 Medium / 3 Hard; Module 3: 6 Medium / 8 Hard; Module 4: 4 Medium / 10 Hard.
- [x] Full Module 0 revision notes: 21 items (was 2), category Revision, covering JVM, OOP, Strings, Collections, Exceptions, Generics, Streams, Optional/functional, Concurrency, Java Memory Model, GC, Reflection/Serialization, JDBC, Patterns/SOLID, Spring IoC, Boot auto-configuration, MVC/REST, JPA, Security/JWT, Microservices/Actuator, plus Modern Java. Existing ids `iq-rev-jvm` and `iq-rev-collections` preserved.
- [x] Full Bonus Resume: 12 items (was 1), category Resume, including separate copy-ready templates for 0–3, 3–5, 5–8, and 8–15 years, ATS/tailoring, impact bullets, projects/GitHub, job-switch/gap explanations, common mistakes, interview-prep use, and a pre-send checklist. Existing id `iq-resume-tips` preserved.
- [x] Practice expansion: practice-2 (32 items: 10 MCQ, 6 flashcard, 6 coding, 6 output, 4 scenario) and practice-3 (25 items: 8 MCQ, 4 flashcard, 4 coding, 4 output, 5 scenario, focused on concurrency, JVM/GC, Security, JPA, microservices, generics, I/O). Total practice: 73 items (was 16).
- [x] Cheatsheets expansion: 8 new cheatsheets (core-java, streams-functional, concurrency, jvm-gc, spring-core, spring-boot, jpa, rest-security). Total cheatsheets: 10 (was 2).
- [x] Polish — vendor chunk-splitting + lazy pages: `vite.config.ts` manualChunks (react, markdown, motion, icons) and lazy-loaded page components in `src/App.tsx`. Main chunk fell from 1,006 KB to 442 KB; the production build no longer emits the 800 KB chunk-size warning. Topic Markdown bodies remain split per file.
- [x] Polish — accessibility fix from code walkthrough: flashcard flip in `src/pages/Practice.tsx` is now keyboard-operable (tabIndex 0, Enter/Space toggles, updated hint text). Walkthrough notes (code, not a live device test): visible `:focus-visible` outline exists, sidebar has `aria-label="Primary navigation"`, command palette is a labelled dialog with Ctrl/Cmd+K toggle and Escape to close, filters/inputs are labelled, mobile layout stacks the sidebar above content at ≤900px and collapses grids to one column, print CSS hides nav/topbar.
- [x] Vercel deploy verification notes (no live deploy performed, per instruction): `vercel.json` SPA rewrites to `/index.html` are present, build command `npm run build`, output `dist`, no env vars/backend/database required. A live Vercel import and deep-link refresh check still require user approval/import and are not claimed here.

## Completed — completion run (2026-11-04, all placeholder tracks filled)

- [x] Frontend (9 topics): JavaScript fundamentals, Async JavaScript, DOM/browser APIs; TypeScript types/interfaces, generics, TypeScript with React; React components/hooks, state management, performance/patterns. Plus 2 cheatsheets, 18 practice items, 12 interview questions.
- [x] Databases (6 topics): SQL fundamentals, joins/indexes/transactions, SQL for Java developers; document stores, key-value/caching, choosing a NoSQL store. Plus 1 cheatsheet, 15 practice items, 11 interview questions.
- [x] System Design (6 topics): scalability basics, caching/queues/databases, designing real systems; class design, design patterns in LLD, common LLD problems (with explicit Mermaid diagrams for HLD). Plus 1 cheatsheet, 14 practice items, 14 interview questions.
- [x] DSA & Coding (6 topics): arrays/strings, trees/graphs, dynamic programming; patterns, complexities, interview coding problems. Plus 1 cheatsheet, 18 practice items, 12 interview questions.
- [x] DevOps & Cloud (9 topics): Git fundamentals, branching/merging; containers, Dockerfiles/images; Kubernetes pods/services/deployments; CI/CD pipelines, testing in CI; AWS core services, deploying a Java app on AWS. Plus 1 cheatsheet, 18 practice items, 12 interview questions. No credentials/secrets in examples (placeholders only).
- [x] Testing (4 topics): JUnit/Mockito fundamentals, test design/pyramid/flaky tests; Spring Boot tests, Testcontainers basics. Plus 1 cheatsheet, 14 practice items, 12 interview questions. Uses @MockitoBean for Spring Boot 3.4+.
- [x] Behavioral & Projects (5 topics): STAR method, common behavioral questions; presenting a project, architecture deep dives, trade-offs/lessons (fictional/generic examples only). Plus 1 cheatsheet, 13 practice items, 12 interview questions.
- [x] Tracks config: all 10 tracks now status `complete`, `comingSoon: false` in content/tracks.json; no Coming Soon badge remains in the UI.
- [x] Learning paths: added Frontend Roadmap (9 topics), Full-Stack Java Developer Roadmap (16 topics), System Design Crash Path (6 topics). Total paths: 6 (was 3).
- [x] Central validation fix: 19 new practice items lacked a validator-required prompt/title field; a prompt derived from each item's own front/first-sentence description was added (see DECISIONS.md). No answers or solutions changed.
- [x] Accessibility/mobile walkthrough (code, not a live-device test): :focus-visible outline present, sidebar aria-label, labelled command-palette dialog with Ctrl/Cmd+K toggle and Escape to close, keyboard-operable flashcard flip, mobile layout stacking sidebar above content at ≤900px with grids collapsing to one column, print CSS hiding nav/topbar, reduced-motion setting respected.

## Completed — critic audit run (2026-11-04, navigation / robustness / tone, PUSHED 2026-11-05)

- [x] Navigation (worker): fixed side chevrons overlapped content at 1400–1487px — gate raised to 1520px; topic article/TOC grid now collapses to one column ≤900px with TOC first; TOC scroll-spy fixed to MarkdownView's real heading ids and to the actually displayed body in Quick Revision Mode; track/path progress + resume added to Learn index, Track page, and Home (resume now targets the most recently viewed unfinished topic); back-to-top (floating after 600px, reduced-motion aware, plus bottom-row button); bottom dead end fixed (Back-to-track, Browse another track); sidebar tracks hidden on mobile, sidebar links now NavLink active states; shared Breadcrumb component; topic copy-link with clipboard fallback and feedback; palette destinations expanded; tables in a horizontal-scroll wrapper; tap targets enlarged; stale "Coming Soon" copy removed.
- [x] Robustness (worker): LocalStorage sanitisation on load/import/every settings write (`sanitizeUserData`/`sanitizeSettings`, unknown ids and invalid enums dropped, never throws); import validation completed for all id lists/values, 5 MB guard, distinct invalid-JSON message, error truncation to 20 + "…and N more", file-input reset, "your current data was not changed" on rejection; note cap 10,000 chars, attempts cap 5,000, activity dates cap 730; unknown Practice tab falls back to mcq; real "Retry wrong only" toggle; flashcard due-today caught-up state and box clamping 1–5; unscorable MCQ/output cards and empty flashcard/coding states handled; mock interview empty-state guard; streak/Leitner now use local dates (not UTC), calendar validation, corrupt dueAt = due now, future activity ignored; removed-id bookmarks/favorites/notes degrade to "no longer available" rows, accuracy no longer buckets removed items as "general"; search normalisation (case/accents/whitespace, punctuation-only = no results); system-theme listener; corrupt lastExportedAt and Invalid Date handled. New tests: `src/lib/robustness.test.ts` (15 tests).
- [x] Tone (worker): all 79 topics audited; 17 touched with targeted Overview edits only (plain-language lead-in, first-use glosses, one concrete example/analogy, expanded acronyms such as SOLID); 62 untouched because their Overviews already opened in plain language; no frontmatter, code, or stated outputs changed; no JDK compile-check claimed. Edited ids: collections-framework, oop-principles, exception-handling, garbage-collection, concurrency-basics, spring-data-jpa, spring-mvc-rest, fe-js-async, fe-react-components-hooks, functional-interfaces-optional, dsa-patterns, db-sql-java-developers, logging-testing-docs, design-patterns-solid, fe-ts-types, streams-lambdas, fe-js-dom.
- [x] Central follow-ups (parent): TopicPage now validates URL track/section segments (in-place not-found with correct-address link); Search page and command palette now include practice MCQs and use track titles; palette input gained an aria-label; dark-mode `.badge.warn` contrast fixed; validation script hardened (see DECISIONS.md) and current content passes all new checks.
- [x] Deliberately not added/changed: keyboard arrow-key navigation (forbidden by original prompt); duplicate-heading id disambiguation (known minor limitation, see DECISIONS.md); LocalStorage quota-failure toast (new component machinery, see DECISIONS.md); trailing Version Differences sections (kept, see DECISIONS.md); backend/database/auth/external APIs/runtime AI/Redux (out of scope).

## Completed — small UX change (2026-11-04, clickable topic arrows, PUSHED)

- 2026-11-04, CONFIRMED PUSH: "Beanstack: clickable topic arrows — previous/next navigation", 5 files, manifest at `~/workspace/beanstack-manifest-6.txt`, commit SHA `e4be9bddd5263241ef959910d79373bfe5644569` on branch `main`, verified by re-reading the repo head.
- 2026-11-05, CONFIRMED PUSH: "Beanstack: critic audit — navigation, robustness, tone, search MCQs", 34 files, manifest at `~/workspace/beanstack-manifest-7.txt`, commit SHA `5b899e8e864036c29b1f6ecd7621c2eda648530c` on branch `main`, verified by re-reading the repo head. Totals unchanged: 79 topics, 18 cheatsheets, 168 interview questions, 183 practice items, 10 tracks, 6 paths; tests now 25 passed.
- 2026-11-09, CONFIRMED PUSH: "Beanstack: add Desktop Modules interview questions — 93 new, modules 0-4", 8 files, manifest at `~/workspace/beanstack-manifest-9.txt`, commit SHA `89459fe1313e2c6a82f09daaf52f9c0be9ef5c53` on branch `main`, verified by re-reading the repo head. Totals after this push: 79 topics, 18 cheatsheets, 261 interview questions, 183 practice items, 10 tracks, 6 paths. Source was Faizan's ~/Desktop/Modules files, used only as an inventory; every added question/answer was written fresh in Beanstack's own words, no verbatim copying, source files not committed.
- 2026-11-09, CONFIRMED PUSH: "Beanstack: Module 0 topic gaps — 17 new topics, 105 interview questions, messaging cheatsheet, split content index", 41 files, manifest at `~/workspace/beanstack-manifest-12.txt`, commit SHA `543783635ea37054b8e9b20b131f69261599cd99` on branch `main`, verified by re-reading the repo head. Totals after this push: 96 topics, 19 cheatsheets, 366 interview questions, 183 practice items, 10 tracks, 6 paths; tests 30 passed; main chunk 339.92 KB, no chunk-size warning.

- [x] Topic page: clickable left/right arrow navigation to the previous/next topic in the same track, using the existing `prevNextTopic` order. A labelled top prev/next bar is shown on every topic page; large fixed chevron buttons appear only on very wide screens (≥1400px) to avoid overlapping content. The existing bottom prev/next links are kept for mobile. Deliberately click-only, not keyboard arrow keys, per the original prompt (plain arrow keys conflict with scrolling/text selection).
- [x] Topic page now scrolls to the top when the topic changes, so clicking next/previous from the bottom of a long topic does not leave the new topic scrolled to the bottom.
- [x] Verification for this change: `npm run validate-content` OK, `npm run build-content-index` OK (79 topics, 18 cheatsheets, 168 interview questions, 183 practice items, 10 tracks, 6 paths), `npm run typecheck` OK, `npm test` 10 passed, `npm run build` OK in ~10s (main index chunk 722 KB, unchanged).

## Completed — chunk fix + finalise run (2026-11-09, NOT yet pushed)

- [x] Chunk-size regression fixed: the production build's main `index-*.js` chunk was 1,153.99 KB with the 800 KB warning (regression from the second Modules batch: 96 topics + 366 questions inlined in the generated index). The generated index is now split by `scripts/build-content-index.mjs` into three committed files: slim `src/generated/content-index.json` (~118 KB: tracks, paths, topics, cheatsheets, plus id-only `interviewQuestionIds` / `practiceItemIds`), `src/generated/content-interview.json` (366 questions, ~737 KB), and `src/generated/content-practice.json` (183 items, ~165 KB). `src/lib/content.ts` loads the slim index synchronously and lazy-loads the other two via cached dynamic `import()` (`loadInterviewQuestions`, `loadPracticeItems`, `loadFullContent`, plus `useInterviewQuestions` / `usePracticeItems` / `useFullContent` hooks). Pages that need the heavy data (Interview, Practice, Library, Search, command palette) load it on demand and show a loading state until it arrives, never an empty "no content" state. The palette loads it only when opened. `AppContext` sanitisation and Settings import validation use the id-only lists, so they work without the full text.
- [x] Result: main chunk 1,153.99 KB → **339.92 KB** (gzip ~97 KB), **no chunk-size warning**. Interview data is a separate 681.85 KB chunk and practice data a separate 148.56 KB chunk, loaded only when those pages are visited. The warning limit was NOT raised to hide the problem (still 800 KB in `vite.config.ts`).
- [x] New tests: `src/lib/content.test.ts` (5 tests) — slim index has no full bodies, lazy loaders return 366 / 183 items with ids matching the slim lists, loaders are cached (same array on repeat calls), `loadFullContent` loads both. Total tests now 30 (was 25).
- [x] Stale-log correction (2026-11-09): three sections in this file wrongly described already-pushed batches as "NOT pushed" — the completion run (actually pushed as `666e536d…`), the critic audit run heading (actually pushed as `5b899e8e…` on 2026-11-05), and the first Desktop Modules import (actually pushed as `89459fe1…`). All three are corrected above; the "Current state" header and Push log now list the full confirmed push history in order.
- [x] Final check in this run: full build output inspected — no warnings and no errors; no `console.*` calls in `src/` code (only `console.log` inside practice-question content strings, which are quiz data, not code); all 17 new topics from the second Modules batch are present in the regenerated index and every prerequisite/related id in all 96 topics resolves; no `genzcareer`/`goalkicker` strings in `content/` or `src/`; no new content topics, interview questions, or features added in this run (fix-and-finalise only).
- [x] Still pending, deliberately not done: Spring Batch / Spring Kafka topics and @Lazy / Runners expansions (candidates for a later batch); LocalStorage quota-failure banner; duplicate-heading id disambiguation; JDK compile-check (no JDK installed); live Vercel deploy (needs the user's Vercel import).
- NOT yet pushed, by instruction. Combined manifest (manifest-11 files + this run's files, deduplicated) to be prepared by the parent for one final push. GitHub head to be verified by the parent.

## Remaining — content batches

- [x] All former placeholder tracks filled in the completion run (see Completed — completion run below). No track remains Coming Soon.
- [ ] Optional deeper Java topics: deliberately NOT added — see DECISIONS.md (collections deep dive and JDBC & Networking already cover the suggested areas; further topics would be scope creep, not a curriculum gap).
- [ ] Interview question groups as a separate level: deliberately NOT added — see DECISIONS.md (module → category → questions plus browse-by-topic already provides the hierarchy; a separate group field would require a type/index/UI change, not content-only).

## Remaining — polish / verification

- [ ] Compile-check every snippet in a JDK and verify stated outputs — NOT completed: no JDK is installed in this environment and none was installed (system-level change outside repo scope). All new snippets were manually reviewed only; no javac verification is claimed. This is the one verification item that could not be closed to 100% in this environment.
- [ ] Live Vercel deploy verification (import repo, confirm deep-link refresh works) — NOT performed: requires the user's Vercel account action/import. Notes only: vercel.json SPA rewrites to /index.html present, build command `npm run build`, output `dist`, no env vars/backend/database required. This is the one deployment item that could not be closed to 100% in this run.
- [ ] After all content batches: final summary (what was built, key decisions, anything left as placeholder, how to run/deploy)

## Verification (last run, 2026-11-09, after chunk fix + finalise run)

- `npm run validate-content` — OK (96 topic files, 96 unique topic ids, 10 tracks)
- `npm run build-content-index` — OK (96 topics, 19 cheatsheets, 366 interview questions, 183 practice items, 10 tracks, 6 paths; slim index + content-interview.json + content-practice.json)
- `npm run typecheck` — OK
- `npm test` — 30 tests passed (3 files: utils 10, robustness 15, content 5 new)
- `npm run build` — OK (built in ~8s; main index chunk 339.92 KB / gzip ~97 KB, under the configured 800 KB warning limit; NO chunk-size warning; interview chunk 681.85 KB and practice chunk 148.56 KB are separate lazy-loaded chunks; topic/cheatsheet bodies split per file)
- JDK compile-check: NOT performed — no JDK installed (see Remaining — polish). Snippets manually reviewed only.

## Push log

- (To be filled after each confirmed push: date, batch description, commit SHA from the provider result, paths submitted.)
- 2026-11-04, foundation batch (55 files): push attempted via `github push-files` to Faizxaan/bean-stack branch `main`, but the runtime approval card timed out (`approval_expired`, egress approval timed out for this invocation). The action was NOT performed. Repo head remains the initial commit `d5aa0d451ed5b6a3882979afcff08cccd2efbb92`. Do NOT claim this push succeeded. Retry requires a fresh approval; the manifest is at `~/workspace/beanstack-manifest-1.txt` (outside the source dir).
- 2026-11-04, CONFIRMED PUSH: "Beanstack: foundation + Java content (34 topics)", 76 files, manifest at `~/workspace/beanstack-manifest-2.txt`, commit SHA `81f00e1ec9604341ad630045a2d30067a41ee895` on branch `main`, verified by re-reading the repo head. This supersedes the failed attempts above. The sync record lives outside the repo at `~/workspace/beanstack.muse-github-snapshot-sync.json` and must never be committed.
- 2026-11-04, CONFIRMED PUSH: "Beanstack: interview modules 2-4, Module 0, resume, practice + cheatsheets, bundle polish", 21 files, manifest at `~/workspace/beanstack-manifest-3.txt`, commit SHA `58f7c4522ce7551a4712b869e4aefd2d000635b4` on branch `main`, verified by re-reading the repo head. Totals after this push: 34 topics, 10 cheatsheets, 83 interview questions, 73 practice items, 10 tracks, 3 paths.
- 2026-11-04, CONFIRMED PUSH: "Beanstack: complete all tracks to 100% — frontend, databases, system design, DSA, DevOps, testing, behavioral", 74 files, manifest at `~/workspace/beanstack-manifest-4.txt`, commit SHA `666e536ddd941b6dda1fc4de6a43aff5524ac9d7` on branch `main`, verified by re-reading the repo head. Totals after this push: 79 topics, 18 cheatsheets, 168 interview questions, 183 practice items, 10 tracks, 6 paths. All tracks complete; no Coming Soon tracks remain.

- 2026-11-04, completion run: PUSHED (correction 2026-11-09 — this section wrongly said "NOT pushed"). Confirmed push: "Beanstack: complete all tracks to 100% — frontend, databases, system design, DSA, DevOps, testing, behavioral", 74 files, manifest at `~/workspace/beanstack-manifest-4.txt`, commit SHA `666e536ddd941b6dda1fc4de6a43aff5524ac9d7` on branch `main`, verified by re-reading the repo head. A follow-up PROGRESS log sync was pushed as `c5c4fd2cae110465cc085e7f067698bb86d3c588`.
- 2026-11-12, CONFIRMED PUSH: "Beanstack: redesign Interview Prep — grouped by topic, question cards, self-test", 9 files, manifest at `~/workspace/beanstack-manifest-14.txt`, commit SHA `85f02d76f490332da2a42d8091bd4177cc1de8be` on branch `main`, verified by re-reading the repo head. UI-only redesign (no interview content changed): module cards, topic-grouped question cards with inline answers, filters, rich question page with prev/next. Totals unchanged: 96 topics, 19 cheatsheets, 366 interview questions, 183 practice items, 10 tracks, 6 paths; tests 37 passed; main chunk 339.93 KB, no chunk-size warning. Pushed directly per Faizan's 2026-11-12 instruction (no approval widget).

## Completed — Desktop Modules interview import (2026-11-09, PUSHED)

- Source: Faizan's Desktop `modules` folder, copied locally to `~/workspace/modules-source/` (6 .txt files, NOT committed to GitHub and NOT copied into this repo). Module 1 (0-3 yrs, 11 resources, ~499 questions inventoried), Module 2 (3-5 yrs, 20 resources, ~965 headings / ~950 distinct), Module 3 (5-8 yrs, 26 resources, ~1,029 questions), Module 4 (8-15 yrs, 29 resources, ~1,387 questions). Module 0 (revision notes, 7 resources — not 8 as first assumed; handwritten-note OCR is garbled, inventory from headings/contents only). Bonus (586 bytes: resume tips + a Canva link only).
- Added, all written fresh in Beanstack's own words (see DECISIONS.md copyright rule): Module 0 +5 (21 -> 26: SQL fundamentals, SQL joins/subqueries/window functions/CTEs, Java data types/variables/operators, Spring AOP, testing with JUnit/Mockito/MockMvc), Module 1 +24 (8 -> 32), Module 2 +24 after central dedupe (14 -> 38), Module 3 +20 after central dedupe (14 -> 34), Module 4 +21 after central dedupe (14 -> 34). Bonus +0 (existing 12 resume items already cover it).
- Central dedupe removed 10 near-duplicates the per-module workers had added in parallel: DispatcherServlet flow (kept Module 1), first non-repeated character with streams (kept Module 2; removed Module 3 and Module 4 versions), Spring Boot caching (kept Module 2), Kafka ordering/exactly-once (kept Module 2), OAuth2 authorization code flow (kept Module 2), stateless JWT flow (kept Module 2), Kafka partitions/delivery (kept Module 2), multiple DataSources (kept Module 3), deep vs shallow copy (kept Module 3). Net new: 93 questions. Totals now: 79 topics, 18 cheatsheets, 261 interview questions, 183 practice items, 10 tracks, 6 paths.
- Skipped: thousands of source items as within-source repeats (e.g. Spring Security Level II duplicated verbatim in Module 3), repeats across modules (same 25 coding + stream tasks in every module), near-duplicates of the existing 168 Beanstack questions, or too basic for the module's experience level. Category mapping: Spring Security/Kafka/Design Patterns/Lead have no dedicated Beanstack category, so they were mapped to the closest allowed category (Spring Boot / Microservices / Java / Scenario-based) or skipped; Maven/Git/Gradle and JUnit/Mockito were mostly skipped in Modules 2-4 (already covered by the DevOps/Testing interview files, no DevOps/Testing category in module files).
- Verification (central, 2026-11-09): `npm run validate-content` OK, `npm run build-content-index` OK (261 interview questions), `npm run typecheck` OK, `npm test` 25 passed, `npm run build` OK in ~7s. All 261 interview ids unique; no source PDF URLs in module files (checked). Coding solutions manually reviewed only; no JDK compile-check claimed.
- PUSHED (correction 2026-11-09 — this section wrongly said "NOT pushed"). Confirmed push: "Beanstack: add Desktop Modules interview questions — 93 new, modules 0-4", 8 files, manifest at `~/workspace/beanstack-manifest-9.txt`, commit SHA `89459fe1313e2c6a82f09daaf52f9c0be9ef5c53` on branch `main`, verified by re-reading the repo head. A follow-up PROGRESS log sync was pushed as `ee0da341f88dab52baaa66f86f0c5ddd49e0c735`.

## Completed — Second deeper Modules batch (2026-11-09, NOT yet pushed)

- Source: same Desktop `modules` files in `~/workspace/modules-source/` (NOT committed, NOT copied into this repo). Copyright rule as in DECISIONS.md: inventory only, everything written fresh in Beanstack's own words, no verbatim copying, no source URLs.
- Deep topic-gap comparison: every Module 0 chapter/heading was compared against all 79 existing topics by title, frontmatter, and Overview/Key Concepts, not titles alone. Result: 17 new topics added (79 -> 96), listed in the gap table below. The user's OOP example was confirmed: the four pillars were one combined topic (`oop-principles`, 958 words, pillars in a single subsection); they are now separate topics (`oop-encapsulation`, `oop-inheritance`, `oop-polymorphism`, `oop-abstraction`), with the combined topic kept.
- Second interview batch: Module 1 +24 (32 -> 56), Module 2 +25 (38 -> 63), Module 3 +25 (34 -> 59), Module 4 +20 (34 -> 54). Module 0 +11 (26 -> 37: SQL indexes/transactions, @Transactional, scheduling, RestTemplate/WebClient, filter vs interceptor, Kafka basics, Spring Cloud, abstract vs interface, static/final, Flyway, Swagger/OpenAPI). Bonus +0 (source is only a Canva template-gallery tip, already covered by the existing 12 resume items). New cheatsheet: messaging-spring-cloud (Kafka, discovery, resilience) — 18 -> 19 cheatsheets.
- Central dedupe: all 366 interview ids unique, zero duplicate question texts (normalised check). No cross-worker duplicates found.
- Totals now: 96 topics, 19 cheatsheets, 366 interview questions, 183 practice items, 10 tracks, 6 paths.
- Verification (central, 2026-11-09): `npm run validate-content` OK (96 topics), `npm run build-content-index` OK (96 topics, 19 cheatsheets, 366 interview questions, 183 practice items, 10 tracks, 6 paths), `npm run typecheck` OK, `npm test` 25 passed, `npm run build` OK in ~7.5s BUT the main index chunk is now ~1.2 MB and the build emits the 800 KB chunk-size warning again (was 729 KB). Cause: the statically imported generated index grew with 17 topics + 105 questions. Splitting the index itself would be an architecture change and was NOT done in this run; recorded in DECISIONS.md. Coding solutions manually reviewed only; no JDK compile-check claimed.
- NOT pushed in this run, by instruction. Manifest at `~/workspace/beanstack-manifest-11.txt`. GitHub head to be verified by the parent against GitHub (this VM has no .git in the source dir).

# Module 0 deep topic-gap comparison — Worker A (topics only)

Date: 2026-11-09. Local source: `~/workspace/beanstack`. GitHub head could NOT be verified locally: `~/workspace/beanstack` has no `.git` directory (only a `.gitignore`), so the stated head `ee0da341f88dab52baaa66f86f0c5ddd49e0c735` was not confirmed from this machine. Baseline before this work: 79 topics (verified by file count), 18 cheatsheets, 261 interview questions, 183 practice items, 10 tracks, 6 paths (totals as given by parent; topic count verified).

## Module 0 inventory (7 source documents in `~/workspace/modules-source/`)

Used ONLY as a topic inventory. All new topics below are written in Beanstack's own words, plain-language tone; no source passage, code block, or handwritten-note text was reproduced, no source URLs are included.

| # | Source document | Lines | Contents (chapters / headings) |
| --- | --- | --- | --- |
| 1 | SQL PDF Notes (GenZ Career / Rishabh Mishra) | 6–1195 | 16 chapters: intro/SQL & DB, data types/keys/constraints, CREATE TABLE/DB, INSERT/UPDATE/DELETE/ALTER, SELECT & WHERE, CSV import, functions & string functions, aggregate functions, GROUP BY/HAVING, timestamps/EXTRACT, JOINS, SELF JOIN/UNION/UNION ALL, subqueries, window functions, CASE, CTEs |
| 2 | SQL handwritten notes | 1196–1400 | Garbled OCR of the same SQL basics (SELECT, WHERE, operators, CREATE/INSERT/UPDATE/DELETE, NULL, LIMIT, aliases). No distinct topics beyond doc 1. |
| 3 | Spring Framework Notes (GoalKicker, 18 chapters) | 1401–4092 | Getting started, Spring Core, SpEL, SqlRowSet/SimpleJdbcCall, creating/using beans, bean scopes, conditional bean registration, JSR-303 validation, ApplicationContext config, RestTemplate, task execution & scheduling, lazy init, property source, DI/IoC, JdbcTemplate, SOAP WS, profiles, dispatcher-servlet.xml |
| 4 | Spring Boot PDF Notes (tutorialspoint-style, 49 chapters) | 4093–15996 | Intro, quick start, bootstrapping, Tomcat deployment, build systems, code structure, beans & DI, runners, application properties, logging, RESTful services, exception handling, interceptor, servlet filter, Tomcat port, RestTemplate, file handling, service components, Thymeleaf, consuming REST, CORS, i18n, scheduling, HTTPS, Eureka, service registration, Zuul, Cloud Config server/client, Actuator, Admin server/client, Swagger2, Docker image, tracing, Flyway, email, Hystrix, WebSocket, batch, Kafka, Twilio, unit tests, REST controller unit test, database handling, securing web apps, OAuth2/JWT, GCP, Google OAuth2 sign-in |
| 5 | Spring ALL handwritten notes | 15997–27493 | Garbled OCR of a Spring Core course (modules, IoC/DI, BeanFactory, scopes, lifecycle, JdbcTemplate, AOP, profiles). No distinct topics beyond docs 3–4. |
| 6 | Java PDF Notes (javatpoint-style) | 27494–29838 | Features of Java, first program, JDK/JRE/JVM, variables, data types, Unicode, operators, keywords, control flow/loops, OOP concepts (object, class, inheritance, polymorphism, abstraction, encapsulation, coupling, cohesion, association, aggregation, composition), constructors, singleton, static, inheritance, aggregation, overloading, overriding, covariant return, super, instance initializer, final, binding, instanceof, abstract class/interface, encapsulation, packages, access modifiers, arrays, Object class, cloning, Math, wrappers, autoboxing, strictfp, String/StringBuffer/StringBuilder, toString, StringTokenizer, exceptions, multithreading (lifecycle, Thread class, scheduler, join, priority, daemon, thread pool, ThreadGroup, shutdown hook), GC, Runtime class, collections (ArrayList, LinkedList, List, HashSet, LinkedHashSet, TreeMap, TreeSet, Queue, PriorityQueue, Deque, Hashtable, Map, HashMap, EnumSet, LinkedHashMap, Collections class, Comparable/Comparator, ArrayList vs Vector, Vector, Stack), JDBC (drivers, 5 steps), Reflection API |
| 7 | Java handwritten notes | 29839–30731 | Garbled OCR of a Java course (syllabus, OOP pillars, programs, data types, arrays, overloading, static, abstract classes, packages, exceptions, String, ArrayList, HashSet/TreeSet). No distinct topics beyond doc 6. |

Method: every Module 0 chapter/heading above was checked against the 79 existing topics by title, frontmatter, and Overview/Key Concepts content (including keyword counts across all topic bodies), not by title alone. Example findings: `oop-principles` is ONE combined topic (958 words, the four pillars in a single `###` subsection plus constructors); SQL window functions / CTEs had zero mentions anywhere; `CASE` appeared only incidentally in an unrelated topic.

## New topics added by Worker A (17)

| New topic id | File | Track / section (order) |
| --- | --- | --- |
| `oop-encapsulation` | `content/topics/java-core/oop/encapsulation.md` | java-core / oop (2) |
| `oop-inheritance` | `content/topics/java-core/oop/inheritance.md` | java-core / oop (3) |
| `oop-polymorphism` | `content/topics/java-core/oop/polymorphism.md` | java-core / oop (4) |
| `oop-abstraction` | `content/topics/java-core/oop/abstraction.md` | java-core / oop (5) |
| `sql-window-functions` | `content/topics/databases/sql/sql-window-functions.md` | databases / sql (4) |
| `sql-cte` | `content/topics/databases/sql/sql-cte.md` | databases / sql (5) |
| `sql-case-expressions` | `content/topics/databases/sql/sql-case-expressions.md` | databases / sql (6) |
| `sql-functions` | `content/topics/databases/sql/sql-functions.md` | databases / sql (7) |
| `thread-lifecycle-control` | `content/topics/java-advanced/concurrency/thread-lifecycle-control.md` | java-advanced / concurrency (4) |
| `spring-spel` | `content/topics/spring-boot/spring-core/spring-spel.md` | spring-boot / spring-core (3) |
| `spring-jdbctemplate` | `content/topics/spring-boot/data-jpa/spring-jdbctemplate.md` | spring-boot / data-jpa (2) |
| `spring-rest-clients` | `content/topics/spring-boot/mvc-rest/spring-rest-clients.md` | spring-boot / mvc-rest (3) |
| `spring-interceptors-filters` | `content/topics/spring-boot/mvc-rest/spring-interceptors-filters.md` | spring-boot / mvc-rest (4) |
| `spring-file-handling` | `content/topics/spring-boot/mvc-rest/spring-file-handling.md` | spring-boot / mvc-rest (5) |
| `spring-task-scheduling` | `content/topics/spring-boot/spring-boot-core/spring-task-scheduling.md` | spring-boot / spring-boot-core (3) |
| `spring-build-systems` | `content/topics/spring-boot/spring-boot-core/spring-build-systems.md` | spring-boot / spring-boot-core (4) |
| `spring-cloud-basics` | `content/topics/spring-boot/testing-ops/spring-cloud-basics.md` | spring-boot / testing-ops (3) |

All 17 have status `complete`, `lastUpdated: 2026-11-09`, and all nine required sections in order (Overview, Theory, Key Concepts, Code Examples, Best Practices, Common Mistakes, Interview Importance, Interview Questions, Revision Summary). No existing topic was edited or deleted; `content/tracks.json` and `content/paths.json` were NOT changed (all new topics fit existing sections; no section/order change was needed). No interview JSON, cheatsheet, practice, or generated file was touched. `build-content-index` was NOT run (parent to run centrally). Nothing was pushed.

## Gap-comparison table (Module 0 topic → outcome)

### SQL (docs 1–2)

| Module 0 topic | Outcome |
| --- | --- |
| Introduction to SQL, what is SQL & database, SQL vs NoSQL, types of SQL commands (DDL/DML/DCL), Excel vs database | Already covered — `db-sql-fundamentals` (relational model, statement families, DDL/DML), `db-choosing-nosql` (SQL vs NoSQL, CAP) |
| Data types, primary/foreign keys, constraints | Already covered — `db-sql-fundamentals` (tables, keys, constraints) |
| Create Table / Create Database | Already covered — `db-sql-fundamentals` |
| INSERT, UPDATE, DELETE, ALTER, DROP, TRUNCATE | Already covered — `db-sql-fundamentals` |
| SELECT, WHERE, operators, LIMIT, ORDER BY | Already covered — `db-sql-fundamentals` |
| Import CSV file to SQL; install PostgreSQL/pgAdmin | Deliberately NOT added — tooling/setup task, not an interview topic; a one-off admin operation |
| Functions in SQL & string functions | **Newly added — `sql-functions`** (no dedicated topic; only passing mentions before) |
| Aggregate functions (COUNT/SUM/AVG/MIN/MAX) | Already covered — `db-sql-fundamentals` |
| GROUP BY and HAVING | Already covered — `db-sql-fundamentals` |
| Timestamp, EXTRACT, date/time functions | **Newly added — `sql-functions`** (date/time functions had no dedicated topic; Java `date-time-regex` is `java.time`, not SQL) |
| SQL JOINS — types & syntax (inner/left/right/full) | Already covered — `db-joins-indexes-transactions` |
| SELF JOIN, UNION & UNION ALL | Already covered — `db-joins-indexes-transactions` (self join), `db-sql-fundamentals` (UNION/UNION ALL) |
| Subquery | Already covered — `db-sql-fundamentals` (subquery example + coverage) |
| Window functions (ranking, aggregate, analytic; OVER/PARTITION BY) | **Newly added — `sql-window-functions`** (zero mentions in all 79 topics before) |
| CASE statement/expression | **Newly added — `sql-case-expressions`** (only one incidental mention before, in an unrelated topic) |
| CTE — Common Table Expression (incl. recursive) | **Newly added — `sql-cte`** (zero mentions in all 79 topics before) |
| NULL values, IS NULL / IS NOT NULL | Already covered — `db-sql-fundamentals` |
| SQL handwritten notes (SELECT/WHERE/operators/CRUD/NULL/LIMIT/aliases) | Already covered — duplicates of doc 1; see rows above |

### Java (docs 6–7)

| Module 0 topic | Outcome |
| --- | --- |
| Features of Java, first program, platform independence | Already covered — `jdk-jre-jvm`, `language-basics-syntax` |
| JDK, JRE, JVM difference | Already covered — `jdk-jre-jvm` |
| Variables (local/instance/static), data types, Unicode | Already covered — `variables-operators-control-flow`, `wrapper-classes` |
| Operators, keywords, control flow, loops, jump statements | Already covered — `variables-operators-control-flow`, `language-basics-syntax` |
| OOP concepts overview (object, class) | Already covered — `oop-principles` |
| Encapsulation (pillar) | **Newly added — `oop-encapsulation`** (was one subsection of the combined `oop-principles`; access modifiers/packages also covered here) |
| Inheritance (pillar; types, IS-A) | **Newly added — `oop-inheritance`** (was one subsection of the combined `oop-principles`; covers `super`/`this`, constructor chaining, `final`) |
| Polymorphism (pillar; overloading/overriding, binding, upcasting, instanceof, covariant return) | **Newly added — `oop-polymorphism`** (was one subsection of the combined `oop-principles`; covers overloading vs overriding, dynamic dispatch, static vs dynamic binding, downcasting/pattern matching) |
| Abstraction (pillar; abstract class vs interface) | **Newly added — `oop-abstraction`** (was one subsection of the combined `oop-principles`; covers abstract class vs interface table, default methods, sealed classes) |
| Coupling, cohesion, association, aggregation, composition | Already covered — `sd-class-design` (association/aggregation/composition), `oop-principles` (composition over inheritance); `design-patterns-solid` (coupling/cohesion in design context) |
| Constructors, constructor overloading, constructor vs method, private constructor, singleton | Already covered — `oop-principles` (constructors/initialisation order), `design-patterns-solid` + `bean-scopes-lifecycle` (singleton) |
| static keyword, final keyword | Already covered in outline — `language-basics-syntax`, `modern-java-features`, `oop-principles` (final/initialisation); folded into new `oop-inheritance` (`final`, `static` hiding) and `oop-encapsulation` (static context). No separate keyword topic: too narrow for a full topic |
| Object class, toString, equals/hashCode | Already covered — `collections-deep-dive` (hash/equals contract), `strings` (toString), `modern-java-features` (records) |
| Object cloning | Deliberately NOT added — niche/legacy (`Cloneable` is widely considered broken design); not a core interview topic |
| Math class | Deliberately NOT added — a utility-class API list, not an interview topic; no design content |
| Wrapper classes, autoboxing/unboxing | Already covered — `wrapper-classes` |
| strictfp keyword | Deliberately NOT added — obsolete (a no-op since Java 17; floating-point is always strict now) |
| String, immutable String, StringBuffer vs StringBuilder, StringTokenizer | Already covered — `strings` (immutability, StringBuffer vs StringBuilder). StringTokenizer deliberately NOT added — legacy class; `String.split()` is the modern answer |
| Exception handling (checked/unchecked, try-catch-finally, throw/throws, custom exceptions, final vs finally vs finalize) | Already covered — `exception-handling`, `generics-deep-dive` |
| Multithreading basics, thread creation (Thread vs Runnable), executors | Already covered — `concurrency-basics`, `executors-completablefuture` |
| Thread lifecycle / Thread states, start vs run, sleep/join/yield/interrupt, daemon threads, priorities, ThreadGroup, shutdown hook, thread scheduler | **Newly added — `thread-lifecycle-control`** (states were only named in `concurrency-basics` Interview Importance; no dedicated coverage of the six states, sleep vs wait, interruption, daemon threads, or shutdown hooks) |
| Thread pool | Already covered — `executors-completablefuture`, `concurrency-basics` |
| Garbage collection, Runtime class | Already covered — `garbage-collection` |
| Collections framework (ArrayList, LinkedList, HashSet, LinkedHashSet, TreeSet, TreeMap, HashMap, LinkedHashMap, Hashtable, Vector, Stack, Queue/Deque/PriorityQueue, EnumSet, Comparable/Comparator, Collections class) | Already covered — `collections-framework`, `collections-deep-dive` (incl. HashMap internals, Comparable/Comparator, legacy Vector/Hashtable/Stack) |
| Java arrays (incl. jagged arrays, Arrays utility) | Already covered — `dsa-arrays-strings` (Java arrays: fixed length, `Arrays.copyOf`/`equals`, jagged arrays) plus `variables-operators-control-flow` |
| Java packages | Already covered in outline — `language-basics-syntax` (packages/imports) and new `oop-encapsulation` (package-private access) |
| JDBC (5 steps, drivers) | Already covered — `jdbc-networking`, `db-sql-java-developers`. The four JDBC driver types are a small gap noted here, not a full topic: they are trivia-level and covered in outline by `jdbc-networking` |
| Reflection API | Already covered — `reflection-serialization` |
| Java handwritten notes (syllabus, OOP, arrays, String, collections) | Already covered — duplicates of doc 6; see rows above |

### Spring Framework (doc 3, GoalKicker)

| Module 0 topic | Outcome |
| --- | --- |
| Getting started with Spring, what is Spring / why use it, XML setup | Already covered — `spring-ioc-di` (IoC/DI, container, `@Bean` vs `@Component`), `spring-boot-autoconfig` |
| Spring Core, how Spring manages dependencies | Already covered — `spring-ioc-di` |
| Spring Expression Language (SpEL) | **Newly added — `spring-spel`** (zero real mentions before; only false positives in unrelated topics) |
| SqlRowSet / SimpleJdbcCall | Deliberately NOT added — narrow legacy JDBC helper API; `spring-jdbctemplate` (new) is the current data-access topic |
| Creating and using beans (autowiring, @Qualifier, FactoryBean, generic autowiring, prototype-in-singleton) | Already covered — `spring-ioc-di`, `bean-scopes-lifecycle` (incl. prototype-in-singleton) |
| Bean scopes (singleton, prototype, web scopes) | Already covered — `bean-scopes-lifecycle` |
| Conditional bean registration | Already covered — `spring-boot-autoconfig` (conditional configuration) |
| Spring JSR-303 Bean Validation | Already covered — `validation-exception-handling` |
| ApplicationContext configuration (autowiring, bootstrapping, Java config, XML config) | Already covered — `spring-ioc-di`, `spring-boot-autoconfig`, `configuration-profiles` |
| RestTemplate (headers, generics, auth, large files) | **Newly added — `spring-rest-clients`** (only passing mentions before; covers RestTemplate + modern RestClient + WebClient) |
| Task execution and scheduling (@Scheduled, cron, fixed delay/rate) | **Newly added — `spring-task-scheduling`** (zero mentions before) |
| Spring lazy initialization (@Lazy) | Deliberately NOT added as a standalone topic — too narrow for a full topic; candidate for a future expansion of `bean-scopes-lifecycle` |
| Property Source (@PropertySource, PropertyPlaceholderConfigurer) | Already covered — `configuration-profiles` (configuration sources/precedence, `@Value` vs `@ConfigurationProperties`) |
| Dependency Injection / IoC (XML, Java config, manual injection) | Already covered — `spring-ioc-di` |
| JdbcTemplate (basic queries, List of Maps, SQLRowSet, batch, NamedParameterJdbcTemplate) | **Newly added — `spring-jdbctemplate`** (only one passing mention before, in `design-patterns-solid`) |
| SOAP WS consumption | Deliberately NOT added — legacy protocol; Beanstack's API coverage is REST (`spring-mvc-rest`, new `spring-rest-clients`); SOAP is not a target-stack interview topic |
| Spring profiles | Already covered — `configuration-profiles` |
| dispatcher-servlet.xml / DispatcherServlet | Already covered — `spring-mvc-rest` |
| Spring handwritten notes (IoC/DI, BeanFactory, scopes, lifecycle, JdbcTemplate, AOP) | Already covered — duplicates of docs 3–4; see rows above |

### Spring Boot (doc 4, 49 chapters)

| Module 0 topic | Outcome |
| --- | --- |
| Introduction, quick start, bootstrapping | Already covered — `spring-boot-autoconfig` |
| Tomcat deployment, Tomcat port number | Already covered in outline — `configuration-profiles` (`server.port`), `actuator-microservices-deployment` (deployment) |
| Build systems (Maven, Gradle) | **Newly added — `spring-build-systems`** (only passing mentions before; no dedicated topic) |
| Code structure | Already covered in outline — `spring-boot-autoconfig` (minimal Boot application), `sd-class-design`; not a standalone interview topic |
| Spring beans and dependency injection | Already covered — `spring-ioc-di`, `bean-scopes-lifecycle` |
| Runners (ApplicationRunner / CommandLineRunner) | Deliberately NOT added as a standalone topic — too narrow (one small API); candidate for a future expansion of `spring-boot-autoconfig` |
| Application properties | Already covered — `configuration-profiles` |
| Logging | Already covered — `logging-testing-docs` |
| Building RESTful web services | Already covered — `spring-mvc-rest` |
| Exception handling | Already covered — `validation-exception-handling`, `spring-mvc-rest` |
| Interceptor | **Newly added — `spring-interceptors-filters`** (zero mentions of interceptors before; also covers servlet filters and CORS) |
| Servlet filter | **Newly added — `spring-interceptors-filters`** (filters previously appeared only in the `security-jwt` context) |
| File handling (upload/download) | **Newly added — `spring-file-handling`** (no real coverage before) |
| Service components (@Service/@Repository/@Controller) | Already covered — `spring-ioc-di` (`@Bean` vs `@Component`, stereotype annotations) |
| Thymeleaf | Deliberately NOT added — server-side templating superseded by the React frontend in this stack (`frontend` track); niche for Java+React full-stack interviews |
| Consuming RESTful web services | **Newly added — `spring-rest-clients`** (see Spring Framework row) |
| CORS support | **Newly added — `spring-interceptors-filters`** (zero mentions before) |
| Internationalization (i18n) | Deliberately NOT added — niche; not a core interview topic for the target roles |
| Scheduling | **Newly added — `spring-task-scheduling`** (see Spring Framework row) |
| Enabling HTTPS | Already covered in outline — `security-jwt`, `configuration-profiles` (TLS/SSL properties); not a standalone topic |
| Eureka server, service registration with Eureka | **Newly added — `spring-cloud-basics`** (only passing mentions in `actuator-microservices-deployment` before) |
| Zuul proxy server and routing | **Newly added — `spring-cloud-basics`** (covers Zuul as the retired predecessor of Spring Cloud Gateway; no dedicated topic before) |
| Spring Cloud Config server / client | **Newly added — `spring-cloud-basics`** (zero mentions before) |
| Actuator | Already covered — `actuator-microservices-deployment` |
| Admin server / Admin client | Deliberately NOT added — niche admin UI on top of Actuator (already covered in `actuator-microservices-deployment`); not an interview topic |
| Enabling Swagger2 / API documentation | Already covered — `logging-testing-docs` (OpenAPI/springdoc) |
| Creating Docker image | Already covered — `dv-dockerfiles-images`, `actuator-microservices-deployment`, `dv-deploying-java-aws` |
| Tracing microservice logs | **Newly added — `spring-cloud-basics`** (distributed tracing section; Micrometer Tracing/Zipkin) |
| Flyway database (migrations) | Already covered in outline — `dv-deploying-java-aws` (Flyway/Liquibase as the migration approach) |
| Sending email (JavaMailSender) | Deliberately NOT added — niche utility; not a core interview topic |
| Hystrix (circuit breaker) | **Newly added — `spring-cloud-basics`** (covers Resilience4j as the current implementation and Hystrix as retired) |
| WebSocket | Deliberately NOT added — niche; only passing mentions in `bean-scopes-lifecycle` (websocket scope) and `sd-designing-real-systems` |
| Batch service (Spring Batch) | Deliberately NOT added — enterprise batch processing, niche for the target full-stack web roles; the weakest of the candidate gaps. Candidate for a later batch if Faizan wants it. |
| Spring for Apache Kafka | Deliberately NOT added — messaging is covered at system-design level (`sd-caching-queues-databases`); a Spring-Kafka client topic is a candidate for later, not a Module 0 core gap |
| Twilio | Deliberately NOT added — a single vendor's SMS API, not an interview topic |
| Unit test cases, REST controller unit test | Already covered — `tst-junit-mockito-fundamentals`, `tst-spring-boot-tests`, `logging-testing-docs` |
| Database handling (Spring Data JPA, transactions) | Already covered — `spring-data-jpa`, `db-sql-java-developers` |
| Securing web applications, OAuth2 with JWT | Already covered — `security-jwt` |
| Google Cloud Platform, Google OAuth2 sign-in | Deliberately NOT added — cloud-vendor-specific; GCP deployment is covered in outline by `dv-deploying-java-aws` (AWS) and OAuth2 by `security-jwt` |

## Validation

`npm run validate-content` — **passed**: `Validation OK: 96 topic files, 96 unique topic ids, 10 tracks` (79 + 17 new). No errors, no warnings. `build-content-index` was NOT run (parent to run centrally). Nothing was pushed.

