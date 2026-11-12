import React, { Suspense, lazy } from 'react'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { motion, MotionConfig } from 'framer-motion'
import { AppProvider } from './store/AppContext'
import { Layout } from './components/Layout'

// Page components are lazy-loaded (2026-11-04 polish) so the initial
// bundle stays small; the Suspense fallback below covers all routes.
const Home = lazy(() => import('./pages/Home').then(m => ({ default: m.Home })))
const LearnIndex = lazy(() => import('./pages/Learn').then(m => ({ default: m.LearnIndex })))
const TrackPage = lazy(() => import('./pages/Learn').then(m => ({ default: m.TrackPage })))
const TopicPage = lazy(() => import('./pages/Learn').then(m => ({ default: m.TopicPage })))
const InterviewIndex = lazy(() => import('./pages/Interview').then(m => ({ default: m.InterviewIndex })))
const InterviewQuestionPage = lazy(() => import('./pages/Interview').then(m => ({ default: m.InterviewQuestionPage })))
const Practice = lazy(() => import('./pages/Practice').then(m => ({ default: m.Practice })))
const CheatsheetsIndex = lazy(() => import('./pages/Cheatsheets').then(m => ({ default: m.CheatsheetsIndex })))
const CheatsheetPage = lazy(() => import('./pages/Cheatsheets').then(m => ({ default: m.CheatsheetPage })))
const Library = lazy(() => import('./pages/Library').then(m => ({ default: m.Library })))
const Settings = lazy(() => import('./pages/Settings').then(m => ({ default: m.Settings })))
const NotFound = lazy(() => import('./pages/Misc').then(m => ({ default: m.NotFound })))
const SearchPage = lazy(() => import('./pages/Misc').then(m => ({ default: m.SearchPage })))

function Page({ children }: { children: React.ReactNode }) {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.2 }}>
      {children}
    </motion.div>
  )
}

export default function App() {
  return (
    <AppProvider>
      {/* reducedMotion="user" makes the page fade respect the OS
          reduced-motion setting; the in-app toggle is handled by the
          [data-reduced-motion] CSS rule in index.css. Previously the
          fade ran regardless of either setting. */}
      <MotionConfig reducedMotion="user">
      <BrowserRouter>
        <Suspense fallback={<div style={{ padding: 24 }}>Loading Beanstack…</div>}>
          <Routes>
            <Route element={<Layout />}>
              <Route index element={<Page><Home /></Page>} />
              <Route path="learn" element={<Page><LearnIndex /></Page>} />
              <Route path="learn/:trackId" element={<Page><TrackPage /></Page>} />
              <Route path="learn/:trackId/:sectionId/:topicId" element={<Page><TopicPage /></Page>} />
              <Route path="interview" element={<Page><InterviewIndex /></Page>} />
              <Route path="interview/question/:questionId" element={<Page><InterviewQuestionPage /></Page>} />
              <Route path="practice" element={<Page><Practice /></Page>} />
              <Route path="cheatsheets" element={<Page><CheatsheetsIndex /></Page>} />
              <Route path="cheatsheets/:id" element={<Page><CheatsheetPage /></Page>} />
              <Route path="library" element={<Page><Library /></Page>} />
              <Route path="settings" element={<Page><Settings /></Page>} />
              <Route path="search" element={<Page><SearchPage /></Page>} />
              <Route path="*" element={<Page><NotFound /></Page>} />
            </Route>
          </Routes>
        </Suspense>
      </BrowserRouter>
      </MotionConfig>
    </AppProvider>
  )
}
