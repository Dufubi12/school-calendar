import React, { createContext, useContext, useState, useEffect } from 'react';
import { INITIAL_SUBSTITUTIONS, TEACHERS as MOCK_DATA_TEACHERS } from '../data/mockData';
import {
    calculateWorkload,
    findConflicts,
    checkTeacherConflict,
    getAvailableTeachers,
    getSlotsByDate,
    migrateOldEvents,
    calculateTeacherSalary
} from '../utils/scheduleUtils';

const ScheduleContext = createContext();

export const useSchedule = () => {
    const context = useContext(ScheduleContext);
    if (!context) {
        throw new Error('useSchedule must be used within a ScheduleProvider');
    }
    return context;
};

export const ScheduleProvider = ({ children }) => {
    // 0. Bell Schedule (User customizable)
    const [bellSchedule, setBellSchedule] = useState(() => {
        const saved = localStorage.getItem('school_calendar_bell_schedule');
        if (saved) {
            try {
                return JSON.parse(saved);
            } catch (e) {
                console.error('Failed to parse bell schedule data', e);
            }
        }
        // Default schedule
        return [
            { lessonNumber: 1, startTime: '08:30', endTime: '09:15', label: '1 урок' },
            { lessonNumber: 2, startTime: '09:25', endTime: '10:10', label: '2 урок' },
            { lessonNumber: 3, startTime: '10:30', endTime: '11:15', label: '3 урок' },
            { lessonNumber: 4, startTime: '11:35', endTime: '12:20', label: '4 урок' },
            { lessonNumber: 5, startTime: '12:30', endTime: '13:15', label: '5 урок' },
            { lessonNumber: 6, startTime: '13:25', endTime: '14:10', label: '6 урок' },
            { lessonNumber: 7, startTime: '14:20', endTime: '15:05', label: '7 урок' },
            { lessonNumber: 8, startTime: '15:15', endTime: '16:00', label: '8 урок' },
        ];
    });

    // 1. Events (Lessons & Substitutions)
    const [events, setEvents] = useState(() => {
        const saved = localStorage.getItem('school_calendar_events');
        if (saved) {
            try {
                return JSON.parse(saved);
            } catch (e) {
                console.error('Failed to parse schedule data', e);
            }
        }
        return INITIAL_SUBSTITUTIONS.map(s => ({
            ...s,
            type: 'substitution',
            details: `Замена: ${s.subject}`
        }));
    });

    // 2. Teachers List
    const [teachers, setTeachers] = useState(() => {
        const saved = localStorage.getItem('school_calendar_teachers');
        if (saved) {
            try {
                return JSON.parse(saved);
            } catch (e) {
                console.error('Failed to parse teachers data', e);
            }
        }
        // Force import in case module resolution is needed, or just use MOCK from imports
        // Re-verify imports at top of file
        return MOCK_DATA_TEACHERS;
    });

    // Save to localStorage whenever events change
    useEffect(() => {
        localStorage.setItem('school_calendar_events', JSON.stringify(events));
    }, [events]);

    useEffect(() => {
        localStorage.setItem('school_calendar_teachers', JSON.stringify(teachers));
    }, [teachers]);

    useEffect(() => {
        localStorage.setItem('school_calendar_bell_schedule', JSON.stringify(bellSchedule));
    }, [bellSchedule]);

    const addEvent = (event) => {
        setEvents(prev => [...prev, event]);
    };

    const removeEvent = (eventId) => {
        setEvents(prev => prev.filter(e => e.id !== eventId));
    };

    const addTeacher = (teacher) => {
        setTeachers(prev => {
            const newId = Math.max(...prev.map(t => t.id), 0) + 1;
            return [...prev, { ...teacher, id: newId }];
        });
    };

    const removeTeacher = (id) => {
        setTeachers(prev => prev.filter(t => t.id !== id));
    };

    const updateTeacher = (updatedTeacher) => {
        setTeachers(prev => prev.map(t => t.id === updatedTeacher.id ? updatedTeacher : t));
    };

    // 3. Time Slots Management
    const [timeSlots, setTimeSlots] = useState(() => {
        const saved = localStorage.getItem('school_calendar_timeslots');
        if (saved) {
            try {
                return JSON.parse(saved);
            } catch (e) {
                console.error('Failed to parse time slots data', e);
            }
        }
        // Migrate old events if no time slots exist
        const migratedSlots = migrateOldEvents(events);
        return migratedSlots;
    });

    // Save time slots to localStorage
    useEffect(() => {
        localStorage.setItem('school_calendar_timeslots', JSON.stringify(timeSlots));
    }, [timeSlots]);

    const addTimeSlot = (slot) => {
        setTimeSlots(prev => [...prev, slot]);
    };

    const removeTimeSlot = (slotId) => {
        setTimeSlots(prev => prev.filter(s => s.id !== slotId));
    };

    const updateTimeSlot = (updatedSlot) => {
        setTimeSlots(prev => prev.map(s => s.id === updatedSlot.id ? updatedSlot : s));
    };

    const assignTeacherToSlot = (slotId, teacherId, subject = null, rateId = null) => {
        setTimeSlots(prev => prev.map(slot => {
            if (slot.id === slotId) {
                return { ...slot, teacherId, subject: subject || slot.subject, rateId };
            }
            return slot;
        }));
    };

    // Helper functions using imported utilities
    const getTeacherWorkload = (teacherId, startDate = null, endDate = null) => {
        return calculateWorkload(teacherId, timeSlots, startDate, endDate);
    };

    const checkConflict = (teacherId, date, lessonNumber) => {
        return checkTeacherConflict(teacherId, date, lessonNumber, timeSlots);
    };

    const getAvailableTeachersForSlot = (slot, subject = null) => {
        return getAvailableTeachers(slot, teachers, timeSlots, subject);
    };

    const getSlotsForDate = (date) => {
        return getSlotsByDate(date, timeSlots);
    };

    const updateBellSchedule = (newSchedule) => {
        setBellSchedule(newSchedule);
    };

    const getTeacherSalaryInfo = (teacherId, startDate = null, endDate = null) => {
        const teacher = teachers.find(t => t.id === teacherId);
        if (!teacher) return null;
        // Support multiple rates or single lessonRate
        const hasRates = teacher.rates && teacher.rates.length > 0;
        if (!hasRates && !teacher.lessonRate) return null;
        return calculateTeacherSalary(
            teacherId, timeSlots, teacher.lessonRate || 0,
            startDate, endDate,
            hasRates ? teacher.rates : []
        );
    };

    return (
        <ScheduleContext.Provider value={{
            events, addEvent, removeEvent,
            teachers, addTeacher, removeTeacher, updateTeacher,
            timeSlots, addTimeSlot, removeTimeSlot, updateTimeSlot, assignTeacherToSlot,
            getTeacherWorkload, checkConflict, getAvailableTeachersForSlot, getSlotsForDate,
            bellSchedule, updateBellSchedule,
            getTeacherSalaryInfo
        }}>
            {children}
        </ScheduleContext.Provider>
    );
};
