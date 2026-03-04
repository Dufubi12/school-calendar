import React, { createContext, useContext, useState, useEffect } from 'react';
import { INITIAL_SUBSTITUTIONS, TEACHERS as MOCK_DATA_TEACHERS, REAL_SCHEDULE } from '../data/mockData';
import {
    calculateWorkload,
    findConflicts,
    checkTeacherConflict,
    getAvailableTeachers,
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
    // Всегда используем актуальное расписание звонков
    const [bellSchedule, setBellSchedule] = useState(() => {
        // Принудительно обновляем расписание звонков
        const newSchedule = [
            { lessonNumber: 0, startTime: '08:45', endTime: '09:00', label: 'Сонастройка' },
            { lessonNumber: 1, startTime: '09:00', endTime: '09:45', label: '1 урок' },
            { lessonNumber: 2, startTime: '09:55', endTime: '10:40', label: '2 урок' },
            { lessonNumber: 3, startTime: '10:50', endTime: '11:35', label: '3 урок' },
            { lessonNumber: 4, startTime: '11:45', endTime: '12:30', label: '4 урок' },
            { lessonNumber: 5, startTime: '12:40', endTime: '13:25', label: '5 урок' },
            { lessonNumber: 6, startTime: '13:35', endTime: '14:20', label: '6 урок' },
            { lessonNumber: 7, startTime: '14:30', endTime: '15:15', label: '7 урок' },
            { lessonNumber: 8, startTime: '15:25', endTime: '16:10', label: '8 урок' },
        ];
        localStorage.setItem('school_calendar_bell_schedule', JSON.stringify(newSchedule));
        return newSchedule;
    });

    // 1. User Events (только замены и кружки, БЕЗ расписания)
    const [userEvents, setUserEvents] = useState(() => {
        const saved = localStorage.getItem('school_calendar_user_events');
        if (saved) {
            try {
                return JSON.parse(saved);
            } catch (e) {
                console.error('Failed to parse user events', e);
            }
        }
        // Начальные замены
        return INITIAL_SUBSTITUTIONS.map(s => ({
            ...s,
            type: 'substitution',
            details: `Замена: ${s.subject}`
        }));
    });

    // Функция для получения всех событий (расписание + пользовательские)
    const getAllEvents = () => {
        // Генерируем события расписания только для текущего месяца ± 2 месяца
        const now = new Date();
        const startDate = new Date(now.getFullYear(), now.getMonth() - 2, 1);
        const endDate = new Date(now.getFullYear(), now.getMonth() + 3, 0);

        const scheduleEvents = generateEventsForDateRange(startDate, endDate);
        return [...scheduleEvents, ...userEvents];
    };

    // Генерация событий для диапазона дат
    const generateEventsForDateRange = (startDate, endDate) => {
        const events = [];
        let eventId = 1000;

        const dayNameToNumber = {
            'Понедельник': 1,
            'Вторник': 2,
            'Среда': 3,
            'Четверг': 4,
            'Пятница': 5,
            'Суббота': 6,
            'Воскресенье': 0
        };

        Object.entries(REAL_SCHEDULE).forEach(([className, days]) => {
            Object.entries(days).forEach(([dayName, lessons]) => {
                const targetDayNumber = dayNameToNumber[dayName];
                let currentDate = new Date(startDate);

                while (currentDate.getDay() !== targetDayNumber && currentDate <= endDate) {
                    currentDate.setDate(currentDate.getDate() + 1);
                }

                while (currentDate <= endDate) {
                    const dateStr = currentDate.toISOString().split('T')[0];

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

                    currentDate.setDate(currentDate.getDate() + 7);
                }
            });
        });

        return events;
    };

    // 2. Teachers List
    const [teachers, setTeachers] = useState(() => {
        const saved = localStorage.getItem('school_calendar_teachers_v2');
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

    // Save to localStorage whenever userEvents change
    useEffect(() => {
        localStorage.setItem('school_calendar_user_events', JSON.stringify(userEvents));
    }, [userEvents]);

    useEffect(() => {
        localStorage.setItem('school_calendar_teachers_v2', JSON.stringify(teachers));
    }, [teachers]);

    useEffect(() => {
        localStorage.setItem('school_calendar_bell_schedule', JSON.stringify(bellSchedule));
    }, [bellSchedule]);

    const addEvent = (event) => {
        const newEvent = {
            ...event,
            id: Date.now() // Генерируем уникальный ID
        };
        setUserEvents(prev => [...prev, newEvent]);
    };

    const removeEvent = (eventId) => {
        setUserEvents(prev => prev.filter(e => e.id !== eventId));
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

    // 3. Time Slots Management - генерируем по запросу
    // Храним только пользовательские изменения (назначения учителей и т.д.)
    const [customSlotData, setCustomSlotData] = useState(() => {
        const saved = localStorage.getItem('school_calendar_custom_slots');
        if (saved) {
            try {
                return JSON.parse(saved);
            } catch (e) {
                console.error('Failed to parse custom slots data', e);
            }
        }
        return {}; // { slotId: { teacherId, customField, etc } }
    });

    // Save custom slot data to localStorage
    useEffect(() => {
        localStorage.setItem('school_calendar_custom_slots', JSON.stringify(customSlotData));
    }, [customSlotData]);

    // Генерация слотов для конкретной даты
    const generateSlotsForDate = (date) => {
        const slots = [];
        const dateStr = typeof date === 'string' ? date : date.toISOString().split('T')[0];
        const dateObj = new Date(dateStr);
        const dayNumber = dateObj.getDay();

        const numberToDayName = {
            0: 'Воскресенье',
            1: 'Понедельник',
            2: 'Вторник',
            3: 'Среда',
            4: 'Четверг',
            5: 'Пятница',
            6: 'Суббота'
        };

        const dayName = numberToDayName[dayNumber];
        let slotId = parseInt(dateStr.replace(/-/g, '')) * 1000; // Уникальный ID на основе даты

        Object.entries(REAL_SCHEDULE).forEach(([className, days]) => {
            if (days[dayName]) {
                days[dayName].forEach((lesson, lessonIndex) => {
                    const [startTime, endTime] = lesson.time.split('-');
                    const teacherId = findTeacherByName(lesson.teacher);
                    const currentSlotId = slotId++;

                    // Применяем пользовательские данные если есть
                    const customData = customSlotData[currentSlotId] || {};

                    slots.push({
                        id: currentSlotId,
                        date: dateStr,
                        startTime: startTime,
                        endTime: endTime,
                        subject: lesson.subject,
                        teacherId: customData.teacherId !== undefined ? customData.teacherId : teacherId,
                        teacherName: lesson.teacher || 'Не назначен',
                        grade: className,
                        lessonNumber: lessonIndex + 1,
                        type: 'regular',
                        ...customData
                    });
                });
            }
        });

        return slots;
    };

    const addTimeSlot = (slot) => {
        // Добавляем слот как пользовательский
        setCustomSlotData(prev => ({
            ...prev,
            [slot.id]: slot
        }));
    };

    const removeTimeSlot = (slotId) => {
        // Удаляем пользовательский слот
        setCustomSlotData(prev => {
            const newData = { ...prev };
            delete newData[slotId];
            return newData;
        });
    };

    const updateTimeSlot = (updatedSlot) => {
        setCustomSlotData(prev => ({
            ...prev,
            [updatedSlot.id]: {
                ...prev[updatedSlot.id],
                ...updatedSlot
            }
        }));
    };

    const assignTeacherToSlot = (slotId, teacherId, subject = null) => {
        setCustomSlotData(prev => ({
            ...prev,
            [slotId]: {
                ...prev[slotId],
                teacherId,
                subject: subject || prev[slotId]?.subject
            }
        }));
    };

    // Получение слотов для даты
    const getSlotsForDate = (date) => {
        return generateSlotsForDate(date);
    };

    // Helper functions using imported utilities
    const getTeacherWorkload = (teacherId, startDate = null, endDate = null) => {
        // Генерируем слоты для диапазона дат
        const slots = [];
        const start = startDate ? new Date(startDate) : new Date();
        const end = endDate ? new Date(endDate) : new Date(start.getFullYear(), start.getMonth() + 1, 0);

        for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
            slots.push(...generateSlotsForDate(d));
        }

        return calculateWorkload(teacherId, slots, startDate, endDate);
    };

    const checkConflict = (teacherId, date, lessonNumber) => {
        const slots = generateSlotsForDate(date);
        return checkTeacherConflict(teacherId, date, lessonNumber, slots);
    };

    const getAvailableTeachersForSlot = (slot, subject = null) => {
        const slots = generateSlotsForDate(slot.date);
        return getAvailableTeachers(slot, teachers, slots, subject);
    };

    const updateBellSchedule = (newSchedule) => {
        setBellSchedule(newSchedule);
    };

    return (
        <ScheduleContext.Provider value={{
            events: getAllEvents(), // Все события (расписание + пользовательские)
            addEvent,
            removeEvent,
            teachers,
            addTeacher,
            removeTeacher,
            updateTeacher,
            timeSlots: [], // Deprecated, используйте getSlotsForDate
            addTimeSlot,
            removeTimeSlot,
            updateTimeSlot,
            assignTeacherToSlot,
            getTeacherWorkload,
            checkConflict,
            getAvailableTeachersForSlot,
            getSlotsForDate,
            bellSchedule,
            updateBellSchedule
        }}>
            {children}
        </ScheduleContext.Provider>
    );
};
