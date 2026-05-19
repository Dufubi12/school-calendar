// =====================================================================
// Перенос данных из src/data/individualSlots.json в Supabase
// =====================================================================
//
// Использует individualSlots.json как seed только если в БД ещё нет
// записей для данного teacher_id. То есть запускать можно много раз
// без перезаписи изменённых данных.
// =====================================================================

import { createClient } from '@supabase/supabase-js';
import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

const loadEnv = (file) => {
    try {
        if (!existsSync(join(ROOT, file))) return;
        readFileSync(join(ROOT, file), 'utf-8').split('\n').forEach(line => {
            const m = line.match(/^([A-Z_]+)=(.+)$/);
            if (m) process.env[m[1]] = m[2].trim();
        });
    } catch { /* ignore */ }
};
loadEnv('.env.local');
loadEnv('.env.admin');

const sb = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
});

const slotsJson = JSON.parse(readFileSync(join(ROOT, 'src', 'data', 'individualSlots.json'), 'utf-8'));

// Resolve teacher_id by name (full or canonical)
const { data: teachers } = await sb.from('teachers').select('id, name');
const byName = new Map();
teachers.forEach(t => {
    byName.set(t.name, t);
    const short = t.name.split(' ').slice(0, 2).join(' ');
    if (!byName.has(short)) byName.set(short, t);
});

let descUpserted = 0;
let slotsInserted = 0;
let teachersSkipped = 0;

for (const t of slotsJson.teachers) {
    const teacher = byName.get(t.name) || byName.get(t.name.split(' ').slice(0, 2).join(' '));
    if (!teacher) {
        console.log(`  ⚠️  ${t.name} — not in DB`);
        teachersSkipped++;
        continue;
    }
    // 1) description
    if (t.description) {
        const { error: dErr } = await sb
            .from('individual_slot_descriptions')
            .upsert({
                teacher_id: teacher.id,
                description: t.description,
                updated_at: new Date().toISOString(),
            }, { onConflict: 'teacher_id' });
        if (!dErr) descUpserted++;
    }

    // 2) slots — only insert if no rows exist for this teacher (don't overwrite user edits)
    const { count: existing } = await sb
        .from('individual_slots')
        .select('teacher_id', { count: 'exact', head: true })
        .eq('teacher_id', teacher.id);

    if (existing && existing > 0) {
        console.log(`  ⏭️  ${t.name.padEnd(28)} already has ${existing} slots — skipping seed`);
        continue;
    }

    const rows = [];
    Object.entries(t.slots || {}).forEach(([day, timeMap]) => {
        Object.entries(timeMap).forEach(([timeKey, status]) => {
            // Normalize "09:00-10:00" or "9:00-10:00"
            const cleanedTime = timeKey.replace(/^(\d):/, '0$1:').replace(/-(\d):/, '-0$1:');
            rows.push({
                teacher_id: teacher.id,
                day,
                time_slot: cleanedTime,
                status,
            });
        });
    });

    if (rows.length === 0) {
        console.log(`  ${t.name.padEnd(28)} no slots in seed`);
        continue;
    }

    const { error: sErr } = await sb
        .from('individual_slots')
        .insert(rows);
    if (sErr) {
        console.error(`  ❌ ${t.name}: ${sErr.message}`);
    } else {
        console.log(`  ✅ ${t.name.padEnd(28)} → ${rows.length} slots`);
        slotsInserted += rows.length;
    }
}

console.log('\n' + '='.repeat(60));
console.log(`Descriptions upserted: ${descUpserted}`);
console.log(`Slots inserted: ${slotsInserted}`);
console.log(`Teachers skipped: ${teachersSkipped}`);
