import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { useSchedule } from '../context/ScheduleContext';
import { useAuth } from '../context/AuthContext';
import { ClipboardCheck } from 'lucide-react';
import { loadHomeworkChecks, saveHomeworkCheck, loadHomeworkRates, saveHomeworkRate } from '../lib/api';

const HomeworkCheckPage = () => {
    const { teachers } = useSchedule();
    const { isAdmin, isTeacher, currentUser } = useAuth();
    const [checks, setChecks] = useState({});
    const [hwRates, setHwRates] = useState({});
    const [defaultRate, setDefaultRate] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [selectedMonth, setSelectedMonth] = useState(() => {
        const now = new Date();
        return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    });

    // Load data from Supabase on mount
    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const [checksData, ratesData] = await Promise.all([
                    loadHomeworkChecks(),
                    loadHomeworkRates(),
                ]);
                if (cancelled) return;
                setChecks(checksData || {});
                // Normalize rate keys to strings for consistent lookup
                const normalizedRates = {};
                Object.entries(ratesData || {}).forEach(([k, v]) => {
                    normalizedRates[String(k)] = v;
                });
                setHwRates(normalizedRates);
            } catch (err) {
                console.error('Failed to load homework data', err);
            } finally {
                if (!cancelled) setIsLoading(false);
            }
        })();
        return () => { cancelled = true; };
    }, []);

    // Generate all dates for the selected month
    const monthDates = useMemo(() => {
        const [year, month] = selectedMonth.split('-').map(Number);
        const daysInMonth = new Date(year, month, 0).getDate();
        const dates = [];
        for (let d = 1; d <= daysInMonth; d++) {
            const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
            const dateObj = new Date(dateStr + 'T00:00:00');
            const dow = dateObj.getDay();
            dates.push({ dateStr, day: d, isWeekend: dow === 0 || dow === 6 });
        }
        return dates;
    }, [selectedMonth]);

    const updateCheck = useCallback((teacherId, dateStr, value) => {
        const tid = String(teacherId);
        const numericValue = (value === '' || value === 0) ? 0 : Number(value);

        // Snapshot for revert on error
        let prevSnapshot;
        setChecks(prev => {
            prevSnapshot = prev;
            const next = { ...prev };
            if (!next[tid]) next[tid] = { ...(prev[tid] || {}) };
            else next[tid] = { ...next[tid] };

            if (numericValue <= 0) {
                delete next[tid][dateStr];
                if (Object.keys(next[tid]).length === 0) delete next[tid];
            } else {
                next[tid][dateStr] = numericValue;
            }
            return next;
        });

        // Persist in background
        saveHomeworkCheck(teacherId, dateStr, numericValue).catch(err => {
            console.error('Failed to save homework check', err);
            setChecks(prevSnapshot);
        });
    }, []);

    const getTeacherRate = useCallback((teacherId) => {
        const tid = String(teacherId);
        return hwRates[tid] !== undefined ? hwRates[tid] : 13;
    }, [hwRates]);

    const updateTeacherRate = useCallback((teacherId, value) => {
        const tid = String(teacherId);
        const numericValue = (value === '' || value === 0) ? 0 : Number(value);

        let prevSnapshot;
        setHwRates(prev => {
            prevSnapshot = prev;
            const next = { ...prev };
            if (numericValue <= 0) {
                delete next[tid];
            } else {
                next[tid] = numericValue;
            }
            return next;
        });

        saveHomeworkRate(teacherId, numericValue).catch(err => {
            console.error('Failed to save homework rate', err);
            setHwRates(prevSnapshot);
        });
    }, []);

    const applyDefaultToAll = useCallback(async () => {
        if (defaultRate === '' || defaultRate <= 0) return;
        const rateValue = Number(defaultRate);

        let prevSnapshot;
        setHwRates(prev => {
            prevSnapshot = prev;
            const next = {};
            teachers.forEach(t => { next[String(t.id)] = rateValue; });
            return next;
        });

        try {
            await Promise.all(teachers.map(t => saveHomeworkRate(t.id, rateValue)));
        } catch (err) {
            console.error('Failed to apply default rate to all teachers', err);
            setHwRates(prevSnapshot);
        }
    }, [defaultRate, teachers]);

    // Calculate totals per teacher for the selected month
    const teacherTotals = useMemo(() => {
        const totals = {};
        teachers.forEach(t => {
            const tid = String(t.id);
            let sum = 0;
            monthDates.forEach(({ dateStr }) => {
                sum += (checks[tid]?.[dateStr] || 0);
            });
            totals[tid] = sum;
        });
        return totals;
    }, [teachers, checks, monthDates]);

    const grandTotal = useMemo(() => {
        return Object.values(teacherTotals).reduce((a, b) => a + b, 0);
    }, [teacherTotals]);

    const grandPayment = useMemo(() => {
        let sum = 0;
        teachers.forEach(t => {
            const tid = String(t.id);
            const total = teacherTotals[tid] || 0;
            const rate = hwRates[tid] || 0;
            sum += total * rate;
        });
        return sum;
    }, [teachers, teacherTotals, hwRates]);

    const sortedTeachers = useMemo(() => {
        const list = isTeacher
            ? teachers.filter(t => t.id === currentUser?.teacherId)
            : teachers;
        return [...list].sort((a, b) => a.name.localeCompare(b.name, 'ru'));
    }, [teachers, isTeacher, currentUser]);

    return (
        <div style={{ maxWidth: '100%', margin: '0 auto' }}>
            <div style={{ marginBottom: '1.5rem' }}>
                <h1 style={{ margin: 0, fontSize: '1.8rem' }}>
                    Проверка ДЗ
                </h1>
                <p style={{ margin: '0.5rem 0 0', color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>
                    Количество проверенных работ по дням
                </p>
            </div>

            {/* Filters */}
            <div className="card" style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                <ClipboardCheck size={20} />
                <label htmlFor="month-select" style={{ fontWeight: 500 }}>Месяц:</label>
                <input
                    id="month-select"
                    type="month"
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(e.target.value)}
                    style={{
                        padding: '8px 12px', borderRadius: '8px',
                        border: '2px solid #e5e7eb', fontSize: '14px',
                        cursor: 'pointer'
                    }}
                />

                {isAdmin && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <label htmlFor="hw-default-rate" style={{ fontWeight: 500, fontSize: '0.9rem' }}>Ставка по умолч.:</label>
                        <input
                            id="hw-default-rate"
                            type="number"
                            value={defaultRate}
                            onChange={(e) => setDefaultRate(e.target.value === '' ? '' : Number(e.target.value))}
                            placeholder="руб."
                            min="0"
                            step="10"
                            style={{
                                padding: '6px 10px', borderRadius: '6px',
                                border: '1px solid #e5e7eb', fontSize: '0.9rem',
                                width: '80px'
                            }}
                        />
                        <button
                            onClick={applyDefaultToAll}
                            style={{
                                padding: '6px 12px', borderRadius: '6px',
                                border: '1px solid #e5e7eb', fontSize: '0.8rem',
                                cursor: 'pointer', backgroundColor: '#f8fafc',
                                fontWeight: 500
                            }}
                        >
                            Применить ко всем
                        </button>
                    </div>
                )}

                {grandTotal > 0 && (
                    <span style={{ marginLeft: 'auto', fontSize: '0.9rem', color: '#059669', fontWeight: 600 }}>
                        Итого: {grandTotal} шт.
                        {grandPayment > 0 && ` = ${grandPayment.toLocaleString()} руб.`}
                    </span>
                )}
            </div>

            {/* Table */}
            <div className="card" style={{ overflowX: 'auto', padding: 0 }}>
                {isLoading ? (
                    <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>
                        Загрузка…
                    </div>
                ) : (
                <table style={{ borderCollapse: 'collapse', fontSize: '0.8rem', minWidth: '100%' }}>
                    <thead>
                        <tr style={{ backgroundColor: '#f8fafc' }}>
                            <th style={{
                                padding: '8px 12px', textAlign: 'left',
                                borderBottom: '2px solid #e2e8f0',
                                position: 'sticky', left: 0, backgroundColor: '#f8fafc',
                                zIndex: 2, minWidth: '180px'
                            }}>
                                Учитель
                            </th>
                            <th style={{
                                padding: '6px 4px', textAlign: 'center',
                                borderBottom: '2px solid #e2e8f0',
                                backgroundColor: '#faf5ff', minWidth: '70px',
                                fontSize: '0.75rem', color: '#7c3aed'
                            }}>
                                Ставка
                            </th>
                            {monthDates.map(({ dateStr, day, isWeekend }) => (
                                <th key={dateStr} style={{
                                    padding: '6px 4px', textAlign: 'center',
                                    borderBottom: '2px solid #e2e8f0',
                                    minWidth: '42px',
                                    backgroundColor: isWeekend ? '#fef2f2' : '#f8fafc',
                                    color: isWeekend ? '#dc2626' : 'inherit',
                                    fontSize: '0.75rem'
                                }}>
                                    {day}
                                </th>
                            ))}
                            <th style={{
                                padding: '8px 12px', textAlign: 'center',
                                borderBottom: '2px solid #e2e8f0',
                                backgroundColor: '#f0fdf4', fontWeight: 700,
                                minWidth: '60px'
                            }}>
                                Итого
                            </th>
                            <th style={{
                                padding: '8px 12px', textAlign: 'right',
                                borderBottom: '2px solid #e2e8f0',
                                backgroundColor: '#f0fdf4', fontWeight: 700,
                                minWidth: '80px'
                            }}>
                                Сумма
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        {sortedTeachers.map((teacher, idx) => {
                            const tid = String(teacher.id);
                            const total = teacherTotals[tid] || 0;
                            const tRate = getTeacherRate(teacher.id);
                            const payment = total * tRate;
                            return (
                                <tr key={teacher.id} style={{ backgroundColor: idx % 2 === 0 ? '#fff' : '#f9fafb' }}>
                                    <td style={{
                                        padding: '6px 12px',
                                        borderBottom: '1px solid #f1f5f9',
                                        fontWeight: 500, whiteSpace: 'nowrap',
                                        position: 'sticky', left: 0,
                                        backgroundColor: idx % 2 === 0 ? '#fff' : '#f9fafb',
                                        zIndex: 1
                                    }}>
                                        {teacher.name}
                                    </td>
                                    <td style={{
                                        padding: '2px',
                                        borderBottom: '1px solid #f1f5f9',
                                        backgroundColor: '#faf5ff'
                                    }}>
                                        <input
                                            type="number"
                                            min="0"
                                            step="10"
                                            value={tRate || ''}
                                            readOnly={!isAdmin}
                                            onChange={(e) => {
                                                if (!isAdmin) return;
                                                const v = e.target.value === '' ? 0 : Math.max(0, Number(e.target.value));
                                                updateTeacherRate(teacher.id, v);
                                            }}
                                            placeholder="—"
                                            style={{
                                                width: '60px', padding: '4px 4px',
                                                border: '1px solid transparent',
                                                borderRadius: '4px',
                                                textAlign: 'center', fontSize: '0.8rem',
                                                backgroundColor: tRate ? '#ede9fe' : 'transparent',
                                                color: '#7c3aed', fontWeight: 500,
                                                outline: 'none',
                                                cursor: isAdmin ? 'text' : 'default'
                                            }}
                                            onFocus={(e) => {
                                                if (isAdmin) {
                                                    e.target.style.borderColor = '#8b5cf6';
                                                    e.target.select();
                                                }
                                            }}
                                            onBlur={(e) => { e.target.style.borderColor = 'transparent'; }}
                                        />
                                    </td>
                                    {monthDates.map(({ dateStr, isWeekend }) => {
                                        const val = checks[tid]?.[dateStr] || '';
                                        return (
                                            <td key={dateStr} style={{
                                                padding: '2px',
                                                borderBottom: '1px solid #f1f5f9',
                                                backgroundColor: isWeekend ? '#fef2f2' : 'transparent'
                                            }}>
                                                <input
                                                    type="number"
                                                    min="0"
                                                    value={val}
                                                    onChange={(e) => {
                                                        const v = e.target.value === '' ? '' : Math.max(0, parseInt(e.target.value) || 0);
                                                        updateCheck(teacher.id, dateStr, v === '' ? 0 : v);
                                                    }}
                                                    style={{
                                                        width: '38px', padding: '4px 2px',
                                                        border: '1px solid transparent',
                                                        borderRadius: '4px',
                                                        textAlign: 'center', fontSize: '0.8rem',
                                                        backgroundColor: val ? 'var(--color-moss-soft)' : 'transparent',
                                                        outline: 'none'
                                                    }}
                                                    onFocus={(e) => {
                                                        e.target.style.borderColor = 'var(--color-primary)';
                                                        e.target.select();
                                                    }}
                                                    onBlur={(e) => { e.target.style.borderColor = 'transparent'; }}
                                                />
                                            </td>
                                        );
                                    })}
                                    <td style={{
                                        padding: '6px 12px', textAlign: 'center',
                                        borderBottom: '1px solid #f1f5f9',
                                        fontWeight: 600, backgroundColor: '#f0fdf4',
                                        color: total > 0 ? '#059669' : 'var(--color-text-muted)'
                                    }}>
                                        {total || '—'}
                                    </td>
                                    <td style={{
                                        padding: '6px 12px', textAlign: 'right',
                                        borderBottom: '1px solid #f1f5f9',
                                        fontWeight: 600, backgroundColor: '#f0fdf4',
                                        color: payment > 0 ? '#059669' : 'var(--color-text-muted)'
                                    }}>
                                        {payment > 0 ? `${payment.toLocaleString()} ₽` : '—'}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                    <tfoot>
                        <tr style={{ backgroundColor: '#f0fdf4' }}>
                            <td style={{
                                padding: '10px 12px', fontWeight: 700,
                                borderTop: '2px solid #e2e8f0',
                                position: 'sticky', left: 0,
                                backgroundColor: '#f0fdf4', zIndex: 1
                            }}>
                                ИТОГО
                            </td>
                            <td style={{ borderTop: '2px solid #e2e8f0' }}></td>
                            {monthDates.map(({ dateStr }) => {
                                let dayTotal = 0;
                                sortedTeachers.forEach(t => {
                                    dayTotal += (checks[String(t.id)]?.[dateStr] || 0);
                                });
                                return (
                                    <td key={dateStr} style={{
                                        padding: '6px 4px', textAlign: 'center',
                                        borderTop: '2px solid #e2e8f0',
                                        fontWeight: 600, fontSize: '0.75rem',
                                        color: dayTotal > 0 ? '#059669' : 'var(--color-text-muted)'
                                    }}>
                                        {dayTotal || ''}
                                    </td>
                                );
                            })}
                            <td style={{
                                padding: '10px 12px', textAlign: 'center',
                                borderTop: '2px solid #e2e8f0',
                                fontWeight: 700, fontSize: '1rem',
                                color: '#059669'
                            }}>
                                {grandTotal}
                            </td>
                            <td style={{
                                padding: '10px 12px', textAlign: 'right',
                                borderTop: '2px solid #e2e8f0',
                                fontWeight: 700, fontSize: '1rem',
                                color: '#059669'
                            }}>
                                {grandPayment > 0 ? `${grandPayment.toLocaleString()} ₽` : '—'}
                            </td>
                        </tr>
                    </tfoot>
                </table>
                )}
            </div>
        </div>
    );
};

export default HomeworkCheckPage;
