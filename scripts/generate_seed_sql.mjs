// Reads src/data/mockData.js (ES module) and generates db/02_seed.sql
import { TEACHERS, REAL_SCHEDULE } from '../src/data/mockData.js';
import { writeFileSync } from 'fs';

const sqlEscape = (s) => {
    if (s === null || s === undefined) return 'null';
    return `'${String(s).replace(/'/g, "''")}'`;
};

let sql = '';
sql += '-- =====================================================================\n';
sql += '-- School Calendar — Seed Data\n';
sql += '-- Run this AFTER 01_schema.sql\n';
sql += '-- =====================================================================\n\n';

// Bell schedule
sql += '-- Bell schedule\n';
sql += 'insert into bell_schedule (lesson_number, start_time, end_time, label) values\n';
const bell = [
    [0, '08:45', '09:00', 'Сонастройка'],
    [1, '09:00', '09:45', '1 урок'],
    [2, '09:55', '10:40', '2 урок'],
    [3, '10:50', '11:35', '3 урок'],
    [4, '11:45', '12:30', '4 урок'],
    [5, '12:40', '13:25', '5 урок'],
    [6, '13:35', '14:20', '6 урок'],
    [7, '14:30', '15:15', '7 урок'],
    [8, '15:25', '16:10', '8 урок'],
];
sql += bell.map(([n, s, e, l]) => `    (${n}, ${sqlEscape(s)}, ${sqlEscape(e)}, ${sqlEscape(l)})`).join(',\n');
sql += '\non conflict (lesson_number) do update set start_time=excluded.start_time, end_time=excluded.end_time, label=excluded.label;\n\n';

// Teachers
sql += '-- Teachers\n';
sql += 'insert into teachers (id, name, subject, grades) values\n';
sql += TEACHERS.map(t =>
    `    (${t.id}, ${sqlEscape(t.name)}, ${sqlEscape(t.subject)}, ${sqlEscape(JSON.stringify(t.grades))}::jsonb)`
).join(',\n');
sql += '\non conflict (id) do update set name=excluded.name, subject=excluded.subject, grades=excluded.grades;\n\n';

// Initial teacher rates
sql += '-- Initial teacher rates (default 500, Kozlova=11 forced to 700)\n';
sql += 'insert into teacher_rates (teacher_id, rate) values\n';
sql += TEACHERS.map(t => `    (${t.id}, ${t.id === 11 ? 700 : 500})`).join(',\n');
sql += '\non conflict (teacher_id) do nothing;\n\n';

// Lessons
sql += '-- Lessons (REAL_SCHEDULE)\n';
sql += "delete from lessons;\n";  // wipe and re-seed
const lessonRows = [];
for (const [className, days] of Object.entries(REAL_SCHEDULE)) {
    for (const [dayName, lessons] of Object.entries(days)) {
        for (const lesson of lessons) {
            lessonRows.push(
                `    (${sqlEscape(className)}, ${sqlEscape(dayName)}, ${sqlEscape(lesson.time)}, ${sqlEscape(lesson.subject)}, ${sqlEscape(lesson.teacher)})`
            );
        }
    }
}
sql += 'insert into lessons (class_name, day_name, time_slot, subject, teacher_last_name) values\n';
sql += lessonRows.join(',\n');
sql += '\non conflict do nothing;\n';

writeFileSync(new URL('../db/02_seed.sql', import.meta.url), sql, 'utf8');
console.log(`Generated db/02_seed.sql (${lessonRows.length} lessons, ${TEACHERS.length} teachers)`);
