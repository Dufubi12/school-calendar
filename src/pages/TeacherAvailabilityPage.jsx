import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { useSchedule } from '../context/ScheduleContext';
import { useAuth } from '../context/AuthContext';
import { CalendarClock, Check, X, Pencil, Plus, Trash2, RotateCcw, Save } from 'lucide-react';
import { loadAvailability, saveAvailability } from '../lib/api';

const WEEKDAYS = ['Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота', 'Воскресенье'];
const WEEKDAY_SHORT = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

// Cycle order for clickable cells: default -> free -> busy -> default
const NEXT_STATE = {
    'default': 'free',
    'free': 'busy',
    'busy': 'default'
};

const TIMESLOTS_STORAGE_KEY = 'school_calendar_teacher_timeslots';

// Load all teachers' custom timeslots from localStorage
const loadAllCustomTimeslots = () => {
    try {
        const raw = localStorage.getItem(TIMESLOTS_STORAGE_KEY);
        if (!raw) return {};
        return JSON.parse(raw) || {};
    } catch {
        return {};
    }
};

const saveAllCustomTimeslots = (data) => {
    try {
        localStorage.setItem(TIMESLOTS_STORAGE_KEY, JSON.stringify(data));
    } catch (err) {
        console.error('Failed to save custom timeslots', err);
    }
};

const TeacherAvailabilityPage = () => {
    const { teachers, bellSchedule } = useSchedule();
    const { isAdmin, isTeacher, currentUser } = useAuth();

    // Availability state — shape: { [teacherId]: { [dayName]: { [timeSlot]: 'free'|'busy' } } }
    const [availability, setAvailability] = useState({});
    const [loading, setLoading] = useState(true);

    // Load availability from Supabase on mount
    useEffect(() => {
        let cancelled = false;
        setLoading(true);
        loadAvailability()
            .then(data => {
                if (!cancelled) {
                    setAvailability(data || {});
                }
            })
            .catch(err => {
                console.error('Failed to load availability', err);
                if (!cancelled) {
                    setAvailability({});
                }
            })
            .finally(() => {
                if (!cancelled) {
                    setLoading(false);
                }
            });
        return () => { cancelled = true; };
    }, []);

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

    // Per-teacher custom time slots (override bell schedule)
    const [allCustomTimeslots, setAllCustomTimeslots] = useState(() => loadAllCustomTimeslots());
    const [editingSlots, setEditingSlots] = useState(false);
    const [draftSlots, setDraftSlots] = useState(null);

    // Build the time-slot list: custom slots for this teacher if present, else bell schedule
    const timeSlots = useMemo(() => {
        const tid = String(selectedTeacherId || '');
        const custom = allCustomTimeslots[tid];
        const source = (custom && Array.isArray(custom) && custom.length > 0)
            ? custom
            : bellSchedule.map(b => ({
                label: b.label,
                startTime: b.startTime,
                endTime: b.endTime
            }));

        return source.map(s => ({
            key: `${s.startTime}-${s.endTime}`,
            label: s.label,
            startTime: s.startTime,
            endTime: s.endTime
        }));
    }, [bellSchedule, allCustomTimeslots, selectedTeacherId]);

    const hasCustomSlots = useMemo(() => {
        const tid = String(selectedTeacherId || '');
        return !!(allCustomTimeslots[tid] && allCustomTimeslots[tid].length > 0);
    }, [allCustomTimeslots, selectedTeacherId]);

    const startEditingSlots = useCallback(() => {
        setDraftSlots(timeSlots.map(s => ({ ...s })));
        setEditingSlots(true);
    }, [timeSlots]);

    const cancelEditingSlots = useCallback(() => {
        setDraftSlots(null);
        setEditingSlots(false);
    }, []);

    const updateDraftSlot = useCallback((idx, field, value) => {
        setDraftSlots(prev => prev.map((s, i) => i === idx ? { ...s, [field]: value } : s));
    }, []);

    const addDraftSlot = useCallback(() => {
        setDraftSlots(prev => [
            ...prev,
            { label: `Слот ${prev.length + 1}`, startTime: '15:00', endTime: '15:45' }
        ]);
    }, []);

    const removeDraftSlot = useCallback((idx) => {
        setDraftSlots(prev => prev.filter((_, i) => i !== idx));
    }, []);

    const saveSlots = useCallback(() => {
        if (!selectedTeacherId || !draftSlots) return;
        const tid = String(selectedTeacherId);
        const cleaned = draftSlots
            .filter(s => s.startTime && s.endTime && s.label)
            .map(s => ({ label: s.label, startTime: s.startTime, endTime: s.endTime }));
        const next = { ...allCustomTimeslots, [tid]: cleaned };
        setAllCustomTimeslots(next);
        saveAllCustomTimeslots(next);
        setEditingSlots(false);
        setDraftSlots(null);
    }, [selectedTeacherId, draftSlots, allCustomTimeslots]);

    const resetSlotsToDefault = useCallback(() => {
        if (!selectedTeacherId) return;
        const tid = String(selectedTeacherId);
        const next = { ...allCustomTimeslots };
        delete next[tid];
        setAllCustomTimeslots(next);
        saveAllCustomTimeslots(next);
        setEditingSlots(false);
        setDraftSlots(null);
    }, [selectedTeacherId, allCustomTimeslots]);

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
            {!readOnly && selectedTeacher && !editingSlots && (
                <div style={{
                    marginBottom: '1rem', padding: '10px 14px',
                    borderRadius: '8px', backgroundColor: 'var(--color-moss-tint)',
                    border: '1px solid var(--color-sage)', color: 'var(--color-primary-deep)',
                    fontSize: '0.85rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '0.5rem'
                }}>
                    <span>
                        Кликайте по ячейкам: «—» → «Свободно» → «Занят» → «—». Изменения сохраняются автоматически.
                        {hasCustomSlots && <span style={{ marginLeft: '0.5rem', fontStyle: 'italic' }}>(используются ваши слоты)</span>}
                    </span>
                    <div style={{ display: 'flex', gap: '6px' }}>
                        <button
                            onClick={startEditingSlots}
                            style={{
                                display: 'flex', alignItems: 'center', gap: '4px',
                                padding: '6px 12px', borderRadius: '6px',
                                border: '1px solid var(--color-primary)', backgroundColor: '#fff',
                                color: 'var(--color-primary)', cursor: 'pointer', fontSize: '0.8rem',
                                fontWeight: 500
                            }}
                        >
                            <Pencil size={14} />
                            Редактировать слоты
                        </button>
                        {hasCustomSlots && (
                            <button
                                onClick={resetSlotsToDefault}
                                style={{
                                    display: 'flex', alignItems: 'center', gap: '4px',
                                    padding: '6px 12px', borderRadius: '6px',
                                    border: '1px solid #d1d5db', backgroundColor: '#fff',
                                    color: '#6b7280', cursor: 'pointer', fontSize: '0.8rem',
                                    fontWeight: 500
                                }}
                                title="Сбросить к расписанию звонков"
                            >
                                <RotateCcw size={14} />
                                Сброс
                            </button>
                        )}
                    </div>
                </div>
            )}

            {/* Edit mode panel */}
            {!readOnly && editingSlots && draftSlots && (
                <div className="card" style={{ marginBottom: '1rem', padding: '1rem' }}>
                    <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: '0.75rem'
                    }}>
                        <h3 style={{ margin: 0, fontSize: '1rem' }}>Редактирование временных слотов</h3>
                        <div style={{ display: 'flex', gap: '8px' }}>
                            <button
                                onClick={cancelEditingSlots}
                                style={{
                                    padding: '6px 14px', borderRadius: '6px',
                                    border: '1px solid #d1d5db', backgroundColor: '#fff',
                                    color: '#6b7280', cursor: 'pointer', fontSize: '0.85rem'
                                }}
                            >
                                Отмена
                            </button>
                            <button
                                onClick={saveSlots}
                                style={{
                                    display: 'flex', alignItems: 'center', gap: '4px',
                                    padding: '6px 14px', borderRadius: '6px',
                                    border: 'none', backgroundColor: '#10b981',
                                    color: '#fff', cursor: 'pointer', fontSize: '0.85rem',
                                    fontWeight: 500
                                }}
                            >
                                <Save size={14} />
                                Сохранить
                            </button>
                        </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        {draftSlots.map((slot, idx) => (
                            <div key={idx} style={{
                                display: 'flex', alignItems: 'center', gap: '8px',
                                padding: '8px', borderRadius: '6px',
                                backgroundColor: '#f8fafc'
                            }}>
                                <span style={{ width: '20px', fontSize: '0.85rem', color: '#6b7280' }}>{idx + 1}.</span>
                                <input
                                    type="text"
                                    value={slot.label}
                                    onChange={e => updateDraftSlot(idx, 'label', e.target.value)}
                                    placeholder="Название"
                                    style={{
                                        flex: 1, padding: '6px 10px', borderRadius: '6px',
                                        border: '1px solid #d1d5db', fontSize: '0.9rem',
                                        minWidth: '120px'
                                    }}
                                />
                                <input
                                    type="time"
                                    value={slot.startTime}
                                    onChange={e => updateDraftSlot(idx, 'startTime', e.target.value)}
                                    style={{
                                        padding: '6px 10px', borderRadius: '6px',
                                        border: '1px solid #d1d5db', fontSize: '0.9rem',
                                        width: '110px'
                                    }}
                                />
                                <span>—</span>
                                <input
                                    type="time"
                                    value={slot.endTime}
                                    onChange={e => updateDraftSlot(idx, 'endTime', e.target.value)}
                                    style={{
                                        padding: '6px 10px', borderRadius: '6px',
                                        border: '1px solid #d1d5db', fontSize: '0.9rem',
                                        width: '110px'
                                    }}
                                />
                                <button
                                    onClick={() => removeDraftSlot(idx)}
                                    style={{
                                        background: 'none', border: 'none', cursor: 'pointer',
                                        color: '#ef4444', padding: '4px'
                                    }}
                                    title="Удалить"
                                >
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        ))}
                        <button
                            onClick={addDraftSlot}
                            style={{
                                display: 'flex', alignItems: 'center', gap: '4px',
                                justifyContent: 'center',
                                padding: '8px', borderRadius: '6px',
                                border: '1px dashed #d1d5db', backgroundColor: 'transparent',
                                color: '#6b7280', cursor: 'pointer', fontSize: '0.85rem'
                            }}
                        >
                            <Plus size={14} />
                            Добавить слот
                        </button>
                    </div>
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
                                        const clickable = !readOnly;
                                        return (
                                            <td key={day} style={{
                                                padding: '6px 8px',
                                                borderBottom: '1px solid #e2e8f0',
                                                textAlign: 'center'
                                            }}>
                                                {clickable ? (
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
