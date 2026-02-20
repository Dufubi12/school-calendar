import React, { useState } from 'react';
import { useSchedule } from '../../context/ScheduleContext';
import { generateDefaultSchedule, DEFAULT_SCHEDULE_TEMPLATE } from '../../utils/scheduleUtils';
import { CLASS_LIST } from '../../data/mockData';
import './TimeSlotManager.css';

const TimeSlotManager = ({ isOpen, onClose }) => {
    const { addTimeSlot, timeSlots } = useSchedule();
    const [grade, setGrade] = useState(CLASS_LIST[0] || '9А');
    const [selectedDays, setSelectedDays] = useState([1, 2, 3, 4, 5]); // Mon-Fri

    if (!isOpen) return null;

    const daysOfWeek = [
        { value: 1, label: 'Понедельник' },
        { value: 2, label: 'Вторник' },
        { value: 3, label: 'Среда' },
        { value: 4, label: 'Четверг' },
        { value: 5, label: 'Пятница' },
        { value: 6, label: 'Суббота' },
        { value: 0, label: 'Воскресенье' }
    ];

    const toggleDay = (dayValue) => {
        if (selectedDays.includes(dayValue)) {
            setSelectedDays(selectedDays.filter(d => d !== dayValue));
        } else {
            setSelectedDays([...selectedDays, dayValue]);
        }
    };

    const handleGenerateSchedule = () => {
        const slots = [];

        selectedDays.forEach(dayOfWeek => {
            DEFAULT_SCHEDULE_TEMPLATE.forEach(template => {
                slots.push({
                    id: `slot-${dayOfWeek}-${template.lessonNumber}-${Date.now()}-${Math.random()}`,
                    dayOfWeek,
                    lessonNumber: template.lessonNumber,
                    startTime: template.startTime,
                    endTime: template.endTime,
                    grade,
                    subject: null,
                    teacherId: null,
                    room: '',
                    isRecurring: true,
                    date: null
                });
            });
        });

        slots.forEach(slot => addTimeSlot(slot));
        onClose();
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h2>Создать расписание</h2>
                    <button className="modal-close" onClick={onClose}>×</button>
                </div>

                <div className="modal-body">
                    <div className="info-box">
                        <p>
                            Создайте шаблон расписания для класса. Вы сможете назначить учителей на каждый урок позже.
                        </p>
                    </div>

                    <div className="form-group">
                        <label className="form-label">Класс</label>
                        <select
                            className="form-input"
                            value={grade}
                            onChange={(e) => setGrade(e.target.value)}
                        >
                            {CLASS_LIST.map(className => (
                                <option key={className} value={className}>
                                    {className}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="form-group">
                        <label className="form-label">Дни недели</label>
                        <div className="days-grid">
                            {daysOfWeek.map(day => (
                                <label key={day.value} className="day-checkbox">
                                    <input
                                        type="checkbox"
                                        checked={selectedDays.includes(day.value)}
                                        onChange={() => toggleDay(day.value)}
                                    />
                                    <span>{day.label}</span>
                                </label>
                            ))}
                        </div>
                    </div>

                    <div className="form-group">
                        <label className="form-label">Расписание звонков</label>
                        <div className="schedule-preview">
                            {DEFAULT_SCHEDULE_TEMPLATE.map(lesson => (
                                <div key={lesson.lessonNumber} className="lesson-time">
                                    <span className="lesson-number">{lesson.lessonNumber} урок</span>
                                    <span className="lesson-time-range">
                                        {lesson.startTime} - {lesson.endTime}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="summary-box">
                        <strong>Будет создано:</strong> {selectedDays.length} дней × {DEFAULT_SCHEDULE_TEMPLATE.length} уроков = {selectedDays.length * DEFAULT_SCHEDULE_TEMPLATE.length} временных слотов
                    </div>
                </div>

                <div className="modal-footer">
                    <button className="btn btn--secondary" onClick={onClose}>
                        Отмена
                    </button>
                    <button
                        className="btn btn--primary"
                        onClick={handleGenerateSchedule}
                        disabled={selectedDays.length === 0 || !grade}
                    >
                        Создать расписание
                    </button>
                </div>
            </div>
        </div>
    );
};

export default TimeSlotManager;
