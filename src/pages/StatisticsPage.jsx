import React, { useState, useMemo, useEffect } from 'react';
import { useSchedule } from '../context/ScheduleContext';
import { REAL_SCHEDULE } from '../data/mockData';
import { loadHomeworkChecks, loadHomeworkRates, loadLessonTypes, loadTeacherRates, saveTeacherRate } from '../lib/api';
import RoleFilterTabs, { filterByRole } from '../components/RoleFilterTabs';
import { computeForRange } from '../lib/extraPay';
import { fetchStore as loadExtraPayStore, DEFAULT_RATES as EP_DEFAULTS } from '../lib/extraPayApi';
import './StatisticsPage.css';

const DEFAULT_LESSON_TYPE = 'Групповой';
const WEEKDAYS_LIST = ['Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница'];

const LESSON_TYPE_COLORS = {
    'Групповой': { bg: 'var(--color-moss-soft)', text: 'var(--color-primary-deep)' },
    'Индивидуальный': { bg: '#fef3c7', text: '#92400e' },
    'ОГЭ': { bg: '#ede9fe', text: '#6b21a8' },
    'ЕГЭ': { bg: '#ffe4e6', text: '#9f1239' },
    'Тьюторский': { bg: '#d1fae5', text: '#065f46' },
};

const StatisticsPage = () => {
    const { teachers, getSlotsForDate } = useSchedule();
    const [roleFilter, setRoleFilter] = useState('all');

    // Date range for statistics
    const [startDate, setStartDate] = useState(() => {
        const now = new Date();
        return new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    });

    const [endDate, setEndDate] = useState(() => {
        const now = new Date();
        return new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
    });

    // Async-loaded data from Supabase
    const [teacherRates, setTeacherRates] = useState({});
    const [homeworkChecks, setHomeworkChecks] = useState({});
    const [homeworkRates, setHomeworkRates] = useState({});
    const [lessonTypes, setLessonTypes] = useState({});
    // Extra pay store (Supabase)
    const [extraPayStore, setExtraPayStore] = useState({
        rates: { ...EP_DEFAULTS },
        ratesPerTeacher: {},
        entries: {},
    });

    // Initial load + reload on window focus to pick up changes from Доп. оплата страница
    useEffect(() => {
        let cancelled = false;
        const reload = () => {
            loadExtraPayStore().then(s => { if (!cancelled) setExtraPayStore(s); });
        };
        reload();
        window.addEventListener('focus', reload);
        return () => { cancelled = true; window.removeEventListener('focus', reload); };
    }, []);

    useEffect(() => {
        Promise.all([
            loadTeacherRates().catch(() => ({})),
            loadHomeworkChecks().catch(() => ({})),
            loadHomeworkRates().catch(() => ({})),
            loadLessonTypes().catch(() => ({})),
        ]).then(([rates, checks, hwRates, types]) => {
            setTeacherRates(rates);
            setHomeworkChecks(checks);
            setHomeworkRates(hwRates);
            setLessonTypes(types);
        });
    }, []);

    // Подсчёт уроков по типам для каждого учителя (на основе недельного расписания)
    const typesByTeacher = useMemo(() => {
        const result = {};
        teachers.forEach(t => {
            const lastName = t.name.split(' ')[0];
            const counts = {};
            Object.entries(REAL_SCHEDULE).forEach(([className, days]) => {
                Object.entries(days).forEach(([dayName, lessons]) => {
                    if (!WEEKDAYS_LIST.includes(dayName)) return;
                    lessons.forEach(lesson => {
                        if (lesson.teacher !== lastName) return;
                        const key = `${className}_${dayName}_${lesson.time}_${lesson.teacher}`;
                        const type = lessonTypes[key] || DEFAULT_LESSON_TYPE;
                        counts[type] = (counts[type] || 0) + 1;
                    });
                });
            });
            result[t.id] = counts;
        });
        return result;
    }, [teachers, lessonTypes]);

    // Есть ли вообще размеченные типы (отличные от Групповой)
    const hasCustomTypes = useMemo(() => {
        return Object.keys(lessonTypes).length > 0;
    }, [lessonTypes]);

    // Default rate for new teachers or "set all"
    const [defaultRate, setDefaultRate] = useState(500);

    // Set rate for specific teacher (optimistic + persist)
    const setTeacherRate = (teacherId, rate) => {
        const prev = teacherRates;
        setTeacherRates(curr => ({ ...curr, [teacherId]: rate }));
        saveTeacherRate(teacherId, rate).catch(err => {
            console.error('Failed to save teacher rate', err);
            setTeacherRates(prev);
        });
    };

    // Apply default rate to all teachers (persist to DB for each)
    const applyDefaultRateToAll = async () => {
        const prev = teacherRates;
        const newRates = {};
        teachers.forEach(t => { newRates[t.id] = defaultRate; });
        setTeacherRates(newRates);
        try {
            await Promise.all(teachers.map(t => saveTeacherRate(t.id, defaultRate)));
        } catch (err) {
            console.error('Failed to apply default rate to all teachers', err);
            setTeacherRates(prev);
        }
    };

    // Calculate statistics for all teachers
    const teacherStats = useMemo(() => {
        const stats = [];
        const start = new Date(startDate);
        const end = new Date(endDate);

        teachers.forEach(teacher => {
            let lessonCount = 0;
            let totalHours = 0;

            // Iterate through each day in the date range
            for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
                const slots = getSlotsForDate(d);
                const teacherSlots = slots.filter(slot =>
                    slot.teacherId === teacher.id ||
                    (slot.teacherName && slot.teacherName.includes(teacher.name.split(' ')[0]))
                );

                lessonCount += teacherSlots.length;

                // Calculate hours
                teacherSlots.forEach(slot => {
                    if (slot.startTime && slot.endTime) {
                        const [startHour, startMin] = slot.startTime.split(':').map(Number);
                        const [endHour, endMin] = slot.endTime.split(':').map(Number);
                        const hours = (endHour * 60 + endMin - startHour * 60 - startMin) / 60;
                        totalHours += hours;
                    }
                });
            }

            const rate = teacherRates[teacher.id] !== undefined ? teacherRates[teacher.id] : defaultRate;
            const lessonPayment = lessonCount * rate;

            // Homework checks for this teacher in the date range
            let hwCount = 0;
            const tid = String(teacher.id);
            const teacherHw = homeworkChecks[tid] || {};
            Object.entries(teacherHw).forEach(([date, count]) => {
                if (date >= startDate && date <= endDate) hwCount += count;
            });
            const hwRate = homeworkRates[tid] !== undefined ? homeworkRates[tid] : 13;
            const hwPayment = hwCount * hwRate;

            // Extra pay (расписание + методичка) — суммируем по месяцам в выбранном диапазоне
            const fromPeriod = startDate.slice(0, 7);
            const toPeriod = endDate.slice(0, 7);
            const extra = computeForRange(extraPayStore, teacher.id, fromPeriod, toPeriod, teacher.name);

            stats.push({
                ...teacher,
                lessonCount,
                totalHours: totalHours.toFixed(1),
                payment: lessonPayment + hwPayment + extra.total,
                rate,
                hwCount,
                hwPayment,
                extraPay: extra.total,
                extraCycles: extra.totalCycles,
                extraAssembly: extra.totalAssembly,
                extraHours: extra.totalHours,
            });
        });

        // Sort by lesson count descending
        return stats.sort((a, b) => b.lessonCount - a.lessonCount);
    }, [teachers, startDate, endDate, teacherRates, defaultRate, getSlotsForDate, homeworkChecks, homeworkRates, extraPayStore]);

    // Apply role filter
    const filteredStats = useMemo(
        () => filterByRole(teacherStats, roleFilter),
        [teacherStats, roleFilter]
    );

    // Calculate totals
    const totals = useMemo(() => {
        return filteredStats.reduce((acc, stat) => ({
            lessons: acc.lessons + stat.lessonCount,
            hours: acc.hours + parseFloat(stat.totalHours),
            payment: acc.payment + stat.payment,
            hwCount: acc.hwCount + (stat.hwCount || 0),
            extraPay: acc.extraPay + (stat.extraPay || 0),
        }), { lessons: 0, hours: 0, payment: 0, hwCount: 0, extraPay: 0 });
    }, [filteredStats]);

    // Export to CSV
    const exportToCSV = () => {
        const headers = ['Учитель', 'Предмет', 'Количество уроков', 'Часов', 'Проверка ДЗ', 'Ставка', 'Зарплата'];
        const rows = filteredStats.map(stat => [
            stat.name,
            stat.subject,
            stat.lessonCount,
            stat.totalHours,
            stat.hwCount || 0,
            stat.rate,
            stat.payment
        ]);

        const csv = [
            headers.join(','),
            ...rows.map(row => row.join(','))
        ].join('\n');

        const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `statistics_${startDate}_${endDate}.csv`;
        link.click();
    };

    return (
        <div className="statistics-page">
            <div className="statistics-header">
                <h1>📊 Статистика учителей</h1>
                <p className="statistics-subtitle">
                    Подсчет уроков и расчет зарплаты
                </p>
            </div>

            {/* Filters */}
            <div className="statistics-filters">
                <div className="filter-group">
                    <label>
                        📅 Период с:
                        <input
                            type="date"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                        />
                    </label>
                    <label>
                        до:
                        <input
                            type="date"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                        />
                    </label>
                </div>

                <div className="filter-group">
                    <label>
                        💰 Ставка по умолчанию (руб):
                        <input
                            type="number"
                            value={defaultRate}
                            onChange={(e) => setDefaultRate(Number(e.target.value))}
                            min="0"
                            step="50"
                        />
                    </label>
                    <button className="btn btn-secondary" onClick={applyDefaultRateToAll}>
                        Применить ко всем
                    </button>
                </div>

                <button className="btn btn-primary" onClick={exportToCSV}>
                    📥 Экспорт в CSV
                </button>
            </div>

            <RoleFilterTabs
                value={roleFilter}
                onChange={setRoleFilter}
                counts={{
                    all: teacherStats.length,
                    teachers: filterByRole(teacherStats, 'teachers').length,
                    tutors: filterByRole(teacherStats, 'tutors').length,
                }}
            />

            {/* Summary Cards */}
            <div className="summary-cards">
                <div className="summary-card">
                    <div className="summary-icon">📚</div>
                    <div className="summary-value">{totals.lessons}</div>
                    <div className="summary-label">Всего уроков</div>
                </div>
                <div className="summary-card">
                    <div className="summary-icon">⏱️</div>
                    <div className="summary-value">{totals.hours.toFixed(1)}</div>
                    <div className="summary-label">Часов работы</div>
                </div>
                <div className="summary-card">
                    <div className="summary-icon">💵</div>
                    <div className="summary-value">{totals.payment.toLocaleString()} ₽</div>
                    <div className="summary-label">Общая сумма</div>
                </div>
            </div>

            {/* Statistics Table */}
            <div className="statistics-table-container">
                <table className="statistics-table">
                    <thead>
                        <tr>
                            <th>#</th>
                            <th>Учитель</th>
                            <th>Предмет</th>
                            <th>Классы</th>
                            <th>Уроков</th>
                            <th>Часов</th>
                            {hasCustomTypes && <th>Типы (нед.)</th>}
                            <th>ДЗ</th>
                            <th>Доп. оплата</th>
                            <th>Ставка (руб)</th>
                            <th>Зарплата</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredStats.map((stat, index) => (
                            <tr key={stat.id} className={stat.lessonCount === 0 ? 'no-lessons' : ''}>
                                <td>{index + 1}</td>
                                <td className="teacher-name">
                                    <strong>{stat.name}</strong>
                                </td>
                                <td>{stat.subject}</td>
                                <td>
                                    <div className="grade-badges">
                                        {stat.grades.map(grade => (
                                            <span key={grade} className="grade-badge">
                                                {grade}
                                            </span>
                                        ))}
                                    </div>
                                </td>
                                <td>
                                    <strong className={stat.lessonCount > 0 ? 'text-success' : 'text-muted'}>
                                        {stat.lessonCount}
                                    </strong>
                                </td>
                                <td>{stat.totalHours}</td>
                                {hasCustomTypes && (
                                    <td>
                                        {(() => {
                                            const counts = typesByTeacher[stat.id] || {};
                                            const entries = Object.entries(counts).filter(([, v]) => v > 0);
                                            if (entries.length === 0) return <span className="text-muted">—</span>;
                                            return (
                                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '3px' }}>
                                                    {entries.map(([type, count]) => {
                                                        const colors = LESSON_TYPE_COLORS[type] || LESSON_TYPE_COLORS[DEFAULT_LESSON_TYPE];
                                                        return (
                                                            <span
                                                                key={type}
                                                                title={`${type}: ${count} ур./нед.`}
                                                                style={{
                                                                    padding: '2px 6px',
                                                                    borderRadius: '4px',
                                                                    fontSize: '0.7rem',
                                                                    backgroundColor: colors.bg,
                                                                    color: colors.text,
                                                                    fontWeight: 500,
                                                                    whiteSpace: 'nowrap'
                                                                }}
                                                            >
                                                                {type.slice(0, 3)}: {count}
                                                            </span>
                                                        );
                                                    })}
                                                </div>
                                            );
                                        })()}
                                    </td>
                                )}
                                <td>
                                    {stat.hwCount > 0 ? (
                                        <span style={{ color: 'var(--color-info)', fontWeight: 500 }}>
                                            {stat.hwCount}
                                            {stat.hwPayment > 0 && <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}> ({stat.hwPayment.toLocaleString()} ₽)</span>}
                                        </span>
                                    ) : '—'}
                                </td>
                                <td>
                                    {stat.extraPay > 0 ? (
                                        <span
                                            style={{ color: 'var(--color-primary)', fontWeight: 600 }}
                                            title={`Расписание: ${stat.extraCycles || 0} цикл · Сборка: ${stat.extraAssembly || 0} · Часы: ${stat.extraHours || 0}`}
                                        >
                                            {stat.extraPay.toLocaleString()} ₽
                                        </span>
                                    ) : '—'}
                                </td>
                                <td>
                                    <input
                                        type="number"
                                        className="rate-input"
                                        value={stat.rate}
                                        onChange={(e) => setTeacherRate(stat.id, Number(e.target.value))}
                                        min="0"
                                        step="50"
                                    />
                                </td>
                                <td className="payment-cell">
                                    <strong>{stat.payment.toLocaleString()} ₽</strong>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                    <tfoot>
                        <tr className="totals-row">
                            <td colSpan="4"><strong>ИТОГО:</strong></td>
                            <td><strong>{totals.lessons}</strong></td>
                            <td><strong>{totals.hours.toFixed(1)}</strong></td>
                            {hasCustomTypes && <td></td>}
                            <td><strong style={{ color: 'var(--color-info)' }}>{totals.hwCount || ''}</strong></td>
                            <td><strong style={{ color: 'var(--color-primary)' }}>{totals.extraPay > 0 ? `${totals.extraPay.toLocaleString()} ₽` : ''}</strong></td>
                            <td></td>
                            <td className="payment-cell">
                                <strong>{totals.payment.toLocaleString()} ₽</strong>
                            </td>
                        </tr>
                    </tfoot>
                </table>
            </div>
        </div>
    );
};

export default StatisticsPage;
