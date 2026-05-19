// =====================================================================
// Миграция школьного расписания из mockData.REAL_SCHEDULE в Supabase
//
// Использование:
//   1. Получи Service Role Key в Supabase Dashboard → Settings → API
//   2. Создай (или дополни) файл .env.admin строкой:
//        SUPABASE_SERVICE_ROLE_KEY=sb_secret_xxxxxxxxxx
//   3. Накати db/14_school_lessons.sql в SQL Editor (один раз).
//   4. Запусти:
//        node scripts/migrate_school_lessons.mjs
//
// Идемпотентен: вторичный запуск ничего не сломает, дубликаты
// фильтруются по (class_name, day_of_week, time_slot, subject, teacher_id).
// =====================================================================

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const loadEnv = (file) => {
    try {
        const content = readFileSync(join(__dirname, '..', file), 'utf-8');
        content.split('\n').forEach(line => {
            const m = line.match(/^([A-Z_]+)=(.+)$/);
            if (m) process.env[m[1]] = m[2].trim();
        });
    } catch { /* ignore */ }
};

loadEnv('.env.local');
loadEnv('.env.admin');

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
    console.error('VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY missing');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { persistSession: false }
});

// Dynamic import of mockData (ESM-friendly)
const mockData = await import('../src/data/mockData.js');
const { REAL_SCHEDULE, TEACHERS } = mockData;

if (!REAL_SCHEDULE || !TEACHERS) {
    console.error('Could not load REAL_SCHEDULE / TEACHERS from mockData.js');
    process.exit(1);
}

// Build last-name -> teacher_id map (REAL_SCHEDULE stores teachers by last name)
const teachersByLastName = new Map();
TEACHERS.forEach(t => {
    const lastName = t.name.split(' ')[0];
    teachersByLastName.set(lastName, t.id);
});

const EFFECTIVE_FROM = '2025-09-01'; // school year start

// Flatten REAL_SCHEDULE into rows
const rows = [];
for (const [className, days] of Object.entries(REAL_SCHEDULE)) {
    for (const [dayOfWeek, lessons] of Object.entries(days)) {
        for (const lesson of lessons) {
            const teacherId = lesson.teacher
                ? (teachersByLastName.get(lesson.teacher) ?? null)
                : null;
            if (!teacherId && lesson.teacher) {
                console.warn(`[warn] Unknown teacher "${lesson.teacher}" for ${className} ${dayOfWeek} ${lesson.time}`);
            }
            rows.push({
                teacher_id: teacherId,
                class_name: className,
                subject: lesson.subject,
                day_of_week: dayOfWeek,
                time_slot: lesson.time,
                recurrence_pattern: 'weekly',
                single_date: null,
                effective_from: EFFECTIVE_FROM,
                effective_to: null,
            });
        }
    }
}

console.log(`Prepared ${rows.length} rows from REAL_SCHEDULE`);

// Idempotency: skip rows that already exist (same class+day+time+subject+teacher)
const { data: existing, error: selErr } = await supabase
    .from('school_lessons')
    .select('class_name, day_of_week, time_slot, subject, teacher_id');
if (selErr) {
    console.error('Failed to load existing school_lessons:', selErr);
    process.exit(1);
}

const existingKey = new Set(
    (existing || []).map(r => `${r.class_name}|${r.day_of_week}|${r.time_slot}|${r.subject}|${r.teacher_id ?? 'null'}`)
);

const toInsert = rows.filter(r =>
    !existingKey.has(`${r.class_name}|${r.day_of_week}|${r.time_slot}|${r.subject}|${r.teacher_id ?? 'null'}`)
);

console.log(`Skipping ${rows.length - toInsert.length} duplicates`);
console.log(`Will insert ${toInsert.length} new rows`);

if (toInsert.length === 0) {
    console.log('Nothing to insert. Done.');
    process.exit(0);
}

// Insert in chunks of 200 (PostgREST limit-safe)
const CHUNK = 200;
let inserted = 0;
for (let i = 0; i < toInsert.length; i += CHUNK) {
    const slice = toInsert.slice(i, i + CHUNK);
    const { error } = await supabase.from('school_lessons').insert(slice);
    if (error) {
        console.error(`Insert chunk ${i}-${i + slice.length} failed:`, error);
        process.exit(1);
    }
    inserted += slice.length;
    console.log(`Inserted ${inserted}/${toInsert.length}`);
}

console.log(`Done. Inserted ${inserted} school lessons.`);
