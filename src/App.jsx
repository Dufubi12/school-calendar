import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { ScheduleProvider } from './context/ScheduleContext'
import Layout from './components/Layout'
import CalendarPage from './pages/CalendarPage'
import TeachersPage from './pages/TeachersPage'
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
          </Route>
        </Routes>
      </BrowserRouter>
    </ScheduleProvider>
  )
}

export default App
