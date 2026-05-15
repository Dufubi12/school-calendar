// =====================================================================
// Импорт ставок педагогов из Word-документа "Ставки педагогов.docx".
// Использует уже извлечённый JSON _temp_table.json (rows x cols).
//
// Цель: записать в Supabase teacher_rates "Ставка за группу" для каждого
// педагога, у которого она указана. Остальные категории (Сонастройка,
// Продленка, Индивидуальные, Диагностика, Кружки, Подготовка к школе) —
// выведем в отчёт для дальнейшей реализации.
// =====================================================================

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

const loadEnv = (file) => {
    try {
        const content = readFileSync(join(ROOT, file), 'utf-8');
        content.split('\n').forEach(line => {
            const m = line.match(/^([A-Z_]+)=(.+)$/);
            if (m) process.env[m[1]] = m[2].trim();
        });
    } catch { /* ignore */ }
};
loadEnv('.env.local');
loadEnv('.env.admin');

const supabase = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } }
);

const rows = JSON.parse(readFileSync(join(ROOT, '_temp_table.json'), 'utf-8'));
const [header, ...body] = rows;

const COL = {
    name: 0,
    group: 1,
    sonastroyka: 2,
    prodlenka: 3,
    stazhirovka: 4,
    individual: 5,
    diagnostika: 6,
    kruzhki: 7,
    podgotovka: 8,
};

// Normalise name: strip patronymics and second variations
const normName = (s) => (s || '').replace(/\s+/g, ' ').trim();

// Map name from doc → canonical name in DB (use first 2 words = ФИ)
const canonicalName = (full) => {
    const parts = normName(full).split(' ').filter(Boolean);
    if (parts.length === 0) return null;
    if (parts.length === 1) return parts[0];
    return parts.slice(0, 2).join(' ');
};

// Some aliases (doc → DB)
const ALIASES = {
    'Матвеева (Дечева) Валерия Александровна': 'Матвеева Валерия',
    'Чеченкова Светлана': 'Чеченкова Светлана',
    'Тронина Ольга': 'Тронина',
    'Карпова Татьяна Николаевна': 'Карпова',
};

// === Load teachers from DB ===
const { data: dbTeachers, error: tErr } = await supabase
    .from('teachers')
    .select('id, name');
if (tErr) { console.error('Error loading teachers:', tErr); process.exit(1); }
console.log(`Loaded ${dbTeachers.length} teachers from DB`);

// Build name → teacher map (also indexed by first 2 words)
const teacherByName = new Map();
dbTeachers.forEach(t => {
    teacherByName.set(t.name, t);
    const short = canonicalName(t.name);
    if (short && !teacherByName.has(short)) teacherByName.set(short, t);
});

// === Parse all rates ===
const allRates = [];
const skipped = [];

for (const row of body) {
    const docName = row[COL.name];
    if (!docName) continue;
    const aliasOrName = ALIASES[docName] || docName;
    const key = canonicalName(aliasOrName);
    const teacher = teacherByName.get(aliasOrName) || teacherByName.get(key);

    const rates = {
        group: row[COL.group] || '',
        sonastroyka: row[COL.sonastroyka] || '',
        prodlenka: row[COL.prodlenka] || '',
        stazhirovka: row[COL.stazhirovka] || '',
        individual: row[COL.individual] || '',
        diagnostika: row[COL.diagnostika] || '',
        kruzhki: row[COL.kruzhki] || '',
        podgotovka: row[COL.podgotovka] || '',
    };
    const hasAnyRate = Object.values(rates).some(v => v);

    if (!teacher) {
        if (hasAnyRate) skipped.push({ docName, rates, reason: 'not in DB' });
        continue;
    }
    allRates.push({ teacher, docName, rates });
}

console.log(`\nParsed ${allRates.length} teachers with rates from doc`);
console.log(`Skipped (not in DB): ${skipped.length}`);

// === Write "Ставка за группу" to teacher_rates ===
let written = 0, noGroupRate = 0;
console.log('\nUpdating teacher_rates (Ставка за группу):');
for (const { teacher, rates } of allRates) {
    const groupRate = rates.group;
    if (!groupRate) {
        noGroupRate++;
        continue;
    }
    // Parse — can be "400", "400/450/800" etc. Take first number.
    const num = parseInt(String(groupRate).split('/')[0], 10);
    if (!num) continue;

    const { error } = await supabase
        .from('teacher_rates')
        .upsert({
            teacher_id: teacher.id,
            rate: num,
            updated_at: new Date().toISOString(),
        }, { onConflict: 'teacher_id' });
    if (error) {
        console.error(`  ❌ ${teacher.name}: ${error.message}`);
    } else {
        const note = String(groupRate) !== String(num) ? ` (из "${groupRate}")` : '';
        console.log(`  ✅ ${teacher.name.padEnd(34)} → ${num} ₽${note}`);
        written++;
    }
}

// === Detailed report ===
console.log('\n' + '='.repeat(70));
console.log(`Group rate written for ${written} teachers (${noGroupRate} without group rate)`);

console.log('\n📋 Full breakdown by category (для дальнейшей реализации):');
const categories = [
    ['Сонастройка', 'sonastroyka'],
    ['Продленка', 'prodlenka'],
    ['Стажировка', 'stazhirovka'],
    ['Индивидуальные занятия', 'individual'],
    ['Диагностика', 'diagnostika'],
    ['Кружки', 'kruzhki'],
    ['Подготовка к школе', 'podgotovka'],
];
for (const [label, key] of categories) {
    const list = allRates.filter(r => r.rates[key]);
    if (list.length === 0) continue;
    console.log(`\n  ${label}:`);
    list.forEach(r => console.log(`    ${r.teacher.name.padEnd(34)} ${r.rates[key]}`));
}

if (skipped.length > 0) {
    console.log('\n⚠️  Педагоги из документа НЕ найдены в БД (ставки не записаны):');
    skipped.forEach(s => console.log(`    ${s.docName.padEnd(50)} (group: ${s.rates.group || '—'})`));
}
