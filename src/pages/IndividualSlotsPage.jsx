import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSchedule } from '../context/ScheduleContext';
import { GraduationCap, Check, X, Info, Plus, Trash2, Clock } from 'lucide-react';
import { loadIndividualSlots, saveIndividualSlot, createSingleIndividualSlot, createRecurringIndividualSlot, deleteIndividualSlot, loadAvailability, loadInvitations, setIzSlotApproval, loadTeacherTimeGrid, addTeacherTimeSlot, deleteTeacherTimeSlot, seedTeacherTimeGridFromDefault, DEFAULT_HOUR_GRID } from '../lib/api';
import { REAL_SCHEDULE } from '../data/mockData';

const DAY_FULL_RU = {
    'пн': 'Понедельник', 'вт': 'Вторник', 'ср': 'Среда',
    'чт': 'Четверг', 'пт': 'Пятница', 'сб': 'Суббота', 'вс': 'Воскресенье',
};

// Day codes used in the source CSV and storage
const DAYS = ['пн', 'вт', 'ср', 'чт', 'пт', 'сб', 'вс'];
const DAY_LABELS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
const DAY_FULL = ['Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота', 'Воскресенье'];

const NEXT_STATE = { 'default': 'free', 'free': 'busy', 'busy': 'default' };

const IndividualSlotsPage = () => {
    const { teachers } = useSchedule();
    const { isAdmin, isTeacher, currentUser } = useAuth();

    // Load slots from Supabase on mount
    const [slotsByTeacher, setSlotsByTeacher] = useState({});
    const [availability, setAvailability] = useState({});
    const [acceptedInvitations, setAcceptedInvitations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showAddModal, setShowAddModal] = useState(false);
    const [showGridModal, setShowGridModal] = useState(false);
    // Custom time grid for the currently selected teacher
    const [timeGrid, setTimeGrid] = useState([]); // [{id?, start_time, end_time}]

    useEffect(() => {
        let cancelled = false;
        Promise.all([
            loadIndividualSlots(teachers),
            loadAvailability(),
            loadInvitations(),
        ]).then(([slots, av, invs]) => {
            if (cancelled) return;
            setSlotsByTeacher(slots || {});
            setAvailability(av || {});
            setAcceptedInvitations((invs || []).filter(i => i.status === 'accepted'));
            setLoading(false);
        }).catch(err => {
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

    // List of teacher last-names to display in the sidebar.
    // Teacher: own entry only. Admin: ALL teachers from the `teachers` table,
    // even those without any slot entries yet — so admin can navigate the
    // whole roster and seed slots if needed.
    const teacherKeys = useMemo(() => {
        if (isTeacher && currentTeacherLastName) {
            return [currentTeacherLastName];
        }
        // Admin: union of (teachers with slots) and (all teachers from roster)
        const fromSlots = Object.keys(slotsByTeacher);
        const fromRoster = teachers.map(t => t.name.split(' ')[0]);
        const all = [...new Set([...fromSlots, ...fromRoster])];
        return all.sort((a, b) => a.localeCompare(b, 'ru'));
    }, [slotsByTeacher, isTeacher, currentTeacherLastName, teachers]);

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

    // If selected teacher has no slot entry yet — show an empty placeholder
    // (both for teachers viewing themselves and admins viewing any teacher
    // from the roster).
    const selected = useMemo(() => {
        if (!selectedTeacherKey) return null;
        const existing = slotsByTeacher[selectedTeacherKey];
        if (existing) return existing;
        // Look up the teacher in the roster for full name + teacherId
        const rosterMatch = teachers.find(t => t.name.split(' ')[0] === selectedTeacherKey);
        if (rosterMatch) {
            return {
                teacherId: rosterMatch.id,
                name: rosterMatch.name,
                description: '',
                slots: {},
            };
        }
        // Fallback for teacher view if roster doesn't have them (shouldn't happen)
        if (isTeacher && selectedTeacherKey === currentTeacherLastName) {
            return {
                name: currentTeacherFullName || currentTeacherLastName,
                description: '',
                slots: {},
            };
        }
        return null;
    }, [selectedTeacherKey, slotsByTeacher, teachers, isTeacher, currentTeacherLastName, currentTeacherFullName]);

    // Load custom time grid for the selected teacher
    useEffect(() => {
        const teacherId = selected?.teacherId
            || teachers.find(t => t.name.split(' ')[0] === selectedTeacherKey)?.id;
        if (!teacherId) {
            setTimeGrid([]);
            return;
        }
        let cancelled = false;
        loadTeacherTimeGrid(teacherId).then(grid => {
            if (!cancelled) setTimeGrid(grid || []);
        });
        return () => { cancelled = true; };
    }, [selected, selectedTeacherKey, teachers]);

    // Time slots used to render the grid (custom or fallback)
    const timeSlotKeys = useMemo(() => {
        const rows = timeGrid.length > 0 ? timeGrid : DEFAULT_HOUR_GRID;
        return rows.map(r => `${r.start_time}-${r.end_time}`);
    }, [timeGrid]);

    const getCellState = useCallback((day, timeKey) => {
        if (!selected) return 'default';
        return selected.slots?.[day]?.[timeKey] || 'default';
    }, [selected]);

    const getCellApproval = useCallback((day, timeKey) => {
        if (!selected) return null;
        return selected.slotMeta?.[day]?.[timeKey] || null;
    }, [selected]);

    // Check if this cell is occupied by something else (school lesson, availability busy, accepted invitation)
    // Returns string reason or null
    const getOccupiedReason = useCallback((day, timeKey) => {
        if (!selected || !selectedTeacherKey) return null;
        const teacherId = selected.teacherId || teachers.find(t => t.name.split(' ')[0] === selectedTeacherKey)?.id;
        if (!teacherId) return null;
        const dayFull = DAY_FULL_RU[day];

        // 1) School schedule (REAL_SCHEDULE) — same day-of-week + same time
        try {
            for (const [className, days] of Object.entries(REAL_SCHEDULE)) {
                const lessons = days[dayFull] || [];
                for (const l of lessons) {
                    if (l.teacher === selectedTeacherKey && l.time === timeKey) {
                        return `Школа: ${className} ${l.subject}`;
                    }
                }
            }
        } catch { /* ignore */ }

        // 2) "Мои слоты" availability — busy on the same day/time
        const av = availability[String(teacherId)]?.[dayFull]?.[timeKey];
        if (av === 'busy') return 'Отмечено "занят" в Моих слотах';

        // 3) Accepted invitation — would need to check by date, skip for now (recurring grid doesn't have date)
        return null;
    }, [selected, selectedTeacherKey, teachers, availability]);

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
            await saveIndividualSlot(teacherId, day, timeKey, nextStatus, isAdmin);
        } catch (err) {
            console.error('Failed to save IZ slot, reverting', err);
            setSlotsByTeacher(prevState);
        }
    }, [readOnly, selectedTeacherKey, slotsByTeacher, teachers]);

    // Reload slots from Supabase (used after add/delete via modal)
    const reloadSlots = useCallback(async () => {
        try {
            const data = await loadIndividualSlots(teachers);
            setSlotsByTeacher(data || {});
        } catch (err) {
            console.error('Failed to reload IZ slots', err);
        }
    }, [teachers]);

    // Add a custom slot (recurring weekly or single-date)
    const handleAddSlot = useCallback(async ({ recurring, day, date, startTime, endTime }) => {
        if (!selectedTeacherKey) return;
        const teacher = slotsByTeacher[selectedTeacherKey];
        const teacherId = teacher?.teacherId
            || teachers.find(t => t.name.split(' ')[0] === selectedTeacherKey)?.id;
        if (!teacherId) return;
        const timeSlot = `${startTime}-${endTime}`;
        try {
            if (recurring) {
                await createRecurringIndividualSlot({ teacherId, day, timeSlot, status: 'busy', byAdmin: isAdmin });
            } else {
                await createSingleIndividualSlot({ teacherId, date, timeSlot, status: 'busy', byAdmin: isAdmin });
            }
            await reloadSlots();
            setShowAddModal(false);
        } catch (err) {
            console.error('Failed to add slot', err);
            alert('Не удалось добавить слот: ' + (err?.message || 'неизвестная ошибка'));
        }
    }, [selectedTeacherKey, slotsByTeacher, teachers, reloadSlots]);

    // Admin reviewer: approve or reject a slot (recurring or single-date)
    const handleReview = useCallback(async (slotId, decision) => {
        if (!slotId) return;
        let note = null;
        if (decision === 'rejected') {
            note = window.prompt('Комментарий для педагога (необязательно):', '') || null;
        }
        try {
            await setIzSlotApproval(slotId, decision, note);
            await reloadSlots();
        } catch (err) {
            console.error('Failed to review slot:', err);
            alert('Не удалось сохранить решение: ' + (err?.message || 'неизвестная ошибка'));
        }
    }, [reloadSlots]);

    // Delete a single-date slot by id
    const handleDeleteSingle = useCallback(async (id) => {
        if (!window.confirm('Удалить это разовое занятие?')) return;
        try {
            await deleteIndividualSlot(id);
            await reloadSlots();
        } catch (err) {
            console.error('Failed to delete slot', err);
        }
    }, [reloadSlots]);

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
                            const rosterMatch = !t ? teachers.find(x => x.name.split(' ')[0] === key) : null;
                            const displayName = t?.name || rosterMatch?.name || key;
                            const count = totalSlotsForTeacher(key);
                            const active = key === selectedTeacherKey;
                            return (
                                <button
                                    key={key}
                                    data-teacher-item={displayName}
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
                                        {displayName}
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
                                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center', fontSize: '0.75rem', flexWrap: 'wrap' }}>
                                        {!readOnly && (
                                            <>
                                                <button
                                                    onClick={() => setShowGridModal(true)}
                                                    className="btn btn-secondary"
                                                    style={{ padding: '6px 12px', fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '4px' }}
                                                    title="Редактировать список временных интервалов слева"
                                                >
                                                    <Clock size={14} /> Сетка времени
                                                </button>
                                                <button
                                                    onClick={() => setShowAddModal(true)}
                                                    className="btn btn-primary"
                                                    style={{ padding: '6px 12px', fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '4px' }}
                                                >
                                                    <Plus size={14} /> Свой слот
                                                </button>
                                            </>
                                        )}
                                        <span style={{ padding: '3px 8px', borderRadius: '4px', backgroundColor: '#f0fdf4', color: '#059669', border: '1px solid #d1fae5' }}>
                                            <Check size={11} style={{ verticalAlign: 'middle' }} /> Свободно
                                        </span>
                                        <span style={{ padding: '3px 8px', borderRadius: '4px', backgroundColor: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca' }}>
                                            <X size={11} style={{ verticalAlign: 'middle' }} /> Занят
                                        </span>
                                    </div>
                                </div>

                                {/* List of single-date events */}
                                {selected.singleEvents && selected.singleEvents.length > 0 && (
                                    <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid var(--color-divider)' }}>
                                        <div style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--color-text-muted)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                            Разовые занятия:
                                        </div>
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                            {selected.singleEvents
                                                .slice()
                                                .sort((a, b) => (a.single_date + a.time_slot).localeCompare(b.single_date + b.time_slot))
                                                .map(ev => {
                                                    const pending = ev.approval_status === 'pending';
                                                    const rejected = ev.approval_status === 'rejected';
                                                    const tipParts = [];
                                                    if (pending) tipParts.push('⏳ Ожидает подтверждения');
                                                    if (rejected) tipParts.push(`✕ Отклонено${ev.approval_note ? ': ' + ev.approval_note : ''}`);
                                                    return (
                                                        <span key={ev.id} style={{
                                                            display: 'inline-flex', alignItems: 'center', gap: '6px',
                                                            padding: '5px 10px',
                                                            borderRadius: 'var(--radius-pill)',
                                                            backgroundColor: ev.status === 'busy' ? 'var(--color-danger-bg)' : 'var(--color-success-bg)',
                                                            color: ev.status === 'busy' ? 'var(--color-danger)' : 'var(--color-success)',
                                                            border: `${pending || rejected ? '2px dashed' : '1px solid'} ${pending ? '#fbbf24' : rejected ? '#ef4444' : (ev.status === 'busy' ? 'var(--color-danger-border)' : 'var(--color-success-border)')}`,
                                                            fontSize: '0.78rem',
                                                            fontWeight: 500
                                                        }} title={tipParts.join(' · ')}>
                                                            📅 {new Date(ev.single_date + 'T00:00:00').toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' })} · {ev.time_slot}
                                                            {pending && <span style={{ fontSize: '0.7rem' }}>⏳</span>}
                                                            {rejected && <span style={{ fontSize: '0.7rem' }}>✕</span>}
                                                            {isAdmin && pending && (
                                                                <>
                                                                    <button
                                                                        onClick={() => handleReview(ev.id, 'approved')}
                                                                        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: 'var(--color-success)' }}
                                                                        title="Подтвердить"
                                                                    >
                                                                        <Check size={14} />
                                                                    </button>
                                                                    <button
                                                                        onClick={() => handleReview(ev.id, 'rejected')}
                                                                        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: 'var(--color-danger)' }}
                                                                        title="Отклонить"
                                                                    >
                                                                        <X size={14} />
                                                                    </button>
                                                                </>
                                                            )}
                                                            {!readOnly && (
                                                                <button
                                                                    onClick={() => handleDeleteSingle(ev.id)}
                                                                    style={{
                                                                        background: 'none', border: 'none', cursor: 'pointer',
                                                                        padding: 0, color: 'inherit', opacity: 0.6,
                                                                        display: 'inline-flex', alignItems: 'center'
                                                                    }}
                                                                    title="Удалить"
                                                                >
                                                                    <Trash2 size={12} />
                                                                </button>
                                                            )}
                                                        </span>
                                                    );
                                                })}
                                        </div>
                                    </div>
                                )}
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
                                        {timeSlotKeys.map((slot, rowIdx) => (
                                            <tr key={slot} style={{ backgroundColor: rowIdx % 2 === 0 ? '#fff' : '#f9fafb' }}>
                                                <td style={{ padding: '6px 8px', borderBottom: '1px solid #e2e8f0', fontWeight: 500, whiteSpace: 'nowrap', backgroundColor: '#f8fafc' }}>
                                                    {slot}
                                                </td>
                                                {DAYS.map(day => {
                                                    const state = getCellState(day, slot);
                                                    const meta = getCellApproval(day, slot);
                                                    const occupiedReason = getOccupiedReason(day, slot);
                                                    const isOccupied = !!occupiedReason && state === 'default';
                                                    const clickable = !readOnly && !isOccupied;
                                                    const pending = meta?.approval_status === 'pending';
                                                    const rejected = meta?.approval_status === 'rejected';
                                                    const approvalIcon = pending ? '⏳' : rejected ? '✕' : null;
                                                    const approvalTitle = pending
                                                        ? 'Ожидает подтверждения админа'
                                                        : rejected
                                                            ? `Отклонено${meta?.approval_note ? ': ' + meta.approval_note : ''}`
                                                            : '';
                                                    const baseStyle = cellStyle(state, clickable);
                                                    const borderTint = pending ? '#fbbf24' : rejected ? '#ef4444' : null;
                                                    const styled = borderTint ? { ...baseStyle, border: `2px dashed ${borderTint}` } : baseStyle;

                                                    const renderInside = () => (
                                                        <>
                                                            {state === 'free' && (<><Check size={12} /> своб.</>)}
                                                            {state === 'busy' && (<><X size={12} /> занят</>)}
                                                            {state === 'default' && '—'}
                                                            {approvalIcon && (
                                                                <span style={{ marginLeft: '4px', fontSize: '0.7rem' }} title={approvalTitle}>
                                                                    {approvalIcon}
                                                                </span>
                                                            )}
                                                        </>
                                                    );
                                                    return (
                                                        <td key={day} style={{ padding: '4px 6px', borderBottom: '1px solid #e2e8f0' }}>
                                                            {isOccupied ? (
                                                                <span
                                                                    style={{
                                                                        ...cellStyle('default', false),
                                                                        backgroundColor: '#e2e8f0',
                                                                        color: '#64748b',
                                                                        cursor: 'not-allowed',
                                                                        fontStyle: 'italic',
                                                                        fontSize: '0.7rem'
                                                                    }}
                                                                    title={occupiedReason}
                                                                >
                                                                    ⊘ занято
                                                                </span>
                                                            ) : clickable ? (
                                                                <button
                                                                    type="button"
                                                                    onClick={() => cycleCell(day, slot)}
                                                                    style={styled}
                                                                    title={approvalTitle || undefined}
                                                                    aria-label={`${day} ${slot}: ${state === 'free' ? 'свободно' : state === 'busy' ? 'занят' : 'не указано'}`}
                                                                >
                                                                    {renderInside()}
                                                                </button>
                                                            ) : (
                                                                <span style={styled} title={approvalTitle || undefined}>
                                                                    {renderInside()}
                                                                </span>
                                                            )}
                                                            {isAdmin && pending && meta?.id && (
                                                                <div style={{ display: 'flex', gap: '4px', marginTop: '4px', justifyContent: 'center' }}>
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => handleReview(meta.id, 'approved')}
                                                                        title="Подтвердить"
                                                                        style={{
                                                                            padding: '2px 6px', fontSize: '0.65rem',
                                                                            backgroundColor: 'var(--color-success-bg)',
                                                                            color: 'var(--color-success)',
                                                                            border: '1px solid var(--color-success-border)',
                                                                            borderRadius: '4px', cursor: 'pointer',
                                                                            display: 'inline-flex', alignItems: 'center', gap: '2px'
                                                                        }}
                                                                    >
                                                                        ✓
                                                                    </button>
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => handleReview(meta.id, 'rejected')}
                                                                        title="Отклонить"
                                                                        style={{
                                                                            padding: '2px 6px', fontSize: '0.65rem',
                                                                            backgroundColor: 'var(--color-danger-bg)',
                                                                            color: 'var(--color-danger)',
                                                                            border: '1px solid var(--color-danger-border)',
                                                                            borderRadius: '4px', cursor: 'pointer',
                                                                            display: 'inline-flex', alignItems: 'center', gap: '2px'
                                                                        }}
                                                                    >
                                                                        ✕
                                                                    </button>
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
                        </>
                    )}
                </div>
            </div>

            {showAddModal && (
                <AddSlotModal
                    onClose={() => setShowAddModal(false)}
                    onSubmit={handleAddSlot}
                />
            )}

            {showGridModal && selected && (
                <TimeGridModal
                    teacherId={selected.teacherId || teachers.find(t => t.name.split(' ')[0] === selectedTeacherKey)?.id}
                    initialGrid={timeGrid}
                    onClose={() => setShowGridModal(false)}
                    onChanged={async () => {
                        const teacherId = selected.teacherId || teachers.find(t => t.name.split(' ')[0] === selectedTeacherKey)?.id;
                        if (teacherId) {
                            const fresh = await loadTeacherTimeGrid(teacherId);
                            setTimeGrid(fresh || []);
                        }
                    }}
                />
            )}
        </div>
    );
};

// ===== Add Slot Modal =====
const AddSlotModal = ({ onClose, onSubmit }) => {
    const [recurring, setRecurring] = useState(true);
    const [day, setDay] = useState('пн');
    const [date, setDate] = useState(() => {
        const d = new Date();
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    });
    const [startTime, setStartTime] = useState('16:00');
    const [endTime, setEndTime] = useState('17:00');
    const [submitting, setSubmitting] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (submitting) return;
        if (!startTime || !endTime || startTime >= endTime) {
            alert('Введите корректное время начала и окончания');
            return;
        }
        setSubmitting(true);
        try {
            await onSubmit({ recurring, day, date, startTime, endTime });
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="card modal-content" onClick={(e) => e.stopPropagation()} style={{ width: '420px', maxWidth: '95%', padding: '1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                    <h3 style={{ margin: 0 }}>Добавить слот</h3>
                    <button onClick={onClose} className="btn btn-ghost" style={{ padding: '4px' }}>
                        <X size={18} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {/* Recurring vs single */}
                    <div>
                        <label className="label">Тип</label>
                        <div style={{ display: 'flex', gap: '6px' }}>
                            <button
                                type="button"
                                onClick={() => setRecurring(true)}
                                className={recurring ? 'btn btn-primary' : 'btn btn-secondary'}
                                style={{ flex: 1, padding: '8px 12px', fontSize: '0.85rem' }}
                            >
                                🔁 Каждую неделю
                            </button>
                            <button
                                type="button"
                                onClick={() => setRecurring(false)}
                                className={!recurring ? 'btn btn-primary' : 'btn btn-secondary'}
                                style={{ flex: 1, padding: '8px 12px', fontSize: '0.85rem' }}
                            >
                                📅 Разово
                            </button>
                        </div>
                    </div>

                    {recurring ? (
                        <div>
                            <label className="label">День недели</label>
                            <select value={day} onChange={(e) => setDay(e.target.value)}>
                                <option value="пн">Понедельник</option>
                                <option value="вт">Вторник</option>
                                <option value="ср">Среда</option>
                                <option value="чт">Четверг</option>
                                <option value="пт">Пятница</option>
                                <option value="сб">Суббота</option>
                                <option value="вс">Воскресенье</option>
                            </select>
                        </div>
                    ) : (
                        <div>
                            <label className="label">Дата</label>
                            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
                        </div>
                    )}

                    <div style={{ display: 'flex', gap: '12px' }}>
                        <div style={{ flex: 1 }}>
                            <label className="label">Начало</label>
                            <input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
                        </div>
                        <div style={{ flex: 1 }}>
                            <label className="label">Конец</label>
                            <input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
                        </div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '4px' }}>
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

// ===== Time Grid Modal =====
// Lets teacher/admin add or remove time intervals shown in the left column.
// If teacher has no custom rows, fallback DEFAULT_HOUR_GRID is displayed
// — first edit (add or seed) materializes those rows into the DB.
const TimeGridModal = ({ teacherId, initialGrid, onClose, onChanged }) => {
    const [grid, setGrid] = useState(initialGrid || []);
    const [start, setStart] = useState('08:00');
    const [end, setEnd] = useState('09:00');
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState(null);

    const isFallback = !grid.some(r => r.id); // no real DB rows yet

    const reload = async () => {
        const fresh = await loadTeacherTimeGrid(teacherId);
        setGrid(fresh || []);
        if (onChanged) await onChanged();
    };

    const handleAdd = async (e) => {
        e.preventDefault();
        if (!teacherId) return;
        setError(null);
        if (!start || !end || start >= end) {
            setError('Введите корректное время начала и окончания');
            return;
        }
        setBusy(true);
        try {
            // If the teacher has no custom rows yet, materialize defaults first
            // so the new slot doesn't replace the fallback (otherwise the table
            // would shrink to a single row).
            if (isFallback) {
                await seedTeacherTimeGridFromDefault(teacherId);
            }
            await addTeacherTimeSlot(teacherId, start, end);
            await reload();
        } catch (err) {
            setError(err?.message || 'Не удалось добавить');
        } finally {
            setBusy(false);
        }
    };

    const handleDelete = async (id) => {
        if (!id) return;
        if (!window.confirm('Удалить интервал?')) return;
        try {
            await deleteTeacherTimeSlot(id);
            await reload();
        } catch (err) {
            setError(err?.message || 'Не удалось удалить');
        }
    };

    const handleSeed = async () => {
        if (!teacherId) return;
        setBusy(true);
        try {
            await seedTeacherTimeGridFromDefault(teacherId);
            await reload();
        } catch (err) {
            setError(err?.message || 'Не удалось засеять');
        } finally {
            setBusy(false);
        }
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="card modal-content" onClick={(e) => e.stopPropagation()} style={{ width: '480px', maxWidth: '95%', padding: '1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                    <h3 style={{ margin: 0 }}>Сетка времени</h3>
                    <button onClick={onClose} className="btn btn-ghost" style={{ padding: '4px' }}>
                        <X size={18} />
                    </button>
                </div>

                <p style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)', marginBottom: '12px' }}>
                    Добавьте или удалите интервалы, которые будут отображаться в столбце «Время» слева.
                    {isFallback && (
                        <span style={{ display: 'block', marginTop: '6px', color: 'var(--color-warning)' }}>
                            Сейчас используется стандартная сетка 08:00-22:00. Добавьте первый свой интервал —
                            старые слоты сохранятся и появятся в редакторе.
                        </span>
                    )}
                </p>

                <form onSubmit={handleAdd} style={{ display: 'flex', gap: '8px', alignItems: 'flex-end', marginBottom: '12px' }}>
                    <div style={{ flex: 1 }}>
                        <label className="label">Начало</label>
                        <input type="time" value={start} onChange={(e) => setStart(e.target.value)} style={{ width: '100%' }} />
                    </div>
                    <div style={{ flex: 1 }}>
                        <label className="label">Конец</label>
                        <input type="time" value={end} onChange={(e) => setEnd(e.target.value)} style={{ width: '100%' }} />
                    </div>
                    <button type="submit" className="btn btn-primary" disabled={busy} style={{ padding: '8px 12px' }}>
                        {busy ? '...' : 'Добавить'}
                    </button>
                </form>

                {error && (
                    <div style={{
                        padding: '8px 12px', marginBottom: '12px',
                        borderRadius: 'var(--radius)',
                        backgroundColor: 'var(--color-danger-bg)',
                        color: 'var(--color-danger)',
                        border: '1px solid var(--color-danger-border)',
                        fontSize: '0.82rem'
                    }}>
                        {error}
                    </div>
                )}

                <div style={{ maxHeight: '320px', overflowY: 'auto', border: '1px solid var(--color-border)', borderRadius: 'var(--radius)' }}>
                    {(grid.length === 0 ? DEFAULT_HOUR_GRID : grid).map((r, i) => (
                        <div key={r.id || `default-${i}`} style={{
                            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                            padding: '8px 12px',
                            borderBottom: i < grid.length - 1 ? '1px solid var(--color-divider)' : 'none',
                            backgroundColor: i % 2 === 0 ? 'transparent' : 'var(--color-bg-tint)',
                            fontSize: '0.88rem'
                        }}>
                            <span>{r.start_time}-{r.end_time}</span>
                            {r.id ? (
                                <button
                                    onClick={() => handleDelete(r.id)}
                                    title="Удалить"
                                    style={{
                                        background: 'none', border: 'none', cursor: 'pointer',
                                        color: 'var(--color-danger)', padding: '4px',
                                        display: 'inline-flex', alignItems: 'center'
                                    }}
                                >
                                    <Trash2 size={14} />
                                </button>
                            ) : (
                                <span style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', fontStyle: 'italic' }}>
                                    из стандартной
                                </span>
                            )}
                        </div>
                    ))}
                </div>

                {isFallback && (
                    <button
                        onClick={handleSeed}
                        className="btn btn-secondary"
                        disabled={busy}
                        style={{ width: '100%', marginTop: '12px', padding: '8px' }}
                        title="Скопировать стандартную сетку в свою — после этого можно удалять отдельные строки"
                    >
                        Скопировать стандартную сетку себе
                    </button>
                )}

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '12px' }}>
                    <button type="button" onClick={onClose} className="btn btn-secondary">Готово</button>
                </div>
            </div>
        </div>
    );
};

export default IndividualSlotsPage;
