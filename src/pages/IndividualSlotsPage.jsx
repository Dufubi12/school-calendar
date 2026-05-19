import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSchedule } from '../context/ScheduleContext';
import { GraduationCap, Check, X, Info } from 'lucide-react';
import { loadIndividualSlots, saveIndividualSlot } from '../lib/api';

// Day codes used in the source CSV and storage
const DAYS = ['пн', 'вт', 'ср', 'чт', 'пт', 'сб', 'вс'];
const DAY_LABELS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
const DAY_FULL = ['Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота', 'Воскресенье'];

// Hourly slots 08:00 -> 22:00
const HOUR_SLOTS = (() => {
    const slots = [];
    for (let h = 8; h < 22; h++) {
        const start = String(h).padStart(2, '0');
        const end = String(h + 1).padStart(2, '0');
        slots.push(`${start}:00-${end}:00`);
    }
    return slots;
})();

const NEXT_STATE = { 'default': 'free', 'free': 'busy', 'busy': 'default' };

const IndividualSlotsPage = () => {
    const { teachers } = useSchedule();
    const { isAdmin, isTeacher, currentUser } = useAuth();

    // Load slots from Supabase on mount
    const [slotsByTeacher, setSlotsByTeacher] = useState({});
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let cancelled = false;
        loadIndividualSlots(teachers)
            .then(data => {
                if (!cancelled) {
                    setSlotsByTeacher(data || {});
                    setLoading(false);
                }
            })
            .catch(err => {
                console.error('Failed to load IZ slots', err);
                if (!cancelled) setLoading(false);
            });
        return () => { cancelled = true; };
    }, [teachers]);

    // Resolve current user's last name to filter for teacher view
    const currentTeacherLastName = useMemo(() => {
        if (!isTeacher || !currentUser?.teacherId) return null;
        const t = teachers.find(x => x.id === currentUser.teacherId);
        return t ? t.name.split(' ')[0] : null;
    }, [isTeacher, currentUser, teachers]);

    // Resolve current teacher's full name (for display when entry doesn't exist yet)
    const currentTeacherFullName = useMemo(() => {
        if (!isTeacher || !currentUser?.teacherId) return null;
        const t = teachers.find(x => x.id === currentUser.teacherId);
        return t ? t.name : null;
    }, [isTeacher, currentUser, teachers]);

    // List of teacher last-names that have data
    const teacherKeys = useMemo(() => {
        const keys = Object.keys(slotsByTeacher).sort((a, b) => a.localeCompare(b, 'ru'));
        if (isTeacher && currentTeacherLastName) {
            // Teacher sees only own entry (always include it, even if not yet in map)
            return [currentTeacherLastName];
        }
        return keys;
    }, [slotsByTeacher, isTeacher, currentTeacherLastName]);

    const [selectedTeacherKey, setSelectedTeacherKey] = useState(() => {
        if (currentTeacherLastName) return currentTeacherLastName;
        return null;
    });

    useEffect(() => {
        if (isTeacher && currentTeacherLastName) {
            setSelectedTeacherKey(currentTeacherLastName);
        } else if (!selectedTeacherKey && teacherKeys.length > 0) {
            setSelectedTeacherKey(teacherKeys[0]);
        }
    }, [isTeacher, currentTeacherLastName, teacherKeys, selectedTeacherKey]);

    const readOnly = isAdmin && !isTeacher;

    // If teacher has no entry yet — show an empty placeholder so they can start marking slots
    const selected = useMemo(() => {
        if (!selectedTeacherKey) return null;
        const existing = slotsByTeacher[selectedTeacherKey];
        if (existing) return existing;
        // Fallback to empty entry for the current teacher
        if (isTeacher && selectedTeacherKey === currentTeacherLastName) {
            return {
                name: currentTeacherFullName || currentTeacherLastName,
                description: '',
                slots: {},
            };
        }
        return null;
    }, [selectedTeacherKey, slotsByTeacher, isTeacher, currentTeacherLastName, currentTeacherFullName]);

    const getCellState = useCallback((day, timeKey) => {
        if (!selected) return 'default';
        return selected.slots?.[day]?.[timeKey] || 'default';
    }, [selected]);

    const cycleCell = useCallback(async (day, timeKey) => {
        if (readOnly || !selectedTeacherKey) return;

        // Determine new status from current
        const teacher = slotsByTeacher[selectedTeacherKey];
        const teacherId = teacher?.teacherId
            || teachers.find(t => t.name.split(' ')[0] === selectedTeacherKey)?.id;
        if (!teacherId) {
            console.error('Cannot find teacher_id for', selectedTeacherKey);
            return;
        }
        const current = teacher?.slots?.[day]?.[timeKey] || 'default';
        const next = NEXT_STATE[current];
        const nextStatus = next === 'default' ? null : next;

        // Optimistic local update
        const prevState = slotsByTeacher;
        setSlotsByTeacher(prev => {
            const t = prev[selectedTeacherKey] || { teacherId, name: selectedTeacherKey, description: '', slots: {} };
            const newSlots = { ...(t.slots || {}) };
            const dayBranch = { ...(newSlots[day] || {}) };
            if (nextStatus === null) {
                delete dayBranch[timeKey];
            } else {
                dayBranch[timeKey] = nextStatus;
            }
            if (Object.keys(dayBranch).length === 0) {
                delete newSlots[day];
            } else {
                newSlots[day] = dayBranch;
            }
            return { ...prev, [selectedTeacherKey]: { ...t, teacherId, slots: newSlots } };
        });

        // Persist to Supabase
        try {
            await saveIndividualSlot(teacherId, day, timeKey, nextStatus);
        } catch (err) {
            console.error('Failed to save IZ slot, reverting', err);
            setSlotsByTeacher(prevState);
        }
    }, [readOnly, selectedTeacherKey, slotsByTeacher, teachers]);

    const totalSlotsForTeacher = (key) => {
        const t = slotsByTeacher[key];
        if (!t) return 0;
        return Object.values(t.slots || {}).reduce((s, day) => s + Object.keys(day).length, 0);
    };

    const cellStyle = (state, clickable) => ({
        width: '100%',
        padding: '6px 4px',
        borderRadius: '4px',
        border: '1px solid',
        borderColor: state === 'free' ? '#d1fae5' : state === 'busy' ? '#fecaca' : '#e5e7eb',
        backgroundColor: state === 'free' ? '#f0fdf4' : state === 'busy' ? '#fef2f2' : 'transparent',
        color: state === 'free' ? '#059669' : state === 'busy' ? '#dc2626' : '#9ca3af',
        cursor: clickable ? 'pointer' : 'default',
        fontSize: '0.75rem',
        fontWeight: 500,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '3px',
        minHeight: '32px'
    });

    if (loading) {
        return (
            <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
                <div className="card" style={{ padding: '3rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>
                    Загрузка…
                </div>
            </div>
        );
    }

    return (
        <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
            <div style={{ marginBottom: '1rem' }}>
                <h1 style={{ margin: 0, fontSize: '1.7rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <GraduationCap size={26} />
                    {isAdmin ? 'Слоты для индивидуальных занятий' : 'Мои слоты для индивидуальных занятий'}
                </h1>
                <p style={{ margin: '0.4rem 0 0', color: '#64748b', fontSize: '0.9rem' }}>
                    {isAdmin
                        ? 'Доступность педагогов для ОГЭ/ЕГЭ и индивидуальных занятий'
                        : 'Отметьте часы когда вы готовы вести индивидуальные занятия. Клик: «—» → «Свободно» → «Занят»'}
                </p>
            </div>

            <div style={{
                display: 'grid',
                gridTemplateColumns: isAdmin ? '280px 1fr' : '1fr',
                gap: '1rem'
            }}>
                {/* Sidebar with teachers list — admin only */}
                {isAdmin && (
                    <div className="card" style={{ padding: '0.75rem', maxHeight: '78vh', overflowY: 'auto' }}>
                        <input
                            type="search"
                            placeholder="Поиск педагога..."
                            onChange={(e) => {
                                const term = e.target.value.toLowerCase();
                                const list = document.querySelectorAll('[data-teacher-item]');
                                list.forEach(el => {
                                    const name = el.getAttribute('data-teacher-item').toLowerCase();
                                    el.style.display = name.includes(term) ? '' : 'none';
                                });
                            }}
                            style={{
                                width: '100%',
                                padding: '6px 10px',
                                marginBottom: '0.5rem',
                                borderRadius: '6px',
                                border: '1px solid #e5e7eb',
                                fontSize: '0.85rem'
                            }}
                        />
                        {teacherKeys.map(key => {
                            const t = slotsByTeacher[key];
                            const count = totalSlotsForTeacher(key);
                            const active = key === selectedTeacherKey;
                            return (
                                <button
                                    key={key}
                                    data-teacher-item={t.name}
                                    onClick={() => setSelectedTeacherKey(key)}
                                    style={{
                                        width: '100%',
                                        textAlign: 'left',
                                        padding: '8px 10px',
                                        borderRadius: '6px',
                                        border: '2px solid',
                                        borderColor: active ? 'var(--color-primary)' : 'transparent',
                                        backgroundColor: active ? 'var(--color-moss-tint)' : 'transparent',
                                        cursor: 'pointer',
                                        marginBottom: '2px',
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        gap: '6px'
                                    }}
                                >
                                    <span style={{ fontWeight: active ? 600 : 500, fontSize: '0.85rem' }}>
                                        {t.name}
                                    </span>
                                    <span style={{
                                        fontSize: '0.7rem',
                                        padding: '1px 7px',
                                        borderRadius: '10px',
                                        backgroundColor: count > 0 ? '#d1fae5' : '#f1f5f9',
                                        color: count > 0 ? '#065f46' : '#94a3b8',
                                        fontWeight: 600,
                                        whiteSpace: 'nowrap'
                                    }}>
                                        {count}
                                    </span>
                                </button>
                            );
                        })}
                    </div>
                )}

                {/* Main panel */}
                <div>
                    {!selected ? (
                        <div className="card" style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>
                            {isAdmin ? 'Выберите педагога слева' : 'Данных нет'}
                        </div>
                    ) : (
                        <>
                            <div className="card" style={{ marginBottom: '0.75rem', padding: '0.85rem 1rem' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem' }}>
                                    <div>
                                        <div style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '4px' }}>
                                            {selected.name}
                                        </div>
                                        {selected.description && (
                                            <div style={{ fontSize: '0.82rem', color: '#475569', display: 'flex', alignItems: 'flex-start', gap: '6px' }}>
                                                <Info size={14} style={{ flexShrink: 0, marginTop: '2px', color: '#94a3b8' }} />
                                                <span>{selected.description}</span>
                                            </div>
                                        )}
                                    </div>
                                    <div style={{ display: 'flex', gap: '8px', fontSize: '0.75rem', flexWrap: 'wrap' }}>
                                        <span style={{ padding: '3px 8px', borderRadius: '4px', backgroundColor: '#f0fdf4', color: '#059669', border: '1px solid #d1fae5' }}>
                                            <Check size={11} style={{ verticalAlign: 'middle' }} /> Свободно
                                        </span>
                                        <span style={{ padding: '3px 8px', borderRadius: '4px', backgroundColor: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca' }}>
                                            <X size={11} style={{ verticalAlign: 'middle' }} /> Занят
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <div className="card" style={{ overflowX: 'auto', padding: 0 }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                                    <thead>
                                        <tr style={{ backgroundColor: '#f8fafc' }}>
                                            <th style={{ padding: '10px 8px', textAlign: 'left', borderBottom: '2px solid #e2e8f0', minWidth: '110px' }}>Время</th>
                                            {DAYS.map((day, i) => (
                                                <th key={day} style={{ padding: '10px 8px', textAlign: 'center', borderBottom: '2px solid #e2e8f0', minWidth: '90px' }}>
                                                    <div style={{ fontWeight: 600 }}>{DAY_LABELS[i]}</div>
                                                    <div style={{ fontSize: '0.7rem', color: '#94a3b8', fontWeight: 400 }}>
                                                        {DAY_FULL[i]}
                                                    </div>
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {HOUR_SLOTS.map((slot, rowIdx) => (
                                            <tr key={slot} style={{ backgroundColor: rowIdx % 2 === 0 ? '#fff' : '#f9fafb' }}>
                                                <td style={{ padding: '6px 8px', borderBottom: '1px solid #e2e8f0', fontWeight: 500, whiteSpace: 'nowrap', backgroundColor: '#f8fafc' }}>
                                                    {slot}
                                                </td>
                                                {DAYS.map(day => {
                                                    const state = getCellState(day, slot);
                                                    const clickable = !readOnly;
                                                    return (
                                                        <td key={day} style={{ padding: '4px 6px', borderBottom: '1px solid #e2e8f0' }}>
                                                            {clickable ? (
                                                                <button
                                                                    type="button"
                                                                    onClick={() => cycleCell(day, slot)}
                                                                    style={cellStyle(state, true)}
                                                                    aria-label={`${day} ${slot}: ${state === 'free' ? 'свободно' : state === 'busy' ? 'занят' : 'не указано'}`}
                                                                >
                                                                    {state === 'free' && (<><Check size={12} /> своб.</>)}
                                                                    {state === 'busy' && (<><X size={12} /> занят</>)}
                                                                    {state === 'default' && '—'}
                                                                </button>
                                                            ) : (
                                                                <span style={cellStyle(state, false)}>
                                                                    {state === 'free' && (<><Check size={12} /> своб.</>)}
                                                                    {state === 'busy' && (<><X size={12} /> занят</>)}
                                                                    {state === 'default' && '—'}
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
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default IndividualSlotsPage;
