// =====================================================================
// Слияние дубликатов педагогов: переносит все ссылки с FROM_ID на TO_ID
// и удаляет FROM_ID из таблицы teachers.
// =====================================================================

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

['env.local', '.env.local', '.env.admin'].forEach(f => {
    try {
        readFileSync(f, 'utf-8').split('\n').forEach(line => {
            const m = line.match(/^([A-Z_]+)=(.+)$/);
            if (m) process.env[m[1]] = m[2].trim();
        });
    } catch { /* ignore */ }
});

const sb = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const FROM_ID = 28;  // «Созонов» — дубликат
const TO_ID = 45;    // «Созонов Никита» — оставляем

console.log(`Сливаем teacher_id ${FROM_ID} → ${TO_ID}`);

// Tables that reference teacher_id
const TABLES_FK = [
    { name: 'profiles', col: 'teacher_id', strategy: 'update_ignore_unique' },
    { name: 'teacher_rates', col: 'teacher_id', strategy: 'upsert_keep_target' },
    { name: 'homework_checks', col: 'teacher_id', strategy: 'delete_source' },
    { name: 'homework_rates', col: 'teacher_id', strategy: 'upsert_keep_target' },
    { name: 'availability', col: 'teacher_id', strategy: 'delete_source' },
    { name: 'invitations', col: 'teacher_id', strategy: 'update' },
    { name: 'extra_pay_rates', col: 'teacher_id', strategy: 'upsert_keep_target' },
    { name: 'extra_pay_entries', col: 'teacher_id', strategy: 'delete_source' },
    // lesson_types refers by teacher_last_name, not teacher_id — skip
];

for (const t of TABLES_FK) {
    if (t.strategy === 'update' || t.strategy === 'update_ignore_unique') {
        const { error } = await sb.from(t.name).update({ [t.col]: TO_ID }).eq(t.col, FROM_ID);
        if (error && !error.message.includes('duplicate')) {
            console.error(`  ❌ ${t.name}: ${error.message}`);
        } else if (error) {
            // Duplicate key — fall back to delete source
            await sb.from(t.name).delete().eq(t.col, FROM_ID);
            console.log(`  ⚠️  ${t.name}: target had row, deleted source`);
        } else {
            console.log(`  ✅ ${t.name}: updated`);
        }
    } else if (t.strategy === 'upsert_keep_target') {
        // If target has a row already — delete source. Otherwise update.
        const { data: target } = await sb.from(t.name).select(t.col).eq(t.col, TO_ID).maybeSingle();
        if (target) {
            await sb.from(t.name).delete().eq(t.col, FROM_ID);
            console.log(`  ✅ ${t.name}: target already had row, deleted source`);
        } else {
            const { error } = await sb.from(t.name).update({ [t.col]: TO_ID }).eq(t.col, FROM_ID);
            if (error) console.error(`  ❌ ${t.name}: ${error.message}`);
            else console.log(`  ✅ ${t.name}: moved to target`);
        }
    } else if (t.strategy === 'delete_source') {
        const { error, count } = await sb.from(t.name).delete({ count: 'exact' }).eq(t.col, FROM_ID);
        if (error) console.error(`  ❌ ${t.name}: ${error.message}`);
        else console.log(`  ✅ ${t.name}: deleted ${count || 0} source rows`);
    }
}

// Finally: delete the duplicate teacher
const { error: delErr } = await sb.from('teachers').delete().eq('id', FROM_ID);
if (delErr) {
    console.error(`\n❌ Failed to delete teachers.id=${FROM_ID}: ${delErr.message}`);
} else {
    console.log(`\n✅ teachers.id=${FROM_ID} deleted`);
}
