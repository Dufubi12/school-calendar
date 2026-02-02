import React, { useState } from 'react';
import { nextMonth, prevMonth } from '../utils/dateUtils';
import CalendarHeader from '../components/Calendar/CalendarHeader';
import CalendarGrid from '../components/Calendar/CalendarGrid';
import SubstitutionModal from '../components/Substitution/SubstitutionModal';
import DayDetailsModal from '../components/Schedule/DayDetailsModal';
import LessonModal from '../components/Schedule/LessonModal';
import TimeSlotGrid from '../components/Schedule/TimeSlotGrid';
import TeacherAssignmentModal from '../components/Schedule/TeacherAssignmentModal';
import TimeSlotManager from '../components/Schedule/TimeSlotManager';
import { useSchedule } from '../context/ScheduleContext';

const CalendarPage = () => {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState(null);
    const [viewMode, setViewMode] = useState('calendar'); // 'calendar' or 'schedule'

    // Modals State
    const [isDetailsOpen, setIsDetailsOpen] = useState(false);
    const [isSubModalOpen, setIsSubModalOpen] = useState(false);
    const [subModalData, setSubModalData] = useState(null); // Data to pre-fill
    const [isLessonModalOpen, setIsLessonModalOpen] = useState(false);
    const [isTeacherAssignmentOpen, setIsTeacherAssignmentOpen] = useState(false);
    const [selectedSlot, setSelectedSlot] = useState(null);
    const [isTimeSlotManagerOpen, setIsTimeSlotManagerOpen] = useState(false);

    // Data State
    const { events, addEvent, removeEvent, assignTeacherToSlot } = useSchedule();

    const handleNextMonth = () => {
        setCurrentDate(nextMonth(currentDate));
    };

    const handlePrevMonth = () => {
        setCurrentDate(prevMonth(currentDate));
    };

    const handleDayClick = (day) => {
        setSelectedDate(day);
        setIsDetailsOpen(true);
    };

    const handleAddEvent = (newEvent) => {
        addEvent(newEvent);
    };

    const openSubstitutionModal = (teacherId = null, lessonNumber = 1, subject = null, grade = null, startTime = null, endTime = null) => {
        if (teacherId) {
            setSubModalData({ teacherId, lessonNumber, subject, grade, startTime, endTime });
        } else {
            setSubModalData(null);
        }
        setIsSubModalOpen(true);
    };

    const handleSlotClick = (slot) => {
        setSelectedSlot(slot);
        setIsTeacherAssignmentOpen(true);
    };

    const handleTeacherAssignment = (slotId, teacherId, subject) => {
        assignTeacherToSlot(slotId, teacherId, subject);
    };

    return (
        <div className="calendar-page">
            <CalendarHeader
                currentDate={currentDate}
                onNextMonth={handleNextMonth}
                onPrevMonth={handlePrevMonth}
            />

            {/* View Mode Toggle */}
            <div className="view-mode-toggle">
                <button
                    className={`toggle-btn ${viewMode === 'calendar' ? 'toggle-btn--active' : ''}`}
                    onClick={() => setViewMode('calendar')}
                >
                    📅 Календарь
                </button>
                <button
                    className={`toggle-btn ${viewMode === 'schedule' ? 'toggle-btn--active' : ''}`}
                    onClick={() => setViewMode('schedule')}
                >
                    ⏰ Расписание по слотам
                </button>
                {viewMode === 'schedule' && (
                    <button
                        className="btn btn-primary"
                        onClick={() => setIsTimeSlotManagerOpen(true)}
                        style={{ marginLeft: 'auto' }}
                    >
                        ➕ Создать расписание
                    </button>
                )}
            </div>

            {viewMode === 'calendar' ? (
                <CalendarGrid
                    currentDate={currentDate}
                    onDayClick={handleDayClick}
                    substitutions={events} // Grid will display all events
                />
            ) : (
                <TimeSlotGrid
                    date={selectedDate || new Date()}
                    onSlotClick={handleSlotClick}
                />
            )}

            {/* 1. Day Details (Menu) */}
            <DayDetailsModal
                date={selectedDate}
                isOpen={isDetailsOpen}
                onClose={() => setIsDetailsOpen(false)}
                lessons={events}
                onAddLesson={() => setIsLessonModalOpen(true)}
                onAddSubstitution={openSubstitutionModal}
                onRemoveLesson={removeEvent}
            />

            {/* 2. Add Lesson */}
            <LessonModal
                date={selectedDate}
                isOpen={isLessonModalOpen}
                onClose={() => setIsLessonModalOpen(false)}
                onSave={handleAddEvent}
            />

            {/* 3. Add Substitution */}
            <SubstitutionModal
                date={selectedDate}
                isOpen={isSubModalOpen}
                onClose={() => { setIsSubModalOpen(false); setSubModalData(null); }}
                onSave={(data) => handleAddEvent({ ...data, type: 'substitution' })}
                initialData={subModalData}
            />

            {/* 4. Teacher Assignment */}
            <TeacherAssignmentModal
                isOpen={isTeacherAssignmentOpen}
                onClose={() => setIsTeacherAssignmentOpen(false)}
                slot={selectedSlot}
                onAssign={handleTeacherAssignment}
            />

            {/* 5. Time Slot Manager */}
            <TimeSlotManager
                isOpen={isTimeSlotManagerOpen}
                onClose={() => setIsTimeSlotManagerOpen(false)}
            />
        </div>
    );
};

export default CalendarPage;
