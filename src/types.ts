export type TopicStatus = 'complete' | 'draft' | 'placeholder'
export type ProgressStatus = 'not-started' | 'in-progress' | 'completed'

export interface TrackSection {
  id: string
  title: string
  description?: string
  plannedTopics?: string[]
}

export interface Track {
  id: string
  title: string
  domain?: string
  description: string
  status: TopicStatus
  comingSoon?: boolean
  sections: TrackSection[]
}

export interface TopicMeta {
  id: string
  title: string
  track: string
  section: string
  order: number
  difficulty: string
  importance: number
  tags: string[]
  prerequisites: string[]
  related: string[]
  status: TopicStatus
  lastUpdated: string | null
  file: string
  readingMinutes: number
  summary: string
}

export interface CheatsheetMeta {
  id: string
  title: string
  track: string | null
  category: string
  status: TopicStatus
  file: string
  readingMinutes: number
  summary: string
}

export interface InterviewQuestion {
  id: string
  module: string
  moduleTitle?: string
  level?: string
  category: string
  title: string
  question: string
  shortAnswer: string
  detailedAnswer?: string
  followUps?: string[]
  tips?: string[]
  commonMistakes?: string[]
  difficulty: string
  topicId?: string
  relatedTopics?: string[]
}

export interface PracticeItem {
  id: string
  type: 'mcq' | 'flashcard' | 'coding' | 'output' | 'scenario'
  topicId?: string
  track?: string
  title: string
  prompt: string
  question?: string
  options?: string[]
  answerIndex?: number
  answer?: string
  explanation?: string
  front?: string
  back?: string
  description?: string
  examples?: string[]
  hints?: string[]
  solution?: string
  code?: string
  output?: string
  difficulty?: string
  category?: string
}

export interface LearningPath {
  id: string
  title: string
  description: string
  topicIds: string[]
}

export interface ContentIndex {
  generatedAt: string
  tracks: Track[]
  paths: LearningPath[]
  topics: TopicMeta[]
  cheatsheets: CheatsheetMeta[]
  interviewQuestions: InterviewQuestion[]
  practiceItems: PracticeItem[]
}

export interface PracticeAttempt {
  itemId: string
  correct: boolean
  at: string
}

export interface FlashcardState {
  box: number
  dueAt: string
  lastReviewedAt?: string
}

export interface UserData {
  schemaVersion: number
  progress: Record<string, ProgressStatus>
  bookmarks: string[]
  favorites: string[]
  questionBookmarks: string[]
  flashcardBookmarks: string[]
  notes: Record<string, string>
  practiceAttempts: PracticeAttempt[]
  flashcardStates: Record<string, FlashcardState>
  interviewReview: Record<string, 'confident' | 'needs-review'>
  recentlyViewed: string[]
  activityDates: string[]
  interviewDate: string | null
  lastExportedAt: string | null
  settings: {
    theme: 'light' | 'dark' | 'system'
    fontSize: 'small' | 'medium' | 'large'
    width: 'narrow' | 'wide'
    reducedMotion: boolean
  }
}

export const EMPTY_USER_DATA: UserData = {
  schemaVersion: 1,
  progress: {},
  bookmarks: [],
  favorites: [],
  questionBookmarks: [],
  flashcardBookmarks: [],
  notes: {},
  practiceAttempts: [],
  flashcardStates: {},
  interviewReview: {},
  recentlyViewed: [],
  activityDates: [],
  interviewDate: null,
  lastExportedAt: null,
  settings: { theme: 'system', fontSize: 'medium', width: 'wide', reducedMotion: false },
}
