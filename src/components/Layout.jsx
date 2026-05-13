import { Outlet, Link, useLocation } from 'react-router-dom';
import { Calendar, Users, BarChart3, Wrench, UserCheck, ClipboardCheck, LogOut, CalendarClock, Mail, Tag, GraduationCap } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const Layout = () => {
    const { currentUser, isAdmin, isTeacher, logout } = useAuth();
    const location = useLocation();

    const linkStyle = (path) => ({
        textDecoration: 'none',
        color: location.pathname === path ? '#2563eb' : 'inherit',
        fontWeight: location.pathname === path ? 600 : 400,
        display: 'flex', alignItems: 'center', gap: '0.25rem',
        padding: '4px 8px', borderRadius: '6px',
        backgroundColor: location.pathname === path ? '#eff6ff' : 'transparent'
    });

    return (
        <div className="layout-container" style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
            <header style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0.75rem 1.5rem',
                borderBottom: '1px solid #eee',
                gap: '1rem',
                flexWrap: 'wrap'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Calendar size={24} />
                    <h1 style={{ margin: 0, fontSize: '1.15rem' }}>School Calendar</h1>
                </div>
                <nav style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
                    {isAdmin && (
                        <>
                            <Link to="/" style={linkStyle('/')}>
                                <Calendar size={16} /> Календарь
                            </Link>
                            <Link to="/teachers" style={linkStyle('/teachers')}>
                                <Users size={16} /> Учителя
                            </Link>
                            <Link to="/teacher-schedule" style={linkStyle('/teacher-schedule')}>
                                <UserCheck size={16} /> Расписание учителя
                            </Link>
                            <Link to="/availability" style={linkStyle('/availability')}>
                                <CalendarClock size={16} /> Доступность
                            </Link>
                            <Link to="/individual-slots" style={linkStyle('/individual-slots')}>
                                <GraduationCap size={16} /> Инд. занятия
                            </Link>
                            <Link to="/invitations" style={linkStyle('/invitations')}>
                                <Mail size={16} /> Приглашения
                            </Link>
                            <Link to="/lesson-types" style={linkStyle('/lesson-types')}>
                                <Tag size={16} /> Типы уроков
                            </Link>
                            <Link to="/homework" style={linkStyle('/homework')}>
                                <ClipboardCheck size={16} /> Проверка ДЗ
                            </Link>
                            <Link to="/statistics" style={linkStyle('/statistics')}>
                                <BarChart3 size={16} /> Статистика
                            </Link>
                            <Link to="/optimization" style={linkStyle('/optimization')}>
                                <Wrench size={16} /> Оптимизация
                            </Link>
                        </>
                    )}
                    {isTeacher && (
                        <>
                            <Link to="/teacher-schedule" style={linkStyle('/teacher-schedule')}>
                                <UserCheck size={16} /> Моё расписание
                            </Link>
                            <Link to="/availability" style={linkStyle('/availability')}>
                                <CalendarClock size={16} /> Мои слоты
                            </Link>
                            <Link to="/individual-slots" style={linkStyle('/individual-slots')}>
                                <GraduationCap size={16} /> Инд. занятия
                            </Link>
                            <Link to="/invitations" style={linkStyle('/invitations')}>
                                <Mail size={16} /> Приглашения
                            </Link>
                            <Link to="/homework" style={linkStyle('/homework')}>
                                <ClipboardCheck size={16} /> Проверка ДЗ
                            </Link>
                        </>
                    )}
                </nav>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{ textAlign: 'right', fontSize: '0.85rem' }}>
                        <div style={{ fontWeight: 600, color: '#1e293b' }}>{currentUser?.name}</div>
                        <div style={{ color: '#64748b', fontSize: '0.75rem' }}>
                            {isAdmin ? 'методист' : 'педагог'}
                        </div>
                    </div>
                    <button
                        onClick={logout}
                        title="Выйти"
                        style={{
                            display: 'flex', alignItems: 'center', gap: '0.25rem',
                            padding: '6px 10px', borderRadius: '6px',
                            border: '1px solid #e2e8f0', backgroundColor: '#fff',
                            color: '#475569', fontSize: '0.85rem', cursor: 'pointer'
                        }}
                    >
                        <LogOut size={14} /> Выйти
                    </button>
                </div>
            </header>
            <main style={{ flex: 1, padding: '1.5rem', overflow: 'auto' }}>
                <Outlet />
            </main>
        </div>
    );
};

export default Layout;
