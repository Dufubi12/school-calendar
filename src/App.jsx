import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { ScheduleProvider } from './context/ScheduleContext'
import Layout from './components/Layout'
import CalendarPage from './pages/CalendarPage'
import TeachersPage from './pages/TeachersPage'
import StatisticsPage from './pages/StatisticsPage'
import ScheduleOptimizationPage from './pages/ScheduleOptimizationPage'
import TeacherSchedulePage from './pages/TeacherSchedulePage'
import './App.css'

function App() {
  return (
    <ScheduleProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route path="/" element={<CalendarPage />} />
            <Route path="/substitutions" element={<CalendarPage />} />
            <Route path="/teachers" element={<TeachersPage />} />
            <Route path="/statistics" element={<StatisticsPage />} />
            <Route path="/optimization" element={<ScheduleOptimizationPage />} />
            <Route path="/teacher-schedule" element={<TeacherSchedulePage />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </ScheduleProvider>
  )
}

export default App
