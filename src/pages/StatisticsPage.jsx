import React, { useState, useMemo } from 'react';
import { useSchedule } from '../context/ScheduleContext';
import './StatisticsPage.css';

const StatisticsPage = () => {
    const { teachers, getSlotsForDate } = useSchedule();

    // Date range for statistics
    const [startDate, setStartDate] = useState(() => {
        const now = new Date();
        return new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    });

    const [endDate, setEndDate] = useState(() => {
        const now = new Date();
        return new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
    });

    // Individual payment rates per teacher (stored in localStorage)
    const [teacherRates, setTeacherRates] = useState(() => {
        const saved = localStorage.getItem('school_calendar_teacher_rates');
        if (saved) {
            try {
                return JSON.parse(saved);
            } catch (e) {
                console.error('Failed to parse teacher rates', e);
            }
        }
        return {}; // { teacherId: rate }
    });

    // Default rate for new teachers or "set all"
    const [defaultRate, setDefaultRate] = useState(500);

    // Save rates to localStorage
    React.useEffect(() => {
        localStorage.setItem('school_calendar_teacher_rates', JSON.stringify(teacherRates));
    }, [teacherRates]);

    // Set rate for specific teacher
    const setTeacherRate = (teacherId, rate) => {
        setTeacherRates(prev => ({ ...prev, [teacherId]: rate }));
    };

    // Apply default rate to all teachers
    const applyDefaultRateToAll = () => {
        const newRates = {};
        teachers.forEach(t => { newRates[t.id] = defaultRate; });
        setTeacherRates(newRates);
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
            const payment = lessonCount * rate;

            stats.push({
                ...teacher,
                lessonCount,
                totalHours: totalHours.toFixed(1),
                payment,
                rate
            });
        });

        // Sort by lesson count descending
        return stats.sort((a, b) => b.lessonCount - a.lessonCount);
    }, [teachers, startDate, endDate, teacherRates, defaultRate, getSlotsForDate]);

    // Calculate totals
    const totals = useMemo(() => {
        return teacherStats.reduce((acc, stat) => ({
            lessons: acc.lessons + stat.lessonCount,
            hours: acc.hours + parseFloat(stat.totalHours),
            payment: acc.payment + stat.payment
        }), { lessons: 0, hours: 0, payment: 0 });
    }, [teacherStats]);

    // Export to CSV
    const exportToCSV = () => {
        const headers = ['Учитель', 'Предмет', 'Количество уроков', 'Часов', 'Ставка', 'Зарплата'];
        const rows = teacherStats.map(stat => [
            stat.name,
            stat.subject,
            stat.lessonCount,
            stat.totalHours,
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
                            <th>Ставка (руб)</th>
                            <th>Зарплата</th>
                        </tr>
                    </thead>
                    <tbody>
                        {teacherStats.map((stat, index) => (
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
