// =====================================================================
// Синхронизация таблицы teachers и profiles в Supabase
//   1. Удаляет из teachers тех, кого нет в mockData
//   2. Upsert всех актуальных учителей (id, name, subject, grades)
//   3. Привязывает profiles.teacher_id по full_name
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
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    console.error('❌ Missing env vars');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
});

// Parse TEACHERS array from mockData.js via dynamic import
async function parseTeachersFromMock() {
    const url = 'file:///' + join(__dirname, '..', 'src', 'data', 'mockData.js').replace(/\\/g, '/');
    const mod = await import(url);
    return mod.TEACHERS;
}

async function main() {
    const teachers = await parseTeachersFromMock();
    console.log(`Loaded ${teachers.length} teachers from mockData.js`);

    // === Step 1: get existing teachers in DB ===
    const { data: existing, error: getErr } = await supabase.from('teachers').select('id, name');
    if (getErr) throw getErr;
    console.log(`Existing in DB: ${existing.length}`);

    // === Step 2: delete teachers that no longer exist in mockData ===
    const validIds = new Set(teachers.map(t => t.id));
    const toDelete = existing.filter(t => !validIds.has(t.id));
    if (toDelete.length > 0) {
        const { error: delErr } = await supabase
            .from('teachers')
            .delete()
            .in('id', toDelete.map(t => t.id));
        if (delErr) console.error('Delete error:', delErr.message);
        else console.log(`Deleted from DB: ${toDelete.length} (${toDelete.map(t => t.name).join(', ')})`);
    }

    // === Step 3: upsert current teachers ===
    const payload = teachers.map(t => ({
        id: t.id,
        name: t.name,
        subject: t.subject,
        grades: t.grades || [],
    }));
    const { error: upErr } = await supabase
        .from('teachers')
        .upsert(payload, { onConflict: 'id' });
    if (upErr) {
        console.error('Upsert error:', upErr.message);
        process.exit(1);
    }
    console.log(`Upserted: ${payload.length} teachers`);

    // === Step 4: link profiles by full_name ===
    const { data: profiles } = await supabase
        .from('profiles')
        .select('id, email, full_name, teacher_id');

    const teacherByName = new Map(teachers.map(t => [t.name, t.id]));
    let linked = 0, alreadyOk = 0, noMatch = 0;
    const updates = [];

    for (const p of profiles || []) {
        if (!p.full_name) continue;
        const expectedId = teacherByName.get(p.full_name);
        if (!expectedId) {
            if (p.email !== 'admin@school.local') {
                console.log(`  ⚠️  no match: ${p.full_name} (${p.email})`);
                noMatch++;
            }
            continue;
        }
        if (p.teacher_id === expectedId) {
            alreadyOk++;
            continue;
        }
        const { error } = await supabase
            .from('profiles')
            .update({ teacher_id: expectedId })
            .eq('id', p.id);
        if (error) {
            console.error(`  ❌ ${p.full_name}: ${error.message}`);
        } else {
            console.log(`  ✅ ${p.full_name.padEnd(28)} → teacher_id=${expectedId}`);
            linked++;
        }
    }

    console.log('\n' + '='.repeat(60));
    console.log(`Done.`);
    console.log(`  Teachers in DB now: ${payload.length}`);
    console.log(`  Profiles newly linked: ${linked}`);
    console.log(`  Profiles already correct: ${alreadyOk}`);
    console.log(`  Profiles without match: ${noMatch}`);
}

main().catch(err => { console.error('Fatal:', err); process.exit(1); });
