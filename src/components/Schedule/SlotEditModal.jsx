import React, { useState, useEffect } from 'react';
import { X, Edit } from 'lucide-react';
import { useSchedule } from '../../context/ScheduleContext';
import { SUBJECTS, CLASS_LIST } from '../../data/mockData';

const SlotEditModal = ({ slot, isOpen, onClose, onSave }) => {
    const { teachers } = useSchedule();

    const [startTime, setStartTime] = useState('08:30');
    const [endTime, setEndTime] = useState('09:15');
    const [subject, setSubject] = useState('');
    const [grade, setGrade] = useState('');
    const [teacherId, setTeacherId] = useState('');
    const [room, setRoom] = useState('');
    const [lessonNumber, setLessonNumber] = useState(1);

    // Загрузить данные слота при открытии
    useEffect(() => {
        if (slot && isOpen) {
            setStartTime(slot.startTime || '08:30');
            setEndTime(slot.endTime || '09:15');
            setSubject(slot.subject || '');
            setGrade(slot.grade || '');
            setTeacherId(slot.teacherId || '');
            setRoom(slot.room || '');
            setLessonNumber(slot.lessonNumber || 1);
        }
    }, [slot, isOpen]);

    const handleSave = () => {
        // Минимальная валидация (только обязательные поля)
        if (!startTime || !endTime) {
            alert('Заполните время начала и окончания!');
            return;
        }

        if (startTime >= endTime) {
            alert('Время начала должно быть раньше времени окончания!');
            return;
        }

        // Сохранить БЕЗ проверки конфликтов (свободное редактирование)
        const updatedSlot = {
            ...slot,
            startTime,
            endTime,
            subject,
            grade,
            teacherId: teacherId ? parseInt(teacherId) : null,
            room,
            lessonNumber: parseInt(lessonNumber)
        };

        onSave(updatedSlot);
        onClose();
    };

    if (!isOpen || !slot) return null;

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
                width: '600px',
                maxWidth: '95%',
                maxHeight: '90vh',
                overflowY: 'auto'
            }}>
                {/* Заголовок */}
                <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '1.5rem',
                    paddingBottom: '1rem',
                    borderTop: '1px solid var(--color-border)'
                }}>
                    <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Edit size={24} color="#3b82f6" />
                        Редактировать слот
                    </h2>
                    <button onClick={onClose} className="icon-btn">
                        <X size={24} />
                    </button>
                </div>

                {/* Инфо */}
                <div style={{
                    padding: '0.75rem',
                    backgroundColor: '#eff6ff',
                    border: '1px solid #bfdbfe',
                    borderRadius: '6px',
                    marginBottom: '1.5rem',
                    fontSize: '0.875rem',
                    color: '#1e40af'
                }}>
                    <strong>Свободное редактирование:</strong> Вы можете изменить любые параметры без проверки конфликтов.
                </div>

                {/* Форма */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {/* Время */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
                        <div>
                            <label className="label">Время начала *</label>
                            <input
                                type="time"
                                className="input-field"
                                value={startTime}
                                onChange={(e) => setStartTime(e.target.value)}
                            />
                        </div>
                        <div>
                            <label className="label">Время окончания *</label>
                            <input
                                type="time"
                                className="input-field"
                                value={endTime}
                                onChange={(e) => setEndTime(e.target.value)}
                            />
                        </div>
                        <div>
                            <label className="label">Номер урока</label>
                            <input
                                type="number"
                                className="input-field"
                                min="1"
                                max="10"
                                value={lessonNumber}
                                onChange={(e) => setLessonNumber(e.target.value)}
                            />
                        </div>
                    </div>

                    {/* Длительность */}
                    {startTime && endTime && startTime < endTime && (
                        <div style={{
                            padding: '0.5rem',
                            backgroundColor: '#f0fdf4',
                            borderRadius: '4px',
                            fontSize: '0.875rem',
                            color: '#15803d',
                            textAlign: 'center'
                        }}>
                            Длительность: {(() => {
                                const [sh, sm] = startTime.split(':').map(Number);
                                const [eh, em] = endTime.split(':').map(Number);
                                const duration = (eh * 60 + em) - (sh * 60 + sm);
                                const hours = Math.floor(duration / 60);
                                const minutes = duration % 60;
                                return hours > 0 ? `${hours} ч ${minutes} мин` : `${minutes} мин`;
                            })()}
                        </div>
                    )}

                    {/* Предмет и класс */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                        <div>
                            <label className="label">Предмет</label>
                            <select
                                className="input-field"
                                value={subject}
                                onChange={(e) => setSubject(e.target.value)}
                            >
                                <option value="">Не выбран</option>
                                {SUBJECTS.map(s => (
                                    <option key={s} value={s}>{s}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="label">Класс</label>
                            <select
                                className="input-field"
                                value={grade}
                                onChange={(e) => setGrade(e.target.value)}
                            >
                                <option value="">Не выбран</option>
                                {CLASS_LIST.map(className => (
                                    <option key={className} value={className}>
                                        {className}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Учитель */}
                    <div>
                        <label className="label">Учитель</label>
                        <select
                            className="input-field"
                            value={teacherId}
                            onChange={(e) => setTeacherId(e.target.value)}
                        >
                            <option value="">Не назначен</option>
                            {teachers.map(teacher => (
                                <option key={teacher.id} value={teacher.id}>
                                    {teacher.name} ({teacher.subject})
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Аудитория */}
                    <div>
                        <label className="label">Аудитория</label>
                        <input
                            type="text"
                            className="input-field"
                            placeholder="Например: 201, Спортзал, Актовый зал..."
                            value={room}
                            onChange={(e) => setRoom(e.target.value)}
                        />
                    </div>
                </div>

                {/* Футер */}
                <div style={{
                    display: 'flex',
                    justifyContent: 'flex-end',
                    gap: '1rem',
                    marginTop: '1.5rem',
                    paddingTop: '1rem',
                    borderTop: '1px solid var(--color-border)'
                }}>
                    <button className="btn btn-secondary" onClick={onClose}>
                        Отмена
                    </button>
                    <button
                        className="btn btn-primary"
                        onClick={handleSave}
                        disabled={!startTime || !endTime}
                    >
                        Сохранить
                    </button>
                </div>
            </div>
        </div>
    );
};

export default SlotEditModal;
