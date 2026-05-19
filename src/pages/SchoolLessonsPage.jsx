import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useSchedule } from '../context/ScheduleContext';
import { useAuth } from '../context/AuthContext';
import { CalendarDays, Plus, Trash2, X, Filter } from 'lucide-react';
import {
    loadSchoolLessons,
    createSchoolLesson,
    closeSchoolLesson,
} from '../lib/api';

const WEEKDAYS = ['Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота', 'Воскресенье'];

const SchoolLessonsPage = () => {
    const { teachers, reloadSchoolSchedule } = useSchedule();
    const { isAdmin } = useAuth();

    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showAddModal, setShowAddModal] = useState(false);

    // Filters
    const [filterClass, setFilterClass] = useState('all');
    const [filterTeacher, setFilterTeacher] = useState('all');
    const [filterDay, setFilterDay] = useState('all');
    const [showHistorical, setShowHistorical] = useState(false);

    const refresh = useCallback(async () => {
        setLoading(true);
        try {
            const data = await loadSchoolLessons();
            setRows(data || []);
        } catch (err) {
            console.error('Failed to load school lessons:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        refresh();
    }, [refresh]);

    const teacherById = useMemo(
        () => new Map(teachers.map(t => [t.id, t])),
        [teachers]
    );

    const todayStr = useMemo(() => {
        const d = new Date();
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    }, []);

    // Lists for filter dropdowns
    const allClasses = useMemo(
        () => [...new Set(rows.map(r => r.class_name))].sort((a, b) => a.localeCompare(b, 'ru')),
        [rows]
    );

    // Filtered rows
    const filteredRows = useMemo(() => {
        return rows.filter(r => {
            if (!showHistorical && r.effective_to && r.effective_to < todayStr) return false;
            if (filterClass !== 'all' && r.class_name !== filterClass) return false;
            if (filterTeacher !== 'all' && String(r.teacher_id ?? '') !== filterTeacher) return false;
            if (filterDay !== 'all' && r.day_of_week !== filterDay) return false;
            return true;
        }).sort((a, b) => {
            // Sort by day of week, then time, then class
            const dayDiff = WEEKDAYS.indexOf(a.day_of_week) - WEEKDAYS.indexOf(b.day_of_week);
            if (dayDiff !== 0) return dayDiff;
            const timeDiff = (a.time_slot || '').localeCompare(b.time_slot || '');
            if (timeDiff !== 0) return timeDiff;
            return a.class_name.localeCompare(b.class_name, 'ru');
        });
    }, [rows, filterClass, filterTeacher, filterDay, showHistorical, todayStr]);

    const handleClose = useCallback(async (row) => {
        const isOpen = !row.effective_to;
        const msg = isOpen
            ? `Закрыть запись «${row.class_name} ${row.subject} ${row.day_of_week} ${row.time_slot}»?\n\nВ статистике и календаре она будет действовать до вчерашнего дня. История сохраняется.`
            : 'Удалить эту запись окончательно?';
        if (!window.confirm(msg)) return;
        try {
            await closeSchoolLesson(row.id, !isOpen);
            await refresh();
            await reloadSchoolSchedule();
        } catch (err) {
            alert('Не удалось: ' + (err?.message || 'неизвестная ошибка'));
        }
    }, [refresh, reloadSchoolSchedule]);

    const handleAdded = async () => {
        setShowAddModal(false);
        await refresh();
        await reloadSchoolSchedule();
    };

    if (!isAdmin) {
        return (
            <div className="card" style={{ padding: '2rem', textAlign: 'center' }}>
                Нет доступа
            </div>
        );
    }

    return (
        <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
            <div style={{ marginBottom: '1rem' }}>
                <h1 style={{ margin: 0, fontSize: '1.7rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <CalendarDays size={26} />
                    Школьное расписание
                </h1>
                <p style={{ margin: '0.4rem 0 0', color: '#64748b', fontSize: '0.9rem' }}>
                    Управление групповыми уроками с привязкой к датам и версионированием
                </p>
            </div>

            {/* Filters */}
            <div className="card" style={{ marginBottom: '1rem', padding: '1rem', display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                <Filter size={18} />
                <select value={filterClass} onChange={(e) => setFilterClass(e.target.value)} style={selectStyle}>
                    <option value="all">Все классы</option>
                    {allClasses.map(c => <option key={c} value={c}>{c}</option>)}
                </select>

                <select value={filterTeacher} onChange={(e) => setFilterTeacher(e.target.value)} style={selectStyle}>
                    <option value="all">Все учителя</option>
                    {teachers.slice().sort((a, b) => a.name.localeCompare(b.name, 'ru')).map(t => (
                        <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                </select>

                <select value={filterDay} onChange={(e) => setFilterDay(e.target.value)} style={selectStyle}>
                    <option value="all">Все дни</option>
                    {WEEKDAYS.map(d => <option key={d} value={d}>{d}</option>)}
                </select>

                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', color: '#475569', cursor: 'pointer' }}>
                    <input
                        type="checkbox"
                        checked={showHistorical}
                        onChange={(e) => setShowHistorical(e.target.checked)}
                    />
                    Показывать закрытые
                </label>

                <button
                    onClick={() => setShowAddModal(true)}
                    className="btn btn-primary"
                    style={{ marginLeft: 'auto', padding: '6px 12px', fontSize: '0.85rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                >
                    <Plus size={14} /> Добавить урок
                </button>
            </div>

            {/* Table */}
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                {loading ? (
                    <div style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>Загрузка…</div>
                ) : filteredRows.length === 0 ? (
                    <div style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>
                        Нет записей по выбранным фильтрам
                    </div>
                ) : (
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' }}>
                            <thead style={{ backgroundColor: '#f8fafc' }}>
                                <tr>
                                    <th style={th}>Класс</th>
                                    <th style={th}>День</th>
                                    <th style={th}>Время</th>
                                    <th style={th}>Предмет</th>
                                    <th style={th}>Учитель</th>
                                    <th style={th}>Повторяемость</th>
                                    <th style={th}>Действует</th>
                                    <th style={{ ...th, width: '60px' }}></th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredRows.map(row => {
                                    const t = row.teacher_id ? teacherById.get(row.teacher_id) : null;
                                    const closed = row.effective_to && row.effective_to < todayStr;
                                    return (
                                        <tr key={row.id} style={{
                                            borderBottom: '1px solid #e2e8f0',
                                            backgroundColor: closed ? '#f8fafc' : '#fff',
                                            opacity: closed ? 0.55 : 1
                                        }}>
                                            <td style={td}><strong>{row.class_name}</strong></td>
                                            <td style={td}>{row.day_of_week}</td>
                                            <td style={td}>{row.time_slot}</td>
                                            <td style={td}>{row.subject}</td>
                                            <td style={td}>{t ? t.name : <span style={{ color: '#ef4444', fontStyle: 'italic' }}>Не назначен</span>}</td>
                                            <td style={td}>
                                                {row.recurrence_pattern === 'once' ? `Разово (${row.single_date})`
                                                    : row.recurrence_pattern === 'biweekly' ? 'Раз в 2 недели'
                                                    : 'Каждую неделю'}
                                            </td>
                                            <td style={{ ...td, fontSize: '0.78rem', color: '#475569' }}>
                                                с {row.effective_from}
                                                {row.effective_to ? ` по ${row.effective_to}` : ''}
                                            </td>
                                            <td style={td}>
                                                <button
                                                    onClick={() => handleClose(row)}
                                                    style={{
                                                        background: 'none', border: 'none', cursor: 'pointer',
                                                        color: '#ef4444', padding: '4px',
                                                        display: 'inline-flex', alignItems: 'center'
                                                    }}
                                                    title={closed ? 'Удалить навсегда' : 'Закрыть (effective_to = вчера)'}
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {showAddModal && (
                <AddLessonModal
                    teachers={teachers}
                    classes={allClasses}
                    onClose={() => setShowAddModal(false)}
                    onAdded={handleAdded}
                />
            )}
        </div>
    );
};

const AddLessonModal = ({ teachers, classes, onClose, onAdded }) => {
    const [className, setClassName] = useState(classes[0] || '');
    const [customClass, setCustomClass] = useState('');
    const [dayOfWeek, setDayOfWeek] = useState('Понедельник');
    const [startTime, setStartTime] = useState('09:00');
    const [endTime, setEndTime] = useState('09:45');
    const [subject, setSubject] = useState('');
    const [teacherId, setTeacherId] = useState('');
    const [recurrence, setRecurrence] = useState('weekly');
    const [singleDate, setSingleDate] = useState(() => {
        const d = new Date();
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    });
    const [effectiveFrom, setEffectiveFrom] = useState(() => {
        const d = new Date();
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    });
    const [effectiveTo, setEffectiveTo] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState(null);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (submitting) return;
        setError(null);
        const cls = (customClass.trim() || className.trim());
        if (!cls) { setError('Укажите класс'); return; }
        if (!subject.trim()) { setError('Укажите предмет'); return; }
        if (!startTime || !endTime || startTime >= endTime) { setError('Введите корректное время'); return; }
        if (recurrence === 'once' && !singleDate) { setError('Укажите дату занятия'); return; }

        setSubmitting(true);
        try {
            await createSchoolLesson({
                teacherId: teacherId ? Number(teacherId) : null,
                className: cls,
                subject: subject.trim(),
                dayOfWeek,
                timeSlot: `${startTime}-${endTime}`,
                recurrencePattern: recurrence,
                singleDate: recurrence === 'once' ? singleDate : null,
                effectiveFrom: recurrence === 'once' ? singleDate : effectiveFrom,
                effectiveTo: recurrence === 'once' ? singleDate : (effectiveTo || null),
            });
            await onAdded();
        } catch (err) {
            setError(err?.message || 'Не удалось добавить');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="card modal-content" onClick={(e) => e.stopPropagation()} style={{ width: '560px', maxWidth: '95%', padding: '1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                    <h3 style={{ margin: 0 }}>Добавить урок</h3>
                    <button onClick={onClose} className="btn btn-ghost" style={{ padding: '4px' }}>
                        <X size={18} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {/* Class */}
                    <div style={{ display: 'flex', gap: '8px' }}>
                        <div style={{ flex: 1 }}>
                            <label className="label">Класс (выбрать)</label>
                            <select value={className} onChange={(e) => { setClassName(e.target.value); setCustomClass(''); }} style={{ width: '100%' }}>
                                {classes.length === 0 && <option value="">— нет данных —</option>}
                                {classes.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                        </div>
                        <div style={{ flex: 1 }}>
                            <label className="label">или ввести</label>
                            <input
                                type="text"
                                placeholder="например, 5Г"
                                value={customClass}
                                onChange={(e) => setCustomClass(e.target.value)}
                                style={{ width: '100%' }}
                            />
                        </div>
                    </div>

                    {/* Day + Times */}
                    <div style={{ display: 'flex', gap: '8px' }}>
                        <div style={{ flex: 2 }}>
                            <label className="label">День недели</label>
                            <select value={dayOfWeek} onChange={(e) => setDayOfWeek(e.target.value)} style={{ width: '100%' }}>
                                {WEEKDAYS.map(d => <option key={d} value={d}>{d}</option>)}
                            </select>
                        </div>
                        <div style={{ flex: 1 }}>
                            <label className="label">Начало</label>
                            <input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} style={{ width: '100%' }} />
                        </div>
                        <div style={{ flex: 1 }}>
                            <label className="label">Конец</label>
                            <input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} style={{ width: '100%' }} />
                        </div>
                    </div>

                    {/* Subject + Teacher */}
                    <div style={{ display: 'flex', gap: '8px' }}>
                        <div style={{ flex: 1 }}>
                            <label className="label">Предмет</label>
                            <input
                                type="text"
                                value={subject}
                                onChange={(e) => setSubject(e.target.value)}
                                placeholder="Математика"
                                style={{ width: '100%' }}
                            />
                        </div>
                        <div style={{ flex: 1 }}>
                            <label className="label">Учитель</label>
                            <select value={teacherId} onChange={(e) => setTeacherId(e.target.value)} style={{ width: '100%' }}>
                                <option value="">— не назначен —</option>
                                {teachers.slice().sort((a, b) => a.name.localeCompare(b.name, 'ru')).map(t => (
                                    <option key={t.id} value={t.id}>{t.name}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Recurrence */}
                    <div>
                        <label className="label">Тип</label>
                        <div style={{ display: 'flex', gap: '6px' }}>
                            <button type="button" onClick={() => setRecurrence('weekly')}
                                className={recurrence === 'weekly' ? 'btn btn-primary' : 'btn btn-secondary'}
                                style={{ flex: 1, padding: '6px 10px', fontSize: '0.82rem' }}>
                                Каждую неделю
                            </button>
                            <button type="button" onClick={() => setRecurrence('biweekly')}
                                className={recurrence === 'biweekly' ? 'btn btn-primary' : 'btn btn-secondary'}
                                style={{ flex: 1, padding: '6px 10px', fontSize: '0.82rem' }}>
                                Раз в 2 недели
                            </button>
                            <button type="button" onClick={() => setRecurrence('once')}
                                className={recurrence === 'once' ? 'btn btn-primary' : 'btn btn-secondary'}
                                style={{ flex: 1, padding: '6px 10px', fontSize: '0.82rem' }}>
                                Разово
                            </button>
                        </div>
                    </div>

                    {/* Effective dates */}
                    {recurrence === 'once' ? (
                        <div>
                            <label className="label">Дата занятия</label>
                            <input type="date" value={singleDate} onChange={(e) => setSingleDate(e.target.value)} style={{ width: '100%' }} />
                        </div>
                    ) : (
                        <div style={{ display: 'flex', gap: '8px' }}>
                            <div style={{ flex: 1 }}>
                                <label className="label">Действует с</label>
                                <input type="date" value={effectiveFrom} onChange={(e) => setEffectiveFrom(e.target.value)} style={{ width: '100%' }} />
                            </div>
                            <div style={{ flex: 1 }}>
                                <label className="label">По (необязательно)</label>
                                <input type="date" value={effectiveTo} onChange={(e) => setEffectiveTo(e.target.value)} style={{ width: '100%' }} />
                            </div>
                        </div>
                    )}

                    {error && (
                        <div style={{
                            padding: '8px 12px',
                            borderRadius: 'var(--radius)',
                            backgroundColor: 'var(--color-danger-bg)',
                            color: 'var(--color-danger)',
                            border: '1px solid var(--color-danger-border)',
                            fontSize: '0.82rem'
                        }}>
                            {error}
                        </div>
                    )}

                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                        <button type="button" onClick={onClose} className="btn btn-secondary">Отмена</button>
                        <button type="submit" className="btn btn-primary" disabled={submitting}>
                            {submitting ? 'Добавление…' : 'Добавить'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

const selectStyle = {
    padding: '6px 8px',
    borderRadius: '6px',
    border: '1px solid #e5e7eb',
    fontSize: '0.85rem',
    cursor: 'pointer',
    minWidth: '140px',
};
const th = { padding: '10px 12px', textAlign: 'left', fontWeight: 600, fontSize: '0.82rem', color: '#475569', borderBottom: '2px solid #e2e8f0' };
const td = { padding: '8px 12px' };

export default SchoolLessonsPage;
