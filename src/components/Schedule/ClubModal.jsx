import React, { useState } from 'react';
import { format } from 'date-fns';
import { X, Users, Calendar } from 'lucide-react';
import { useSchedule } from '../../context/ScheduleContext';

/**
 * Модалка для добавления кружков и внеурочных занятий
 * Позволяет задать произвольное время и название
 */
const ClubModal = ({ date, isOpen, onClose, onSave }) => {
    const { teachers } = useSchedule();
    const [clubName, setClubName] = useState('');
    const [teacherId, setTeacherId] = useState('');
    const [startTime, setStartTime] = useState('16:00');
    const [endTime, setEndTime] = useState('17:00');
    const [description, setDescription] = useState('');
    const [participants, setParticipants] = useState('');

    const resetForm = () => {
        setClubName('');
        setTeacherId('');
        setStartTime('16:00');
        setEndTime('17:00');
        setDescription('');
        setParticipants('');
    };

    const handleSave = () => {
        if (!clubName || !startTime || !endTime) {
            alert('Заполните название кружка и время!');
            return;
        }

        if (startTime >= endTime) {
            alert('Время начала должно быть раньше времени окончания!');
            return;
        }

        const newClub = {
            id: Date.now(),
            date: format(date, 'yyyy-MM-dd'),
            type: 'club',
            subject: clubName,
            teacherId: teacherId ? parseInt(teacherId) : null,
            startTime,
            endTime,
            details: description || `Кружок: ${clubName}`,
            participants,
        };

        onSave(newClub);
        resetForm();
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
                    borderBottom: '1px solid var(--color-border)'
                }}>
                    <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Users size={24} color="#8b5cf6" />
                        Добавить кружок
                    </h2>
                    <button onClick={onClose} className="icon-btn">
                        <X size={24} />
                    </button>
                </div>

                {/* Инфо */}
                <div style={{
                    padding: '0.75rem',
                    backgroundColor: '#f5f3ff',
                    border: '1px solid #ddd6fe',
                    borderRadius: '6px',
                    marginBottom: '1.5rem',
                    fontSize: '0.875rem',
                    color: '#6d28d9'
                }}>
                    <Calendar size={16} style={{ display: 'inline', marginRight: '0.5rem' }} />
                    <strong>Дата:</strong> {date ? format(date, 'dd.MM.yyyy (cccc)', { locale: require('date-fns/locale/ru').ru }) : ''}
                </div>

                {/* Форма */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {/* Название */}
                    <div>
                        <label className="label">Название кружка *</label>
                        <input
                            type="text"
                            className="input-field"
                            placeholder="Например: Робототехника, Шахматы, Театральный..."
                            value={clubName}
                            onChange={(e) => setClubName(e.target.value)}
                            autoFocus
                        />
                    </div>

                    {/* Время */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
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

                    {/* Руководитель */}
                    <div>
                        <label className="label">Руководитель (не обязательно)</label>
                        <select
                            className="input-field"
                            value={teacherId}
                            onChange={(e) => setTeacherId(e.target.value)}
                        >
                            <option value="">Не выбран</option>
                            {teachers.map(teacher => (
                                <option key={teacher.id} value={teacher.id}>
                                    {teacher.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Участники */}
                    <div>
                        <label className="label">Участники (не обязательно)</label>
                        <input
                            type="text"
                            className="input-field"
                            placeholder="Например: 5А, 6Б или '10-15 человек'"
                            value={participants}
                            onChange={(e) => setParticipants(e.target.value)}
                        />
                    </div>

                    {/* Описание */}
                    <div>
                        <label className="label">Описание (не обязательно)</label>
                        <textarea
                            className="input-field"
                            placeholder="Краткое описание кружка или комментарий..."
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            rows={3}
                            style={{ resize: 'vertical' }}
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
                        disabled={!clubName || !startTime || !endTime}
                        style={{
                            backgroundColor: '#8b5cf6',
                            borderColor: '#8b5cf6'
                        }}
                    >
                        Добавить кружок
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ClubModal;
