// =====================================================================
// Создание аккаунтов для тьюторов через Supabase Admin API
//
// Использование:
//   1. Получи Service Role Key в Supabase Dashboard → Settings → API
//   2. Создай файл .env.admin со строкой:
//        SUPABASE_SERVICE_ROLE_KEY=sb_secret_xxxxxxxxxx
//   3. Запусти:
//        node scripts/create_tutor_accounts.mjs
//
// Скрипт создаст аккаунты, привяжет их к teacher_id и установит роль 'teacher'.
// =====================================================================

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Load env from .env.local + .env.admin
const loadEnv = (file) => {
    try {
        const content = readFileSync(join(__dirname, '..', file), 'utf-8');
        content.split('\n').forEach(line => {
            const match = line.match(/^([A-Z_]+)=(.+)$/);
            if (match) process.env[match[1]] = match[2].trim();
        });
    } catch {
        // file not found - ignore
    }
};

loadEnv('.env.local');
loadEnv('.env.admin');

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    console.error('❌ Missing env vars. Need:');
    console.error('   VITE_SUPABASE_URL (in .env.local)');
    console.error('   SUPABASE_SERVICE_ROLE_KEY (in .env.admin)');
    console.error('');
    console.error('Get Service Role Key from: Supabase Dashboard → Settings → API → service_role');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
});

// Tutors list — taken from src/data/mockData.js (teachers with subject = 'Тьютор')
const TUTORS = [
    { teacherId: 2,  name: 'Аношко Лиана',         email: 'tutor-anoshko@school.local',   password: 'Tutor12345!' },
    { teacherId: 7,  name: 'Голубева Елизавета',   email: 'tutor-golubeva@school.local',  password: 'Tutor12345!' },
    { teacherId: 12, name: 'Коновалова Евгения',   email: 'tutor-konovalova@school.local', password: 'Tutor12345!' },
    { teacherId: 13, name: 'Лалетина Елизавета',   email: 'tutor-laletina@school.local',  password: 'Tutor12345!' },
    { teacherId: 16, name: 'Лукина Юлия',          email: 'tutor-lukina@school.local',    password: 'Tutor12345!' },
    { teacherId: 25, name: 'Рассолова Екатерина',  email: 'tutor-rassolova@school.local', password: 'Tutor12345!' },
    { teacherId: 27, name: 'Силосьева Алла',       email: 'tutor-silosyeva@school.local', password: 'Tutor12345!' },
    { teacherId: 30, name: 'Цуркан Юлия',          email: 'tutor-tsurkan@school.local',   password: 'Tutor12345!' },
];

async function createTutor({ teacherId, name, email, password }) {
    // Step 1: create user
    const { data: created, error: createErr } = await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name: name },
    });

    let userId;
    if (createErr) {
        if (createErr.message?.includes('already') || createErr.code === 'email_exists') {
            // User exists — find existing user
            const { data: existing } = await supabase.auth.admin.listUsers();
            const existingUser = existing?.users?.find(u => u.email === email);
            if (!existingUser) {
                console.error(`  ❌ ${name}: ${createErr.message}`);
                return false;
            }
            userId = existingUser.id;
            console.log(`  ⚠️  ${name}: account exists, updating profile...`);
        } else {
            console.error(`  ❌ ${name}: ${createErr.message}`);
            return false;
        }
    } else {
        userId = created.user.id;
        console.log(`  ✅ ${name}: account created`);
    }

    // Step 2: upsert profile with teacher_id binding
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

    console.log(`     → linked to teacher_id=${teacherId}`);
    return true;
}

async function main() {
    console.log('Creating tutor accounts...\n');
    let successCount = 0;
    for (const tutor of TUTORS) {
        const ok = await createTutor(tutor);
        if (ok) successCount++;
    }

    console.log('\n' + '='.repeat(60));
    console.log(`Done: ${successCount}/${TUTORS.length} accounts ready`);
    console.log('\nCredentials:');
    TUTORS.forEach(t => {
        console.log(`  ${t.name.padEnd(28)} ${t.email.padEnd(40)} ${t.password}`);
    });
}

main().catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
});
