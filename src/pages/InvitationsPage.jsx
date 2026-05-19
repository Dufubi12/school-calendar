import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useSchedule } from '../context/ScheduleContext';
import { useAuth } from '../context/AuthContext';
import { Mail, Plus, Check, X, Trash2, Clock } from 'lucide-react';
import {
    loadInvitations as apiLoadInvitations,
    createInvitation as apiCreateInvitation,
    respondToInvitation as apiRespondToInvitation,
    deleteInvitation as apiDeleteInvitation
} from '../lib/api';
import RoleFilterTabs, { filterByRole, isTutor } from '../components/RoleFilterTabs';
import { REAL_SCHEDULE } from '../data/mockData';

// Expose REAL_SCHEDULE for conflict-check (used inside modal useMemo)
if (typeof window !== 'undefined') {
    window.__REAL_SCHEDULE__ = REAL_SCHEDULE;
}

const STATUS_LABELS = {
    pending: 'Ожидает',
    accepted: 'Принято',
    declined: 'Отклонено'
};

const STATUS_STYLES = {
    pending: { backgroundColor: '#fef3c7', color: '#92400e' },
    accepted: { backgroundColor: '#d1fae5', color: '#065f46' },
    declined: { backgroundColor: '#fee2e2', color: '#991b1b' }
};

const SECTION_LABELS = {
    pending: 'Ожидают',
    accepted: 'Приняты',
    declined: 'Отклонены'
};

// Map a row returned by createInvitation (snake_case from DB) to UI shape.
const mapDbRow = (row) => ({
    id: row.id,
    teacherId: row.teacher_id,
    teacherName: row.teacher_name,
    date: row.invite_date,
    time: row.time_slot,
    subject: row.subject,
    grade: row.grade,
    note: row.note,
    studentName: row.student_name || null,
    lessonKind: row.lesson_kind || null,
    status: row.status,
    createdAt: row.created_at,
    respondedAt: row.responded_at,
});

const LESSON_KINDS = ['Групповой', 'ИЗ', 'ИМ', 'ОГЭ', 'ЕГЭ', 'Другое'];

const LESSON_KIND_STYLES = {
    'Групповой':  { bg: '#dbeafe', color: '#1e40af' },
    'ИЗ':         { bg: '#fef3c7', color: '#92400e' },
    'ИМ':         { bg: '#ede9fe', color: '#6b21a8' },
    'ОГЭ':        { bg: '#fce7f3', color: '#9d174d' },
    'ЕГЭ':        { bg: '#ffe4e6', color: '#9f1239' },
    'Другое':     { bg: '#e5e7eb', color: '#374151' },
};

const formatDate = (dateStr) => {
    try {
        const d = new Date(dateStr + 'T00:00:00');
        return d.toLocaleDateString('ru-RU', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            weekday: 'short'
        });
    } catch {
        return dateStr;
    }
};

const formatTimestamp = (iso) => {
    if (!iso) return '';
    try {
        const d = new Date(iso);
        return d.toLocaleString('ru-RU', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    } catch {
        return '';
    }
};

const StatusBadge = ({ status }) => (
    <span style={{
        padding: '3px 10px',
        borderRadius: '12px',
        fontSize: '0.75rem',
        fontWeight: 600,
        ...STATUS_STYLES[status]
    }}>
        {STATUS_LABELS[status]}
    </span>
);

const InvitationCard = ({ invitation, isAdminView, onDelete, onAccept, onDecline }) => {
    const canRespond = !isAdminView && invitation.status === 'pending';
    return (
        <div style={{
            backgroundColor: '#fff',
            border: '1px solid #e5e7eb',
            borderRadius: '10px',
            padding: '14px 16px',
            marginBottom: '12px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.06)'
        }}>
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                gap: '12px',
                marginBottom: '10px',
                flexWrap: 'wrap'
            }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1, minWidth: '200px' }}>
                    <div style={{ fontWeight: 600, fontSize: '1rem' }}>
                        {invitation.teacherName}
                    </div>
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        fontSize: '0.85rem',
                        color: '#6b7280'
                    }}>
                        <Clock size={14} />
                        <span>{formatDate(invitation.date)} · {invitation.time}</span>
                    </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <StatusBadge status={invitation.status} />
                    {isAdminView && (
                        <button
                            onClick={() => onDelete(invitation.id)}
                            title="Удалить приглашение"
                            style={{
                                padding: '6px',
                                border: 'none',
                                borderRadius: '6px',
                                backgroundColor: 'transparent',
                                cursor: 'pointer',
                                color: '#dc2626',
                                display: 'flex',
                                alignItems: 'center'
                            }}
                            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#fee2e2'; }}
                            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                        >
                            <Trash2 size={16} />
                        </button>
                    )}
                </div>
            </div>

            <div style={{
                fontSize: '0.9rem',
                color: '#374151',
                marginBottom: '8px',
                display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap'
            }}>
                {invitation.lessonKind && LESSON_KIND_STYLES[invitation.lessonKind] && (
                    <span style={{
                        padding: '2px 8px',
                        borderRadius: '6px',
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        backgroundColor: LESSON_KIND_STYLES[invitation.lessonKind].bg,
                        color: LESSON_KIND_STYLES[invitation.lessonKind].color
                    }}>
                        {invitation.lessonKind}
                    </span>
                )}
                <strong>{invitation.subject}</strong>
                <span style={{ color: '#6b7280' }}>· {invitation.grade}</span>
                {invitation.studentName && (
                    <span style={{ color: '#6b7280' }}>· 👤 {invitation.studentName}</span>
                )}
            </div>

            {invitation.note && (
                <div style={{
                    fontSize: '0.85rem',
                    color: '#4b5563',
                    backgroundColor: '#f9fafb',
                    padding: '8px 10px',
                    borderRadius: '6px',
                    border: '1px solid #f3f4f6',
                    marginBottom: '10px',
                    whiteSpace: 'pre-wrap'
                }}>
                    {invitation.note}
                </div>
            )}

            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: '12px',
                flexWrap: 'wrap',
                marginTop: '8px'
            }}>
                <div style={{ fontSize: '0.75rem', color: '#9ca3af' }}>
                    Создано: {formatTimestamp(invitation.createdAt)}
                    {invitation.respondedAt && (
                        <span style={{ marginLeft: '12px' }}>
                            Ответ: {formatTimestamp(invitation.respondedAt)}
                        </span>
                    )}
                </div>

                {canRespond && (
                    <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                            onClick={() => onAccept(invitation.id)}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                padding: '8px 14px',
                                border: 'none',
                                borderRadius: '8px',
                                backgroundColor: '#10b981',
                                color: '#fff',
                                fontSize: '0.85rem',
                                fontWeight: 600,
                                cursor: 'pointer'
                            }}
                        >
                            <Check size={16} />
                            Принять
                        </button>
                        <button
                            onClick={() => onDecline(invitation.id)}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                padding: '8px 14px',
                                border: 'none',
                                borderRadius: '8px',
                                backgroundColor: '#ef4444',
                                color: '#fff',
                                fontSize: '0.85rem',
                                fontWeight: 600,
                                cursor: 'pointer'
                            }}
                        >
                            <X size={16} />
                            Отклонить
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

const DAY_NAMES = ['Воскресенье', 'Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота'];

const CreateInvitationModal = ({ teachers, bellSchedule, existingInvitations, onClose, onCreate }) => {
    const [teacherId, setTeacherId] = useState('');
    const [modalRoleFilter, setModalRoleFilter] = useState('all');
    const filteredModalTeachers = useMemo(
        () => filterByRole(teachers, modalRoleFilter),
        [teachers, modalRoleFilter]
    );
    const [date, setDate] = useState(() => {
        const now = new Date();
        return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    });
    const [time, setTime] = useState(() => {
        if (bellSchedule && bellSchedule.length > 0) {
            const first = bellSchedule[0];
            return `${first.startTime}-${first.endTime}`;
        }
        return '';
    });
    const [subject, setSubject] = useState('');
    const [grade, setGrade] = useState('');
    const [note, setNote] = useState('');
    const [studentName, setStudentName] = useState('');
    const [lessonKind, setLessonKind] = useState('Групповой');
    const [error, setError] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [availability, setAvailability] = useState({});
    const [forceCreate, setForceCreate] = useState(false);

    const isIndividual = lessonKind !== 'Групповой' && lessonKind !== 'Другое';

    // Load availability once for conflict check
    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const { loadAvailability } = await import('../lib/api');
                const data = await loadAvailability();
                if (!cancelled) setAvailability(data || {});
            } catch (err) {
                console.error('Failed to load availability for conflict check', err);
            }
        })();
        return () => { cancelled = true; };
    }, []);

    // Compute conflicts whenever inputs change
    const conflicts = useMemo(() => {
        if (!teacherId || !date || !time) return [];
        const tIdNum = Number(teacherId);
        const teacher = teachers.find(t => t.id === tIdNum);
        if (!teacher) return [];
        const lastName = teacher.name.split(' ')[0];
        const issues = [];

        // 1) Day of week + school schedule (REAL_SCHEDULE)
        try {
            const dow = DAY_NAMES[new Date(date + 'T00:00:00').getDay()];
            // REAL_SCHEDULE: { className: { dayName: [{time, subject, teacher}] } }
            // We import it lazily to avoid heavy state — search via global module
            // eslint-disable-next-line no-undef
            const REAL = window.__REAL_SCHEDULE__;
            if (REAL) {
                Object.entries(REAL).forEach(([className, days]) => {
                    const lessons = days[dow] || [];
                    lessons.forEach(l => {
                        if (l.teacher === lastName && l.time === time) {
                            issues.push(`Уже занят: ${className} — ${l.subject} (${l.time})`);
                        }
                    });
                });
            }
        } catch { /* ignore */ }

        // 2) Teacher's availability marked as busy
        const tid = String(teacher.id);
        const dow = DAY_NAMES[new Date(date + 'T00:00:00').getDay()];
        const status = availability[tid]?.[dow]?.[time];
        if (status === 'busy') {
            issues.push(`Педагог отметил себя занятым в этот слот («Мои слоты»: ${dow}, ${time})`);
        }

        // 3) Existing invitation for same teacher/date/time
        const taken = (existingInvitations || []).find(inv =>
            inv.teacherId === tIdNum &&
            inv.date === date &&
            inv.time === time &&
            inv.status !== 'declined'
        );
        if (taken) {
            issues.push(`Уже есть приглашение на этот слот (статус: ${taken.status === 'accepted' ? 'принято' : 'ожидает'})`);
        }

        return issues;
    }, [teacherId, date, time, teachers, availability, existingInvitations]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (submitting) return;

        if (!teacherId) {
            setError('Выберите учителя');
            return;
        }
        if (!date) {
            setError('Укажите дату');
            return;
        }
        if (!time) {
            setError('Укажите время');
            return;
        }
        if (!subject.trim()) {
            setError('Введите название предмета');
            return;
        }
        if (!grade.trim()) {
            setError('Введите класс');
            return;
        }

        const teacher = teachers.find(t => t.id === Number(teacherId));
        if (!teacher) {
            setError('Учитель не найден');
            return;
        }

        // Conflict check — block unless forceCreate is set
        if (conflicts.length > 0 && !forceCreate) {
            setError('Есть конфликты по слоту. Отметьте «Создать всё равно» чтобы продолжить.');
            return;
        }

        setError('');
        setSubmitting(true);
        try {
            await onCreate({
                teacherId: Number(teacherId),
                teacherName: teacher.name,
                date,
                time,
                subject: subject.trim(),
                grade: grade.trim(),
                note: note.trim(),
                studentName: isIndividual ? studentName.trim() : null,
                lessonKind: lessonKind === 'Групповой' ? null : lessonKind,
            });
        } catch (err) {
            console.error('Failed to create invitation:', err);
            setError(err?.message || 'Не удалось создать приглашение');
            setSubmitting(false);
        }
    };

    return (
        <div
            onClick={onClose}
            style={{
                position: 'fixed',
                top: 0, left: 0, right: 0, bottom: 0,
                backgroundColor: 'rgba(15, 23, 42, 0.5)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 1000,
                padding: '1rem'
            }}
        >
            <div
                onClick={(e) => e.stopPropagation()}
                style={{
                    backgroundColor: '#fff',
                    borderRadius: '12px',
                    padding: '24px',
                    width: '100%',
                    maxWidth: '500px',
                    maxHeight: '90vh',
                    overflowY: 'auto',
                    boxShadow: '0 10px 25px rgba(0,0,0,0.15)'
                }}
            >
                <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '18px'
                }}>
                    <h2 style={{ margin: 0, fontSize: '1.25rem' }}>Новое приглашение</h2>
                    <button
                        onClick={onClose}
                        style={{
                            border: 'none',
                            backgroundColor: 'transparent',
                            cursor: 'pointer',
                            padding: '4px',
                            display: 'flex',
                            alignItems: 'center'
                        }}
                    >
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    <div>
                        <label style={{ fontSize: '0.85rem', fontWeight: 500, marginBottom: '4px', display: 'block' }}>
                            Учитель *
                        </label>
                        <RoleFilterTabs
                            value={modalRoleFilter}
                            onChange={(v) => { setModalRoleFilter(v); setTeacherId(''); }}
                            counts={{
                                all: teachers.length,
                                teachers: filterByRole(teachers, 'teachers').length,
                                tutors: filterByRole(teachers, 'tutors').length,
                            }}
                        />
                        <select
                            value={teacherId}
                            onChange={(e) => setTeacherId(e.target.value)}
                            style={{
                                width: '100%',
                                padding: '8px 12px',
                                borderRadius: '8px',
                                border: '2px solid #e5e7eb',
                                fontSize: '0.9rem'
                            }}
                        >
                            <option value="">-- Выберите --</option>
                            {filteredModalTeachers.map(t => (
                                <option key={t.id} value={t.id}>
                                    {t.name} ({t.subject})
                                </option>
                            ))}
                        </select>
                    </div>

                    <div style={{ display: 'flex', gap: '12px' }}>
                        <div style={{ flex: 1 }}>
                            <label style={{ fontSize: '0.85rem', fontWeight: 500, marginBottom: '4px', display: 'block' }}>
                                Дата *
                            </label>
                            <input
                                type="date"
                                value={date}
                                onChange={(e) => setDate(e.target.value)}
                                style={{
                                    width: '100%',
                                    padding: '8px 12px',
                                    borderRadius: '8px',
                                    border: '2px solid #e5e7eb',
                                    fontSize: '0.9rem',
                                    boxSizing: 'border-box'
                                }}
                            />
                        </div>
                        <div style={{ flex: 1 }}>
                            <label style={{ fontSize: '0.85rem', fontWeight: 500, marginBottom: '4px', display: 'block' }}>
                                Урок *
                            </label>
                            <select
                                value={time}
                                onChange={(e) => setTime(e.target.value)}
                                style={{
                                    width: '100%',
                                    padding: '8px 12px',
                                    borderRadius: '8px',
                                    border: '2px solid #e5e7eb',
                                    fontSize: '0.9rem'
                                }}
                            >
                                {bellSchedule && bellSchedule.map(b => {
                                    const value = `${b.startTime}-${b.endTime}`;
                                    return (
                                        <option key={value} value={value}>
                                            {b.label} ({value})
                                        </option>
                                    );
                                })}
                            </select>
                        </div>
                    </div>

                    <div>
                        <label style={{ fontSize: '0.85rem', fontWeight: 500, marginBottom: '4px', display: 'block' }}>
                            Тип занятия
                        </label>
                        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                            {LESSON_KINDS.map(k => {
                                const active = lessonKind === k;
                                const s = LESSON_KIND_STYLES[k];
                                return (
                                    <button
                                        key={k}
                                        type="button"
                                        onClick={() => setLessonKind(k)}
                                        style={{
                                            padding: '6px 12px',
                                            borderRadius: 'var(--radius)',
                                            border: '2px solid',
                                            borderColor: active ? s.color : 'transparent',
                                            backgroundColor: active ? s.bg : 'var(--color-bg-tint)',
                                            color: active ? s.color : 'var(--color-text-muted)',
                                            fontSize: '0.8rem',
                                            fontWeight: 600,
                                            cursor: 'pointer',
                                        }}
                                    >
                                        {k}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    <div style={{ display: 'flex', gap: '12px' }}>
                        <div style={{ flex: 1 }}>
                            <label style={{ fontSize: '0.85rem', fontWeight: 500, marginBottom: '4px', display: 'block' }}>
                                Предмет *
                            </label>
                            <input
                                type="text"
                                value={subject}
                                onChange={(e) => setSubject(e.target.value)}
                                placeholder="Математика"
                                style={{
                                    width: '100%',
                                    padding: '8px 12px',
                                    borderRadius: '8px',
                                    border: '2px solid #e5e7eb',
                                    fontSize: '0.9rem',
                                    boxSizing: 'border-box'
                                }}
                            />
                        </div>
                        <div style={{ flex: 1 }}>
                            <label style={{ fontSize: '0.85rem', fontWeight: 500, marginBottom: '4px', display: 'block' }}>
                                {isIndividual ? 'Класс ученика *' : 'Класс *'}
                            </label>
                            <input
                                type="text"
                                value={grade}
                                onChange={(e) => setGrade(e.target.value)}
                                placeholder="5А"
                                style={{
                                    width: '100%',
                                    padding: '8px 12px',
                                    borderRadius: '8px',
                                    border: '2px solid #e5e7eb',
                                    fontSize: '0.9rem',
                                    boxSizing: 'border-box'
                                }}
                            />
                        </div>
                    </div>

                    {isIndividual && (
                        <div>
                            <label style={{ fontSize: '0.85rem', fontWeight: 500, marginBottom: '4px', display: 'block' }}>
                                ФИ ученика
                            </label>
                            <input
                                type="text"
                                value={studentName}
                                onChange={(e) => setStudentName(e.target.value)}
                                placeholder="Иванов Иван"
                                style={{
                                    width: '100%',
                                    padding: '8px 12px',
                                    borderRadius: '8px',
                                    border: '2px solid #e5e7eb',
                                    fontSize: '0.9rem',
                                    boxSizing: 'border-box'
                                }}
                            />
                        </div>
                    )}

                    <div>
                        <label style={{ fontSize: '0.85rem', fontWeight: 500, marginBottom: '4px', display: 'block' }}>
                            Комментарий
                        </label>
                        <textarea
                            value={note}
                            onChange={(e) => setNote(e.target.value)}
                            rows={3}
                            placeholder="Дополнительная информация (необязательно)"
                            style={{
                                width: '100%',
                                padding: '8px 12px',
                                borderRadius: '8px',
                                border: '2px solid #e5e7eb',
                                fontSize: '0.9rem',
                                fontFamily: 'inherit',
                                resize: 'vertical',
                                boxSizing: 'border-box'
                            }}
                        />
                    </div>

                    {conflicts.length > 0 && (
                        <div style={{
                            padding: '10px 14px',
                            backgroundColor: 'var(--color-warning-bg)',
                            border: '1px solid var(--color-warning-border)',
                            color: 'var(--color-warning)',
                            borderRadius: '8px',
                            fontSize: '0.85rem'
                        }}>
                            <div style={{ fontWeight: 700, marginBottom: '4px' }}>⚠️ Конфликт по слоту:</div>
                            <ul style={{ margin: 0, paddingLeft: '18px' }}>
                                {conflicts.map((c, i) => <li key={i}>{c}</li>)}
                            </ul>
                            <label style={{
                                display: 'flex', alignItems: 'center', gap: '6px',
                                marginTop: '8px', fontSize: '0.82rem', cursor: 'pointer'
                            }}>
                                <input
                                    type="checkbox"
                                    checked={forceCreate}
                                    onChange={(e) => setForceCreate(e.target.checked)}
                                />
                                <span>Создать всё равно</span>
                            </label>
                        </div>
                    )}

                    {error && (
                        <div style={{
                            padding: '8px 12px',
                            backgroundColor: '#fee2e2',
                            color: '#991b1b',
                            borderRadius: '8px',
                            fontSize: '0.85rem'
                        }}>
                            {error}
                        </div>
                    )}

                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '6px' }}>
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={submitting}
                            style={{
                                padding: '9px 16px',
                                border: '1px solid #e5e7eb',
                                borderRadius: '8px',
                                backgroundColor: '#fff',
                                fontSize: '0.9rem',
                                fontWeight: 500,
                                cursor: submitting ? 'not-allowed' : 'pointer',
                                opacity: submitting ? 0.6 : 1
                            }}
                        >
                            Отмена
                        </button>
                        <button
                            type="submit"
                            disabled={submitting}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                padding: '9px 16px',
                                border: 'none',
                                borderRadius: '8px',
                                backgroundColor: 'var(--color-primary)',
                                color: '#fff',
                                fontSize: '0.9rem',
                                fontWeight: 600,
                                cursor: submitting ? 'not-allowed' : 'pointer',
                                opacity: submitting ? 0.7 : 1
                            }}
                        >
                            <Mail size={16} />
                            {submitting ? 'Отправка...' : 'Отправить'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

const InvitationsPage = () => {
    const { teachers, bellSchedule } = useSchedule();
    const { currentUser, isAdmin, isTeacher } = useAuth();
    const [invitations, setInvitations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [roleFilter, setRoleFilter] = useState('all');

    // Lookup: teacherId -> teacher (used for filter by tutor/teacher role)
    const teachersById = useMemo(() => {
        const map = {};
        teachers.forEach(t => { map[t.id] = t; });
        return map;
    }, [teachers]);

    // Initial load from Supabase
    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                setLoading(true);
                setLoadError('');
                const data = await apiLoadInvitations();
                if (!cancelled) {
                    setInvitations(data);
                }
            } catch (err) {
                console.error('Failed to load invitations:', err);
                if (!cancelled) {
                    setLoadError(err?.message || 'Не удалось загрузить приглашения');
                }
            } finally {
                if (!cancelled) {
                    setLoading(false);
                }
            }
        })();
        return () => { cancelled = true; };
    }, []);

    // Filter for current view
    const visibleInvitations = useMemo(() => {
        let base;
        if (isAdmin) {
            base = invitations;
        } else if (isTeacher && currentUser?.teacherId) {
            base = invitations.filter(inv => inv.teacherId === currentUser.teacherId);
        } else {
            base = [];
        }

        // Admin can additionally filter by role (teacher vs tutor)
        if (isAdmin && roleFilter !== 'all') {
            return base.filter(inv => {
                const teacher = teachersById[inv.teacherId];
                if (!teacher) return false;
                const tutor = isTutor(teacher);
                return roleFilter === 'tutors' ? tutor : !tutor;
            });
        }
        return base;
    }, [invitations, isAdmin, isTeacher, currentUser, roleFilter, teachersById]);

    // Group by status
    const grouped = useMemo(() => {
        const result = { pending: [], accepted: [], declined: [] };
        const sorted = [...visibleInvitations].sort((a, b) => {
            // Newest first by createdAt
            return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        });
        sorted.forEach(inv => {
            if (result[inv.status]) {
                result[inv.status].push(inv);
            }
        });
        return result;
    }, [visibleInvitations]);

    const handleCreate = useCallback(async (data) => {
        // Throws on error so the modal can display the message and stay open.
        const row = await apiCreateInvitation(data);
        const mapped = mapDbRow(row);
        setInvitations(prev => [mapped, ...prev]);
        setShowModal(false);
    }, []);

    const handleDelete = useCallback(async (id) => {
        if (!window.confirm('Удалить это приглашение?')) return;
        const previous = invitations;
        // Optimistic removal
        setInvitations(prev => prev.filter(inv => inv.id !== id));
        try {
            await apiDeleteInvitation(id);
        } catch (err) {
            console.error('Failed to delete invitation:', err);
            setInvitations(previous);
            window.alert('Не удалось удалить приглашение. Попробуйте ещё раз.');
        }
    }, [invitations]);

    const respond = useCallback(async (id, status) => {
        const previous = invitations;
        const respondedAt = new Date().toISOString();
        // Optimistic update
        setInvitations(prev => prev.map(inv =>
            inv.id === id
                ? { ...inv, status, respondedAt }
                : inv
        ));
        try {
            await apiRespondToInvitation(id, status);
        } catch (err) {
            console.error(`Failed to ${status} invitation:`, err);
            setInvitations(previous);
        }
    }, [invitations]);

    const handleAccept = useCallback((id) => respond(id, 'accepted'), [respond]);
    const handleDecline = useCallback((id) => respond(id, 'declined'), [respond]);

    const sectionOrder = isTeacher ? ['pending', 'accepted', 'declined'] : ['pending', 'accepted', 'declined'];
    const headerTitle = isAdmin ? 'Приглашения' : 'Мои приглашения';

    return (
        <div style={{ maxWidth: '900px', margin: '0 auto' }}>
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: '1rem',
                flexWrap: 'wrap',
                marginBottom: '1.5rem'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <Mail size={28} color="var(--color-primary)" />
                    <h1 style={{ margin: 0, fontSize: '1.8rem' }}>{headerTitle}</h1>
                </div>
                {isAdmin && (
                    <button
                        onClick={() => setShowModal(true)}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            padding: '10px 18px',
                            border: 'none',
                            borderRadius: '8px',
                            backgroundColor: 'var(--color-primary)',
                            color: '#fff',
                            fontSize: '0.9rem',
                            fontWeight: 600,
                            cursor: 'pointer',
                            boxShadow: '0 1px 3px rgba(59, 130, 246, 0.3)'
                        }}
                    >
                        <Plus size={18} />
                        Создать приглашение
                    </button>
                )}
            </div>

            {isAdmin && (
                <RoleFilterTabs
                    value={roleFilter}
                    onChange={setRoleFilter}
                />
            )}

            {loading ? (
                <div className="card" style={{
                    textAlign: 'center',
                    padding: '3rem',
                    color: 'var(--color-text-muted)'
                }}>
                    Загрузка…
                </div>
            ) : loadError ? (
                <div className="card" style={{
                    textAlign: 'center',
                    padding: '2rem',
                    color: '#991b1b',
                    backgroundColor: '#fee2e2',
                    borderRadius: '10px'
                }}>
                    {loadError}
                </div>
            ) : visibleInvitations.length === 0 ? (
                <div className="card" style={{
                    textAlign: 'center',
                    padding: '3rem',
                    color: 'var(--color-text-muted)'
                }}>
                    {isAdmin
                        ? 'Пока нет приглашений. Нажмите "Создать приглашение", чтобы отправить первое.'
                        : 'У вас пока нет приглашений.'}
                </div>
            ) : (
                sectionOrder.map(status => {
                    const items = grouped[status];
                    if (items.length === 0) return null;
                    const isPendingSection = status === 'pending';
                    return (
                        <div key={status} style={{ marginBottom: '1.5rem' }}>
                            <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '10px',
                                marginBottom: '12px',
                                paddingBottom: '8px',
                                borderBottom: isPendingSection && isTeacher
                                    ? '2px solid #f59e0b'
                                    : '1px solid #e5e7eb'
                            }}>
                                <h2 style={{
                                    margin: 0,
                                    fontSize: isPendingSection && isTeacher ? '1.25rem' : '1.1rem',
                                    color: isPendingSection && isTeacher ? '#92400e' : '#1f2937'
                                }}>
                                    {SECTION_LABELS[status]}
                                </h2>
                                <span style={{
                                    padding: '2px 10px',
                                    borderRadius: '12px',
                                    fontSize: '0.8rem',
                                    fontWeight: 600,
                                    ...STATUS_STYLES[status]
                                }}>
                                    {items.length}
                                </span>
                            </div>
                            <div>
                                {items.map(inv => (
                                    <InvitationCard
                                        key={inv.id}
                                        invitation={inv}
                                        isAdminView={isAdmin}
                                        onDelete={handleDelete}
                                        onAccept={handleAccept}
                                        onDecline={handleDecline}
                                    />
                                ))}
                            </div>
                        </div>
                    );
                })
            )}

            {showModal && isAdmin && (
                <CreateInvitationModal
                    teachers={teachers}
                    bellSchedule={bellSchedule}
                    existingInvitations={invitations}
                    onClose={() => setShowModal(false)}
                    onCreate={handleCreate}
                />
            )}
        </div>
    );
};

export default InvitationsPage;
