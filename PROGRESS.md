# PROGRESS.md — Beanstack build log

This file is the resume point if a session is interrupted or its context is reset. Read it first, then run validation and the build before continuing.

## Current state (2026-11-04, after completion run — all tracks filled)

- **Local directory:** `~/workspace/beanstack` (persistent, not /tmp)
- **GitHub repo:** Faizxaan/bean-stack, branch `main`
- **Repo before this work:** only `README.md` (12 bytes, initial commit `d5aa0d451ed5b6a3882979afcff08cccd2efbb92` on 2026-11-03). No other code existed to replace.
- **App status:** Fully functional end-to-end SPA. Production build, type-check, validation script, and unit tests all pass (see Verification below).
- **Content status:** 79 topics validated, 18 cheatsheets, 168 interview questions, 183 practice items, 10 tracks (none Coming Soon), 6 paths. Interview modules 0–4 and Bonus Resume are complete; all 7 former placeholder tracks are now filled with full content (see Completed — completion run below).
- **Push status:** See "Push log" at the bottom. Confirmed pushes: `81f00e1ec9604341ad630045a2d30067a41ee895` (76 files, foundation + Java) and `58f7c4522ce7551a4712b869e4aefd2d000635b4` (21 files, interview/practice/cheatsheets/polish). The completion run in this file is validated locally and prepared in a fresh manifest, but NOT pushed in this run — do not claim it is on GitHub until a new confirmed commit SHA is recorded.

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

## Completed — critic audit run (2026-11-04, navigation / robustness / tone, NOT yet pushed)

- [x] Navigation (worker): fixed side chevrons overlapped content at 1400–1487px — gate raised to 1520px; topic article/TOC grid now collapses to one column ≤900px with TOC first; TOC scroll-spy fixed to MarkdownView's real heading ids and to the actually displayed body in Quick Revision Mode; track/path progress + resume added to Learn index, Track page, and Home (resume now targets the most recently viewed unfinished topic); back-to-top (floating after 600px, reduced-motion aware, plus bottom-row button); bottom dead end fixed (Back-to-track, Browse another track); sidebar tracks hidden on mobile, sidebar links now NavLink active states; shared Breadcrumb component; topic copy-link with clipboard fallback and feedback; palette destinations expanded; tables in a horizontal-scroll wrapper; tap targets enlarged; stale "Coming Soon" copy removed.
- [x] Robustness (worker): LocalStorage sanitisation on load/import/every settings write (`sanitizeUserData`/`sanitizeSettings`, unknown ids and invalid enums dropped, never throws); import validation completed for all id lists/values, 5 MB guard, distinct invalid-JSON message, error truncation to 20 + "…and N more", file-input reset, "your current data was not changed" on rejection; note cap 10,000 chars, attempts cap 5,000, activity dates cap 730; unknown Practice tab falls back to mcq; real "Retry wrong only" toggle; flashcard due-today caught-up state and box clamping 1–5; unscorable MCQ/output cards and empty flashcard/coding states handled; mock interview empty-state guard; streak/Leitner now use local dates (not UTC), calendar validation, corrupt dueAt = due now, future activity ignored; removed-id bookmarks/favorites/notes degrade to "no longer available" rows, accuracy no longer buckets removed items as "general"; search normalisation (case/accents/whitespace, punctuation-only = no results); system-theme listener; corrupt lastExportedAt and Invalid Date handled. New tests: `src/lib/robustness.test.ts` (15 tests).
- [x] Tone (worker): all 79 topics audited; 17 touched with targeted Overview edits only (plain-language lead-in, first-use glosses, one concrete example/analogy, expanded acronyms such as SOLID); 62 untouched because their Overviews already opened in plain language; no frontmatter, code, or stated outputs changed; no JDK compile-check claimed. Edited ids: collections-framework, oop-principles, exception-handling, garbage-collection, concurrency-basics, spring-data-jpa, spring-mvc-rest, fe-js-async, fe-react-components-hooks, functional-interfaces-optional, dsa-patterns, db-sql-java-developers, logging-testing-docs, design-patterns-solid, fe-ts-types, streams-lambdas, fe-js-dom.
- [x] Central follow-ups (parent): TopicPage now validates URL track/section segments (in-place not-found with correct-address link); Search page and command palette now include practice MCQs and use track titles; palette input gained an aria-label; dark-mode `.badge.warn` contrast fixed; validation script hardened (see DECISIONS.md) and current content passes all new checks.
- [x] Deliberately not added/changed: keyboard arrow-key navigation (forbidden by original prompt); duplicate-heading id disambiguation (known minor limitation, see DECISIONS.md); LocalStorage quota-failure toast (new component machinery, see DECISIONS.md); trailing Version Differences sections (kept, see DECISIONS.md); backend/database/auth/external APIs/runtime AI/Redux (out of scope).

## Completed — small UX change (2026-11-04, clickable topic arrows, PUSHED)

- 2026-11-04, CONFIRMED PUSH: "Beanstack: clickable topic arrows — previous/next navigation", 5 files, manifest at `~/workspace/beanstack-manifest-6.txt`, commit SHA `e4be9bddd5263241ef959910d79373bfe5644569` on branch `main`, verified by re-reading the repo head.
- 2026-11-05, CONFIRMED PUSH: "Beanstack: critic audit — navigation, robustness, tone, search MCQs", 34 files, manifest at `~/workspace/beanstack-manifest-7.txt`, commit SHA `5b899e8e864036c29b1f6ecd7621c2eda648530c` on branch `main`, verified by re-reading the repo head. Totals unchanged: 79 topics, 18 cheatsheets, 168 interview questions, 183 practice items, 10 tracks, 6 paths; tests now 25 passed.

- [x] Topic page: clickable left/right arrow navigation to the previous/next topic in the same track, using the existing `prevNextTopic` order. A labelled top prev/next bar is shown on every topic page; large fixed chevron buttons appear only on very wide screens (≥1400px) to avoid overlapping content. The existing bottom prev/next links are kept for mobile. Deliberately click-only, not keyboard arrow keys, per the original prompt (plain arrow keys conflict with scrolling/text selection).
- [x] Topic page now scrolls to the top when the topic changes, so clicking next/previous from the bottom of a long topic does not leave the new topic scrolled to the bottom.
- [x] Verification for this change: `npm run validate-content` OK, `npm run build-content-index` OK (79 topics, 18 cheatsheets, 168 interview questions, 183 practice items, 10 tracks, 6 paths), `npm run typecheck` OK, `npm test` 10 passed, `npm run build` OK in ~10s (main index chunk 722 KB, unchanged).

## Remaining — content batches

- [x] All former placeholder tracks filled in the completion run (see Completed — completion run below). No track remains Coming Soon.
- [ ] Optional deeper Java topics: deliberately NOT added — see DECISIONS.md (collections deep dive and JDBC & Networking already cover the suggested areas; further topics would be scope creep, not a curriculum gap).
- [ ] Interview question groups as a separate level: deliberately NOT added — see DECISIONS.md (module → category → questions plus browse-by-topic already provides the hierarchy; a separate group field would require a type/index/UI change, not content-only).

## Remaining — polish / verification

- [ ] Compile-check every snippet in a JDK and verify stated outputs — NOT completed: no JDK is installed in this environment and none was installed (system-level change outside repo scope). All new snippets were manually reviewed only; no javac verification is claimed. This is the one verification item that could not be closed to 100% in this environment.
- [ ] Live Vercel deploy verification (import repo, confirm deep-link refresh works) — NOT performed: requires the user's Vercel account action/import. Notes only: vercel.json SPA rewrites to /index.html present, build command `npm run build`, output `dist`, no env vars/backend/database required. This is the one deployment item that could not be closed to 100% in this run.
- [ ] After all content batches: final summary (what was built, key decisions, anything left as placeholder, how to run/deploy)

## Verification (last run, 2026-11-04, after completion run)

- `npm run validate-content` — OK (79 topic files, 79 unique topic ids, 10 tracks)
- `npm run build-content-index` — OK (79 topics, 18 cheatsheets, 168 interview questions, 183 practice items, 10 tracks, 6 paths)
- `npm run typecheck` — OK
- `npm test` — 10 tests passed
- `npm run build` — OK (built in ~9s; main index chunk 722 KB / gzip ~215 KB, under the configured 800 KB warning limit; topic/cheatsheet bodies split per file; no chunk-size warning)
- JDK compile-check: NOT performed — no JDK installed (see Remaining — polish). Snippets manually reviewed only.

## Push log

- (To be filled after each confirmed push: date, batch description, commit SHA from the provider result, paths submitted.)
- 2026-11-04, foundation batch (55 files): push attempted via `github push-files` to Faizxaan/bean-stack branch `main`, but the runtime approval card timed out (`approval_expired`, egress approval timed out for this invocation). The action was NOT performed. Repo head remains the initial commit `d5aa0d451ed5b6a3882979afcff08cccd2efbb92`. Do NOT claim this push succeeded. Retry requires a fresh approval; the manifest is at `~/workspace/beanstack-manifest-1.txt` (outside the source dir).
- 2026-11-04, CONFIRMED PUSH: "Beanstack: foundation + Java content (34 topics)", 76 files, manifest at `~/workspace/beanstack-manifest-2.txt`, commit SHA `81f00e1ec9604341ad630045a2d30067a41ee895` on branch `main`, verified by re-reading the repo head. This supersedes the failed attempts above. The sync record lives outside the repo at `~/workspace/beanstack.muse-github-snapshot-sync.json` and must never be committed.
- 2026-11-04, CONFIRMED PUSH: "Beanstack: interview modules 2-4, Module 0, resume, practice + cheatsheets, bundle polish", 21 files, manifest at `~/workspace/beanstack-manifest-3.txt`, commit SHA `58f7c4522ce7551a4712b869e4aefd2d000635b4` on branch `main`, verified by re-reading the repo head. Totals after this push: 34 topics, 10 cheatsheets, 83 interview questions, 73 practice items, 10 tracks, 3 paths.
- 2026-11-04, CONFIRMED PUSH: "Beanstack: complete all tracks to 100% — frontend, databases, system design, DSA, DevOps, testing, behavioral", 74 files, manifest at `~/workspace/beanstack-manifest-4.txt`, commit SHA `666e536ddd941b6dda1fc4de6a43aff5524ac9d7` on branch `main`, verified by re-reading the repo head. Totals after this push: 79 topics, 18 cheatsheets, 168 interview questions, 183 practice items, 10 tracks, 6 paths. All tracks complete; no Coming Soon tracks remain.

- 2026-11-04, completion run: NOT pushed in this run, by instruction. A fresh manifest for all new/changed files in this run was prepared (see parent report for the exact manifest path and count). GitHub head at the time of this run was still 58f7c4522ce7551a4712b869e4aefd2d000635b4; do NOT claim the completion batch is on GitHub until a new confirmed commit SHA is recorded.

## Completed — Desktop Modules interview import (2026-11-09, NOT yet pushed)

- Source: Faizan's Desktop `modules` folder, copied locally to `~/workspace/modules-source/` (6 .txt files, NOT committed to GitHub and NOT copied into this repo). Module 1 (0-3 yrs, 11 resources, ~499 questions inventoried), Module 2 (3-5 yrs, 20 resources, ~965 headings / ~950 distinct), Module 3 (5-8 yrs, 26 resources, ~1,029 questions), Module 4 (8-15 yrs, 29 resources, ~1,387 questions). Module 0 (revision notes, 7 resources — not 8 as first assumed; handwritten-note OCR is garbled, inventory from headings/contents only). Bonus (586 bytes: resume tips + a Canva link only).
- Added, all written fresh in Beanstack's own words (see DECISIONS.md copyright rule): Module 0 +5 (21 -> 26: SQL fundamentals, SQL joins/subqueries/window functions/CTEs, Java data types/variables/operators, Spring AOP, testing with JUnit/Mockito/MockMvc), Module 1 +24 (8 -> 32), Module 2 +24 after central dedupe (14 -> 38), Module 3 +20 after central dedupe (14 -> 34), Module 4 +21 after central dedupe (14 -> 34). Bonus +0 (existing 12 resume items already cover it).
- Central dedupe removed 10 near-duplicates the per-module workers had added in parallel: DispatcherServlet flow (kept Module 1), first non-repeated character with streams (kept Module 2; removed Module 3 and Module 4 versions), Spring Boot caching (kept Module 2), Kafka ordering/exactly-once (kept Module 2), OAuth2 authorization code flow (kept Module 2), stateless JWT flow (kept Module 2), Kafka partitions/delivery (kept Module 2), multiple DataSources (kept Module 3), deep vs shallow copy (kept Module 3). Net new: 93 questions. Totals now: 79 topics, 18 cheatsheets, 261 interview questions, 183 practice items, 10 tracks, 6 paths.
- Skipped: thousands of source items as within-source repeats (e.g. Spring Security Level II duplicated verbatim in Module 3), repeats across modules (same 25 coding + stream tasks in every module), near-duplicates of the existing 168 Beanstack questions, or too basic for the module's experience level. Category mapping: Spring Security/Kafka/Design Patterns/Lead have no dedicated Beanstack category, so they were mapped to the closest allowed category (Spring Boot / Microservices / Java / Scenario-based) or skipped; Maven/Git/Gradle and JUnit/Mockito were mostly skipped in Modules 2-4 (already covered by the DevOps/Testing interview files, no DevOps/Testing category in module files).
- Verification (central, 2026-11-09): `npm run validate-content` OK, `npm run build-content-index` OK (261 interview questions), `npm run typecheck` OK, `npm test` 25 passed, `npm run build` OK in ~7s. All 261 interview ids unique; no source PDF URLs in module files (checked). Coding solutions manually reviewed only; no JDK compile-check claimed.
- NOT pushed in this run, by instruction. Manifest at `~/workspace/beanstack-manifest-9.txt`. GitHub head verified 2026-11-09: `d87d9ac07d4560b7dafc9abb0f6838cc15e7272f` ("Beanstack: record critic-audit push in PROGRESS.md"). Do NOT claim this batch is on GitHub until a new confirmed commit SHA is recorded.
