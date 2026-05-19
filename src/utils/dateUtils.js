import {
    startOfMonth,
    endOfMonth,
    startOfWeek,
    endOfWeek,
    eachDayOfInterval,
    format,
    addMonths,
    subMonths,
    addWeeks,
    subWeeks,
    isSameMonth,
    isSameDay,
    isToday
} from 'date-fns';
import { ru } from 'date-fns/locale';

export const getCalendarDays = (currentDate) => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(monthStart);

    // Start week on Monday (weekStartsOn: 1)
    const startDate = startOfWeek(monthStart, { weekStartsOn: 1 });
    const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 });

    return eachDayOfInterval({ start: startDate, end: endDate });
};

export const formatMonthYear = (date) => {
    // Format: "Январь 2024"
    const formatted = format(date, 'LLLL yyyy', { locale: ru });
    // Capitalize first letter
    return formatted.charAt(0).toUpperCase() + formatted.slice(1);
};

export const formatWeekDay = (date) => {
    // Format: "Пн", "Вт", etc.
    const formatted = format(date, 'cccccc', { locale: ru });
    return formatted.charAt(0).toUpperCase() + formatted.slice(1);
};

export const nextMonth = (date) => addMonths(date, 1);
export const prevMonth = (date) => subMonths(date, 1);

// === Week mode helpers ===
export const getWeekDays = (currentDate) => {
    const start = startOfWeek(currentDate, { weekStartsOn: 1 });
    const end = endOfWeek(currentDate, { weekStartsOn: 1 });
    return eachDayOfInterval({ start, end });
};

export const nextWeek = (date) => addWeeks(date, 1);
export const prevWeek = (date) => subWeeks(date, 1);

export const formatWeekRange = (date) => {
    const start = startOfWeek(date, { weekStartsOn: 1 });
    const end = endOfWeek(date, { weekStartsOn: 1 });
    const sameMonth = start.getMonth() === end.getMonth();
    if (sameMonth) {
        // "1 — 7 января 2026"
        const left = format(start, 'd', { locale: ru });
        const right = format(end, 'd MMMM yyyy', { locale: ru });
        return `${left} — ${right}`;
    }
    // "29 декабря 2025 — 4 января 2026"
    const left = format(start, 'd MMMM yyyy', { locale: ru });
    const right = format(end, 'd MMMM yyyy', { locale: ru });
    return `${left} — ${right}`;
};
