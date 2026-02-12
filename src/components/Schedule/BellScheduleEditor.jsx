import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2, Clock, Save, RotateCcw } from 'lucide-react';

/**
 * Компонент для редактирования расписания звонков
 * Позволяет добавлять/удалять уроки и изменять их время
 */
const BellScheduleEditor = ({ isOpen, onClose, onSave, currentSchedule }) => {
    const [schedule, setSchedule] = useState([]);

    // Дефолтное расписание
    const DEFAULT_SCHEDULE = [
        { lessonNumber: 1, startTime: '08:30', endTime: '09:15', label: '1 урок' },
        { lessonNumber: 2, startTime: '09:25', endTime: '10:10', label: '2 урок' },
        { lessonNumber: 3, startTime: '10:30', endTime: '11:15', label: '3 урок' },
        { lessonNumber: 4, startTime: '11:35', endTime: '12:20', label: '4 урок' },
        { lessonNumber: 5, startTime: '12:30', endTime: '13:15', label: '5 урок' },
        { lessonNumber: 6, startTime: '13:25', endTime: '14:10', label: '6 урок' },
        { lessonNumber: 7, startTime: '14:20', endTime: '15:05', label: '7 урок' },
        { lessonNumber: 8, startTime: '15:15', endTime: '16:00', label: '8 урок' },
    ];

    useEffect(() => {
        if (isOpen) {
            setSchedule(currentSchedule && currentSchedule.length > 0 ? [...currentSchedule] : [...DEFAULT_SCHEDULE]);
        }
    }, [isOpen, currentSchedule]);

    const addLesson = () => {
        const lastLesson = schedule[schedule.length - 1];
        const newLessonNumber = schedule.length + 1;

        // Автоматически рассчитываем время следующего урока (начало через 10 мин после конца предыдущего)
        const lastEndTime = lastLesson?.endTime || '16:00';
        const [hours, minutes] = lastEndTime.split(':').map(Number);
        const newStartMinutes = hours * 60 + minutes + 10;
        const newEndMinutes = newStartMinutes + 45;

        const formatTime = (totalMinutes) => {
            const h = Math.floor(totalMinutes / 60);
            const m = totalMinutes % 60;
            return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
        };

        setSchedule([...schedule, {
            lessonNumber: newLessonNumber,
            startTime: formatTime(newStartMinutes),
            endTime: formatTime(newEndMinutes),
            label: `${newLessonNumber} урок`
        }]);
    };

    const removeLesson = (index) => {
        if (schedule.length <= 1) {
            alert('Должен быть хотя бы один урок!');
            return;
        }
        const newSchedule = schedule.filter((_, i) => i !== index);
        // Перенумеруем уроки
        setSchedule(newSchedule.map((lesson, idx) => ({
            ...lesson,
            lessonNumber: idx + 1,
            label: `${idx + 1} урок`
        })));
    };

    const updateLesson = (index, field, value) => {
        const newSchedule = [...schedule];
        newSchedule[index] = { ...newSchedule[index], [field]: value };
        setSchedule(newSchedule);
    };

    const resetToDefault = () => {
        if (confirm('Сбросить расписание к стандартному? Все изменения будут потеряны.')) {
            setSchedule([...DEFAULT_SCHEDULE]);
        }
    };

    const handleSave = () => {
        // Проверка валидности времени
        for (let i = 0; i < schedule.length; i++) {
            const lesson = schedule[i];
            if (!lesson.startTime || !lesson.endTime) {
                alert(`Урок ${lesson.lessonNumber}: заполните время начала и окончания!`);
                return;
            }
            if (lesson.startTime >= lesson.endTime) {
                alert(`Урок ${lesson.lessonNumber}: время начала должно быть раньше времени окончания!`);
                return;
            }
        }

        onSave(schedule);
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backdropFilter: 'blur(4px)'
        }}>
            <div className="card" style={{
                width: '700px',
                maxWidth: '95%',
                maxHeight: '90vh',
                display: 'flex',
                flexDirection: 'column'
            }}>
                {/* Заголовок */}
                <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '1.5rem',
                    paddingBottom: '1rem',
                    borderBottom: '1px solid var(--color-border)'
                }}>
                    <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Clock size={24} color="var(--color-primary)" />
                        Расписание звонков
                    </h2>
                    <button onClick={onClose} className="icon-btn">
                        <X size={24} />
                    </button>
                </div>

                {/* Подсказка */}
                <div style={{
                    padding: '0.75rem',
                    backgroundColor: '#eff6ff',
                    border: '1px solid #bfdbfe',
                    borderRadius: '6px',
                    marginBottom: '1rem',
                    fontSize: '0.875rem',
                    color: '#1e40af'
                }}>
                    💡 <strong>Настройте расписание звонков:</strong> можете добавлять, удалять уроки и изменять их время.
                    Также можно добавлять кружки после уроков!
                </div>

                {/* Кнопки управления */}
                <div style={{
                    display: 'flex',
                    gap: '0.75rem',
                    marginBottom: '1rem'
                }}>
                    <button className="btn btn-primary" onClick={addLesson}>
                        <Plus size={18} />
                        Добавить урок
                    </button>
                    <button className="btn btn-secondary" onClick={resetToDefault}>
                        <RotateCcw size={18} />
                        Сбросить к стандартному
                    </button>
                </div>

                {/* Список уроков */}
                <div style={{
                    flex: 1,
                    overflowY: 'auto',
                    marginBottom: '1rem'
                }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        {schedule.map((lesson, index) => (
                            <div key={index} style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.75rem',
                                padding: '1rem',
                                backgroundColor: '#f8fafc',
                                borderRadius: '8px',
                                border: '1px solid var(--color-border)'
                            }}>
                                {/* Номер урока */}
                                <div style={{
                                    width: '40px',
                                    height: '40px',
                                    borderRadius: '50%',
                                    backgroundColor: 'var(--color-primary)',
                                    color: 'white',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontWeight: 'bold',
                                    fontSize: '1.1rem',
                                    flexShrink: 0
                                }}>
                                    {lesson.lessonNumber}
                                </div>

                                {/* Название */}
                                <div style={{ flex: '0 0 100px' }}>
                                    <input
                                        type="text"
                                        className="input-field"
                                        value={lesson.label}
                                        onChange={(e) => updateLesson(index, 'label', e.target.value)}
                                        placeholder="Название"
                                        style={{ padding: '0.5rem', fontSize: '0.9rem' }}
                                    />
                                </div>

                                {/* Время начала */}
                                <div style={{ flex: '0 0 100px' }}>
                                    <label style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', display: 'block', marginBottom: '0.25rem' }}>
                                        Начало
                                    </label>
                                    <input
                                        type="time"
                                        className="input-field"
                                        value={lesson.startTime}
                                        onChange={(e) => updateLesson(index, 'startTime', e.target.value)}
                                        style={{ padding: '0.5rem', fontSize: '0.9rem' }}
                                    />
                                </div>

                                {/* Разделитель */}
                                <div style={{ fontSize: '1.2rem', color: 'var(--color-text-muted)' }}>
                                    -
                                </div>

                                {/* Время окончания */}
                                <div style={{ flex: '0 0 100px' }}>
                                    <label style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', display: 'block', marginBottom: '0.25rem' }}>
                                        Окончание
                                    </label>
                                    <input
                                        type="time"
                                        className="input-field"
                                        value={lesson.endTime}
                                        onChange={(e) => updateLesson(index, 'endTime', e.target.value)}
                                        style={{ padding: '0.5rem', fontSize: '0.9rem' }}
                                    />
                                </div>

                                {/* Длительность */}
                                <div style={{
                                    flex: '0 0 60px',
                                    fontSize: '0.8rem',
                                    color: 'var(--color-text-muted)',
                                    textAlign: 'center'
                                }}>
                                    {(() => {
                                        const [sh, sm] = lesson.startTime.split(':').map(Number);
                                        const [eh, em] = lesson.endTime.split(':').map(Number);
                                        const duration = (eh * 60 + em) - (sh * 60 + sm);
                                        return `${duration} мин`;
                                    })()}
                                </div>

                                {/* Кнопка удаления */}
                                <button
                                    onClick={() => removeLesson(index)}
                                    style={{
                                        background: 'none',
                                        border: 'none',
                                        cursor: 'pointer',
                                        color: '#ef4444',
                                        padding: '0.5rem',
                                        borderRadius: '4px',
                                        transition: 'background-color 0.2s'
                                    }}
                                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#fee2e2'}
                                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                                    title="Удалить"
                                >
                                    <Trash2 size={20} />
                                </button>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Футер */}
                <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    paddingTop: '1rem',
                    borderTop: '1px solid var(--color-border)'
                }}>
                    <div style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>
                        Всего уроков: <strong>{schedule.length}</strong>
                    </div>
                    <div style={{ display: 'flex', gap: '0.75rem' }}>
                        <button className="btn btn-secondary" onClick={onClose}>
                            Отмена
                        </button>
                        <button className="btn btn-primary" onClick={handleSave}>
                            <Save size={18} />
                            Сохранить
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default BellScheduleEditor;
