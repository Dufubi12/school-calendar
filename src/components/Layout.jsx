import { Outlet, Link, useLocation } from 'react-router-dom';
import { Calendar, Users, BarChart3, Wrench, GraduationCap } from 'lucide-react';

const navItems = [
    { path: '/', icon: Calendar, label: 'Календарь' },
    { path: '/teachers', icon: Users, label: 'Учителя' },
    { path: '/stats', icon: BarChart3, label: 'Статистика' },
    { path: '/optimization', icon: Wrench, label: 'Оптимизация' },
];

const Layout = () => {
    const location = useLocation();

    return (
        <div className="app-layout">
            <aside className="sidebar">
                <div className="sidebar-logo">
                    <GraduationCap size={28} />
                    <span className="sidebar-logo-text">Школьный<br />Календарь</span>
                </div>
                <nav className="sidebar-nav">
                    {navItems.map(({ path, icon: Icon, label }) => {
                        const isActive = location.pathname === path ||
                            (path === '/' && location.pathname === '/substitutions');
                        return (
                            <Link
                                key={path}
                                to={path}
                                className={`sidebar-link ${isActive ? 'sidebar-link--active' : ''}`}
                            >
                                <Icon size={20} />
                                <span>{label}</span>
                            </Link>
                        );
                    })}
                </nav>
                <div className="sidebar-footer">
                    <div className="sidebar-footer-text">2025-2026</div>
                </div>
            </aside>
            <main className="main-content">
                <Outlet />
            </main>
        </div>
    );
};

export default Layout;
