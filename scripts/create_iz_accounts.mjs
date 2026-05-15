// =====================================================================
// Создание аккаунтов для всех 27 педагогов индивидуальных занятий
// через Supabase Admin API
//
// Использование:
//   1. Получи Service Role Key в Supabase Dashboard → Settings → API
//   2. Создай файл .env.admin со строкой:
//        SUPABASE_SERVICE_ROLE_KEY=sb_secret_xxxxxxxxxx
//   3. Запусти:
//        node scripts/create_iz_accounts.mjs
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
    console.error('❌ Missing env vars. Need VITE_SUPABASE_URL (in .env.local) and SUPABASE_SERVICE_ROLE_KEY (in .env.admin)');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
});

// === All 27 IZ-педагогов ===
const PEDS = [
    { name: 'Мишина Валерия',         email: 'tutor-mishina@school.local' },
    { name: 'Лазарева Анна',          email: 'tutor-lazareva@school.local' },
    { name: 'Юмагужина Наталья',      email: 'tutor-yumaguzhina@school.local' },
    { name: 'Карчевская Анастасия',   email: 'tutor-karchevskaya@school.local' },
    { name: 'Матвеева Валерия',       email: 'tutor-matveeva@school.local' },
    { name: 'Алымова Анна',           email: 'tutor-alymova@school.local' },
    { name: 'Баранникова Лада',       email: 'tutor-barannikova@school.local' },
    { name: 'Смирнова Вероника',      email: 'tutor-smirnova@school.local' },
    { name: 'Латышева Ирина',         email: 'tutor-latysheva@school.local' },
    { name: 'Гайденко Елена',         email: 'tutor-gaydenko@school.local' },
    { name: 'Коломеец Екатерина',     email: 'tutor-kolomeets@school.local' },
    { name: 'Кис Мария',              email: 'tutor-kis@school.local' },
    { name: 'Березняя Софья',         email: 'tutor-bereznyaya@school.local' },
    { name: 'Чеченкова Светлана',     email: 'tutor-chechenkova@school.local' },
    { name: 'Абдуллаева Джамиля',     email: 'tutor-abdullaeva@school.local' },
    { name: 'Орунова Яна',            email: 'tutor-orunova@school.local' },
    { name: 'Скоринова Наталия',      email: 'tutor-skorinova@school.local' },
    { name: 'Нестеренко Софья',       email: 'tutor-nesterenko@school.local' },
    { name: 'Созонов Никита',         email: 'tutor-sozonov@school.local' },
    { name: 'Волкова Ольга',          email: 'tutor-volkova@school.local' },
    { name: 'Куликова Арина',         email: 'tutor-kulikova@school.local' },
    { name: 'Абрамова Александра',    email: 'tutor-abramova@school.local' },
    { name: 'Плотникова Злата',       email: 'tutor-plotnikova@school.local' },
    { name: 'Бурьян Анна',            email: 'tutor-buryan@school.local' },
    { name: 'Багрова Виктория',       email: 'tutor-bagrova@school.local' },
    { name: 'Афанасьева Анастасия',   email: 'tutor-afanaseva@school.local' },
    { name: 'Битинас Екатерина',      email: 'tutor-bitinas@school.local' },
];

const PASSWORD = 'Tutor12345!';

async function lookupTeacherId(name) {
    const { data } = await supabase.from('teachers').select('id').eq('name', name).maybeSingle();
    return data?.id ?? null;
}

async function createOne({ name, email }) {
    // 1. Find teacher_id (might be null if teacher not in DB yet)
    const teacherId = await lookupTeacherId(name);

    // 2. Create user via admin API
    const { data: created, error: createErr } = await supabase.auth.admin.createUser({
        email,
        password: PASSWORD,
        email_confirm: true,
        user_metadata: { full_name: name },
    });

    let userId;
    if (createErr) {
        if (createErr.message?.includes('already') || createErr.code === 'email_exists') {
            const { data: existing } = await supabase.auth.admin.listUsers();
            const u = existing?.users?.find(x => x.email === email);
            if (!u) {
                console.error(`  ❌ ${name}: ${createErr.message}`);
                return false;
            }
            userId = u.id;
            console.log(`  ⚠️  ${name.padEnd(28)} account exists, updating profile`);
        } else {
            console.error(`  ❌ ${name}: ${createErr.message}`);
            return false;
        }
    } else {
        userId = created.user.id;
        console.log(`  ✅ ${name.padEnd(28)} created`);
    }

    // 3. Upsert profile
    const { error: profileErr } = await supabase
        .from('profiles')
        .upsert({
            id: userId,
            email,
            role: 'teacher',
            teacher_id: teacherId,
            full_name: name,
        }, { onConflict: 'id' });

    if (profileErr) {
        console.error(`     profile error: ${profileErr.message}`);
        return false;
    }

    if (teacherId) {
        console.log(`     → linked to teacher_id=${teacherId}`);
    } else {
        console.log(`     ⚠️  teacher_id not found in DB — profile created без привязки`);
    }
    return true;
}

async function main() {
    console.log(`Creating ${PEDS.length} ИЗ-педагогов в Supabase Auth...\n`);
    let ok = 0;
    for (const p of PEDS) {
        if (await createOne(p)) ok++;
    }
    console.log('\n' + '='.repeat(60));
    console.log(`Done: ${ok}/${PEDS.length} accounts ready`);
    console.log(`Default password for all: ${PASSWORD}`);
    console.log('Файл с доступами: ДОСТУПЫ_ИЗ_ПЕДАГОГИ.md');
}

main().catch(err => { console.error('Fatal:', err); process.exit(1); });
