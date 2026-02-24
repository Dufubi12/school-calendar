import React, { useState, useMemo } from 'react';
import { useSchedule } from '../../context/ScheduleContext';
import { getSlotStatus, getWorkloadLevel } from '../../utils/scheduleUtils';
import './TimeSlot.css';

const TimeSlotGrid = ({ date, onSlotClick, selectedClass = 'all' }) => {
    const { getSlotsForDate, teachers, timeSlots, bellSchedule, addTimeSlot, assignTeacherToSlot } = useSchedule();
    const [showGaps, setShowGaps] = useState(true);

    // Get all slots for the date
    let allSlots = getSlotsForDate(date);
    let slots = selectedClass !== 'all'
        ? allSlots.filter(slot => slot.grade === selectedClass)
        : allSlots;

    // Get all classes present in today's schedule
    const allClasses = useMemo(() => {
        const classSet = new Set();
        allSlots.forEach(s => classSet.add(s.grade));
        return [...classSet].sort();
    }, [allSlots]);

    // Detect gaps: for each class, find missing lesson numbers between min and max
    const gaps = useMemo(() => {
        if (!showGaps) return [];
        const result = [];
        const classesToCheck = selectedClass !== 'all' ? [selectedClass] : allClasses;

        classesToCheck.forEach(cls => {
            const classSlots = allSlots.filter(s => s.grade === cls);
            if (classSlots.length === 0) return;

            const lessonNumbers = classSlots.map(s => s.lessonNumber).sort((a, b) => a - b);
            const minLesson = lessonNumbers[0];
            const maxLesson = lessonNumbers[lessonNumbers.length - 1];

            for (let i = minLesson; i <= maxLesson; i++) {
                if (!lessonNumbers.includes(i)) {
                    // This is a gap! Find the bell schedule time for this lesson
                    const bell = bellSchedule.find(b => b.lessonNumber === i);
                    const startTime = bell ? bell.startTime : '';
                    const endTime = bell ? bell.endTime : '';

                    // Find which subjects this class doesn't have today but has in schedule
                    const todaySubjects = classSlots.map(s => s.subject);

                    // Find busy teacher IDs at this time
                    const busyTeacherIds = new Set();
                    allSlots.forEach(s => {
                        if (s.lessonNumber === i && s.teacherId) {
                            busyTeacherIds.add(s.teacherId);
                        }
                    });

                    // Find available teachers (not busy at this time)
                    const availableTeachers = teachers.filter(t => !busyTeacherIds.has(t.id));

                    // Suggest subjects that available teachers can teach
                    const suggestions = [];
                    availableTeachers.forEach(t => {
                        const subjects = t.subject.split(',').map(s => s.trim());
                        subjects.forEach(subj => {
                            if (subj && !suggestions.find(s => s.subject === subj && s.teacherId === t.id)) {
                                suggestions.push({
                                    subject: subj,
                                    teacherId: t.id,
                                    teacherName: t.name,
                                });
                            }
                        });
                    });

                    result.push({
                        grade: cls,
                        lessonNumber: i,
                        startTime,
                        endTime,
                        suggestions: suggestions.slice(0, 5), // Top 5 suggestions
                        availableCount: availableTeachers.length,
                    });
                }
            }
        });

        return result;
    }, [allSlots, allClasses, selectedClass, showGaps, bellSchedule, teachers]);

    // Group slots by lesson number (including gaps)
    const slotsByLesson = {};
    slots.forEach(slot => {
        if (!slotsByLesson[slot.lessonNumber]) {
            slotsByLesson[slot.lessonNumber] = [];
        }
        slotsByLesson[slot.lessonNumber].push(slot);
    });

    // Add gap entries into lesson groups
    gaps.forEach(gap => {
        if (!slotsByLesson[gap.lessonNumber]) {
            slotsByLesson[gap.lessonNumber] = [];
        }
    });

    const getTeacherName = (teacherId) => {
        const teacher = teachers.find(t => t.id === teacherId);
        return teacher ? teacher.name : 'Не назначен';
    };

    const handleFillGap = (gap, suggestion) => {
        // Create a new slot for the gap
        const newSlot = {
            id: Date.now(),
            date: typeof date === 'string' ? date : date.toISOString().split('T')[0],
            startTime: gap.startTime,
            endTime: gap.endTime,
            subject: suggestion.subject,
            teacherId: suggestion.teacherId,
            teacherName: suggestion.teacherName,
            grade: gap.grade,
            lessonNumber: gap.lessonNumber,
            type: 'regular',
        };
        addTimeSlot(newSlot);
    };

    const renderSlot = (slot) => {
        const status = getSlotStatus(slot, timeSlots);
        const teacher = teachers.find(t => t.id === slot.teacherId);

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
                            </>
                        ) : slot.teacherName && slot.teacherName !== 'Не назначен' ? (
                            <span className="time-slot__teacher-name">
                                {slot.teacherName}
                            </span>
                        ) : (
                            <span className="time-slot__teacher-empty">
                                Учитель не назначен
                            </span>
                        )}
                    </div>
                </div>

                <div className="time-slot__status-label">
                    {status.label}
                </div>
            </div>
        );
    };

    const renderGapCard = (gap) => {
        return (
            <div
                key={`gap-${gap.grade}-${gap.lessonNumber}`}
                className="time-slot time-slot--gap"
            >
                <div className="time-slot__header">
                    <span className="time-slot__time">
                        {gap.startTime || '??:??'} - {gap.endTime || '??:??'}
                    </span>
                    <span className="time-slot__status-badge" style={{ backgroundColor: '#8b5cf6' }}>
                        💡
                    </span>
                </div>

                <div className="time-slot__content">
                    <div className="time-slot__subject" style={{ color: '#8b5cf6' }}>
                        Окно — {gap.grade}
                    </div>
                    <div className="time-slot__grade" style={{ fontSize: '12px', color: '#6b7280' }}>
                        Свободно учителей: {gap.availableCount}
                    </div>
                </div>

                {gap.suggestions.length > 0 ? (
                    <div className="gap-suggestions">
                        <div className="gap-suggestions__title">Предложения:</div>
                        {gap.suggestions.map((s, idx) => (
                            <button
                                key={idx}
                                className="gap-suggestion-btn"
                                onClick={() => handleFillGap(gap, s)}
                                title={`Назначить ${s.teacherName} — ${s.subject}`}
                            >
                                <span className="gap-suggestion-subject">{s.subject}</span>
                                <span className="gap-suggestion-teacher">{s.teacherName}</span>
                            </button>
                        ))}
                    </div>
                ) : (
                    <div style={{ fontSize: '12px', color: '#9ca3af', marginTop: '8px' }}>
                        Нет доступных учителей
                    </div>
                )}
            </div>
        );
    };

    if (slots.length === 0 && gaps.length === 0) {
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
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    {gaps.length > 0 && (
                        <div style={{
                            padding: '4px 12px',
                            backgroundColor: '#f5f3ff',
                            borderRadius: '20px',
                            fontSize: '13px',
                            color: '#7c3aed',
                            fontWeight: '600',
                        }}>
                            💡 Окон: {gaps.length}
                        </div>
                    )}
                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', cursor: 'pointer', color: '#6b7280' }}>
                        <input
                            type="checkbox"
                            checked={showGaps}
                            onChange={(e) => setShowGaps(e.target.checked)}
                            style={{ cursor: 'pointer' }}
                        />
                        Показать окна
                    </label>
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
                        {showGaps && (
                            <div className="legend-item">
                                <span className="legend-dot" style={{ backgroundColor: '#8b5cf6' }}>💡</span>
                                <span>Окно</span>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <div className="time-slot-grid__content">
                {Object.keys(slotsByLesson).sort((a, b) => a - b).map(lessonNumber => {
                    const lessonSlots = slotsByLesson[lessonNumber] || [];
                    const lessonGaps = showGaps ? gaps.filter(g => g.lessonNumber === parseInt(lessonNumber)) : [];

                    return (
                        <div key={lessonNumber} className="time-slot-grid__lesson-group">
                            <div className="lesson-group__number">
                                Урок {lessonNumber}
                            </div>
                            <div className="lesson-group__slots">
                                {lessonSlots.map(slot => renderSlot(slot))}
                                {lessonGaps.map(gap => renderGapCard(gap))}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default TimeSlotGrid;
