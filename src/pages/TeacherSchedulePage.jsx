import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useSchedule } from '../context/ScheduleContext';
import { useAuth } from '../context/AuthContext';
import { REAL_SCHEDULE } from '../data/mockData';
import { loadHomeworkChecks, loadHomeworkRates, loadLessonTypes, loadTeacherRates } from '../lib/api';
import { loadInvitations, respondToInvitation } from '../lib/api';
import { UserCheck, Mail, Check, X, Clock } from 'lucide-react';

const WEEKDAYS = ['Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница'];
const WEEKDAY_SHORT = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт'];
const DAY_INDEX_TO_NAME = [null, 'Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', null, null];

const DEFAULT_LESSON_TYPE = 'Групповой';

// Цветовая схема для типов уроков
const LESSON_TYPE_COLORS = {
    'Групповой': { bg: 'var(--color-moss-soft)', text: 'var(--color-primary-deep)' },
    'Индивидуальный': { bg: '#fef3c7', text: '#92400e' },
    'ОГЭ': { bg: '#ede9fe', text: '#6b21a8' },
    'ЕГЭ': { bg: '#ffe4e6', text: '#9f1239' },
    'Тьюторский': { bg: '#d1fae5', text: '#065f46' },
};

// Считает кол-во каждого рабочего дня в диапазоне дат
const getWeekdayCounts = (start, end) => {
    const counts = {};
    WEEKDAYS.forEach(d => counts[d] = 0);
    const current = new Date(start + 'T00:00:00');
    const endD = new Date(end + 'T00:00:00');
    while (current <= endD) {
        const name = DAY_INDEX_TO_NAME[current.getDay()];
        if (name) counts[name]++;
        current.setDate(current.getDate() + 1);
    }
    return counts;
};

// Генерирует список рабочих дат в диапазоне
const getWorkingDates = (start, end) => {
    const dates = [];
    const current = new Date(start + 'T00:00:00');
    const endD = new Date(end + 'T00:00:00');
    while (current <= endD) {
        const dow = current.getDay();
        if (dow >= 1 && dow <= 5) {
            dates.push({
                date: new Date(current),
                dayName: DAY_INDEX_TO_NAME[dow]
            });
        }
        current.setDate(current.getDate() + 1);
    }
    return dates;
};

const TeacherSchedulePage = () => {
    const { teachers, bellSchedule } = useSchedule();
    const { isAdmin, isTeacher, currentUser } = useAuth();
    const [selectedTeacherId, setSelectedTeacherId] = useState(
        isTeacher && currentUser?.teacherId ? String(currentUser.teacherId) : ''
    );

    // Lock to current teacher in teacher mode
    useEffect(() => {
        if (isTeacher && currentUser?.teacherId) {
            setSelectedTeacherId(String(currentUser.teacherId));
        }
    }, [isTeacher, currentUser]);
    const [startDate, setStartDate] = useState(() => {
        const now = new Date();
        return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
    });
    const [endDate, setEndDate] = useState(() => {
        const now = new Date();
        const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        return lastDay.toISOString().split('T')[0];
    });
    const [selectedTimeSlots, setSelectedTimeSlots] = useState('all');

    // Async-loaded data from Supabase
    const [homeworkChecks, setHomeworkChecks] = useState({});
    const [homeworkRates, setHomeworkRates] = useState({});
    const [lessonTypes, setLessonTypes] = useState({});
    const [teacherRatesMap, setTeacherRatesMap] = useState({});
    const [invitations, setInvitations] = useState([]);

    useEffect(() => {
        Promise.all([
            loadHomeworkChecks().catch(() => ({})),
            loadHomeworkRates().catch(() => ({})),
            loadLessonTypes().catch(() => ({})),
            loadTeacherRates().catch(() => ({})),
            loadInvitations().catch(() => []),
        ]).then(([checks, hwRates, types, tRates, invs]) => {
            setHomeworkChecks(checks);
            setHomeworkRates(hwRates);
            setLessonTypes(types);
            setTeacherRatesMap(tRates);
            setInvitations(invs);
        });
    }, []);

    // Pending invitations for current teacher
    const pendingInvitations = useMemo(() => {
        if (!isTeacher || !currentUser?.teacherId) return [];
        return invitations.filter(inv =>
            inv.teacherId === currentUser.teacherId && inv.status === 'pending'
        );
    }, [invitations, isTeacher, currentUser]);

    const handleRespond = useCallback(async (invId, newStatus) => {
        // Optimistic update
        const respondedAt = new Date().toISOString();
        setInvitations(prev => prev.map(inv =>
            inv.id === invId ? { ...inv, status: newStatus, respondedAt } : inv
        ));
        try {
            await respondToInvitation(invId, newStatus);
        } catch (err) {
            console.error('Failed to respond', err);
            // rollback
            setInvitations(prev => prev.map(inv =>
                inv.id === invId ? { ...inv, status: 'pending', respondedAt: null } : inv
            ));
        }
    }, []);

    const selectedTeacher = teachers.find(t => t.id === Number(selectedTeacherId));

    // Ставка учителя из Supabase (с fallback 500)
    const teacherRate = useMemo(() => {
        if (!selectedTeacher) return 500;
        const r = teacherRatesMap[selectedTeacher.id];
        if (r === undefined || r === null) return 500;
        // New shape: { base, sonastroyka, ... } — fall back to old shape (raw number) for safety
        if (typeof r === 'object') return r.base ?? 500;
        return r;
    }, [selectedTeacher, teacherRatesMap]);

    // Строим недельное расписание учителя из REAL_SCHEDULE
    // Структура: { "09:00-09:45": { "Понедельник": [{subject, grade}], ... }, ... }
    const weeklySchedule = useMemo(() => {
        if (!selectedTeacher) return {};

        const lastName = selectedTeacher.name.split(' ')[0];
        const schedule = {};

        Object.entries(REAL_SCHEDULE).forEach(([className, days]) => {
            Object.entries(days).forEach(([dayName, lessons]) => {
                if (!WEEKDAYS.includes(dayName)) return;

                lessons.forEach(lesson => {
                    if (lesson.teacher === lastName) {
                        if (!schedule[lesson.time]) {
                            schedule[lesson.time] = {};
                        }
                        if (!schedule[lesson.time][dayName]) {
                            schedule[lesson.time][dayName] = [];
                        }
                        schedule[lesson.time][dayName].push({
                            subject: lesson.subject,
                            grade: className
                        });
                    }
                });
            });
        });

        return schedule;
    }, [selectedTeacher]);

    // Сортируем временные слоты по порядку из расписания звонков
    const allTimeSlots = useMemo(() => {
        const bellTimes = bellSchedule.map(b => `${b.startTime}-${b.endTime}`);
        const scheduleTimes = Object.keys(weeklySchedule);
        const allTimes = [...new Set([...bellTimes, ...scheduleTimes])];
        return allTimes.filter(t => scheduleTimes.includes(t));
    }, [weeklySchedule, bellSchedule]);

    // Фильтруем по выбранному времени
    const timeSlots = useMemo(() => {
        if (selectedTimeSlots === 'all') return allTimeSlots;
        return allTimeSlots.filter(t => t === selectedTimeSlots);
    }, [allTimeSlots, selectedTimeSlots]);

    // Получаем лейбл из расписания звонков (например "1 урок")
    const getBellLabel = (timeStr) => {
        const [start] = timeStr.split('-');
        const bell = bellSchedule.find(b => b.startTime === start);
        return bell ? bell.label : '';
    };

    // Считаем общее количество уроков в неделю
    const totalLessonsPerWeek = useMemo(() => {
        let count = 0;
        Object.values(weeklySchedule).forEach(days => {
            Object.values(days).forEach(lessons => {
                count += lessons.length;
            });
        });
        return count;
    }, [weeklySchedule]);

    // Считаем уроки и оплату за выбранный период
    const periodStats = useMemo(() => {
        const counts = getWeekdayCounts(startDate, endDate);
        let totalLessons = 0;
        Object.values(weeklySchedule).forEach(days => {
            Object.entries(days).forEach(([dayName, lessons]) => {
                totalLessons += lessons.length * (counts[dayName] || 0);
            });
        });
        // Homework checks for this teacher in the date range
        let hwCount = 0;
        let hwRate = 0;
        if (selectedTeacher) {
            const tid = String(selectedTeacher.id);
            hwRate = homeworkRates[tid] || 0;
            const teacherHw = homeworkChecks[tid] || {};
            Object.entries(teacherHw).forEach(([date, count]) => {
                if (date >= startDate && date <= endDate) hwCount += count;
            });
        }
        const hwPayment = hwCount * hwRate;
        return { totalLessons, lessonsPayment: totalLessons * teacherRate, hwCount, hwRate, hwPayment, totalPayment: totalLessons * teacherRate + hwPayment };
    }, [weeklySchedule, teacherRate, startDate, endDate, selectedTeacher, homeworkChecks, homeworkRates]);

    // Генерируем детальную выписку по датам
    const detailedReport = useMemo(() => {
        if (!selectedTeacher) return [];
        const workingDates = getWorkingDates(startDate, endDate);
        const tid = String(selectedTeacher.id);
        const teacherHw = homeworkChecks[tid] || {};
        const hwRate = homeworkRates[tid] || 0;
        const lastName = selectedTeacher.name.split(' ')[0];
        const rows = [];

        workingDates.forEach(({ date, dayName }) => {
            const dateStr = date.toISOString().split('T')[0];
            const dayLessons = [];
            // Собираем все уроки в этот день (по всем временным слотам)
            const filteredSlots = selectedTimeSlots === 'all' ? allTimeSlots : allTimeSlots.filter(t => t === selectedTimeSlots);
            filteredSlots.forEach(time => {
                const lessons = weeklySchedule[time]?.[dayName] || [];
                lessons.forEach(l => {
                    const typeKey = `${l.grade}_${dayName}_${time}_${lastName}`;
                    const lessonType = lessonTypes[typeKey] || DEFAULT_LESSON_TYPE;
                    dayLessons.push({
                        time,
                        subject: l.subject,
                        grade: l.grade,
                        type: lessonType
                    });
                });
            });

            const hwCount = teacherHw[dateStr] || 0;
            const lessonsTotal = dayLessons.length * teacherRate;
            const hwTotal = hwCount * hwRate;

            if (dayLessons.length > 0 || hwCount > 0) {
                rows.push({
                    date,
                    dayName,
                    lessons: dayLessons,
                    count: dayLessons.length,
                    rate: teacherRate,
                    hwCount,
                    hwRate,
                    hwTotal,
                    total: lessonsTotal + hwTotal
                });
            }
        });

        return rows;
    }, [selectedTeacher, weeklySchedule, teacherRate, startDate, endDate, allTimeSlots, selectedTimeSlots, homeworkChecks, homeworkRates, lessonTypes]);

    return (
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
            <div style={{ marginBottom: '1.5rem' }}>
                <h1 style={{ margin: 0, fontSize: '1.8rem' }}>
                    Расписание учителя
                </h1>
            </div>

            {/* Pending invitations panel — only for teacher view */}
            {isTeacher && pendingInvitations.length > 0 && (
                <div className="card" style={{
                    marginBottom: '1.5rem',
                    padding: '1rem 1.25rem',
                    borderLeft: '4px solid var(--color-warning)',
                    backgroundColor: 'var(--color-warning-bg)',
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                        <Mail size={20} color="var(--color-warning)" />
                        <h3 style={{ margin: 0, fontSize: '1.05rem', color: 'var(--color-warning)' }}>
                            Новые приглашения ({pendingInvitations.length})
                        </h3>
                    </div>
                    <p style={{ margin: '0 0 12px', fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
                        Подтвердите или отклоните занятие. После подтверждения слот будет занят.
                    </p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {pendingInvitations.map(inv => (
                            <div key={inv.id} style={{
                                backgroundColor: 'var(--color-bg-card)',
                                border: '1px solid var(--color-border)',
                                borderRadius: 'var(--radius)',
                                padding: '12px 14px',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                gap: '10px',
                                flexWrap: 'wrap'
                            }}>
                                <div style={{ flex: 1, minWidth: '220px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.82rem', color: 'var(--color-text-muted)', marginBottom: '4px' }}>
                                        <Clock size={13} />
                                        <span>{new Date(inv.date + 'T00:00:00').toLocaleDateString('ru-RU', { weekday: 'short', day: '2-digit', month: '2-digit' })} · {inv.time}</span>
                                    </div>
                                    <div style={{ fontWeight: 600, color: 'var(--color-primary-deep)' }}>
                                        {inv.subject} · <span style={{ color: 'var(--color-text-muted)', fontWeight: 500 }}>{inv.grade}</span>
                                    </div>
                                    {inv.note && (
                                        <div style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)', marginTop: '4px' }}>
                                            💬 {inv.note}
                                        </div>
                                    )}
                                </div>
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    <button
                                        onClick={() => handleRespond(inv.id, 'accepted')}
                                        className="btn"
                                        style={{
                                            display: 'flex', alignItems: 'center', gap: '6px',
                                            padding: '8px 14px',
                                            backgroundColor: 'var(--color-success)',
                                            color: '#fff',
                                            border: 'none',
                                            fontSize: '0.85rem',
                                            fontWeight: 600
                                        }}
                                    >
                                        <Check size={14} /> Принять
                                    </button>
                                    <button
                                        onClick={() => handleRespond(inv.id, 'declined')}
                                        className="btn"
                                        style={{
                                            display: 'flex', alignItems: 'center', gap: '6px',
                                            padding: '8px 14px',
                                            backgroundColor: 'var(--color-bg-card)',
                                            color: 'var(--color-danger)',
                                            border: '1px solid var(--color-danger-border)',
                                            fontSize: '0.85rem',
                                            fontWeight: 600
                                        }}
                                    >
                                        <X size={14} /> Отклонить
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Выбор учителя и фильтры */}
            <div className="card" style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                <UserCheck size={20} />
                <label htmlFor="teacher-select" style={{ fontWeight: 500 }}>
                    Выберите учителя:
                </label>
                <select
                    id="teacher-select"
                    value={selectedTeacherId}
                    onChange={(e) => setSelectedTeacherId(e.target.value)}
                    disabled={isTeacher}
                    style={{
                        padding: '8px 12px', borderRadius: '8px',
                        border: '2px solid #e5e7eb', fontSize: '14px',
                        fontWeight: '500',
                        cursor: isTeacher ? 'not-allowed' : 'pointer',
                        backgroundColor: isTeacher ? '#f1f5f9' : '#fff',
                        minWidth: '250px'
                    }}
                >
                    <option value="">-- Выберите --</option>
                    {(isTeacher ? teachers.filter(t => t.id === currentUser?.teacherId) : teachers).map(t => (
                        <option key={t.id} value={t.id}>
                            {t.name} ({t.subject})
                        </option>
                    ))}
                </select>

                {selectedTeacher && (
                    <>
                        <span style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>
                            Уроков в неделю: <strong>{totalLessonsPerWeek}</strong>
                        </span>
                        <span style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>
                            Ставка: <strong>{teacherRate} ₽</strong>
                        </span>
                        <span style={{ fontSize: '0.9rem', color: '#059669', fontWeight: 600 }}>
                            За период: <strong>{periodStats.totalPayment.toLocaleString()} ₽</strong>
                            <span style={{ fontWeight: 400, color: 'var(--color-text-muted)', marginLeft: '4px' }}>
                                ({periodStats.totalLessons} ур.{periodStats.hwCount > 0 ? ` + ${periodStats.hwCount} ДЗ` : ''})
                            </span>
                        </span>
                    </>
                )}

                {/* Фильтры по дате и времени */}
                {selectedTeacher && (
                    <>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem' }}>
                            <label htmlFor="time-filter" style={{ fontWeight: 500 }}>⏰ Урок:</label>
                            <select
                                id="time-filter"
                                value={selectedTimeSlots}
                                onChange={(e) => setSelectedTimeSlots(e.target.value)}
                                style={{
                                    padding: '6px 8px', borderRadius: '6px',
                                    border: '1px solid #e5e7eb', fontSize: '0.85rem',
                                    cursor: 'pointer', minWidth: '140px'
                                }}
                            >
                                <option value="all">Все уроки</option>
                                {allTimeSlots.map(time => (
                                    <option key={time} value={time}>
                                        {getBellLabel(time)} ({time})
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem' }}>
                            <label htmlFor="start-date" style={{ fontWeight: 500 }}>С:</label>
                            <input
                                id="start-date"
                                type="date"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                                style={{
                                    padding: '6px 8px', borderRadius: '6px',
                                    border: '1px solid #e5e7eb', fontSize: '0.85rem'
                                }}
                            />
                            <label htmlFor="end-date" style={{ fontWeight: 500 }}>По:</label>
                            <input
                                id="end-date"
                                type="date"
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                                style={{
                                    padding: '6px 8px', borderRadius: '6px',
                                    border: '1px solid #e5e7eb', fontSize: '0.85rem'
                                }}
                            />
                        </div>
                    </>
                )}
            </div>

            {/* Таблица расписания */}
            {selectedTeacher && timeSlots.length > 0 ? (
                <div className="card" style={{ overflowX: 'auto', padding: '0' }}>
                    <table style={{
                        width: '100%', borderCollapse: 'collapse',
                        fontSize: '0.9rem'
                    }}>
                        <thead>
                            <tr style={{ backgroundColor: '#f8fafc' }}>
                                <th style={{
                                    padding: '12px', textAlign: 'left',
                                    borderBottom: '2px solid #e2e8f0', minWidth: '120px'
                                }}>
                                    Время
                                </th>
                                {WEEKDAYS.map((day, i) => (
                                    <th key={day} style={{
                                        padding: '12px', textAlign: 'center',
                                        borderBottom: '2px solid #e2e8f0', minWidth: '150px'
                                    }}>
                                        {WEEKDAY_SHORT[i]}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {timeSlots.map(time => (
                                <tr key={time}>
                                    <td style={{
                                        padding: '10px 12px',
                                        borderBottom: '1px solid #e2e8f0',
                                        fontWeight: 500, whiteSpace: 'nowrap',
                                        backgroundColor: '#f8fafc'
                                    }}>
                                        <div>{getBellLabel(time)}</div>
                                        <div style={{
                                            fontSize: '0.8rem',
                                            color: 'var(--color-text-muted)'
                                        }}>
                                            {time}
                                        </div>
                                    </td>
                                    {WEEKDAYS.map(day => {
                                        const lessons = weeklySchedule[time]?.[day] || [];
                                        const payment = lessons.length * teacherRate;
                                        return (
                                            <td key={day} style={{
                                                padding: '8px 12px',
                                                borderBottom: '1px solid #e2e8f0',
                                                textAlign: 'center',
                                                backgroundColor: lessons.length > 0 ? '#f0fdf4' : 'transparent'
                                            }}>
                                                {lessons.map((l, i) => (
                                                    <div key={i} style={{
                                                        padding: '4px 8px',
                                                        borderRadius: '6px',
                                                        backgroundColor: lessons.length > 1 ? 'var(--color-moss-soft)' : 'transparent',
                                                        marginBottom: i < lessons.length - 1 ? '4px' : 0
                                                    }}>
                                                        <div style={{ fontWeight: 500 }}>{l.subject}</div>
                                                        <div style={{
                                                            fontSize: '0.8rem',
                                                            color: 'var(--color-text-muted)'
                                                        }}>
                                                            {l.grade}
                                                        </div>
                                                    </div>
                                                ))}
                                                {lessons.length > 0 && (
                                                    <div style={{
                                                        fontSize: '0.7rem',
                                                        color: '#059669',
                                                        fontWeight: '600',
                                                        marginTop: '4px',
                                                        paddingTop: '4px',
                                                        borderTop: '1px solid #d1fae5'
                                                    }}>
                                                        {payment} ₽
                                                    </div>
                                                )}
                                            </td>
                                        );
                                    })}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            ) : selectedTeacher ? (
                <div className="card" style={{ textAlign: 'center', padding: '3rem', color: 'var(--color-text-muted)' }}>
                    У этого учителя нет уроков в расписании
                </div>
            ) : (
                <div className="card" style={{ textAlign: 'center', padding: '3rem', color: 'var(--color-text-muted)' }}>
                    Выберите учителя, чтобы увидеть расписание
                </div>
            )}

            {/* Детальная выписка по датам */}
            {selectedTeacher && detailedReport.length > 0 && (
                <div className="card" style={{ marginTop: '1.5rem', padding: 0 }}>
                    <div style={{ padding: '16px 16px 8px', borderBottom: '2px solid #e2e8f0' }}>
                        <h3 style={{ margin: 0, fontSize: '1.1rem' }}>
                            Выписка за период ({new Date(startDate + 'T00:00:00').toLocaleDateString('ru-RU')} — {new Date(endDate + 'T00:00:00').toLocaleDateString('ru-RU')})
                        </h3>
                    </div>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                        <thead>
                            <tr style={{ backgroundColor: '#f8fafc' }}>
                                <th style={{ padding: '10px 12px', textAlign: 'left', borderBottom: '1px solid #e2e8f0' }}>Дата</th>
                                <th style={{ padding: '10px 12px', textAlign: 'left', borderBottom: '1px solid #e2e8f0' }}>Уроки</th>
                                <th style={{ padding: '10px 12px', textAlign: 'center', borderBottom: '1px solid #e2e8f0' }}>Тип</th>
                                <th style={{ padding: '10px 12px', textAlign: 'center', borderBottom: '1px solid #e2e8f0' }}>Кол-во</th>
                                <th style={{ padding: '10px 12px', textAlign: 'center', borderBottom: '1px solid #e2e8f0' }}>Ставка</th>
                                <th style={{ padding: '10px 12px', textAlign: 'center', borderBottom: '1px solid #e2e8f0' }}>ДЗ</th>
                                <th style={{ padding: '10px 12px', textAlign: 'right', borderBottom: '1px solid #e2e8f0' }}>Итого</th>
                            </tr>
                        </thead>
                        <tbody>
                            {detailedReport.map((row, idx) => (
                                <tr key={idx} style={{ backgroundColor: idx % 2 === 0 ? '#fff' : '#f9fafb' }}>
                                    <td style={{ padding: '10px 12px', borderBottom: '1px solid #f1f5f9', whiteSpace: 'nowrap' }}>
                                        <div style={{ fontWeight: 500 }}>
                                            {row.date.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                                        </div>
                                        <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                                            {WEEKDAY_SHORT[WEEKDAYS.indexOf(row.dayName)]}
                                        </div>
                                    </td>
                                    <td style={{ padding: '10px 12px', borderBottom: '1px solid #f1f5f9' }}>
                                        {row.lessons.map((l, i) => (
                                            <div key={i} style={{ marginBottom: i < row.lessons.length - 1 ? '2px' : 0 }}>
                                                <span style={{ fontWeight: 500 }}>{l.subject}</span>
                                                <span style={{ color: 'var(--color-text-muted)', marginLeft: '6px' }}>({l.grade})</span>
                                                <span style={{ color: '#6b7280', marginLeft: '6px', fontSize: '0.8rem' }}>{l.time}</span>
                                            </div>
                                        ))}
                                    </td>
                                    <td style={{ padding: '10px 12px', borderBottom: '1px solid #f1f5f9', textAlign: 'center' }}>
                                        {row.lessons.map((l, i) => {
                                            const colors = LESSON_TYPE_COLORS[l.type] || LESSON_TYPE_COLORS[DEFAULT_LESSON_TYPE];
                                            return (
                                                <div key={i} style={{ marginBottom: i < row.lessons.length - 1 ? '2px' : 0 }}>
                                                    <span style={{
                                                        padding: '2px 8px', borderRadius: '4px', fontSize: '0.75rem',
                                                        backgroundColor: colors.bg,
                                                        color: colors.text,
                                                        fontWeight: 500
                                                    }}>
                                                        {l.type}
                                                    </span>
                                                </div>
                                            );
                                        })}
                                    </td>
                                    <td style={{ padding: '10px 12px', borderBottom: '1px solid #f1f5f9', textAlign: 'center', fontWeight: 500 }}>
                                        {row.count}
                                    </td>
                                    <td style={{ padding: '10px 12px', borderBottom: '1px solid #f1f5f9', textAlign: 'center' }}>
                                        {row.rate} ₽
                                    </td>
                                    <td style={{ padding: '10px 12px', borderBottom: '1px solid #f1f5f9', textAlign: 'center' }}>
                                        {row.hwCount > 0 ? (
                                            <span style={{ color: '#7c3aed', fontWeight: 500 }}>
                                                {row.hwCount} шт.
                                                {row.hwRate > 0 && <span style={{ fontSize: '0.75rem', color: '#6b7280' }}> ({row.hwTotal} ₽)</span>}
                                            </span>
                                        ) : '—'}
                                    </td>
                                    <td style={{ padding: '10px 12px', borderBottom: '1px solid #f1f5f9', textAlign: 'right', fontWeight: 600, color: '#059669' }}>
                                        {row.total.toLocaleString()} ₽
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                        <tfoot>
                            <tr style={{ backgroundColor: '#f0fdf4' }}>
                                <td colSpan={3} style={{ padding: '12px', fontWeight: 600, borderTop: '2px solid #e2e8f0' }}>
                                    Итого за период
                                </td>
                                <td style={{ padding: '12px', textAlign: 'center', fontWeight: 600, borderTop: '2px solid #e2e8f0' }}>
                                    {periodStats.totalLessons}
                                </td>
                                <td style={{ padding: '12px', textAlign: 'center', borderTop: '2px solid #e2e8f0' }}>
                                    {teacherRate} ₽
                                </td>
                                <td style={{ padding: '12px', textAlign: 'center', fontWeight: 600, borderTop: '2px solid #e2e8f0', color: '#7c3aed' }}>
                                    {periodStats.hwCount > 0 ? `${periodStats.hwCount} шт.` : '—'}
                                </td>
                                <td style={{ padding: '12px', textAlign: 'right', fontWeight: 700, fontSize: '1rem', color: '#059669', borderTop: '2px solid #e2e8f0' }}>
                                    {periodStats.totalPayment.toLocaleString()} ₽
                                </td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
            )}
        </div>
    );
};

export default TeacherSchedulePage;
