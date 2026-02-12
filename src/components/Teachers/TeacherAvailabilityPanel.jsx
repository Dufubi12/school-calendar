import React, { useState, useMemo } from 'react';
import { useSchedule } from '../../context/ScheduleContext';
import { getAvailableTeachers, DEFAULT_SCHEDULE_TEMPLATE } from '../../utils/scheduleUtils';
import { format } from 'date-fns';
import { UserCheck, UserX, Clock, Filter, X } from 'lucide-react';

/**
 * Панель показывающая занятость учителей в конкретное время
 * Используется для быстрого поиска свободных учителей для замены
 */
const TeacherAvailabilityPanel = ({ date, onSelectTeacher, selectedSubject = null, isOpen, onClose }) => {
    const { teachers, timeSlots } = useSchedule();
    const [filterSubject, setFilterSubject] = useState(selectedSubject);
    const [selectedTime, setSelectedTime] = useState(null);

    // Создаем временной слот для проверки
    const timeSlot = useMemo(() => {
        if (!selectedTime) return null;

        const template = DEFAULT_SCHEDULE_TEMPLATE.find(t => t.lessonNumber === selectedTime);
        return {
            date: date ? format(new Date(date), 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'),
            startTime: template?.startTime || '08:30',
            endTime: template?.endTime || '09:15',
            lessonNumber: selectedTime
        };
    }, [selectedTime, date]);

    // Получаем список учителей с информацией о доступности
    const teachersWithAvailability = useMemo(() => {
        if (!timeSlot) return [];

        const available = getAvailableTeachers(
            timeSlot,
            teachers,
            timeSlots,
            filterSubject
        );

        // Сортируем: сначала свободные, потом по нагрузке
        return available.sort((a, b) => {
            if (a.hasConflict === b.hasConflict) {
                return a.workload - b.workload;
            }
            return a.hasConflict ? 1 : -1;
        });
    }, [timeSlot, teachers, timeSlots, filterSubject]);

    // Статистика
    const stats = useMemo(() => {
        if (!teachersWithAvailability.length) return { free: 0, busy: 0 };

        const free = teachersWithAvailability.filter(t => !t.hasConflict).length;
        const busy = teachersWithAvailability.filter(t => t.hasConflict).length;

        return { free, busy };
    }, [teachersWithAvailability]);

    if (!isOpen) return null;

    return (
        <div style={{
            position: 'fixed',
            top: 0,
            right: 0,
            bottom: 0,
            width: '450px',
            backgroundColor: 'var(--color-bg, #fff)',
            boxShadow: '-4px 0 12px rgba(0,0,0,0.1)',
            zIndex: 1000,
            display: 'flex',
            flexDirection: 'column',
            borderLeft: '1px solid var(--color-border, #e5e7eb)'
        }}>
            {/* Заголовок */}
            <div style={{
                padding: '1.5rem',
                borderBottom: '1px solid var(--color-border, #e5e7eb)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                backgroundColor: '#f8f9fa'
            }}>
                <div>
                    <h2 style={{ margin: 0, fontSize: '1.3rem', fontWeight: 600 }}>
                        Кто свободен?
                    </h2>
                    {date && (
                        <p style={{ margin: '0.25rem 0 0', fontSize: '0.9rem', color: 'var(--color-text-muted, #666)' }}>
                            {format(new Date(date), 'dd.MM.yyyy')}
                        </p>
                    )}
                </div>
                <button
                    onClick={onClose}
                    style={{
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        padding: '0.5rem',
                        color: 'var(--color-text-muted, #666)'
                    }}
                >
                    <X size={24} />
                </button>
            </div>

            {/* Фильтры */}
            <div style={{ padding: '1rem', borderBottom: '1px solid var(--color-border, #e5e7eb)', backgroundColor: '#fafafa' }}>
                {/* Выбор времени */}
                <div style={{ marginBottom: '1rem' }}>
                    <label className="label" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Clock size={16} />
                        Выберите урок
                    </label>
                    <select
                        className="input-field"
                        value={selectedTime || ''}
                        onChange={(e) => setSelectedTime(Number(e.target.value))}
                        style={{ width: '100%' }}
                    >
                        <option value="">-- Выберите урок --</option>
                        {DEFAULT_SCHEDULE_TEMPLATE.map(lesson => (
                            <option key={lesson.lessonNumber} value={lesson.lessonNumber}>
                                {lesson.lessonNumber} урок ({lesson.startTime} - {lesson.endTime})
                            </option>
                        ))}
                    </select>
                </div>

                {/* Фильтр по предмету */}
                <div>
                    <label className="label" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Filter size={16} />
                        Фильтр по предмету
                    </label>
                    <select
                        className="input-field"
                        value={filterSubject || ''}
                        onChange={(e) => setFilterSubject(e.target.value || null)}
                        style={{ width: '100%' }}
                    >
                        <option value="">Все предметы</option>
                        {Array.from(new Set(teachers.map(t => t.subject))).map(subject => (
                            <option key={subject} value={subject}>{subject}</option>
                        ))}
                    </select>
                </div>

                {/* Статистика */}
                {selectedTime && (
                    <div style={{
                        marginTop: '1rem',
                        padding: '0.75rem',
                        backgroundColor: '#fff',
                        borderRadius: '8px',
                        display: 'flex',
                        gap: '1rem',
                        border: '1px solid var(--color-border, #e5e7eb)'
                    }}>
                        <div style={{ flex: 1, textAlign: 'center' }}>
                            <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#10b981' }}>
                                {stats.free}
                            </div>
                            <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted, #666)' }}>
                                🟢 Свободны
                            </div>
                        </div>
                        <div style={{ width: '1px', backgroundColor: 'var(--color-border, #e5e7eb)' }}></div>
                        <div style={{ flex: 1, textAlign: 'center' }}>
                            <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#ef4444' }}>
                                {stats.busy}
                            </div>
                            <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted, #666)' }}>
                                🔴 Заняты
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Список учителей */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '1rem' }}>
                {!selectedTime && (
                    <div style={{
                        textAlign: 'center',
                        padding: '3rem 1rem',
                        color: 'var(--color-text-muted, #666)'
                    }}>
                        <Clock size={48} style={{ opacity: 0.3, margin: '0 auto 1rem' }} />
                        <p>Выберите урок, чтобы увидеть<br />свободных учителей</p>
                    </div>
                )}

                {selectedTime && teachersWithAvailability.length === 0 && (
                    <div style={{
                        textAlign: 'center',
                        padding: '3rem 1rem',
                        color: 'var(--color-text-muted, #666)'
                    }}>
                        <UserX size={48} style={{ opacity: 0.3, margin: '0 auto 1rem' }} />
                        <p>Учителя не найдены</p>
                    </div>
                )}

                {selectedTime && teachersWithAvailability.map(teacher => (
                    <div
                        key={teacher.id}
                        onClick={() => !teacher.hasConflict && onSelectTeacher && onSelectTeacher(teacher)}
                        style={{
                            padding: '1rem',
                            marginBottom: '0.75rem',
                            backgroundColor: teacher.hasConflict ? '#fef2f2' : '#f0fdf4',
                            border: `2px solid ${teacher.hasConflict ? '#fecaca' : '#bbf7d0'}`,
                            borderRadius: '8px',
                            cursor: teacher.hasConflict ? 'not-allowed' : 'pointer',
                            opacity: teacher.hasConflict ? 0.6 : 1,
                            transition: 'all 0.2s',
                        }}
                        onMouseEnter={(e) => {
                            if (!teacher.hasConflict) {
                                e.currentTarget.style.transform = 'translateX(-4px)';
                                e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)';
                            }
                        }}
                        onMouseLeave={(e) => {
                            if (!teacher.hasConflict) {
                                e.currentTarget.style.transform = 'translateX(0)';
                                e.currentTarget.style.boxShadow = 'none';
                            }
                        }}
                    >
                        <div style={{ display: 'flex', alignItems: 'start', gap: '0.75rem' }}>
                            {/* Иконка статуса */}
                            <div style={{
                                width: '40px',
                                height: '40px',
                                borderRadius: '50%',
                                backgroundColor: teacher.hasConflict ? '#fee2e2' : '#dcfce7',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                flexShrink: 0
                            }}>
                                {teacher.hasConflict ? (
                                    <UserX size={20} color="#ef4444" />
                                ) : (
                                    <UserCheck size={20} color="#10b981" />
                                )}
                            </div>

                            {/* Информация об учителе */}
                            <div style={{ flex: 1 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                                    <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 600 }}>
                                        {teacher.name}
                                    </h4>
                                    {teacher.hasConflict ? (
                                        <span style={{ fontSize: '1rem' }}>🔴</span>
                                    ) : (
                                        <span style={{ fontSize: '1rem' }}>🟢</span>
                                    )}
                                </div>

                                <p style={{
                                    margin: '0.25rem 0',
                                    fontSize: '0.875rem',
                                    color: 'var(--color-text-muted, #666)'
                                }}>
                                    {teacher.subject}
                                </p>

                                {/* Статус */}
                                <div style={{
                                    marginTop: '0.5rem',
                                    fontSize: '0.8rem',
                                    fontWeight: 500
                                }}>
                                    {teacher.hasConflict ? (
                                        <span style={{ color: '#ef4444' }}>
                                            ❌ Занят в это время
                                        </span>
                                    ) : (
                                        <span style={{ color: '#10b981' }}>
                                            ✅ Свободен
                                        </span>
                                    )}
                                </div>

                                {/* Нагрузка */}
                                <div style={{ marginTop: '0.5rem' }}>
                                    <div style={{
                                        fontSize: '0.75rem',
                                        color: 'var(--color-text-muted, #666)',
                                        marginBottom: '0.25rem'
                                    }}>
                                        Нагрузка: {teacher.workload}% ({teacher.totalLessons} уроков)
                                    </div>
                                    <div style={{
                                        height: '4px',
                                        backgroundColor: '#e5e7eb',
                                        borderRadius: '2px',
                                        overflow: 'hidden'
                                    }}>
                                        <div style={{
                                            width: `${Math.min(teacher.workload, 100)}%`,
                                            height: '100%',
                                            backgroundColor: teacher.workload >= 80 ? '#ef4444' :
                                                           teacher.workload >= 60 ? '#f59e0b' : '#10b981',
                                            transition: 'width 0.3s'
                                        }} />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default TeacherAvailabilityPanel;
