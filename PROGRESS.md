# PROGRESS.md — Beanstack build log

This file is the resume point if a session is interrupted or its context is reset. Read it first, then run validation and the build before continuing.

## Current state (2026-11-04, after foundation + sample content + three Java content batches)

- **Local directory:** `~/workspace/beanstack` (persistent, not /tmp)
- **GitHub repo:** Faizxaan/bean-stack, branch `main`
- **Repo before this work:** only `README.md` (12 bytes, initial commit `d5aa0d451ed5b6a3882979afcff08cccd2efbb92` on 2026-11-03). No other code existed to replace.
- **App status:** Fully functional end-to-end SPA. Production build, type-check, validation script, and unit tests all pass (see Verification below).
- **Content status:** 34 topics validated (Core Java, Advanced Java, Spring & Spring Boot largely covered — see Completed), 2 cheatsheets, 11 interview questions, 16 practice items. Interview modules 2–4, expanded practice/cheatsheets, and placeholder tracks remain (see Remaining).
- **Push status:** See "Push log" at the bottom. If a push has not yet been confirmed, the local build in this directory is the source of truth — do not claim a push that is not recorded with a confirmed commit SHA.

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

## Remaining — content batches (in order, one section at a time)

Content volume is the main remaining work. The app is ready; each batch is: write files → run validation → regenerate index → typecheck/test/build → push.

- [ ] Interview modules — Module 2 (3–5 years), Module 3 (5–8 years), Module 4 (8–15 years), full Module 0 revision notes, full Bonus Resume templates; interview categories in every module: Java, Collections, Streams, Concurrency, JVM, Spring Framework, Spring Boot, Spring MVC, Spring Data JPA, Microservices, SQL as used by Java developers, coding, scenario-based
- [ ] Practice material — expand MCQs, flashcards, coding, output-based, and scenario-based items per topic, so per-topic accuracy and weak areas are meaningful across the whole Java curriculum
- [ ] Cheatsheets — expand to cover each major topic area, keeping every cheatsheet consistent with its topic content
- [ ] Placeholder tracks — fill Frontend, Databases, System Design, DSA & Coding, DevOps & Cloud, Testing, Behavioral & Projects with content and config only (no component changes), in that order or by user priority
- [ ] Optional deeper Java topics, if the user wants them: collections List/Set/Map specifics as separate topics, JDBC deep dive, networking deep dive, and per-category interview question groups (currently interview questions are flat per module with a category field, which satisfies the data model but is not yet grouped into question groups in the UI)

## Remaining — polish / verification

- [ ] Vendor chunk-splitting to reduce the main bundle below the 800 KB warning (build currently warns, does not fail; main chunk ~820 KB, content chunks are already split)
- [ ] Compile-check every Java snippet in a JDK and verify stated outputs, especially Spring/Jakarta snippets that are framework code rather than standalone programs (sample snippets were written to be correct by construction; a systematic compile pass is still open)
- [ ] Manual accessibility pass on mobile navigation and dialogs (keyboard-only walkthrough)
- [ ] Vercel deploy verification (import repo, confirm build command `npm run build`, output `dist`, deep-link refresh works via `vercel.json`)
- [ ] After all content batches: final summary (what was built, key decisions, anything left as placeholder, how to run/deploy)

## Verification (last run, 2026-11-04, after three Java content batches)

- `npm run validate-content` — OK (34 topics, 34 unique ids, 10 tracks)
- `npm run build-content-index` — OK (34 topics, 2 cheatsheets, 11 interview questions, 16 practice items, 10 tracks, 3 paths)
- `npm run typecheck` — OK
- `npm test` — 10 tests passed
- `npm run build` — OK (Vite production build; each topic is its own chunk; one main-chunk size warning, see above)

## Push log

- (To be filled after each confirmed push: date, batch description, commit SHA from the provider result, paths submitted.)
- 2026-11-04, foundation batch (55 files): push attempted via `github push-files` to Faizxaan/bean-stack branch `main`, but the runtime approval card timed out (`approval_expired`, egress approval timed out for this invocation). The action was NOT performed. Repo head remains the initial commit `d5aa0d451ed5b6a3882979afcff08cccd2efbb92`. Do NOT claim this push succeeded. Retry requires a fresh approval; the manifest is at `~/workspace/beanstack-manifest-1.txt` (outside the source dir).
- No successful push has been recorded yet. The sync record lives outside the repo at `~/workspace/beanstack.muse-github-snapshot-sync.json` and must never be committed.
