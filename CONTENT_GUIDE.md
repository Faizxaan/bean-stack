# CONTENT_GUIDE.md — How to add content to Beanstack

Content lives in `content/`, separate from UI code in `src/`. Nothing study-related is hardcoded in components. If you add a file and regenerate the index, the UI picks it up.

## File layout

```
content/
  tracks.json
  paths.json
  topics/<track>/<section>/<topic-slug>.md
  interview/<module-or-area>.json
  practice/<name>.json
  revision/one-minute.json
  cheatsheets/<cheatsheet-slug>.md
```

Current totals (2026-11-13, from the generated index — re-check with
`npm run build-content-index` rather than trusting this line): 105
topics, 358 interview questions + 37 one-minute revision prompts,
214 practice items, 19 cheatsheets, 10 tracks, 6 paths.

## Tracks and sections

`content/tracks.json` is an array of tracks. Each track has:

- `id` — stable, kebab-case, e.g. `java-core`
- `title`, `description`, `domain` (optional grouping, e.g. "Java Ecosystem")
- `status` — `complete` | `draft` | `placeholder`
- `comingSoon` — `true` for placeholder tracks (shown with a "Coming Soon" badge)
- `sections` — array of `{ id, title, description?, plannedTopics?[] }`

Section `id`s are globally unique in this repo (validation checks this). A placeholder track needs sections with `plannedTopics` so its page is useful before content exists.

## Topic Markdown (preferred format)

Path: `content/topics/<track>/<section>/<slug>.md`

Frontmatter (all fields except `summary` are required unless noted):

```yaml
---
id: collections-framework
title: Collections Framework Overview
track: java-core
section: collections
order: 1
difficulty: Beginner | Intermediate | Advanced
importance: 1-5
tags: [Collections, List, Map]
prerequisites: [oop-principles]
related: [streams-lambdas]
status: complete | draft | placeholder
lastUpdated: 2026-11-04
summary: One sentence describing the topic.
---
```

Rules:

- `id` must be unique across all topics.
- `track` must exist in `tracks.json`; `section` must exist in some track's sections.
- `prerequisites` and `related` must reference existing topic ids (validation checks this).
- Quote YAML values that start with special characters (`@`, `*`, `:`) or contain `: `, e.g. `summary: "@Component vs @Bean, ..."`.
- Body must contain at least `## Overview` and be more than 50 characters. Use these headings, in this order where applicable, so every topic page feels identical:
  `## Overview`, `## Theory`, `## Key Concepts`, `## Code Examples`, `## Best Practices`, `## Common Mistakes`, `## Interview Importance`, `## Interview Questions`, `## Revision Summary`
- Code examples use the track's primary language per example (Java for the Java tracks; JavaScript/TypeScript, SQL, Bash/Dockerfile/YAML, etc. elsewhere). Use fenced code blocks with a language tag. Plain-text blocks (program output, query results, templates) use ```text so the highlighter does not auto-detect them as the wrong language. State the output exactly, and verify it: code examples must compile and their stated output must be correct where practical. No multi-language tabs, switchers, runners, or playgrounds.
- Diagrams must be explicit in content (e.g. a Mermaid block or an image reference). Never rely on the UI to infer a diagram from a topic name. Diagram images live in `public/diagrams/<name>.svg` with their Mermaid source kept alongside as `public/diagrams/<name>.mmd` — do not paste Mermaid source into a topic as an HTML comment, because the ` --> ` arrows inside it terminate the comment early and leak the source onto the page as a visible code block.
- Reading time is calculated automatically from body word count. Placeholders never show "0 min" — placeholder topics/sections show "Coming Soon" instead of a reading time in the UI.
- Version differences: for Java/Spring topics, call out version differences interviews commonly ask about (Java 8 vs 11 vs 17 vs 21; Spring Boot versions where relevant).
- Write in your own words. Do not reproduce copyrighted text from books, courses, or websites.

## Interview questions (JSON)

Path: `content/interview/<file>.json` — an array of question objects. The
build merges every JSON file in `content/interview/`, so files are split
by module (`module-1.json` … `module-4.json`, `bonus-resume.json`) and by
broad area (`interview-<area>.json`, e.g. `interview-testing.json`).

```json
{
  "id": "iq-hashmap-internals",
  "module": "module-1",
  "category": "Collections",
  "title": "HashMap internals",
  "question": "How does HashMap work internally?",
  "shortAnswer": "One or two sentences.",
  "detailedAnswer": "A fuller explanation.",
  "followUps": ["Follow-up question 1"],
  "tips": ["Tip 1"],
  "commonMistakes": ["Mistake 1"],
  "difficulty": "Easy | Medium | Hard",
  "topicId": "collections-framework",
  "relatedTopics": ["concurrency-basics"]
}
```

Modules: `module-1` (0–3 years, 88 questions), `module-2` (3–5 years, 109),
`module-3` (5–8 years, 91), `module-4` (8–15 years, 58), `bonus-resume`
(Resume Tips & Templates, 12) — 358 questions in total. There is no
`module-0` in Interview Prep: the old Module 0 revision notes were moved
to `content/revision/one-minute.json` (see below) and render as a
one-minute revision deck under Revision & Cheatsheets, so they never
appear in interview counts, filters, or progress.

Questions group by 10 broad areas, in learning order within each module
(Easy → Hard): Java (126), Spring & Spring Boot (83), SQL & Databases
(26), Microservices (22), Behavioral & Projects (19), System Design (18),
DevOps & Cloud (14), DSA & Coding (13), Testing (13), Frontend (12).
Resume (12) is bonus-only. The UI already lists all modules and shows a
helpful placeholder state for modules with no questions yet, so adding
questions is content-only.

## One-minute revision prompts (JSON)

Path: `content/revision/one-minute.json` — an array of 37 short prompts.
Each prompt has the same shape as an interview question (`id`, `title`,
`question`, `shortAnswer`, `detailedAnswer`, `category`, `module`,
`difficulty`, `topicId`, `tips`, `relatedTopics`). These are revision
prompts, not interview questions: the build writes them to a separate
`content-revision.json` and the interview index, counts, filters, and
progress never see them.
They render as a one-minute revision deck under Revision & Cheatsheets.
User progress on them shares the review/bookmark keys with interview
questions, so a prompt keeps its state if it moves between files.

## Practice items (JSON)

Path: `content/practice/<name>.json` — an array of items. `type` is one of `mcq`, `flashcard`, `coding`, `output`, `scenario`.

- MCQ / output: `prompt`, `options[]`, `answerIndex`, `explanation`, optional `code`, `topicId`, `category`, `difficulty`.
- Flashcard: `front`, `back`, `topicId`. Flashcards are atomic (one fact per card). Spaced repetition uses Leitner boxes in the app.
- Coding: `description`, `examples[]`, `hints[]`, `solution` (correct, idiomatic Java), `topicId`.
- Scenario: `description`, `solution` (model approach), `topicId`.
- MCQs need plausible distractors and an explanation of why the right answer is right and the others are wrong.

All practice items must reference an existing `topicId` if they set one (validation checks this).

## Cheatsheets (Markdown)

Path: `content/cheatsheets/<slug>.md`, frontmatter: `id`, `title`, `track` (or null), `category`, `status`, `summary`. Body is Markdown with comparison/quick-reference tables. Cheatsheets are concise and must stay consistent with the topic content they summarise.

## Learning paths

`content/paths.json` is an array of `{ id, title, description, topicIds[] }`. Paths are built from prerequisites and tags in spirit, but stored as explicit ordered topic id lists so they are easy to curate. Validation checks that every referenced topic exists.

## Adding a new track later (no component changes)

1. Add the track (with sections and `plannedTopics`) to `content/tracks.json`.
2. Add topic files under `content/topics/<new-track>/<section>/`.
3. Run validation, regenerate the index, and build. The sidebar, track page, search, and progress all derive from the index.

## Workflow for every batch

```bash
npm run validate-content
npm run build-content-index
npm run typecheck
npm test
npm run build
```

Fix validation errors immediately — do not leave a batch with a failing validation script. Commit after each batch (see PROGRESS.md).
