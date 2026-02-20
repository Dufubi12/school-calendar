// Utility functions for schedule management

import { format, parse, isSameDay } from 'date-fns';

/**
 * Default schedule template (расписание звонков)
 */
export const DEFAULT_SCHEDULE_TEMPLATE = [
    { lessonNumber: 1, startTime: '08:30', endTime: '09:15' },
    { lessonNumber: 2, startTime: '09:25', endTime: '10:10' },
    { lessonNumber: 3, startTime: '10:30', endTime: '11:15' },
    { lessonNumber: 4, startTime: '11:35', endTime: '12:20' },
    { lessonNumber: 5, startTime: '12:30', endTime: '13:15' },
    { lessonNumber: 6, startTime: '13:25', endTime: '14:10' },
    { lessonNumber: 7, startTime: '14:20', endTime: '15:05' },
    { lessonNumber: 8, startTime: '15:15', endTime: '16:00' },
];

/**
 * Calculate teacher workload
 * @param {number} teacherId - Teacher ID
 * @param {Array} timeSlots - Array of all time slots
 * @param {Date} startDate - Start date for calculation
 * @param {Date} endDate - End date for calculation
 * @returns {Object} Workload statistics
 */
export const calculateWorkload = (teacherId, timeSlots, startDate = null, endDate = null) => {
    const teacherSlots = timeSlots.filter(slot => slot.teacherId === teacherId);

    // Filter by date range if provided
    let filteredSlots = teacherSlots;
    if (startDate || endDate) {
        filteredSlots = teacherSlots.filter(slot => {
            if (!slot.date) return slot.isRecurring; // Include recurring slots
            const slotDate = new Date(slot.date);
            if (startDate && slotDate < startDate) return false;
            if (endDate && slotDate > endDate) return false;
            return true;
        });
    }

    // Calculate slots by day of week
    const slotsByDay = {
        monday: 0,
        tuesday: 0,
        wednesday: 0,
        thursday: 0,
        friday: 0,
        saturday: 0,
        sunday: 0
    };

    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

    filteredSlots.forEach(slot => {
        if (slot.date) {
            const date = new Date(slot.date);
            const dayName = dayNames[date.getDay()];
            slotsByDay[dayName]++;
        } else if (slot.dayOfWeek !== undefined) {
            const dayName = dayNames[slot.dayOfWeek];
            slotsByDay[dayName]++;
        }
    });

    const totalSlots = filteredSlots.length;
    const maxPossibleSlots = 40; // 8 lessons * 5 days
    const workloadPercentage = Math.round((totalSlots / maxPossibleSlots) * 100);

    return {
        teacherId,
        totalSlots,
        assignedSlots: totalSlots,
        workloadPercentage: Math.min(workloadPercentage, 100),
        slotsByDay,
        averagePerDay: totalSlots / 5 // Assuming 5-day week
    };
};

/**
 * Find scheduling conflicts for a teacher
 * @param {number} teacherId - Teacher ID
 * @param {Date|string} date - Date to check
 * @param {Object} newSlot - New time slot to check
 * @param {Array} existingSlots - Existing time slots
 * @returns {Array} Array of conflicting slots
 */
export const findConflicts = (teacherId, date, newSlot, existingSlots) => {
    const dateStr = typeof date === 'string' ? date : format(date, 'yyyy-MM-dd');

    const conflicts = existingSlots.filter(slot => {
        // Skip if different teacher
        if (slot.teacherId !== teacherId) return false;

        // Check if same date
        const isSameDate = slot.date === dateStr ||
            (slot.isRecurring && slot.dayOfWeek === new Date(dateStr).getDay());

        if (!isSameDate) return false;

        // Check time overlap
        const slotStart = slot.startTime;
        const slotEnd = slot.endTime;
        const newStart = newSlot.startTime;
        const newEnd = newSlot.endTime;

        // Times overlap if: (StartA < EndB) and (EndA > StartB)
        return (slotStart < newEnd) && (slotEnd > newStart);
    });

    return conflicts;
};

/**
 * Check if a teacher has a conflict at specific time
 * @param {number} teacherId - Teacher ID
 * @param {Date|string} date - Date to check
 * @param {number} lessonNumber - Lesson number
 * @param {Array} timeSlots - All time slots
 * @returns {boolean} True if teacher has conflict
 */
export const checkTeacherConflict = (teacherId, date, lessonNumber, timeSlots) => {
    const dateStr = typeof date === 'string' ? date : format(date, 'yyyy-MM-dd');
    const dayOfWeek = new Date(dateStr).getDay();

    const conflict = timeSlots.find(slot => {
        if (slot.teacherId !== teacherId) return false;
        if (slot.lessonNumber !== lessonNumber) return false;

        // Check specific date or recurring
        return slot.date === dateStr || (slot.isRecurring && slot.dayOfWeek === dayOfWeek);
    });

    return !!conflict;
};

/**
 * Generate default weekly schedule template
 * @param {string} grade - Grade/class name
 * @returns {Array} Array of time slots for the week
 */
export const generateDefaultSchedule = (grade = '9А') => {
    const slots = [];
    const daysOfWeek = [1, 2, 3, 4, 5]; // Monday to Friday

    daysOfWeek.forEach(dayOfWeek => {
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

    return slots;
};

/**
 * Get available teachers for a specific time slot
 * @param {Object} timeSlot - Time slot to check
 * @param {Array} allTeachers - All teachers
 * @param {Array} existingSlots - Existing time slots
 * @param {string} subject - Optional subject filter
 * @returns {Array} Available teachers with conflict info
 */
export const getAvailableTeachers = (timeSlot, allTeachers, existingSlots, subject = null) => {
    return allTeachers.map(teacher => {
        // Filter by subject if specified
        if (subject && teacher.subject !== subject) {
            return null;
        }

        // Check for conflicts
        const conflicts = findConflicts(
            teacher.id,
            timeSlot.date || new Date(),
            timeSlot,
            existingSlots
        );

        const workload = calculateWorkload(teacher.id, existingSlots);

        return {
            ...teacher,
            hasConflict: conflicts.length > 0,
            conflicts,
            workload: workload.workloadPercentage,
            totalLessons: workload.totalSlots
        };
    }).filter(Boolean); // Remove null entries
};

/**
 * Format time slot for display
 * @param {Object} slot - Time slot object
 * @param {Array} teachers - Teachers array for name lookup
 * @returns {string} Formatted string
 */
export const formatTimeSlot = (slot, teachers = []) => {
    const teacher = teachers.find(t => t.id === slot.teacherId);
    const teacherName = teacher ? teacher.name : 'Не назначен';

    return `${slot.startTime} - ${slot.endTime} | ${slot.subject || 'Предмет не указан'} | ${teacherName}`;
};

/**
 * Get slots for a specific date
 * @param {Date|string} date - Date to get slots for
 * @param {Array} allSlots - All time slots
 * @returns {Array} Slots for the date, sorted by lesson number
 */
export const getSlotsByDate = (date, allSlots) => {
    const dateStr = typeof date === 'string' ? date : format(date, 'yyyy-MM-dd');
    const dayOfWeek = new Date(dateStr).getDay();

    const slots = allSlots.filter(slot => {
        // Match specific date or recurring on this day of week
        return slot.date === dateStr || (slot.isRecurring && slot.dayOfWeek === dayOfWeek);
    });

    // Sort by lesson number
    return slots.sort((a, b) => a.lessonNumber - b.lessonNumber);
};

/**
 * Calculate teacher salary based on lessons
 * @param {number} teacherId - Teacher ID
 * @param {Array} timeSlots - All time slots
 * @param {number} lessonRate - Rate per lesson in rubles
 * @param {Date} startDate - Start date for calculation (optional)
 * @param {Date} endDate - End date for calculation (optional)
 * @returns {Object} Salary information
 */
export const calculateTeacherSalary = (teacherId, timeSlots, lessonRate, startDate = null, endDate = null) => {
    const workload = calculateWorkload(teacherId, timeSlots, startDate, endDate);

    return {
        teacherId,
        totalLessons: workload.totalSlots,
        lessonRate,
        monthlySalary: workload.totalSlots * lessonRate,
        weeklyLessons: Math.round(workload.averagePerDay * 5 * 10) / 10, // Round to 1 decimal
        weeklySalary: Math.round(workload.averagePerDay * 5 * lessonRate),
        lessonsByDay: workload.slotsByDay,
        averagePerDay: workload.averagePerDay,
        period: startDate && endDate ? { startDate, endDate } : null
    };
};

/**
 * Get workload level category
 * @param {number} percentage - Workload percentage
 * @returns {Object} Category info with color and label
 */
export const getWorkloadLevel = (percentage) => {
    if (percentage >= 80) {
        return { level: 'high', color: '#ef4444', label: 'Перегрузка', emoji: '🔴' };
    } else if (percentage >= 60) {
        return { level: 'medium', color: '#f59e0b', label: 'Высокая нагрузка', emoji: '🟡' };
    } else {
        return { level: 'low', color: '#10b981', label: 'Нормальная нагрузка', emoji: '🟢' };
    }
};

/**
 * Get slot status
 * @param {Object} slot - Time slot
 * @param {Array} allSlots - All slots for conflict checking
 * @returns {Object} Status info
 */
export const getSlotStatus = (slot, allSlots = []) => {
    if (!slot.teacherId) {
        return { status: 'free', color: '#10b981', label: 'Свободен', emoji: '🟢' };
    }

    const conflicts = findConflicts(slot.teacherId, slot.date || new Date(), slot, allSlots);

    if (conflicts.length > 0) {
        return { status: 'conflict', color: '#ef4444', label: 'Конфликт', emoji: '🔴' };
    }

    return { status: 'assigned', color: '#f59e0b', label: 'Назначен', emoji: '🟡' };
};

/**
 * Migrate old events to new time slot structure
 * @param {Array} oldEvents - Old event structure
 * @returns {Array} New time slot structure
 */
export const migrateOldEvents = (oldEvents) => {
    return oldEvents.map(event => {
        // Find matching template for time
        const template = DEFAULT_SCHEDULE_TEMPLATE.find(t => t.lessonNumber === event.lessonNumber);

        return {
            id: event.id || `migrated-${Date.now()}-${Math.random()}`,
            dayOfWeek: event.date ? new Date(event.date).getDay() : null,
            lessonNumber: event.lessonNumber || 1,
            startTime: event.startTime || template?.startTime || '08:30',
            endTime: event.endTime || template?.endTime || '09:15',
            grade: event.grade || '',
            subject: event.subject || '',
            teacherId: event.substituteTeacherId || event.teacherId || null,
            room: event.room || '',
            isRecurring: false,
            date: event.date || null,
            type: event.type || 'lesson'
        };
    });
};
