# Beanstack

Beanstack is a personal Java full stack developer wiki and interview preparation platform. It brings everything a Java full stack developer needs into one organized place to learn, practice, revise, and track progress.

**Hard constraints, by design:**

- Frontend only. A static SPA deployed on Vercel. No backend, database, authentication, user accounts, external APIs, or runtime AI calls.
- All user data (progress, bookmarks, notes, settings) lives in LocalStorage.
- State management is React Context and hooks only. No Redux, MobX, or similar.
- Code blocks use the track's primary language per example (Java for the Java tracks; JavaScript/TypeScript, SQL, Bash/Dockerfile/YAML, etc. for the other tracks). No multi-language tabs, switchers, runners, or playgrounds. Standard syntax highlighting for fenced code is enough.
- No hardcoded counts of topics, questions, or tracks anywhere. Everything is derived from content.
- No plugin systems, enterprise patterns, or premature optimization.

## What is built

- **Learn:** Tracks → sections → topics, with a consistent topic page (overview, theory, key concepts, code examples with output and explanation, best practices, common mistakes, interview importance, interview questions, revision summary, personal notes, prerequisites, related topics), progress status, Quick Revision Mode, prev/next navigation, sticky table of contents, and curated learning paths.
- **Interview Prep:** Modules 0–4 plus Bonus Resume Tips, browsable by module and by topic/technology, with short/detailed answers, follow-ups, tips, common mistakes, self-test mode (hide/reveal, Confident / Needs review), copy buttons, bookmarks, and deep links to a specific question.
- **Practice:** MCQs, flashcards (Leitner boxes, due-today count), coding questions, output-based questions, scenario-based questions, persisted attempts, per-topic accuracy, weak areas, retry-what-you-got-wrong, and a mock interview mode.
- **Revision & Cheatsheets:** Fully content-driven cheatsheets with comparison tables and print-friendly layouts.
- **My Library:** Bookmarks and Favorites kept separate, personal notes, recently viewed, continue learning, and automatically computed statistics (completed, in progress, bookmarks, favorites, accuracy, study streak).
- **Home:** Continue learning, today's focus, track progress, flashcards due, recently viewed, bookmarks, statistics, quick actions, and an optional interview-date countdown.
- **Search & Navigation:** Global search across topics, interview questions, and cheatsheets, plus a command palette (Ctrl/Cmd+K, `/` focuses search), breadcrumbs, a sidebar showing only the active track's tree, and a proper in-place 404 page.
- **Settings & Data Safety:** Reading preferences (width, font size), theme, export/import of all user data as JSON (schema version 1, migration support, validation against known ids), granular confirmed resets, and a backup reminder. All storage access is safe (quota errors, private mode, corrupt data are handled).

## Tech stack

React, TypeScript, Vite, and React Router (current stable versions at build time). Styling is a small custom CSS design system (a deliberate choice for build reliability — see DECISIONS.md). Lucide for icons, highlight.js for Java syntax highlighting, react-markdown + remark-gfm for Markdown rendering, and Framer Motion only for a subtle page fade. Tests use Vitest for pure logic only.

## Architecture

See `DECISIONS.md` for decisions, `CONTENT_GUIDE.md` for the content format, and `PROGRESS.md` for what is done and what remains.

Key points:

- **Content is separate from UI.** All study content lives in `content/` as Markdown with frontmatter (topics, cheatsheets) or JSON (interview questions, practice items). UI code in `src/` never hardcodes study content.
- **One source of truth for hierarchy.** `content/tracks.json` defines tracks and sections; topic files declare their track/section in frontmatter. Adding a topic means adding a file and regenerating the index.
- **Build-time content index (split).** `scripts/build-content-index.mjs` scans `content/`, parses frontmatter, and writes three generated files: slim `src/generated/content-index.json` (tracks, paths, topics, cheatsheets, plus id-only interview/practice id lists — imported up front for navigation and search), `src/generated/content-interview.json` (all interview questions), and `src/generated/content-practice.json` (all practice items). The two heavy files are lazy-loaded on demand (see `src/lib/content.ts`), so the initial bundle stays under the 800 KB chunk-size warning. Topic bodies are lazy-loaded with Vite's `import.meta.glob` (`?raw`), so each Markdown file becomes its own chunk and the initial load stays fast as content grows.
- **Validation.** `scripts/validate-content.mjs` checks for duplicate ids, missing metadata, broken prerequisite/related ids, empty required sections, malformed files, and invalid JSON references. Run it after every content batch.
- **User data.** React Context + LocalStorage, schema version 1, key `beanstack-user-data-v1`. See Settings for export/import and resets.

## Setup

```bash
npm install
npm run dev        # local development
npm run validate-content
npm run build-content-index
npm run typecheck
npm test
npm run build      # production build (tsc + vite)
npm run preview
```

Node 20+ is recommended (developed with Node 24).

## How to add content

See `CONTENT_GUIDE.md`. In short:

1. Add a topic Markdown file under `content/topics/<track>/<section>/` with the required frontmatter and `## Overview` section.
2. Or add interview/practice items to JSON files under `content/interview/` or `content/practice/`.
3. Run `npm run validate-content` — fix any errors.
4. Run `npm run build-content-index` to regenerate `src/generated/content-index.json`.
5. Run `npm run typecheck && npm test && npm run build`.
6. Commit (see PROGRESS.md for the push procedure used in this repo).

## Deployment (Vercel)

- Import this repository in Vercel as a Vite/React project.
- Build command: `npm run build`
- Output directory: `dist`
- `vercel.json` in the repo root contains SPA rewrites so deep links and refreshes work: every route rewrites to `/index.html`.
- No environment variables, backend, or database are required. The app is fully static.

## Project structure

```
content/
  tracks.json                 # Track and section definitions
  paths.json                  # Curated learning paths (topic id lists)
  topics/<track>/<section>/   # Topic Markdown with frontmatter
  interview/*.json            # Interview questions by module
  practice/*.json             # MCQs, flashcards, coding, output, scenario items
  cheatsheets/*.md            # Cheatsheet Markdown with frontmatter
scripts/
  frontmatter.mjs             # Shared Markdown frontmatter parsing
  build-content-index.mjs     # Generates src/generated/content-index.json
  validate-content.mjs        # Content validation
src/
  components/                 # Layout, command palette, Markdown rendering
  pages/                      # Home, Learn, Interview, Practice, Cheatsheets, Library, Settings
  lib/                        # Content loading, pure logic (progress, search, spaced repetition, import validation)
  store/                      # React Context + LocalStorage user data
  generated/content-index.json # Generated (slim nav index) — do not edit by hand
  generated/content-interview.json # Generated (interview questions, lazy-loaded) — do not edit by hand
  generated/content-practice.json # Generated (practice items, lazy-loaded) — do not edit by hand
```

## Status

All 11 tracks are built out: Core Java, Advanced Java, Spring & Spring Boot, and Kafka & Redis, plus Frontend, Databases, System Design, DSA & Coding, DevOps & Cloud, Testing, and Behavioral & Projects. No track remains a "Coming Soon" placeholder. See `PROGRESS.md` for exact completed work and known limitations.
