import { describe, expect, it } from 'vitest'
import {
  contentIndex,
  loadFullContent,
  loadInterviewQuestions,
  loadPracticeItems,
  loadRevisionPrompts,
} from './content'

// Chunk fix (2026-11-09): the slim index loaded up front must NOT
// contain the full interview/practice bodies — those are lazy-loaded
// from separate generated files. If this test fails, the initial
// bundle has regressed to ~1.15 MB again.
describe('split content index', () => {
  it('slim index has topics/tracks/cheatsheets and id-only lists, not full bodies', () => {
    expect(contentIndex.topics.length).toBe(105)
    expect(contentIndex.tracks.length).toBe(10)
    expect(contentIndex.cheatsheets.length).toBe(19)
    // Second pass (2026-11-12): 366 interview questions minus the 37
    // Module 0 revision prompts, which moved to content/revision.
    expect(contentIndex.interviewQuestionIds.length).toBe(358)
    expect(contentIndex.revisionPromptIds.length).toBe(37)
    expect(contentIndex.practiceItemIds.length).toBe(214)
    // Full bodies must not be properties of the slim index at all.
    expect('interviewQuestions' in contentIndex).toBe(false)
    expect('practiceItems' in contentIndex).toBe(false)
    expect('revisionPrompts' in contentIndex).toBe(false)
  })

  it('lazy interview loader returns all questions and the ids match the slim index', async () => {
    const questions = await loadInterviewQuestions()
    expect(questions.length).toBe(358)
    expect(new Set(questions.map(q => q.id))).toEqual(new Set(contentIndex.interviewQuestionIds))
    expect(questions.every(q => typeof q.question === 'string' && q.question.length > 0)).toBe(true)
    // No Module 0 / Revision question may remain in Interview Prep.
    expect(questions.some(q => q.module === 'module-0' || q.category === 'Revision')).toBe(false)
    // Every question's category is in the consolidated taxonomy, or
    // 'Resume' on the bonus-resume module only.
    const allowed = new Set(['Java', 'Spring & Spring Boot', 'Microservices', 'SQL & Databases', 'System Design', 'DSA & Coding', 'Frontend', 'DevOps & Cloud', 'Testing', 'Behavioral & Projects', 'Resume'])
    expect(questions.every(q => allowed.has(q.category))).toBe(true)
    expect(questions.filter(q => q.category === 'Resume').every(q => q.module === 'bonus-resume')).toBe(true)
  })

  it('lazy revision loader returns the 37 moved Module 0 prompts, ids intact', async () => {
    const prompts = await loadRevisionPrompts()
    expect(prompts.length).toBe(37)
    expect(new Set(prompts.map(q => q.id))).toEqual(new Set(contentIndex.revisionPromptIds))
    expect(prompts.every(q => q.category === 'Revision')).toBe(true)
    // No id may collide with an interview question id.
    const interviewIds = new Set(contentIndex.interviewQuestionIds)
    expect(prompts.some(q => interviewIds.has(q.id))).toBe(false)
  })

  it('lazy practice loader returns all items and the ids match the slim index', async () => {
    const items = await loadPracticeItems()
    expect(items.length).toBe(214)
    expect(new Set(items.map(i => i.id))).toEqual(new Set(contentIndex.practiceItemIds))
  })

  it('lazy loaders are cached: repeated calls return the same array', async () => {
    const [a, b] = await Promise.all([loadInterviewQuestions(), loadInterviewQuestions()])
    expect(a).toBe(b)
    const [c, d] = await Promise.all([loadPracticeItems(), loadPracticeItems()])
    expect(c).toBe(d)
  })

  it('loadFullContent loads both collections together', async () => {
    const full = await loadFullContent()
    expect(full.interviewQuestions.length).toBe(358)
    expect(full.practiceItems.length).toBe(214)
  })
})
