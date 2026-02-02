// Mock Data for School Calendar

export const SUBJECTS = [
    'Математика',
    'Физика',
    'Русский язык',
    'Литература',
    'Информатика',
    'История',
    'Физкультура',
    'Английский язык',
    'Химия',
    'Биология'
];

export const AVAILABILITY_PRESETS = [
    { label: '1 урок (08:30 - 09:15)', start: '08:30', end: '09:15' },
    { label: '2 урок (09:25 - 10:10)', start: '09:25', end: '10:10' },
    { label: '3 урок (10:30 - 11:15)', start: '10:30', end: '11:15' },
    { label: '4 урок (11:35 - 12:20)', start: '11:35', end: '12:20' },
    { label: '5 урок (12:30 - 13:15)', start: '12:30', end: '13:15' },
    { label: '6 урок (13:25 - 14:10)', start: '13:25', end: '14:10' },
    { label: '7 урок (14:20 - 15:05)', start: '14:20', end: '15:05' },
    { label: '8 урок (15:15 - 16:00)', start: '15:15', end: '16:00' },
];

export const DEFAULT_WORKING_HOURS = {
    start: '2024-01-01',
    end: '2024-12-31',
    slots: [] // Empty means all dates/times available by default? Or none? User approach implies explicit "Work Schedule".
    // Let's assume if no schedule is defined, they are available? Or strict validation?
    // Requirement says: "System checks... Is this date/time in 'Work Schedule'?"
    // So likely restrictive. If no schedule, maybe not working?
    // But for backward compatibility/ease, maybe default to "Always Available" if logic is missing.
    // Let's stick to the structure first.
};

export const GRADES = [
    'Начальная школа (1-4)',
    'Средняя школа (5-9)',
    'Старшая школа (10-11)'
];

export const TEACHERS = [
    { id: 1, name: 'Иванова Мария Ивановна', subject: 'Математика', grades: ['Средняя школа (5-9)', 'Старшая школа (10-11)'] },
    { id: 2, name: 'Петров Петр Петрович', subject: 'Физика', grades: ['Средняя школа (5-9)', 'Старшая школа (10-11)'] },
    { id: 3, name: 'Сидорова Анна Сергеевна', subject: 'Русский язык', grades: ['Начальная школа (1-4)', 'Средняя школа (5-9)'] },
    { id: 4, name: 'Кузнецов Алексей Дмитриевич', subject: 'Информатика', grades: ['Средняя школа (5-9)', 'Старшая школа (10-11)'] },
    { id: 5, name: 'Смирнова Елена Владимировна', subject: 'История', grades: ['Средняя школа (5-9)'] },
    { id: 6, name: 'Попов Дмитрий Олегович', subject: 'Физкультура', grades: ['Начальная школа (1-4)', 'Средняя школа (5-9)', 'Старшая школа (10-11)'] },
    { id: 7, name: 'Васильева Ольга Николаевна', subject: 'Математика', grades: ['Средняя школа (5-9)'] }, // Potential sub for Ivanova
    { id: 8, name: 'Морозов Игорь Сергеевич', subject: 'Английский язык', grades: ['Средняя школа (5-9)', 'Старшая школа (10-11)'] },
];

// Mock Schedule:
// Structure: "YYYY-MM-DD": { [TeacherID]: [Array of busy lesson numbers] }
// Example: On 2024-02-15, Teacher 1 is busy on lessons 1, 2, 3.
export const MOCK_SCHEDULE = {
    // We can populate this dynamically or statically for testing
    'DEFAULT': { // Fallback for any day if specific day not found
        1: [1, 2, 3, 4], // Ivanova busy 1-4
        2: [2, 3, 5, 6], // Petrov busy 2,3,5,6
        3: [1, 2, 3],    // Sidorova busy 1-3
        4: [4, 5, 6],    // Kuznetsov busy 4-6
        7: [1, 2],       // Vasilieva busy 1-2 (FREE on 3, 4!)
    }
};

export const getTeacherAvailability = (teacherId, date, lessonNumber) => {
    // In a real app, date would check specific day. Here we check DEFAULT or day specific.
    const dateKey = typeof date === 'string' ? date : 'DEFAULT'; // Simplified
    const daySchedule = MOCK_SCHEDULE[dateKey] || MOCK_SCHEDULE['DEFAULT'];

    if (!daySchedule) return true; // No info = assumed free? Or assumed busy? Let's say free.

    const busyLessons = daySchedule[teacherId] || [];
    return !busyLessons.includes(parseInt(lessonNumber));
};

export const getTeacherWorkload = (teacherId, date) => {
    // Determine how many lessons a teacher has on this day
    const dateKey = typeof date === 'string' ? date : 'DEFAULT';
    const daySchedule = MOCK_SCHEDULE[dateKey] || MOCK_SCHEDULE['DEFAULT'];

    if (!daySchedule) return 0;

    const busyLessons = daySchedule[teacherId] || [];
    return busyLessons.length;
};

export const INITIAL_SUBSTITUTIONS = [
    {
        id: 101,
        date: '2024-02-15',
        absentTeacherId: 1,
        substituteTeacherId: 7,
        lessonNumber: 3,
        subject: 'Математика',
        grade: 'Средняя школа (5-9)'
    }
];
