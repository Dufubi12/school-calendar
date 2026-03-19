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
import TeacherAvailabilityPanel from '../components/Teachers/TeacherAvailabilityPanel';
import BellScheduleEditor from '../components/Schedule/BellScheduleEditor';
import ClubModal from '../components/Schedule/ClubModal';
import { useSchedule } from '../context/ScheduleContext';

const CalendarPage = () => {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState(null);
    const [viewMode, setViewMode] = useState('calendar'); // 'calendar' or 'schedule'
    const [selectedClass, setSelectedClass] = useState('all'); // 'all' or specific class like '7А'
    const [selectedTeacher, setSelectedTeacher] = useState('all'); // 'all' or teacher last name

    // Available classes
    const availableClasses = ['all', '1А', '1Б', '2А', '2Б', '2В', '3А', '3Б', '3В', '4А', '4Б', '4В', '5А', '5Б', '5В', '6А', '6Б', '7А', '7Б', '8А', '9А'];

    // Modals State
    const [isDetailsOpen, setIsDetailsOpen] = useState(false);
    const [isSubModalOpen, setIsSubModalOpen] = useState(false);
    const [subModalData, setSubModalData] = useState(null); // Data to pre-fill
    const [isLessonModalOpen, setIsLessonModalOpen] = useState(false);
    const [isTeacherAssignmentOpen, setIsTeacherAssignmentOpen] = useState(false);
    const [selectedSlot, setSelectedSlot] = useState(null);
    const [isTimeSlotManagerOpen, setIsTimeSlotManagerOpen] = useState(false);
    const [isAvailabilityPanelOpen, setIsAvailabilityPanelOpen] = useState(false);
    const [isBellScheduleEditorOpen, setIsBellScheduleEditorOpen] = useState(false);
    const [isClubModalOpen, setIsClubModalOpen] = useState(false);

    // Data State
    const { events, addEvent, removeEvent, assignTeacherToSlot, bellSchedule, updateBellSchedule, teachers } = useSchedule();

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
        if (teacherId || subject || grade || startTime) {
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

                {/* Class Filter */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginLeft: '16px' }}>
                    <label htmlFor="class-filter" style={{ fontSize: '14px', fontWeight: '500' }}>
                        📚 Класс:
                    </label>
                    <select
                        id="class-filter"
                        value={selectedClass}
                        onChange={(e) => setSelectedClass(e.target.value)}
                        style={{
                            padding: '8px 12px',
                            borderRadius: '8px',
                            border: '2px solid #e5e7eb',
                            fontSize: '14px',
                            fontWeight: '500',
                            cursor: 'pointer',
                            backgroundColor: '#fff'
                        }}
                    >
                        {availableClasses.map(cls => (
                            <option key={cls} value={cls}>
                                {cls === 'all' ? 'Все классы' : cls}
                            </option>
                        ))}
                    </select>
                </div>

                {/* Teacher Filter */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginLeft: '16px' }}>
                    <label htmlFor="teacher-filter" style={{ fontSize: '14px', fontWeight: '500' }}>
                        👤 Учитель:
                    </label>
                    <select
                        id="teacher-filter"
                        value={selectedTeacher}
                        onChange={(e) => setSelectedTeacher(e.target.value)}
                        style={{
                            padding: '8px 12px',
                            borderRadius: '8px',
                            border: '2px solid #e5e7eb',
                            fontSize: '14px',
                            fontWeight: '500',
                            cursor: 'pointer',
                            backgroundColor: selectedTeacher !== 'all' ? '#dbeafe' : '#fff'
                        }}
                    >
                        <option value="all">Все учителя</option>
                        {teachers.map(t => (
                            <option key={t.id} value={t.name.split(' ')[0]}>
                                {t.name}
                            </option>
                        ))}
                    </select>
                </div>

                <button
                    className="btn btn-secondary"
                    onClick={() => setIsBellScheduleEditorOpen(true)}
                    style={{ marginLeft: 'auto' }}
                >
                    🔔 Расписание звонков
                </button>
                <button
                    className="btn btn-secondary"
                    onClick={() => setIsAvailabilityPanelOpen(true)}
                >
                    👥 Кто свободен?
                </button>
                {viewMode === 'schedule' && (
                    <button
                        className="btn btn-primary"
                        onClick={() => setIsTimeSlotManagerOpen(true)}
                    >
                        ➕ Создать расписание
                    </button>
                )}
            </div>

            {viewMode === 'calendar' ? (
                <CalendarGrid
                    currentDate={currentDate}
                    onDayClick={handleDayClick}
                    substitutions={events}
                    selectedClass={selectedClass}
                    selectedTeacher={selectedTeacher}
                />
            ) : (
                <TimeSlotGrid
                    date={selectedDate || new Date()}
                    onSlotClick={handleSlotClick}
                    selectedClass={selectedClass}
                />
            )}

            {/* 1. Day Details (Menu) */}
            <DayDetailsModal
                date={selectedDate}
                isOpen={isDetailsOpen}
                onClose={() => setIsDetailsOpen(false)}
                lessons={events}
                selectedClass={selectedClass}
                selectedTeacher={selectedTeacher}
                onAddLesson={() => setIsLessonModalOpen(true)}
                onAddSubstitution={openSubstitutionModal}
                onAddClub={() => setIsClubModalOpen(true)}
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

            {/* 6. Teacher Availability Panel */}
            <TeacherAvailabilityPanel
                date={selectedDate}
                isOpen={isAvailabilityPanelOpen}
                onClose={() => setIsAvailabilityPanelOpen(false)}
                onSelectTeacher={(teacher) => {
                    console.log('Selected teacher:', teacher);
                    setIsAvailabilityPanelOpen(false);
                }}
            />

            {/* 7. Bell Schedule Editor */}
            <BellScheduleEditor
                isOpen={isBellScheduleEditorOpen}
                onClose={() => setIsBellScheduleEditorOpen(false)}
                currentSchedule={bellSchedule}
                onSave={updateBellSchedule}
            />

            {/* 8. Club Modal */}
            <ClubModal
                date={selectedDate}
                isOpen={isClubModalOpen}
                onClose={() => setIsClubModalOpen(false)}
                onSave={handleAddEvent}
            />
        </div>
    );
};

export default CalendarPage;
