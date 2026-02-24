import React from 'react';
import { X, Plus, UserX, Trash2, Users } from 'lucide-react';
import { format } from 'date-fns';
import { useSchedule } from '../../context/ScheduleContext';

const DayDetailsModal = ({ date, isOpen, onClose, lessons = [], selectedClass = 'all', onAddLesson, onAddSubstitution, onAddClub, onRemoveLesson }) => {
    const { teachers } = useSchedule();

    if (!isOpen) return null;

    // Resolve a partial teacher name (last name) to full name from teachers list
    const resolveFullName = (partialName) => {
        if (!partialName || partialName === 'Не назначен') return partialName;
        if (partialName.includes(' ')) return partialName;
        const match = teachers.find(t => t.name.split(' ')[0] === partialName);
        return match ? match.name : partialName;
    };

    // Resolve teacher name to teacher ID
    const resolveTeacherId = (lesson) => {
        if (lesson.teacherId) return lesson.teacherId;
        const name = lesson.teacher || '';
        if (!name || name === 'Не назначен') return null;
        const match = teachers.find(t => t.name === name || t.name.split(' ')[0] === name);
        return match ? match.id : null;
    };

    const allDayLessons = lessons.filter(l => l.date === format(date, 'yyyy-MM-dd'));
    const dayLessons = selectedClass === 'all'
        ? allDayLessons
        : allDayLessons.filter(l => (l.className || l.grade) === selectedClass);

    // Normalize lesson data (schedule events vs user events have different fields)
    const normalize = (lesson) => {
        // Time: schedule events have "time", user events have "startTime"/"endTime"
        let startTime = lesson.startTime || '';
        let endTime = lesson.endTime || '';
        if (!startTime && lesson.time) {
            const parts = lesson.time.split('-');
            startTime = parts[0] || '';
            endTime = parts[1] || '';
        }

        // Teacher: schedule events have "teacher", user events have details with "Name • Subject"
        let teacherName = lesson.teacher || '';
        if (!teacherName && lesson.details) {
            const bulletParts = lesson.details.split('•');
            if (bulletParts.length > 1) teacherName = bulletParts[0].trim();
        }
        // Resolve partial name (last name only) to full name from teachers list
        teacherName = resolveFullName(teacherName);

        // Grade: schedule events have "className", user events have "grade"
        const grade = lesson.className || lesson.grade || '';

        return { startTime, endTime, teacherName, grade };
    };

    const handleDelete = (lessonId) => {
        if (confirm('Вы уверены, что хотите удалить этот урок из расписания?')) {
            onRemoveLesson(lessonId);
        }
    };

    return (
        <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1000,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            backdropFilter: 'blur(4px)'
        }}>
            <div className="card" style={{ width: '600px', maxWidth: '95%', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                    <h2 style={{ margin: 0 }}>
                        Расписание: {date?.toLocaleDateString()}
                        {selectedClass !== 'all' && <span style={{ fontSize: '0.85rem', color: '#6366f1', marginLeft: '8px' }}>({selectedClass})</span>}
                    </h2>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={24} /></button>
                </div>

                <div style={{ flex: 1, overflowY: 'auto', marginBottom: '2rem' }}>
                    {dayLessons.length === 0 ? (
                        <div style={{ textAlign: 'center', color: 'var(--color-text-muted)', padding: '2rem' }}>
                            На этот день уроков пока нет.
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            {dayLessons.map(lesson => {
                                const n = normalize(lesson);
                                return (
                                <div key={lesson.id} style={{
                                    padding: '0.75rem',
                                    border: '1px solid var(--color-border)',
                                    borderRadius: 'var(--radius)',
                                    backgroundColor: lesson.type === 'substitution' ? '#fee2e2' : lesson.type === 'club' ? '#faf5ff' : 'white',
                                    display: 'flex', flexDirection: 'column', gap: '0.5rem'
                                }}>
                                    <div style={{ display: 'grid', gridTemplateColumns: '100px 1fr 100px', gap: '1rem', alignItems: 'center' }}>
                                        {/* Column 1: Time */}
                                        <div style={{ fontWeight: 'bold', fontSize: '0.9rem', textAlign: 'center', borderRight: '1px solid #eee' }}>
                                            {n.startTime ? (
                                                <>
                                                    <div>{n.startTime}</div>
                                                    <div style={{ fontSize: '0.8rem', color: '#666' }}>-</div>
                                                    <div>{n.endTime}</div>
                                                </>
                                            ) : (
                                                <span style={{ color: '#999' }}>--:--</span>
                                            )}
                                        </div>

                                        {/* Column 2: Subject & Teacher */}
                                        <div>
                                            <div style={{ fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                {lesson.type === 'club' && <span>🎯</span>}
                                                {lesson.subject}
                                            </div>
                                            <div style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
                                                {lesson.type === 'substitution' && 'Замена: '}
                                                {lesson.type === 'club' && 'Кружок: '}
                                                {n.teacherName}
                                            </div>
                                        </div>

                                        {/* Column 3: Grade */}
                                        <div style={{ textAlign: 'center', fontSize: '0.9rem', fontWeight: '500', color: '#444' }}>
                                            {n.grade}
                                        </div>
                                    </div>

                                    {/* Actions Row */}
                                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', borderTop: '1px dashed #eee', paddingTop: '0.5rem' }}>
                                        {lesson.type !== 'substitution' && (
                                            <>
                                                <button
                                                    className="btn btn-secondary"
                                                    style={{ fontSize: '0.75rem', padding: '0.2rem 0.5rem' }}
                                                    onClick={() => {
                                                        onClose();
                                                        onAddSubstitution(
                                                            resolveTeacherId(lesson),
                                                            lesson.lessonNumber || null,
                                                            lesson.subject,
                                                            n.grade,
                                                            n.startTime,
                                                            n.endTime
                                                        );
                                                    }}
                                                    title="Назначить замену"
                                                >
                                                    <UserX size={14} style={{ marginRight: '4px' }} />
                                                    Заменить
                                                </button>
                                                <button
                                                    className="btn btn-secondary"
                                                    style={{ fontSize: '0.75rem', padding: '0.2rem 0.5rem', color: '#ef4444', borderColor: '#fee2e2' }}
                                                    onClick={() => handleDelete(lesson.id)}
                                                    title="Удалить урок"
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            </>
                                        )}
                                        {lesson.type === 'substitution' && (
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                <span style={{ fontSize: '0.75rem', color: '#dc2626', fontWeight: 'bold' }}>ЗАМЕНА</span>
                                                <button
                                                    className="btn btn-secondary"
                                                    style={{ fontSize: '0.75rem', padding: '0.2rem 0.5rem', color: '#ef4444' }}
                                                    onClick={() => handleDelete(lesson.id)}
                                                    title="Удалить замену"
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                <div style={{ display: 'flex', gap: '0.75rem', borderTop: '1px solid var(--color-border)', paddingTop: '1rem', flexWrap: 'wrap' }}>
                    <button className="btn btn-primary" style={{ flex: 1 }} onClick={() => { onClose(); onAddLesson(); }}>
                        <Plus size={18} />
                        Добавить урок
                    </button>
                    <button
                        className="btn"
                        style={{
                            flex: 1,
                            backgroundColor: '#8b5cf6',
                            color: 'white',
                            borderColor: '#8b5cf6'
                        }}
                        onClick={() => { onClose(); onAddClub && onAddClub(); }}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#7c3aed'}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#8b5cf6'}
                    >
                        <Users size={18} />
                        Добавить кружок
                    </button>
                    <button
                        className="btn btn-secondary"
                        style={{ flex: 1, opacity: 0.5, cursor: 'not-allowed' }}
                        disabled={true}
                        title="Для замены выберите конкретный урок из списка выше"
                    >
                        <UserX size={18} />
                        Назначить замену
                    </button>
                </div>

            </div>
        </div>
    );
};

export default DayDetailsModal;
