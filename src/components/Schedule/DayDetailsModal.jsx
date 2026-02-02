import React, { useState } from 'react';
import { X, Plus, UserX, Trash2 } from 'lucide-react';
import { format } from 'date-fns';

const DayDetailsModal = ({ date, isOpen, onClose, lessons = [], onAddLesson, onAddSubstitution, onRemoveLesson }) => {
    if (!isOpen) return null;

    const dayLessons = lessons.filter(l => l.date === format(date, 'yyyy-MM-dd'));

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
                    <h2 style={{ margin: 0 }}>Расписание: {date?.toLocaleDateString()}</h2>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={24} /></button>
                </div>

                <div style={{ flex: 1, overflowY: 'auto', marginBottom: '2rem' }}>
                    {dayLessons.length === 0 ? (
                        <div style={{ textAlign: 'center', color: 'var(--color-text-muted)', padding: '2rem' }}>
                            На этот день уроков пока нет.
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            {dayLessons.map(lesson => (
                                <div key={lesson.id} style={{
                                    padding: '0.75rem',
                                    border: '1px solid var(--color-border)',
                                    borderRadius: 'var(--radius)',
                                    backgroundColor: lesson.type === 'substitution' ? '#fee2e2' : 'white',
                                    display: 'flex', flexDirection: 'column', gap: '0.5rem'
                                }}>
                                    <div style={{ display: 'grid', gridTemplateColumns: '100px 1fr 100px', gap: '1rem', alignItems: 'center' }}>
                                        {/* Column 1: Time */}
                                        <div style={{ fontWeight: 'bold', fontSize: '0.9rem', textAlign: 'center', borderRight: '1px solid #eee' }}>
                                            {lesson.startTime && lesson.endTime ? (
                                                <>
                                                    <div>{lesson.startTime}</div>
                                                    <div style={{ fontSize: '0.8rem', color: '#666' }}>-</div>
                                                    <div>{lesson.endTime}</div>
                                                </>
                                            ) : (
                                                <span style={{ color: '#999' }}>--:--</span>
                                            )}
                                        </div>

                                        {/* Column 2: Subject & Teacher */}
                                        <div>
                                            <div style={{ fontWeight: 'bold' }}>{lesson.subject}</div>
                                            <div style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
                                                {lesson.type === 'substitution' ? 'Замена: ' : ''}
                                                {lesson.details.split('•')[0]} {/* Extract teacher name */}
                                            </div>
                                        </div>

                                        {/* Column 3: Grade */}
                                        <div style={{ textAlign: 'center', fontSize: '0.9rem', fontWeight: '500', color: '#444' }}>
                                            {lesson.grade}
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
                                                        onAddSubstitution(lesson.teacherId, lesson.lessonNumber, lesson.subject, lesson.grade, lesson.startTime, lesson.endTime);
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
                            ))}
                        </div>
                    )}
                </div>

                <div style={{ display: 'flex', gap: '1rem', borderTop: '1px solid var(--color-border)', paddingTop: '1rem' }}>
                    <button className="btn btn-primary" style={{ flex: 1 }} onClick={() => { onClose(); onAddLesson(); }}>
                        <Plus size={18} />
                        Добавить урок
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
