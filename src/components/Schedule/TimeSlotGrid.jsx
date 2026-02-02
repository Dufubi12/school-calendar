import React from 'react';
import { useSchedule } from '../../context/ScheduleContext';
import { getSlotStatus, getWorkloadLevel } from '../../utils/scheduleUtils';
import './TimeSlot.css';

const TimeSlotGrid = ({ date, onSlotClick }) => {
    const { getSlotsForDate, teachers, timeSlots } = useSchedule();

    const slots = getSlotsForDate(date);

    // Group slots by lesson number
    const slotsByLesson = {};
    slots.forEach(slot => {
        if (!slotsByLesson[slot.lessonNumber]) {
            slotsByLesson[slot.lessonNumber] = [];
        }
        slotsByLesson[slot.lessonNumber].push(slot);
    });

    const getTeacherName = (teacherId) => {
        const teacher = teachers.find(t => t.id === teacherId);
        return teacher ? teacher.name : 'Не назначен';
    };

    const renderSlot = (slot) => {
        const status = getSlotStatus(slot, timeSlots);
        const teacher = teachers.find(t => t.id === slot.teacherId);
        const workload = teacher ? getWorkloadLevel(
            useSchedule().getTeacherWorkload(teacher.id).workloadPercentage
        ) : null;

        return (
            <div
                key={slot.id}
                className={`time-slot time-slot--${status.status}`}
                onClick={() => onSlotClick(slot)}
                style={{ borderLeftColor: status.color }}
            >
                <div className="time-slot__header">
                    <span className="time-slot__time">
                        {slot.startTime} - {slot.endTime}
                    </span>
                    <span className="time-slot__status-badge" style={{ backgroundColor: status.color }}>
                        {status.emoji}
                    </span>
                </div>

                <div className="time-slot__content">
                    <div className="time-slot__subject">
                        {slot.subject || 'Предмет не указан'}
                    </div>
                    <div className="time-slot__grade">
                        {slot.grade}
                    </div>
                    <div className="time-slot__teacher">
                        {slot.teacherId ? (
                            <>
                                <span className="time-slot__teacher-name">
                                    {getTeacherName(slot.teacherId)}
                                </span>
                                {workload && (
                                    <span
                                        className="time-slot__workload-badge"
                                        style={{ backgroundColor: workload.color }}
                                        title={`Загруженность: ${workload.label}`}
                                    >
                                        {workload.emoji}
                                    </span>
                                )}
                            </>
                        ) : (
                            <span className="time-slot__teacher-empty">
                                Учитель не назначен
                            </span>
                        )}
                    </div>
                    {slot.room && (
                        <div className="time-slot__room">
                            📍 {slot.room}
                        </div>
                    )}
                </div>

                <div className="time-slot__status-label">
                    {status.label}
                </div>
            </div>
        );
    };

    if (slots.length === 0) {
        return (
            <div className="time-slot-grid time-slot-grid--empty">
                <div className="time-slot-grid__empty-state">
                    <div className="empty-state__icon">📅</div>
                    <h3>Нет расписания на этот день</h3>
                    <p>Создайте временные слоты для начала работы</p>
                </div>
            </div>
        );
    }

    return (
        <div className="time-slot-grid">
            <div className="time-slot-grid__header">
                <h3>Расписание на {date.toLocaleDateString('ru-RU', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                })}</h3>
                <div className="time-slot-grid__legend">
                    <div className="legend-item">
                        <span className="legend-dot" style={{ backgroundColor: '#10b981' }}>🟢</span>
                        <span>Свободен</span>
                    </div>
                    <div className="legend-item">
                        <span className="legend-dot" style={{ backgroundColor: '#f59e0b' }}>🟡</span>
                        <span>Назначен</span>
                    </div>
                    <div className="legend-item">
                        <span className="legend-dot" style={{ backgroundColor: '#ef4444' }}>🔴</span>
                        <span>Конфликт</span>
                    </div>
                </div>
            </div>

            <div className="time-slot-grid__content">
                {Object.keys(slotsByLesson).sort((a, b) => a - b).map(lessonNumber => (
                    <div key={lessonNumber} className="time-slot-grid__lesson-group">
                        <div className="lesson-group__number">
                            Урок {lessonNumber}
                        </div>
                        <div className="lesson-group__slots">
                            {slotsByLesson[lessonNumber].map(slot => renderSlot(slot))}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default TimeSlotGrid;
