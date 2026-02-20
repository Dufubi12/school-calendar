import React, { createContext, useContext, useState, useEffect } from 'react';
import { INITIAL_SUBSTITUTIONS, TEACHERS as MOCK_DATA_TEACHERS, REAL_SCHEDULE } from '../data/mockData';
import {
    calculateWorkload,
    findConflicts,
    checkTeacherConflict,
    getAvailableTeachers,
    getSlotsByDate,
    migrateOldEvents
} from '../utils/scheduleUtils';

// Функция для поиска учителя по имени
const findTeacherByName = (teacherName) => {
    if (!teacherName || teacherName === 'Не назначен') return null;

    // Ищем точное совпадение
    let teacher = MOCK_DATA_TEACHERS.find(t => t.name === teacherName);
    if (teacher) return teacher.id;

    // Ищем по частичному совпадению (фамилия или имя)
    teacher = MOCK_DATA_TEACHERS.find(t =>
        t.name.includes(teacherName) || teacherName.includes(t.name.split(' ')[0])
    );

    return teacher ? teacher.id : null;
};

// Функция для преобразования REAL_SCHEDULE в временные слоты
const convertRealScheduleToTimeSlots = () => {
    const slots = [];
    let slotId = 5000;

    // Маппинг дней недели на номера
    const dayNameToNumber = {
        'Понедельник': 1,
        'Вторник': 2,
        'Среда': 3,
        'Четверг': 4,
        'Пятница': 5,
        'Суббота': 6,
        'Воскресенье': 0
    };

    // Генерируем слоты для учебного года 2025-2026
    const startDate = new Date(2025, 8, 1); // 1 сентября 2025
    const endDate = new Date(2026, 5, 30); // 30 июня 2026

    // Для каждого класса
    Object.entries(REAL_SCHEDULE).forEach(([className, days]) => {
        // Для каждого дня недели
        Object.entries(days).forEach(([dayName, lessons]) => {
            const targetDayNumber = dayNameToNumber[dayName];

            // Генерируем слоты для всех дат этого дня недели
            let currentDate = new Date(startDate);

            // Находим первое вхождение нужного дня недели
            while (currentDate.getDay() !== targetDayNumber && currentDate <= endDate) {
                currentDate.setDate(currentDate.getDate() + 1);
            }

            // Создаем слоты для каждого вхождения этого дня недели
            while (currentDate <= endDate) {
                const dateStr = currentDate.toISOString().split('T')[0];

                // Для каждого урока в этот день
                lessons.forEach((lesson, lessonIndex) => {
                    const [startTime, endTime] = lesson.time.split('-');
                    const teacherId = findTeacherByName(lesson.teacher);

                    slots.push({
                        id: slotId++,
                        date: dateStr,
                        startTime: startTime,
                        endTime: endTime,
                        subject: lesson.subject,
                        teacherId: teacherId,
                        teacherName: lesson.teacher || 'Не назначен',
                        grade: className,
                        lessonNumber: lessonIndex + 1,
                        type: 'regular'
                    });
                });

                // Переходим к следующей неделе
                currentDate.setDate(currentDate.getDate() + 7);
            }
        });
    });

    console.log(`Создано ${slots.length} временных слотов из расписания`);
    return slots;
};

// Функция для преобразования REAL_SCHEDULE в события
const convertRealScheduleToEvents = () => {
    const events = [];
    let eventId = 1000;

    // Маппинг дней недели на номера
    const dayNameToNumber = {
        'Понедельник': 1,
        'Вторник': 2,
        'Среда': 3,
        'Четверг': 4,
        'Пятница': 5,
        'Суббота': 6,
        'Воскресенье': 0
    };

    // Генерируем события для учебного года 2025-2026 (сентябрь 2025 - июнь 2026)
    const startDate = new Date(2025, 8, 1); // 1 сентября 2025
    const endDate = new Date(2026, 5, 30); // 30 июня 2026

    // Для каждого класса
    Object.entries(REAL_SCHEDULE).forEach(([className, days]) => {
        // Для каждого дня недели
        Object.entries(days).forEach(([dayName, lessons]) => {
            const targetDayNumber = dayNameToNumber[dayName];

            // Генерируем события для всех дат этого дня недели в учебном году
            let currentDate = new Date(startDate);

            // Находим первое вхождение нужного дня недели
            while (currentDate.getDay() !== targetDayNumber && currentDate <= endDate) {
                currentDate.setDate(currentDate.getDate() + 1);
            }

            // Создаем события для каждого вхождения этого дня недели
            while (currentDate <= endDate) {
                const dateStr = currentDate.toISOString().split('T')[0]; // YYYY-MM-DD

                // Для каждого урока в этот день
                lessons.forEach(lesson => {
                    events.push({
                        id: eventId++,
                        type: 'lesson',
                        className: className,
                        date: dateStr,
                        subject: lesson.subject,
                        teacher: lesson.teacher || 'Не назначен',
                        time: lesson.time,
                        details: `${className} - ${lesson.subject}${lesson.teacher ? ` (${lesson.teacher})` : ''}`
                    });
                });

                // Переходим к следующей неделе
                currentDate.setDate(currentDate.getDate() + 7);
            }
        });
    });

    console.log(`Загружено ${events.length} уроков из расписания`);
    return events;
};

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
        const saved = localStorage.getItem('school_calendar_events_v3');
        if (saved) {
            try {
                const parsedEvents = JSON.parse(saved);
                // Если есть сохраненные данные, используем их
                if (parsedEvents && parsedEvents.length > 0) {
                    return parsedEvents;
                }
            } catch (e) {
                console.error('Failed to parse schedule data', e);
            }
        }

        // Если нет сохраненных данных, загружаем из REAL_SCHEDULE
        const realScheduleEvents = convertRealScheduleToEvents();
        const substitutions = INITIAL_SUBSTITUTIONS.map(s => ({
            ...s,
            type: 'substitution',
            details: `Замена: ${s.subject}`
        }));

        return [...realScheduleEvents, ...substitutions];
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
        localStorage.setItem('school_calendar_events_v3', JSON.stringify(events));
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
        const saved = localStorage.getItem('school_calendar_timeslots_v3');
        if (saved) {
            try {
                const parsedSlots = JSON.parse(saved);
                if (parsedSlots && parsedSlots.length > 0) {
                    return parsedSlots;
                }
            } catch (e) {
                console.error('Failed to parse time slots data', e);
            }
        }
        // Загружаем слоты из REAL_SCHEDULE
        const realScheduleSlots = convertRealScheduleToTimeSlots();
        return realScheduleSlots;
    });

    // Save time slots to localStorage
    useEffect(() => {
        localStorage.setItem('school_calendar_timeslots_v3', JSON.stringify(timeSlots));
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

    const assignTeacherToSlot = (slotId, teacherId, subject = null) => {
        setTimeSlots(prev => prev.map(slot => {
            if (slot.id === slotId) {
                return { ...slot, teacherId, subject: subject || slot.subject };
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

    return (
        <ScheduleContext.Provider value={{
            events, addEvent, removeEvent,
            teachers, addTeacher, removeTeacher, updateTeacher,
            timeSlots, addTimeSlot, removeTimeSlot, updateTimeSlot, assignTeacherToSlot,
            getTeacherWorkload, checkConflict, getAvailableTeachersForSlot, getSlotsForDate,
            bellSchedule, updateBellSchedule
        }}>
            {children}
        </ScheduleContext.Provider>
    );
};
