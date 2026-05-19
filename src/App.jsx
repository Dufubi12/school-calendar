import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { ScheduleProvider } from './context/ScheduleContext'
import { AuthProvider, useAuth } from './context/AuthContext'
import { ToastProvider } from './context/ToastContext'
import Layout from './components/Layout'
import LoginPage from './pages/LoginPage'
import TeacherLinkPage from './pages/TeacherLinkPage'
import CalendarPage from './pages/CalendarPage'
import TeachersPage from './pages/TeachersPage'
import StatisticsPage from './pages/StatisticsPage'
import ScheduleOptimizationPage from './pages/ScheduleOptimizationPage'
import TeacherSchedulePage from './pages/TeacherSchedulePage'
import HomeworkCheckPage from './pages/HomeworkCheckPage'
import TeacherAvailabilityPage from './pages/TeacherAvailabilityPage'
import InvitationsPage from './pages/InvitationsPage'
import LessonTypesPage from './pages/LessonTypesPage'
import IndividualSlotsPage from './pages/IndividualSlotsPage'
import ExtraPayPage from './pages/ExtraPayPage'
import SchoolLessonsPage from './pages/SchoolLessonsPage'
import './App.css'

const AdminOnly = ({ children }) => {
    const { isAdmin } = useAuth();
    return isAdmin ? children : <Navigate to="/teacher-schedule" replace />;
};

const FullPageMessage = ({ children }) => (
    <div style={{
        minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
        backgroundColor: '#f8fafc', color: '#64748b', fontSize: '0.95rem'
    }}>{children}</div>
);

const AuthenticatedRoutes = () => {
    const { session, profile, loading, isAdmin, needsTeacherLink } = useAuth();

    if (loading) return <FullPageMessage>Загрузка…</FullPageMessage>;
    if (!session) return <LoginPage />;
    if (!profile) return <FullPageMessage>Подготовка профиля…</FullPageMessage>;
    if (needsTeacherLink) return <TeacherLinkPage />;

    return (
        <Routes>
            <Route element={<Layout />}>
                <Route path="/" element={isAdmin ? <CalendarPage /> : <Navigate to="/teacher-schedule" replace />} />
                <Route path="/substitutions" element={<AdminOnly><CalendarPage /></AdminOnly>} />
                <Route path="/teachers" element={<AdminOnly><TeachersPage /></AdminOnly>} />
                <Route path="/statistics" element={<AdminOnly><StatisticsPage /></AdminOnly>} />
                <Route path="/optimization" element={<AdminOnly><ScheduleOptimizationPage /></AdminOnly>} />
                <Route path="/lesson-types" element={<AdminOnly><LessonTypesPage /></AdminOnly>} />
                <Route path="/teacher-schedule" element={<TeacherSchedulePage />} />
                <Route path="/homework" element={<HomeworkCheckPage />} />
                <Route path="/extra-pay" element={<ExtraPayPage />} />
                <Route path="/availability" element={<TeacherAvailabilityPage />} />
                <Route path="/individual-slots" element={<IndividualSlotsPage />} />
                <Route path="/invitations" element={<AdminOnly><InvitationsPage /></AdminOnly>} />
                <Route path="/school-lessons" element={<AdminOnly><SchoolLessonsPage /></AdminOnly>} />
                <Route path="*" element={<Navigate to={isAdmin ? "/" : "/teacher-schedule"} replace />} />
            </Route>
        </Routes>
    );
};

function App() {
    return (
        <ToastProvider>
            <AuthProvider>
                <ScheduleProvider>
                    <BrowserRouter>
                        <AuthenticatedRoutes />
                    </BrowserRouter>
                </ScheduleProvider>
            </AuthProvider>
        </ToastProvider>
    );
}

export default App
