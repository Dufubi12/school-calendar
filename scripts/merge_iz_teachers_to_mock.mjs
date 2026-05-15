// =====================================================================
// Добавляет в TEACHERS массив mockData.js всех ИЗ-педагогов
// которых там ещё нет (но есть в individualSlots.json)
// =====================================================================

import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

const MOCK_PATH = join(ROOT, 'src', 'data', 'mockData.js');
const SLOTS_PATH = join(ROOT, 'src', 'data', 'individualSlots.json');

// Load current TEACHERS
const mockUrl = 'file:///' + MOCK_PATH.replace(/\\/g, '/');
const { TEACHERS } = await import(mockUrl);

// Load IZ teachers
const slots = JSON.parse(readFileSync(SLOTS_PATH, 'utf-8'));

const existingNames = new Set(TEACHERS.map(t => t.name));
const maxId = Math.max(...TEACHERS.map(t => t.id));

const toAdd = [];
let nextId = maxId + 1;

slots.teachers.forEach(t => {
    if (existingNames.has(t.name)) return;
    // Derive subject from description (first part before ',' or ';')
    const desc = (t.description || '').replace(/\s+/g, ' ').trim();
    let subject = desc.split(/[,;()]/)[0].trim() || 'ИЗ педагог';
    // Capitalize first letter
    subject = subject.charAt(0).toUpperCase() + subject.slice(1);
    // Try to guess grade
    let grade = 'Средняя школа (5-9)';
    if (/начальн/i.test(desc)) grade = 'Начальная школа (1-4)';
    else if (/старш|10-11|9-11|8-11/i.test(desc)) grade = 'Старшая школа (10-11)';
    else if (/5-7|5-9|средн/i.test(desc)) grade = 'Средняя школа (5-9)';

    toAdd.push({
        id: nextId++,
        name: t.name,
        subject,
        grades: [grade],
    });
});

console.log(`Adding ${toAdd.length} new teachers:`);
toAdd.forEach(t => console.log(`  id=${t.id}  ${t.name.padEnd(28)}  ${t.subject}  [${t.grades.join(', ')}]`));

if (toAdd.length === 0) {
    console.log('Nothing to add.');
    process.exit(0);
}

// Patch mockData.js
let content = readFileSync(MOCK_PATH, 'utf-8');
const lines = toAdd.map(t =>
    `    { "id": ${t.id}, "name": "${t.name}", "subject": "${t.subject}", "grades": ${JSON.stringify(t.grades)} },`
).join('\n');

// Insert before the closing ']' of TEACHERS array
const re = /(\];[\s\S]*?\/\/ Расписание из Excel)/;
const insertPattern = /(\{[^}]*"id":\s*33[^}]*\},)\n(\]);/;
const newContent = content.replace(insertPattern, `$1\n${lines}\n$2;`);

if (newContent === content) {
    console.error('❌ Failed to patch mockData.js — pattern not found');
    process.exit(1);
}

writeFileSync(MOCK_PATH, newContent, 'utf-8');
console.log(`\n✅ Patched mockData.js. New total: ${TEACHERS.length + toAdd.length} teachers.`);
