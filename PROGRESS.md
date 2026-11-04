# PROGRESS.md — Beanstack build log

This file is the resume point if a session is interrupted or its context is reset. Read it first, then run validation and the build before continuing.

## Current state (2026-11-04, after interview/practice/cheatsheet batches + polish)

- **Local directory:** `~/workspace/beanstack` (persistent, not /tmp)
- **GitHub repo:** Faizxaan/bean-stack, branch `main`
- **Repo before this work:** only `README.md` (12 bytes, initial commit `d5aa0d451ed5b6a3882979afcff08cccd2efbb92` on 2026-11-03). No other code existed to replace.
- **App status:** Fully functional end-to-end SPA. Production build, type-check, validation script, and unit tests all pass (see Verification below).
- **Content status:** 34 topics validated, 10 cheatsheets, 83 interview questions, 73 practice items. Interview modules 0–4 and Bonus Resume are now complete; placeholder non-Java tracks remain Coming Soon by instruction (see Remaining).
- **Push status:** See "Push log" at the bottom. Confirmed push `81f00e1ec9604341ad630045a2d30067a41ee895` (76 files) covers foundation + 34 topics. The batches in this continuation run are validated locally and prepared in a fresh manifest, but NOT pushed in this run — do not claim they are on GitHub until a new confirmed commit SHA is recorded. If a push has not yet been confirmed, the local build in this directory is the source of truth.

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

## Remaining — content batches (in order, one section at a time)

- [ ] Placeholder tracks — NOT filled in this continuation run, by explicit parent instruction. They stay Coming Soon: Frontend, Databases, System Design, DSA & Coding, DevOps & Cloud, Testing, Behavioral & Projects, to be filled later with content and config only (no component changes), in that order or by user priority.
- [ ] Optional deeper Java topics, if the user wants them: collections List/Set/Map specifics as separate topics, JDBC deep dive, networking deep dive, and per-category interview question groups (currently interview questions are flat per module with a category field, which satisfies the data model but is not yet grouped into question groups in the UI)

## Remaining — polish / verification

- [ ] Compile-check every Java snippet in a JDK and verify stated outputs, especially Spring/Jakarta snippets that are framework code rather than standalone programs (snippets were written to be correct by construction; a systematic compile pass is still open — no JDK is installed in this environment)
- [ ] Live Vercel deploy verification (import repo, confirm deep-link refresh works) — requires user approval/import; not performed in this run
- [ ] After all content batches: final summary (what was built, key decisions, anything left as placeholder, how to run/deploy)

## Verification (last run, 2026-11-04, after interview/practice/cheatsheet batches + polish)

- `npm run validate-content` — OK (34 topics, 34 unique ids, 10 tracks)
- `npm run build-content-index` — OK (34 topics, 10 cheatsheets, 83 interview questions, 73 practice items, 10 tracks, 3 paths)
- `npm run typecheck` — OK
- `npm test` — 10 tests passed
- `npm run build` — OK (Vite production build; main chunk 442 KB, no 800 KB chunk-size warning; vendor chunks: markdown 323 KB, motion 121 KB, react 50 KB; topic/cheatsheet chunks split per file)

## Push log

- (To be filled after each confirmed push: date, batch description, commit SHA from the provider result, paths submitted.)
- 2026-11-04, foundation batch (55 files): push attempted via `github push-files` to Faizxaan/bean-stack branch `main`, but the runtime approval card timed out (`approval_expired`, egress approval timed out for this invocation). The action was NOT performed. Repo head remains the initial commit `d5aa0d451ed5b6a3882979afcff08cccd2efbb92`. Do NOT claim this push succeeded. Retry requires a fresh approval; the manifest is at `~/workspace/beanstack-manifest-1.txt` (outside the source dir).
- 2026-11-04, CONFIRMED PUSH: "Beanstack: foundation + Java content (34 topics)", 76 files, manifest at `~/workspace/beanstack-manifest-2.txt`, commit SHA `81f00e1ec9604341ad630045a2d30067a41ee895` on branch `main`, verified by re-reading the repo head. This supersedes the failed attempts above. The sync record lives outside the repo at `~/workspace/beanstack.muse-github-snapshot-sync.json` and must never be committed.
