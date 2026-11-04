import React, { Suspense } from 'react'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { motion } from 'framer-motion'
import { AppProvider } from './store/AppContext'
import { Layout } from './components/Layout'
import { Home } from './pages/Home'
import { LearnIndex, TrackPage, TopicPage } from './pages/Learn'
import { InterviewIndex, InterviewQuestionPage } from './pages/Interview'
import { Practice } from './pages/Practice'
import { CheatsheetsIndex, CheatsheetPage } from './pages/Cheatsheets'
import { Library } from './pages/Library'
import { Settings } from './pages/Settings'
import { NotFound, SearchPage } from './pages/Misc'

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
    </AppProvider>
  )
}
