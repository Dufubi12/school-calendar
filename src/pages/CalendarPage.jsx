import React, { useState, useMemo, useEffect } from 'react';
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
import { filterByRole, isTutor } from '../components/RoleFilterTabs';
import { loadInvitations, loadIndividualSlots } from '../lib/api';

const CalendarPage = () => {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState(null);
    const [viewMode, setViewMode] = useState('calendar'); // 'calendar' or 'schedule'
    const [selectedClass, setSelectedClass] = useState('all'); // 'all' or specific class like '7А'
    const [selectedTeacher, setSelectedTeacher] = useState('all'); // 'all' or teacher last name
    const [roleFilter, setRoleFilter] = useState('all'); // 'all' | 'teachers' | 'tutors'
    const [kindFilter, setKindFilter] = useState('all'); // 'all' | 'group' | 'individual'

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

    // Invitations + ИЗ-slots (busy = recurring individual lesson)
    const [invitations, setInvitations] = useState([]);
    const [izSlots, setIzSlots] = useState({});
    useEffect(() => {
        let cancelled = false;
        const refresh = async () => {
            try {
                const [invs, slots] = await Promise.all([
                    loadInvitations(),
                    loadIndividualSlots(teachers),
                ]);
                if (cancelled) return;
                setInvitations(invs || []);
                // Shallow check: only update if data actually changed (avoid izEvents recompute)
                setIzSlots(prev => {
                    const next = slots || {};
                    if (JSON.stringify(prev) === JSON.stringify(next)) return prev;
                    return next;
                });
            } catch { /* ignore */ }
        };
        refresh();
        const onFocus = () => refresh();
        window.addEventListener('focus', onFocus);
        return () => { cancelled = true; window.removeEventListener('focus', onFocus); };
    }, [teachers]);

    // Merge invitations + ИЗ-slots into events as virtual entries
    const eventsWithInvitations = useMemo(() => {
        // 1) invitations → virtual events
        const invEvents = (invitations || [])
            .filter(inv => inv.status !== 'declined')
            .map(inv => {
                const teacher = teachers.find(t => t.id === inv.teacherId);
                const lastName = teacher ? teacher.name.split(' ')[0] : '';
                const [startTime, endTime] = (inv.time || '').split('-');
                return {
                    id: `inv-${inv.id}`,
                    type: inv.status === 'accepted' ? 'substitution' : 'pending-invitation',
                    date: inv.date,
                    startTime: startTime || '',
                    endTime: endTime || '',
                    time: inv.time,
                    subject: inv.subject,
                    grade: inv.grade,
                    className: inv.grade,
                    teacher: lastName,
                    teacherName: inv.teacherName,
                    lessonKind: inv.lessonKind || null,
                    studentName: inv.studentName || null,
                    details: `${inv.status === 'pending' ? '⏳ Предложено' : 'Замена'}: ${inv.subject}`
                };
            });

        // 2) ИЗ-busy slots → recurring weekly events for visible month ± 1
        const dayCodeToWeekday = {
            'пн': 1, 'вт': 2, 'ср': 3, 'чт': 4, 'пт': 5, 'сб': 6, 'вс': 0,
        };
        const monthStart = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1);
        const monthEnd = new Date(currentDate.getFullYear(), currentDate.getMonth() + 2, 0);

        const izEvents = [];
        Object.entries(izSlots).forEach(([lastName, data]) => {
            const tIdNum = data?.teacherId;
            const fullName = data?.name || lastName;

            // 2a) Recurring weekly busy slots
            Object.entries(data?.slots || {}).forEach(([day, timeMap]) => {
                const dow = dayCodeToWeekday[day];
                if (dow === undefined) return;
                Object.entries(timeMap).forEach(([timeKey, status]) => {
                    if (status !== 'busy') return;
                    const [startTime, endTime] = timeKey.split('-');
                    const cur = new Date(monthStart);
                    while (cur.getDay() !== dow) cur.setDate(cur.getDate() + 1);
                    while (cur <= monthEnd) {
                        const dateStr = `${cur.getFullYear()}-${String(cur.getMonth() + 1).padStart(2, '0')}-${String(cur.getDate()).padStart(2, '0')}`;
                        izEvents.push({
                            id: `iz-${tIdNum}-${dateStr}-${timeKey}`,
                            type: 'individual',
                            date: dateStr,
                            startTime, endTime,
                            time: timeKey,
                            subject: 'Индивид.',
                            grade: '',
                            className: '',
                            teacher: lastName,
                            teacherName: fullName,
                            lessonKind: 'ИЗ',
                            details: `ИЗ: ${fullName}`
                        });
                        cur.setDate(cur.getDate() + 7);
                    }
                });
            });

            // 2b) Single-date events
            (data?.singleEvents || []).forEach(ev => {
                if (ev.status !== 'busy') return;
                const [startTime, endTime] = (ev.time_slot || '').split('-');
                izEvents.push({
                    id: `iz-single-${ev.id}`,
                    type: 'individual',
                    date: ev.single_date,
                    startTime, endTime,
                    time: ev.time_slot,
                    subject: 'Индивид. (разово)',
                    grade: '',
                    className: '',
                    teacher: lastName,
                    teacherName: fullName,
                    lessonKind: 'ИЗ',
                    details: `ИЗ (разово): ${fullName}`
                });
            });
        });

        const merged = [...events, ...invEvents, ...izEvents];

        // Apply kind filter (group vs individual)
        if (kindFilter === 'all') return merged;
        const INDIVIDUAL_KINDS = new Set(['ИЗ', 'ИМ', 'ОГЭ', 'ЕГЭ']);
        return merged.filter(ev => {
            const isInd = INDIVIDUAL_KINDS.has(ev.lessonKind);
            return kindFilter === 'individual' ? isInd : !isInd;
        });
    }, [events, invitations, izSlots, teachers, kindFilter, currentDate]);

    // Last names of teachers allowed by current role filter (null = no role filter)
    const allowedTeacherLastNames = useMemo(() => {
        if (roleFilter === 'all') return null;
        return filterByRole(teachers, roleFilter).map(t => t.name.split(' ')[0]);
    }, [teachers, roleFilter]);

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
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginLeft: '12px' }}>
                    <label htmlFor="class-filter" style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-text-muted)' }}>
                        📚 Класс
                    </label>
                    <select
                        id="class-filter"
                        value={selectedClass}
                        onChange={(e) => setSelectedClass(e.target.value)}
                        style={{
                            padding: '7px 12px',
                            width: 'auto',
                            minWidth: '120px',
                            fontWeight: 500,
                            cursor: 'pointer',
                            backgroundColor: selectedClass !== 'all' ? 'var(--color-bg-tint)' : 'var(--color-bg-card)',
                            borderColor: selectedClass !== 'all' ? 'var(--color-primary)' : 'var(--color-border)'
                        }}
                    >
                        {availableClasses.map(cls => (
                            <option key={cls} value={cls}>
                                {cls === 'all' ? 'Все классы' : cls}
                            </option>
                        ))}
                    </select>
                </div>

                {/* Kind Filter: Все / Групповые / Индивидуальные */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginLeft: '12px' }}>
                    <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-text-muted)' }}>
                        🎯 Тип
                    </label>
                    <div style={{
                        display: 'inline-flex',
                        padding: '3px',
                        borderRadius: 'var(--radius)',
                        border: '1px solid var(--color-border)',
                        backgroundColor: 'var(--color-bg-tint)'
                    }}>
                        {[
                            { id: 'all', label: 'Все' },
                            { id: 'group', label: 'Групповые' },
                            { id: 'individual', label: 'Инд.' },
                        ].map(opt => {
                            const active = kindFilter === opt.id;
                            return (
                                <button
                                    key={opt.id}
                                    onClick={() => setKindFilter(opt.id)}
                                    style={{
                                        padding: '5px 12px',
                                        borderRadius: 'var(--radius-sm)',
                                        border: 'none',
                                        backgroundColor: active ? 'var(--color-primary)' : 'transparent',
                                        color: active ? '#fff' : 'var(--color-text-muted)',
                                        cursor: 'pointer',
                                        fontSize: '12px',
                                        fontWeight: 600,
                                        boxShadow: active ? 'var(--shadow-xs)' : 'none'
                                    }}
                                >
                                    {opt.label}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Teacher Filter (label + role tabs + select) */}
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    marginLeft: '12px',
                    flexWrap: 'wrap'
                }}>
                    <label htmlFor="teacher-filter" style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-text-muted)' }}>
                        👤 Учитель
                    </label>

                    {/* Segmented role toggle */}
                    <div style={{
                        display: 'inline-flex',
                        padding: '3px',
                        borderRadius: 'var(--radius)',
                        border: '1px solid var(--color-border)',
                        backgroundColor: 'var(--color-bg-tint)'
                    }}>
                        {[
                            { id: 'all', label: 'Все' },
                            { id: 'teachers', label: 'Учителя' },
                            { id: 'tutors', label: 'Тьюторы' },
                        ].map(opt => {
                            const active = roleFilter === opt.id;
                            return (
                                <button
                                    key={opt.id}
                                    onClick={() => {
                                        setRoleFilter(opt.id);
                                        if (selectedTeacher !== 'all') {
                                            const t = teachers.find(x => x.name.split(' ')[0] === selectedTeacher);
                                            if (!t || (opt.id === 'tutors' && !isTutor(t)) || (opt.id === 'teachers' && isTutor(t))) {
                                                setSelectedTeacher('all');
                                            }
                                        }
                                    }}
                                    style={{
                                        padding: '5px 12px',
                                        borderRadius: 'var(--radius-sm)',
                                        border: 'none',
                                        backgroundColor: active ? 'var(--color-primary)' : 'transparent',
                                        color: active ? '#fff' : 'var(--color-text-muted)',
                                        cursor: 'pointer',
                                        fontSize: '12px',
                                        fontWeight: 600,
                                        transition: 'all var(--duration-fast) var(--ease-out)',
                                        boxShadow: active ? 'var(--shadow-xs)' : 'none'
                                    }}
                                >
                                    {opt.label}
                                </button>
                            );
                        })}
                    </div>

                    <select
                        id="teacher-filter"
                        value={selectedTeacher}
                        onChange={(e) => setSelectedTeacher(e.target.value)}
                        style={{
                            padding: '7px 12px',
                            width: 'auto',
                            minWidth: '180px',
                            fontWeight: 500,
                            cursor: 'pointer',
                            backgroundColor: selectedTeacher !== 'all' ? 'var(--color-bg-tint)' : 'var(--color-bg-card)',
                            borderColor: selectedTeacher !== 'all' ? 'var(--color-primary)' : 'var(--color-border)'
                        }}
                    >
                        <option value="all">
                            {roleFilter === 'tutors' ? 'Все тьюторы' : roleFilter === 'teachers' ? 'Все учителя' : 'Все учителя/тьюторы'}
                        </option>
                        {filterByRole(teachers, roleFilter).map(t => (
                            <option key={t.id} value={t.name.split(' ')[0]}>
                                {t.name}{t.subject ? ` — ${t.subject}` : ''}
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
                    substitutions={eventsWithInvitations}
                    selectedClass={selectedClass}
                    selectedTeacher={selectedTeacher}
                    allowedTeacherLastNames={allowedTeacherLastNames}
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
                lessons={eventsWithInvitations}
                selectedClass={selectedClass}
                selectedTeacher={selectedTeacher}
                allowedTeacherLastNames={allowedTeacherLastNames}
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
