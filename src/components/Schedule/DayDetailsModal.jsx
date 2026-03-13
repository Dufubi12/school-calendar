import { useState, useMemo } from 'react';
import { X, Plus, UserX, Trash2, Users, ChevronDown, ChevronRight } from 'lucide-react';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';

const DayDetailsModal = ({ date, isOpen, onClose, lessons = [], onAddLesson, onAddSubstitution, onAddClub, onRemoveLesson }) => {
    const [expandedClasses, setExpandedClasses] = useState({});
    const [filterClass, setFilterClass] = useState('all');

    if (!isOpen || !date) return null;

    const dateStr = format(date, 'yyyy-MM-dd');
    const dayLessons = lessons.filter(l => l.date === dateStr);

    // Group by className
    const grouped = {};
    dayLessons.forEach(lesson => {
        const cls = lesson.className || 'Без класса';
        if (!grouped[cls]) grouped[cls] = [];
        grouped[cls].push(lesson);
    });

    // Sort classes naturally: 1А, 1Б, 2А, ...
    const sortedClasses = Object.keys(grouped).sort((a, b) => {
        const numA = parseInt(a) || 99;
        const numB = parseInt(b) || 99;
        if (numA !== numB) return numA - numB;
        return a.localeCompare(b, 'ru');
    });

    // Sort lessons within each class by time
    sortedClasses.forEach(cls => {
        grouped[cls].sort((a, b) => (a.startTime || a.time || '').localeCompare(b.startTime || b.time || ''));
    });

    const toggleClass = (cls) => {
        setExpandedClasses(prev => ({ ...prev, [cls]: !prev[cls] }));
    };

    const filteredClasses = filterClass === 'all' ? sortedClasses : sortedClasses.filter(c => c === filterClass);

    const handleDelete = (lessonId) => {
        if (confirm('Удалить этот урок из расписания?')) {
            onRemoveLesson(lessonId);
        }
    };

    const dateFormatted = format(date, 'd MMMM yyyy, EEEE', { locale: ru });

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="card" onClick={e => e.stopPropagation()} style={{
                width: '700px', maxWidth: '95vw', maxHeight: '90vh',
                display: 'flex', flexDirection: 'column', padding: 0
            }}>
                {/* Header */}
                <div style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--color-border)'
                }}>
                    <div>
                        <h2 style={{ margin: 0, fontSize: '1.1rem' }}>{dateFormatted}</h2>
                        <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                            {dayLessons.length} уроков, {sortedClasses.length} классов
                        </span>
                    </div>
                    <button onClick={onClose} className="icon-btn"><X size={20} /></button>
                </div>

                {/* Class filter */}
                {sortedClasses.length > 1 && (
                    <div style={{
                        padding: '8px 1.5rem', borderBottom: '1px solid var(--color-border)',
                        display: 'flex', gap: '4px', flexWrap: 'wrap', background: '#f8fafc'
                    }}>
                        <button
                            onClick={() => setFilterClass('all')}
                            style={{
                                padding: '3px 10px', borderRadius: '12px', border: '1px solid',
                                fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer',
                                background: filterClass === 'all' ? 'var(--color-primary)' : 'white',
                                color: filterClass === 'all' ? 'white' : 'var(--color-text-muted)',
                                borderColor: filterClass === 'all' ? 'var(--color-primary)' : 'var(--color-border)'
                            }}
                        >
                            Все
                        </button>
                        {sortedClasses.map(cls => (
                            <button
                                key={cls}
                                onClick={() => setFilterClass(cls === filterClass ? 'all' : cls)}
                                style={{
                                    padding: '3px 10px', borderRadius: '12px', border: '1px solid',
                                    fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer',
                                    background: filterClass === cls ? 'var(--color-primary)' : 'white',
                                    color: filterClass === cls ? 'white' : 'var(--color-text-muted)',
                                    borderColor: filterClass === cls ? 'var(--color-primary)' : 'var(--color-border)'
                                }}
                            >
                                {cls} <span style={{ opacity: 0.7 }}>({grouped[cls].length})</span>
                            </button>
                        ))}
                    </div>
                )}

                {/* Content */}
                <div style={{ flex: 1, overflowY: 'auto', padding: '1rem 1.5rem' }}>
                    {dayLessons.length === 0 ? (
                        <div style={{ textAlign: 'center', color: 'var(--color-text-muted)', padding: '3rem 1rem' }}>
                            На этот день уроков нет
                        </div>
                    ) : (
                        filteredClasses.map(cls => {
                            const classLessons = grouped[cls];
                            const isExpanded = expandedClasses[cls] !== false; // default open

                            return (
                                <div key={cls} style={{ marginBottom: '12px' }}>
                                    {/* Class header */}
                                    <button
                                        onClick={() => toggleClass(cls)}
                                        style={{
                                            width: '100%', display: 'flex', alignItems: 'center', gap: '8px',
                                            padding: '6px 10px', border: 'none', borderRadius: '6px',
                                            background: '#f1f5f9', cursor: 'pointer', textAlign: 'left'
                                        }}
                                    >
                                        {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                                        <span style={{ fontWeight: 700, fontSize: '0.95rem', color: '#1e293b' }}>{cls}</span>
                                        <span style={{
                                            fontSize: '0.7rem', padding: '1px 8px', borderRadius: '10px',
                                            background: '#e2e8f0', color: '#475569', fontWeight: 600
                                        }}>
                                            {classLessons.length}
                                        </span>
                                    </button>

                                    {/* Lessons */}
                                    {isExpanded && (
                                        <div style={{ padding: '4px 0 0 8px' }}>
                                            {classLessons.map(lesson => {
                                                const startTime = lesson.startTime || (lesson.time || '').split('-')[0] || '';
                                                const endTime = lesson.endTime || (lesson.time || '').split('-')[1] || '';
                                                const isSub = lesson.type === 'substitution';
                                                const isClub = lesson.type === 'club';

                                                let rowBg = 'white';
                                                if (isSub) rowBg = '#fef2f2';
                                                if (isClub) rowBg = '#faf5ff';

                                                return (
                                                    <div key={lesson.id} style={{
                                                        display: 'flex', alignItems: 'center', gap: '10px',
                                                        padding: '6px 10px', borderBottom: '1px solid #f1f5f9',
                                                        background: rowBg, borderRadius: '4px', marginBottom: '2px'
                                                    }}>
                                                        {/* Time */}
                                                        <div style={{
                                                            width: '85px', flexShrink: 0,
                                                            fontWeight: 600, fontSize: '0.82rem',
                                                            color: startTime ? '#1e293b' : '#94a3b8',
                                                            fontVariantNumeric: 'tabular-nums'
                                                        }}>
                                                            {startTime && endTime
                                                                ? `${startTime} - ${endTime}`
                                                                : '--:--'}
                                                        </div>

                                                        {/* Subject */}
                                                        <div style={{ flex: 1, minWidth: 0 }}>
                                                            <div style={{
                                                                fontWeight: 600, fontSize: '0.85rem',
                                                                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
                                                            }}>
                                                                {isSub && <span style={{ color: '#dc2626', marginRight: '4px' }}>ЗАМЕНА</span>}
                                                                {lesson.subject}
                                                            </div>
                                                        </div>

                                                        {/* Teacher */}
                                                        <div style={{
                                                            fontSize: '0.8rem', color: '#475569', fontWeight: 500,
                                                            flexShrink: 0, maxWidth: '140px',
                                                            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
                                                        }}>
                                                            {lesson.teacher || ''}
                                                        </div>

                                                        {/* Actions */}
                                                        <div style={{ display: 'flex', gap: '2px', flexShrink: 0 }}>
                                                            {!isSub && (
                                                                <button
                                                                    className="icon-btn"
                                                                    style={{ width: '28px', height: '28px' }}
                                                                    onClick={() => {
                                                                        onClose();
                                                                        onAddSubstitution(
                                                                            lesson.teacherId, lesson.lessonNumber,
                                                                            lesson.subject, lesson.className,
                                                                            startTime, endTime
                                                                        );
                                                                    }}
                                                                    title="Назначить замену"
                                                                >
                                                                    <UserX size={14} />
                                                                </button>
                                                            )}
                                                            <button
                                                                className="icon-btn"
                                                                style={{ width: '28px', height: '28px', color: '#ef4444' }}
                                                                onClick={() => handleDelete(lesson.id)}
                                                                title="Удалить"
                                                            >
                                                                <Trash2 size={14} />
                                                            </button>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            );
                        })
                    )}
                </div>

                {/* Footer actions */}
                <div style={{
                    display: 'flex', gap: '8px', padding: '1rem 1.5rem',
                    borderTop: '1px solid var(--color-border)', flexWrap: 'wrap'
                }}>
                    <button className="btn btn-primary" style={{ flex: 1 }} onClick={() => { onClose(); onAddLesson(); }}>
                        <Plus size={16} /> Урок
                    </button>
                    <button
                        className="btn"
                        style={{ flex: 1, backgroundColor: '#8b5cf6', color: 'white', borderColor: '#8b5cf6' }}
                        onClick={() => { onClose(); onAddClub && onAddClub(); }}
                    >
                        <Users size={16} /> Кружок
                    </button>
                </div>
            </div>
        </div>
    );
};

export default DayDetailsModal;
