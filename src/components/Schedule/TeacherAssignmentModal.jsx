import React, { useState, useEffect } from 'react';
import { useSchedule } from '../../context/ScheduleContext';
import { getWorkloadLevel } from '../../utils/scheduleUtils';
import './TeacherAssignment.css';

const TeacherAssignmentModal = ({ isOpen, onClose, slot, onAssign }) => {
    const { teachers, getAvailableTeachersForSlot, getTeacherWorkload } = useSchedule();
    const [selectedTeacherId, setSelectedTeacherId] = useState(slot?.teacherId || null);
    const [subjectFilter, setSubjectFilter] = useState(slot?.subject || '');
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        if (slot) {
            setSelectedTeacherId(slot.teacherId);
            setSubjectFilter(slot.subject || '');
        }
    }, [slot]);

    if (!isOpen || !slot) return null;

    const availableTeachers = getAvailableTeachersForSlot(slot, subjectFilter || null);

    // Filter by search query
    const filteredTeachers = availableTeachers.filter(teacher =>
        teacher.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        teacher.subject.toLowerCase().includes(searchQuery.toLowerCase())
    );

    // Sort: available first, then by workload
    const sortedTeachers = [...filteredTeachers].sort((a, b) => {
        if (a.hasConflict && !b.hasConflict) return 1;
        if (!a.hasConflict && b.hasConflict) return -1;
        return a.workload - b.workload;
    });

    const handleAssign = () => {
        if (selectedTeacherId) {
            const teacher = teachers.find(t => t.id === selectedTeacherId);
            onAssign(slot.id, selectedTeacherId, teacher?.subject);
            onClose();
        }
    };

    const handleRemoveTeacher = () => {
        onAssign(slot.id, null, null);
        onClose();
    };

    const renderTeacherCard = (teacher) => {
        const workload = getTeacherWorkload(teacher.id);
        const workloadLevel = getWorkloadLevel(workload.workloadPercentage);
        const isSelected = selectedTeacherId === teacher.id;

        return (
            <div
                key={teacher.id}
                className={`teacher-card ${isSelected ? 'teacher-card--selected' : ''} ${teacher.hasConflict ? 'teacher-card--conflict' : ''}`}
                onClick={() => !teacher.hasConflict && setSelectedTeacherId(teacher.id)}
            >
                <div className="teacher-card__header">
                    <div className="teacher-card__info">
                        <h4 className="teacher-card__name">{teacher.name}</h4>
                        <p className="teacher-card__subject">{teacher.subject}</p>
                    </div>
                    {isSelected && (
                        <div className="teacher-card__selected-badge">✓</div>
                    )}
                </div>

                <div className="teacher-card__stats">
                    <div className="stat-item">
                        <span className="stat-label">Уроков:</span>
                        <span className="stat-value">{workload.totalSlots}</span>
                    </div>
                    <div className="stat-item">
                        <span className="stat-label">Загруженность:</span>
                        <span className="stat-value" style={{ color: workloadLevel.color }}>
                            {workloadLevel.emoji} {workload.workloadPercentage}%
                        </span>
                    </div>
                </div>

                <div className="teacher-card__workload-bar">
                    <div
                        className="workload-bar__fill"
                        style={{
                            width: `${workload.workloadPercentage}%`,
                            backgroundColor: workloadLevel.color
                        }}
                    />
                </div>

                {teacher.hasConflict && (
                    <div className="teacher-card__conflict-warning">
                        ⚠️ Конфликт расписания: учитель занят в это время
                    </div>
                )}
            </div>
        );
    };

    // Get unique subjects from all teachers
    const subjects = [...new Set(teachers.map(t => t.subject))];

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content modal-content--large" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h2>Назначить учителя</h2>
                    <button className="modal-close" onClick={onClose}>×</button>
                </div>

                <div className="modal-body">
                    {/* Slot Info */}
                    <div className="slot-info-card">
                        <div className="slot-info__row">
                            <span className="slot-info__label">Время:</span>
                            <span className="slot-info__value">{slot.startTime} - {slot.endTime}</span>
                        </div>
                        <div className="slot-info__row">
                            <span className="slot-info__label">Класс:</span>
                            <span className="slot-info__value">{slot.grade}</span>
                        </div>
                        <div className="slot-info__row">
                            <span className="slot-info__label">Предмет:</span>
                            <span className="slot-info__value">{slot.subject || 'Не указан'}</span>
                        </div>
                    </div>

                    {/* Filters */}
                    <div className="filters-section">
                        <input
                            type="text"
                            className="search-input"
                            placeholder="Поиск учителя..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />

                        <select
                            className="subject-filter"
                            value={subjectFilter}
                            onChange={(e) => setSubjectFilter(e.target.value)}
                        >
                            <option value="">Все предметы</option>
                            {subjects.map(subject => (
                                <option key={subject} value={subject}>{subject}</option>
                            ))}
                        </select>
                    </div>

                    {/* Teachers List */}
                    <div className="teachers-list">
                        {sortedTeachers.length === 0 ? (
                            <div className="empty-state">
                                <p>Нет доступных учителей</p>
                            </div>
                        ) : (
                            sortedTeachers.map(teacher => renderTeacherCard(teacher))
                        )}
                    </div>
                </div>

                <div className="modal-footer">
                    {slot.teacherId && (
                        <button
                            className="btn btn--danger"
                            onClick={handleRemoveTeacher}
                        >
                            Убрать учителя
                        </button>
                    )}
                    <button className="btn btn--secondary" onClick={onClose}>
                        Отмена
                    </button>
                    <button
                        className="btn btn--primary"
                        onClick={handleAssign}
                        disabled={!selectedTeacherId}
                    >
                        Назначить
                    </button>
                </div>
            </div>
        </div>
    );
};

export default TeacherAssignmentModal;
