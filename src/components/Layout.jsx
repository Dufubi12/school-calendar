import { useEffect, useState, useRef } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { Calendar, Users, BarChart3, Wrench, UserCheck, ClipboardCheck, LogOut, CalendarClock, Mail, Tag, GraduationCap, Sprout, Wallet, CalendarDays } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { loadInvitations, countPendingIzSlots, countRecentIzDecisions } from '../lib/api';

const Layout = () => {
    const { currentUser, isAdmin, isTeacher, logout } = useAuth();
    const toast = useToast();
    const location = useLocation();
    const [pendingCount, setPendingCount] = useState(0);
    // For admin: count of recently answered (accepted/declined) invitations in last 24h
    const [adminRecentResponses, setAdminRecentResponses] = useState(0);
    // For admin: count of IZ slots currently in 'pending' approval status
    const [adminPendingIzSlots, setAdminPendingIzSlots] = useState(0);
    // For teacher: count of admin decisions on own IZ slots in last 24h
    const [teacherRecentIzDecisions, setTeacherRecentIzDecisions] = useState(0);

    // Previous values to detect *changes* (first poll establishes baseline, no toast)
    const prevRef = useRef({
        pending: null,
        adminResp: null,
        adminIz: null,
        teacherIzDec: null,
    });

    // Poll badges
    useEffect(() => {
        // Reset counters AND baseline when role context changes
        setPendingCount(0);
        setAdminRecentResponses(0);
        setAdminPendingIzSlots(0);
        setTeacherRecentIzDecisions(0);
        prevRef.current = { pending: null, adminResp: null, adminIz: null, teacherIzDec: null };

        if (!isTeacher && !isAdmin) return;
        let cancelled = false;
        const refresh = async () => {
            try {
                const invs = await loadInvitations();
                if (cancelled) return;
                const prev = prevRef.current;
                if (isTeacher && currentUser?.teacherId) {
                    const tid = currentUser.teacherId;
                    const count = (invs || []).filter(
                        inv => inv.teacherId === tid && inv.status === 'pending'
                    ).length;
                    if (prev.pending !== null && count > prev.pending) {
                        const delta = count - prev.pending;
                        toast.warning(
                            delta === 1
                                ? 'У вас новое приглашение'
                                : `У вас ${delta} новых приглашений`,
                            { title: 'Новое приглашение' }
                        );
                    }
                    prev.pending = count;
                    setPendingCount(count);

                    const izDec = await countRecentIzDecisions(tid, 24);
                    if (cancelled) return;
                    if (prev.teacherIzDec !== null && izDec > prev.teacherIzDec) {
                        toast.info('Админ принял решение по вашему слоту — проверьте «Инд. занятия»', {
                            title: 'Решение по слоту',
                        });
                    }
                    prev.teacherIzDec = izDec;
                    setTeacherRecentIzDecisions(izDec);
                }
                if (isAdmin) {
                    const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
                    const count = (invs || []).filter(
                        inv => inv.status !== 'pending'
                            && inv.respondedAt
                            && inv.respondedAt >= dayAgo
                    ).length;
                    if (prev.adminResp !== null && count > prev.adminResp) {
                        toast.info('Педагог ответил на приглашение — откройте «Приглашения»', {
                            title: 'Ответ педагога',
                        });
                    }
                    prev.adminResp = count;
                    setAdminRecentResponses(count);

                    const pendingIz = await countPendingIzSlots();
                    if (cancelled) return;
                    if (prev.adminIz !== null && pendingIz > prev.adminIz) {
                        toast.warning('Появились новые слоты на согласование в «Инд. занятиях»', {
                            title: 'Новые слоты',
                        });
                    }
                    prev.adminIz = pendingIz;
                    setAdminPendingIzSlots(pendingIz);
                }
            } catch { /* ignore */ }
        };
        refresh();
        const id = setInterval(refresh, 30000);
        const onFocus = () => refresh();
        window.addEventListener('focus', onFocus);
        return () => {
            cancelled = true;
            clearInterval(id);
            window.removeEventListener('focus', onFocus);
        };
    }, [isTeacher, isAdmin, currentUser, toast]);

    const linkStyle = (path) => {
        const active = location.pathname === path;
        return {
            textDecoration: 'none',
            color: active ? '#fff' : 'var(--color-text-main)',
            fontWeight: active ? 600 : 500,
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '8px 14px',
            borderRadius: 'var(--radius)',
            backgroundColor: active ? 'var(--color-primary)' : 'transparent',
            boxShadow: active ? 'var(--shadow-sm)' : 'none',
            transition: 'background-color var(--duration-fast) var(--ease-out), color var(--duration-fast) var(--ease-out), transform var(--duration-fast) var(--ease-out)',
            fontSize: '0.88rem',
            whiteSpace: 'nowrap'
        };
    };

    const adminLinks = [
        { to: '/', label: 'Календарь', icon: Calendar },
        { to: '/teachers', label: 'Учителя', icon: Users },
        { to: '/school-lessons', label: 'Уроки', icon: CalendarDays },
        { to: '/teacher-schedule', label: 'Расписание', icon: UserCheck },
        { to: '/availability', label: 'Доступность', icon: CalendarClock },
        { to: '/individual-slots', label: 'Инд. занятия', icon: GraduationCap },
        { to: '/invitations', label: 'Приглашения', icon: Mail },
        { to: '/lesson-types', label: 'Типы уроков', icon: Tag },
        { to: '/homework', label: 'Проверка ДЗ', icon: ClipboardCheck },
        { to: '/extra-pay', label: 'Доп. оплата', icon: Wallet },
        { to: '/statistics', label: 'Статистика', icon: BarChart3 },
        { to: '/optimization', label: 'Оптимизация', icon: Wrench },
    ];

    const teacherLinks = [
        { to: '/teacher-schedule', label: 'Моё расписание', icon: UserCheck },
        { to: '/availability', label: 'Мои слоты', icon: CalendarClock },
        { to: '/individual-slots', label: 'Инд. занятия', icon: GraduationCap },
        { to: '/homework', label: 'Проверка ДЗ', icon: ClipboardCheck },
        { to: '/extra-pay', label: 'Доп. оплата', icon: Wallet },
    ];

    const links = isAdmin ? adminLinks : teacherLinks;

    return (
        <div className="layout-container" style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
            <header style={{
                position: 'sticky',
                top: 0,
                zIndex: 50,
                backgroundColor: 'rgba(242, 247, 243, 0.85)',
                backdropFilter: 'blur(12px) saturate(140%)',
                WebkitBackdropFilter: 'blur(12px) saturate(140%)',
                borderBottom: '1px solid var(--color-border)',
                boxShadow: 'var(--shadow-xs)'
            }}>
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px 24px',
                    gap: '1rem',
                    flexWrap: 'wrap',
                    maxWidth: '1600px',
                    margin: '0 auto'
                }}>
                    {/* Brand */}
                    <Link to={isAdmin ? '/' : '/teacher-schedule'} style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '10px',
                        textDecoration: 'none',
                        color: 'var(--color-primary-deep)'
                    }}>
                        <div style={{
                            width: '36px',
                            height: '36px',
                            borderRadius: 'var(--radius)',
                            background: 'linear-gradient(135deg, var(--color-moss) 0%, var(--color-olive) 100%)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            boxShadow: 'var(--shadow-sm)'
                        }}>
                            <Sprout size={20} color="#fff" strokeWidth={2.4} />
                        </div>
                        <div>
                            <div style={{ fontSize: '1.05rem', fontWeight: 700, letterSpacing: '-0.01em', lineHeight: 1 }}>
                                School Calendar
                            </div>
                            <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', marginTop: '2px' }}>
                                Управление расписанием
                            </div>
                        </div>
                    </Link>

                    {/* Navigation */}
                    <nav style={{
                        display: 'flex',
                        gap: '4px',
                        flexWrap: 'wrap',
                        alignItems: 'center',
                        flex: 1,
                        justifyContent: 'center'
                    }}>
                        {links.map(({ to, label, icon: Icon }) => {
                            // Teacher: pending invitations on "Моё расписание"
                            // Teacher: recent admin decisions on "Инд. занятия"
                            // Admin: recent invitation responses on "Приглашения"
                            // Admin: pending IZ slots requiring review on "Инд. занятия"
                            let badge = null;
                            if (isAdmin && to === '/invitations' && adminRecentResponses > 0) {
                                badge = adminRecentResponses;
                            } else if (isAdmin && to === '/individual-slots' && adminPendingIzSlots > 0) {
                                badge = adminPendingIzSlots;
                            } else if (isTeacher && to === '/teacher-schedule' && pendingCount > 0) {
                                badge = pendingCount;
                            } else if (isTeacher && to === '/individual-slots' && teacherRecentIzDecisions > 0) {
                                badge = teacherRecentIzDecisions;
                            }
                            return (
                                <Link key={to} to={to} style={linkStyle(to)}>
                                    <Icon size={15} /> {label}
                                    {badge && (
                                        <span style={{
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            minWidth: '18px',
                                            height: '18px',
                                            padding: '0 5px',
                                            borderRadius: '999px',
                                            backgroundColor: 'var(--color-danger)',
                                            color: '#fff',
                                            fontSize: '0.7rem',
                                            fontWeight: 700,
                                            marginLeft: '2px'
                                        }}>
                                            {badge}
                                        </span>
                                    )}
                                </Link>
                            );
                        })}
                    </nav>

                    {/* User chip + logout */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            padding: '6px 12px 6px 8px',
                            borderRadius: 'var(--radius-pill)',
                            backgroundColor: 'var(--color-bg-card)',
                            border: '1px solid var(--color-border)'
                        }}>
                            <div style={{
                                width: '28px',
                                height: '28px',
                                borderRadius: '50%',
                                background: 'linear-gradient(135deg, var(--color-moss) 0%, var(--color-forest) 100%)',
                                color: '#fff',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '0.75rem',
                                fontWeight: 700
                            }}>
                                {(currentUser?.name || currentUser?.email || '?').slice(0, 1).toUpperCase()}
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.1 }}>
                                <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--color-text-main)' }}>
                                    {currentUser?.name || currentUser?.email}
                                </span>
                                <span style={{ fontSize: '0.68rem', color: 'var(--color-text-muted)' }}>
                                    {isAdmin ? 'методист' : 'педагог'}
                                </span>
                            </div>
                        </div>
                        <button
                            onClick={logout}
                            title="Выйти"
                            className="btn btn-ghost"
                            style={{ padding: '8px 10px' }}
                        >
                            <LogOut size={15} />
                        </button>
                    </div>
                </div>
            </header>

            <main style={{ flex: 1, padding: '24px', overflow: 'auto' }}>
                <div style={{ maxWidth: '1500px', margin: '0 auto' }}>
                    <Outlet />
                </div>
            </main>
        </div>
    );
};

export default Layout;
