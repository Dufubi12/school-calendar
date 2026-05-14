// =====================================================================
// Удаляет указанных учителей из mockData.js (TEACHERS + REAL_SCHEDULE)
// и из individualSlots.json
// =====================================================================

import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

// Полные имена и фамилии учителей которых нужно удалить
const TO_REMOVE = [
    'Барышникова Дарья',
    'Дутова Анна',
    'Зиновьева Александра',
    'Конохов Павел',
    'Петрова Елизавета',
    'Тенешева Дарья',
    'Карнаушенко Оксана',
    'Четверикова Ксения',
    'Липко Владлена',
    'Шашерина Дана',
    'Ковалева Оксана',
    'Долгих Любовь',
    'Курочка Дарья',
];

// Их фамилии для удаления упоминаний в расписании
const LAST_NAMES = TO_REMOVE.map(n => n.split(' ')[0]);

console.log('Removing teachers:', TO_REMOVE.length);
console.log('Last names:', LAST_NAMES.join(', '));
console.log();

// === 1. mockData.js ===
const MOCK_PATH = join(ROOT, 'src', 'data', 'mockData.js');
let mockContent = readFileSync(MOCK_PATH, 'utf-8');

let removedFromTeachers = 0;
TO_REMOVE.forEach(fullName => {
    // Удаляем строку из TEACHERS массива
    const re = new RegExp(`^\\s*\\{[^}]*"name":\\s*"${fullName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"[^}]*\\},?\\s*\\n`, 'gm');
    const before = mockContent.length;
    mockContent = mockContent.replace(re, '');
    if (mockContent.length < before) removedFromTeachers++;
});

// Удаляем уроки в REAL_SCHEDULE где teacher = одна из удалённых фамилий
let removedLessons = 0;
LAST_NAMES.forEach(lastName => {
    const re = new RegExp(`^\\s*\\{[^}]*"teacher":\\s*"${lastName}"[^}]*\\},?\\s*\\n`, 'gm');
    const before = mockContent.length;
    const matches = mockContent.match(re);
    if (matches) removedLessons += matches.length;
    mockContent = mockContent.replace(re, '');
});

writeFileSync(MOCK_PATH, mockContent, 'utf-8');
console.log(`mockData.js: removed ${removedFromTeachers} teachers, ${removedLessons} lessons`);

// === 2. individualSlots.json ===
const SLOTS_PATH = join(ROOT, 'src', 'data', 'individualSlots.json');
try {
    const slots = JSON.parse(readFileSync(SLOTS_PATH, 'utf-8'));
    const beforeCount = slots.teachers.length;
    slots.teachers = slots.teachers.filter(t => {
        const ln = (t.name || '').split(' ')[0];
        return !LAST_NAMES.includes(ln);
    });
    const removedSlots = beforeCount - slots.teachers.length;
    writeFileSync(SLOTS_PATH, JSON.stringify(slots, null, 2), 'utf-8');
    console.log(`individualSlots.json: removed ${removedSlots} teachers`);
} catch (err) {
    console.error('individualSlots.json error:', err.message);
}

// === 3. Печатаем SQL для Supabase ===
console.log('\nSQL for Supabase (run in SQL Editor):');
console.log(`delete from teachers where name in (${TO_REMOVE.map(n => `'${n}'`).join(', ')});`);
