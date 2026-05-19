import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { useSchedule } from '../context/ScheduleContext';
import { useAuth } from '../context/AuthContext';
import { CalendarClock, Check, X } from 'lucide-react';
import { loadAvailability, saveAvailability, loadIndividualSlots } from '../lib/api';

const WEEKDAYS = ['Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота', 'Воскресенье'];
const WEEKDAY_SHORT = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

// Cycle order for clickable cells: default -> free -> busy -> default
const NEXT_STATE = {
    'default': 'free',
    'free': 'busy',
    'busy': 'default'
};

const TeacherAvailabilityPage = () => {
    const { teachers, bellSchedule, realSchedule } = useSchedule();
    const { isAdmin, isTeacher, currentUser } = useAuth();

    // Availability state — shape: { [teacherId]: { [dayName]: { [timeSlot]: 'free'|'busy' } } }
    const [availability, setAvailability] = useState({});
    // Individual slots by teacher last name (for grey-zone detection)
    const [izSlots, setIzSlots] = useState({});
    const [loading, setLoading] = useState(true);

    // Load availability + IZ slots from Supabase on mount
    useEffect(() => {
        let cancelled = false;
        setLoading(true);
        Promise.all([
            loadAvailability(),
            loadIndividualSlots(teachers),
        ])
            .then(([av, iz]) => {
                if (!cancelled) {
                    setAvailability(av || {});
                    setIzSlots(iz || {});
                }
            })
            .catch(err => {
                console.error('Failed to load availability/IZ', err);
                if (!cancelled) {
                    setAvailability({});
                    setIzSlots({});
                }
            })
            .finally(() => {
                if (!cancelled) {
                    setLoading(false);
                }
            });
        return () => { cancelled = true; };
    }, [teachers]);

    // Sort teachers alphabetically (Russian collation)
    const sortedTeachers = useMemo(
        () => [...teachers].sort((a, b) => a.name.localeCompare(b.name, 'ru')),
        [teachers]
    );

    // For admins: dropdown selection; for teachers: forced to their own teacherId
    const [selectedTeacherId, setSelectedTeacherId] = useState(() => {
        if (isTeacher && currentUser?.teacherId) {
            return String(currentUser.teacherId);
        }
        return '';
    });

    // Keep selection synced with current user when switching auth state
    useEffect(() => {
        if (isTeacher && currentUser?.teacherId) {
            setSelectedTeacherId(String(currentUser.teacherId));
        }
    }, [isTeacher, currentUser]);

    // Time slots come from bell schedule only (custom editing moved to "Инд. занятия")
    const timeSlots = useMemo(() => {
        return bellSchedule.map(b => ({
            key: `${b.startTime}-${b.endTime}`,
            label: b.label,
            startTime: b.startTime,
            endTime: b.endTime
        }));
    }, [bellSchedule]);

    const selectedTeacher = useMemo(
        () => teachers.find(t => t.id === Number(selectedTeacherId)),
        [teachers, selectedTeacherId]
    );

    // Read-only flag: admins cannot mutate teacher availability
    const readOnly = isAdmin || !isTeacher;

    const getCellState = useCallback((teacherId, day, timeKey) => {
        if (!teacherId) return 'default';
        const tid = String(teacherId);
        return availability[tid]?.[day]?.[timeKey] || 'default';
    }, [availability]);

    // Detect external "occupied" reasons — school lesson or busy IZ slot.
    // Returns string reason or null.
    const getOccupiedReason = useCallback((teacherName, day, timeKey) => {
        if (!teacherName) return null;
        const lastName = teacherName.split(' ')[0];
        // 1) School schedule
        try {
            for (const [className, days] of Object.entries(realSchedule)) {
                const lessons = days[day] || [];
                for (const l of lessons) {
                    if (l.teacher === lastName && l.time === timeKey) {
                        return `Школа: ${className} ${l.subject}`;
                    }
                }
            }
        } catch { /* ignore */ }
        // 2) IZ busy slot for this weekday/time
        // izSlots: { [lastName]: { slots: { [dayCode]: { [timeKey]: 'busy'|'free' } } } }
        const dayCodeMap = {
            'Понедельник': 'пн', 'Вторник': 'вт', 'Среда': 'ср',
            'Четверг': 'чт', 'Пятница': 'пт', 'Суббота': 'сб', 'Воскресенье': 'вс'
        };
        const dayCode = dayCodeMap[day];
        const izStatus = izSlots[lastName]?.slots?.[dayCode]?.[timeKey];
        if (izStatus === 'busy') return 'Занят в инд. занятиях';
        return null;
    }, [izSlots, realSchedule]);

    const cycleCell = useCallback(async (day, timeKey) => {
        if (readOnly || !selectedTeacherId) return;
        const tid = String(selectedTeacherId);
        const teacherIdNum = Number(selectedTeacherId);

        // Snapshot previous state for rollback on error
        const prevAvailability = availability;

        const current = prevAvailability[tid]?.[day]?.[timeKey] || 'default';
        const next = NEXT_STATE[current];
        const nextStatus = next === 'default' ? null : next;

        // Build the optimistic next state (immutable)
        const updated = { ...prevAvailability };
        const tBranch = { ...(updated[tid] || {}) };
        const dBranch = { ...(tBranch[day] || {}) };

        if (nextStatus === null) {
            delete dBranch[timeKey];
        } else {
            dBranch[timeKey] = nextStatus;
        }

        // Cleanup empty branches to keep state tidy
        if (Object.keys(dBranch).length === 0) {
            delete tBranch[day];
        } else {
            tBranch[day] = dBranch;
        }

        if (Object.keys(tBranch).length === 0) {
            delete updated[tid];
        } else {
            updated[tid] = tBranch;
        }

        // Optimistic update
        setAvailability(updated);

        // Persist to Supabase; revert on error
        try {
            await saveAvailability(teacherIdNum, day, timeKey, nextStatus);
        } catch (err) {
            console.error('Failed to save availability', err);
            setAvailability(prevAvailability);
        }
    }, [readOnly, selectedTeacherId, availability]);

    // Visual style for each cell state
    const getCellStyle = (state, clickable) => {
        const base = {
            width: '100%',
            padding: '8px 6px',
            borderRadius: '6px',
            border: '1px solid transparent',
            fontSize: '0.85rem',
            fontWeight: 500,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '4px',
            cursor: clickable ? 'pointer' : 'default',
            transition: 'transform 0.05s ease',
            minHeight: '36px',
            userSelect: 'none'
        };

        if (state === 'free') {
            return {
                ...base,
                backgroundColor: '#f0fdf4',
                color: '#059669',
                borderColor: '#d1fae5'
            };
        }
        if (state === 'busy') {
            return {
                ...base,
                backgroundColor: '#fef2f2',
                color: '#dc2626',
                borderColor: '#fecaca'
            };
        }
        // default
        return {
            ...base,
            backgroundColor: 'transparent',
            color: '#9ca3af',
            borderColor: '#e5e7eb'
        };
    };

    const renderCellContent = (state) => {
        if (state === 'free') {
            return (<><Check size={14} /> Свободно</>);
        }
        if (state === 'busy') {
            return (<><X size={14} /> Занят</>);
        }
        return '—';
    };

    const headerTitle = isAdmin ? 'Доступность педагогов' : 'Мои свободные слоты';
    const headerSubtitle = isAdmin
        ? 'Просмотр доступности всех учителей (только чтение)'
        : 'Отметьте, когда вы свободны для замен или заняты';

    if (loading) {
        return (
            <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
                <div style={{ marginBottom: '1.5rem' }}>
                    <h1 style={{ margin: 0, fontSize: '1.8rem', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                        <CalendarClock size={26} />
                        {headerTitle}
                    </h1>
                </div>
                <div className="card" style={{
                    textAlign: 'center',
                    padding: '3rem',
                    color: 'var(--color-text-muted)'
                }}>
                    Загрузка…
                </div>
            </div>
        );
    }

    return (
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
            <div style={{ marginBottom: '1.5rem' }}>
                <h1 style={{ margin: 0, fontSize: '1.8rem', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                    <CalendarClock size={26} />
                    {headerTitle}
                </h1>
                <p style={{ margin: '0.5rem 0 0', color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>
                    {headerSubtitle}
                </p>
            </div>

            {/* Filters / teacher selector */}
            <div className="card" style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                <CalendarClock size={20} />
                <label htmlFor="availability-teacher" style={{ fontWeight: 500 }}>
                    {isAdmin ? 'Учитель:' : 'Вы:'}
                </label>
                <select
                    id="availability-teacher"
                    value={selectedTeacherId}
                    onChange={(e) => setSelectedTeacherId(e.target.value)}
                    disabled={isTeacher}
                    style={{
                        padding: '8px 12px',
                        borderRadius: '8px',
                        border: '2px solid #e5e7eb',
                        fontSize: '14px',
                        fontWeight: 500,
                        cursor: isTeacher ? 'not-allowed' : 'pointer',
                        backgroundColor: isTeacher ? '#f1f5f9' : '#fff',
                        minWidth: '260px'
                    }}
                >
                    <option value="">-- Выберите учителя --</option>
                    {sortedTeachers.map(t => (
                        <option key={t.id} value={t.id}>
                            {t.name}{t.subject ? ` (${t.subject})` : ''}
                        </option>
                    ))}
                </select>

                {/* Legend */}
                <div style={{
                    marginLeft: 'auto',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    fontSize: '0.8rem',
                    flexWrap: 'wrap'
                }}>
                    <span style={{
                        display: 'inline-flex', alignItems: 'center', gap: '4px',
                        padding: '4px 10px', borderRadius: '6px',
                        backgroundColor: '#f0fdf4', color: '#059669',
                        border: '1px solid #d1fae5', fontWeight: 500
                    }}>
                        <Check size={14} /> Свободно
                    </span>
                    <span style={{
                        display: 'inline-flex', alignItems: 'center', gap: '4px',
                        padding: '4px 10px', borderRadius: '6px',
                        backgroundColor: '#fef2f2', color: '#dc2626',
                        border: '1px solid #fecaca', fontWeight: 500
                    }}>
                        <X size={14} /> Занят
                    </span>
                    <span style={{
                        display: 'inline-flex', alignItems: 'center', gap: '4px',
                        padding: '4px 10px', borderRadius: '6px',
                        color: '#9ca3af', border: '1px solid #e5e7eb', fontWeight: 500
                    }}>
                        — Не указано
                    </span>
                </div>
            </div>

            {/* Helper hint for teachers */}
            {!readOnly && selectedTeacher && (
                <div style={{
                    marginBottom: '1rem', padding: '10px 14px',
                    borderRadius: '8px', backgroundColor: 'var(--color-moss-tint)',
                    border: '1px solid var(--color-sage)', color: 'var(--color-primary-deep)',
                    fontSize: '0.85rem'
                }}>
                    Кликайте по ячейкам: «—» → «Свободно» → «Занят» → «—». Изменения сохраняются автоматически.
                </div>
            )}

            {/* Grid table */}
            {selectedTeacher ? (
                <div className="card" style={{ overflowX: 'auto', padding: 0 }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                        <thead>
                            <tr style={{ backgroundColor: '#f8fafc' }}>
                                <th style={{
                                    padding: '12px',
                                    textAlign: 'left',
                                    borderBottom: '2px solid #e2e8f0',
                                    minWidth: '140px'
                                }}>
                                    Время
                                </th>
                                {WEEKDAYS.map((day, i) => (
                                    <th key={day} style={{
                                        padding: '12px',
                                        textAlign: 'center',
                                        borderBottom: '2px solid #e2e8f0',
                                        minWidth: '150px'
                                    }}>
                                        <div style={{ fontWeight: 600 }}>{WEEKDAY_SHORT[i]}</div>
                                        <div style={{
                                            fontSize: '0.75rem',
                                            color: 'var(--color-text-muted)',
                                            fontWeight: 400
                                        }}>
                                            {day}
                                        </div>
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {timeSlots.map((slot, rowIdx) => (
                                <tr key={slot.key} style={{ backgroundColor: rowIdx % 2 === 0 ? '#fff' : '#f9fafb' }}>
                                    <td style={{
                                        padding: '10px 12px',
                                        borderBottom: '1px solid #e2e8f0',
                                        fontWeight: 500,
                                        whiteSpace: 'nowrap',
                                        backgroundColor: '#f8fafc'
                                    }}>
                                        <div>{slot.label}</div>
                                        <div style={{
                                            fontSize: '0.8rem',
                                            color: 'var(--color-text-muted)'
                                        }}>
                                            {slot.key}
                                        </div>
                                    </td>
                                    {WEEKDAYS.map(day => {
                                        const state = getCellState(selectedTeacher.id, day, slot.key);
                                        const occupiedReason = getOccupiedReason(selectedTeacher.name, day, slot.key);
                                        const isOccupied = !!occupiedReason && state === 'default';
                                        const clickable = !readOnly && !isOccupied;
                                        return (
                                            <td key={day} style={{
                                                padding: '6px 8px',
                                                borderBottom: '1px solid #e2e8f0',
                                                textAlign: 'center'
                                            }}>
                                                {isOccupied ? (
                                                    <span
                                                        style={{
                                                            ...getCellStyle('default', false),
                                                            backgroundColor: '#e2e8f0',
                                                            color: '#64748b',
                                                            cursor: 'not-allowed',
                                                            fontStyle: 'italic',
                                                            fontSize: '0.78rem'
                                                        }}
                                                        title={occupiedReason}
                                                    >
                                                        ⊘ занято
                                                    </span>
                                                ) : clickable ? (
                                                    <button
                                                        type="button"
                                                        onClick={() => cycleCell(day, slot.key)}
                                                        style={getCellStyle(state, true)}
                                                        aria-label={`${day} ${slot.label}: ${state === 'free' ? 'Свободно' : state === 'busy' ? 'Занят' : 'Не указано'}`}
                                                    >
                                                        {renderCellContent(state)}
                                                    </button>
                                                ) : (
                                                    <span style={getCellStyle(state, false)}>
                                                        {renderCellContent(state)}
                                                    </span>
                                                )}
                                            </td>
                                        );
                                    })}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            ) : (
                <div className="card" style={{
                    textAlign: 'center',
                    padding: '3rem',
                    color: 'var(--color-text-muted)'
                }}>
                    {isAdmin
                        ? 'Выберите учителя, чтобы увидеть его доступность'
                        : 'Не удалось определить учителя. Войдите как педагог.'}
                </div>
            )}
        </div>
    );
};

export default TeacherAvailabilityPage;
