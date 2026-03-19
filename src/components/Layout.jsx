import { Outlet, Link } from 'react-router-dom';
import { Calendar, Users, BarChart3, Wrench, UserCheck } from 'lucide-react';

const Layout = () => {
    return (
        <div className="layout-container" style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
            <header style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '1rem 2rem',
                borderBottom: '1px solid #eee'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Calendar size={24} />
                    <h1 style={{ margin: 0, fontSize: '1.25rem' }}>School Calendar</h1>
                </div>
                <nav style={{ display: 'flex', gap: '1.5rem' }}>
                    <Link to="/" style={{ textDecoration: 'none', color: 'inherit', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                        <Calendar size={18} /> Календарь
                    </Link>
                    <Link to="/teachers" style={{ textDecoration: 'none', color: 'inherit', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                        <Users size={18} /> Учителя
                    </Link>
                    <Link to="/teacher-schedule" style={{ textDecoration: 'none', color: 'inherit', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                        <UserCheck size={18} /> Расписание учителя
                    </Link>
                    <Link to="/statistics" style={{ textDecoration: 'none', color: 'inherit', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                        <BarChart3 size={18} /> Статистика
                    </Link>
                    <Link to="/optimization" style={{ textDecoration: 'none', color: 'inherit', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                        <Wrench size={18} /> Оптимизация
                    </Link>
                </nav>
            </header>
            <main style={{ flex: 1, padding: '2rem', overflow: 'auto' }}>
                <Outlet />
            </main>
        </div>
    );
};

export default Layout;
