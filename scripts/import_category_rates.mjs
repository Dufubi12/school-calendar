// =====================================================================
// Импорт категорийных ставок из "Ставки педагогов.docx".
// Записывает в teacher_rates: rate_sonastroyka, rate_individual,
// rate_diagnostika, rate_podgotovka, rate_prodlenka, rate_kruzhki,
// rate_stazhirovka.
//
// Для значений вида "400/450/800" берётся максимальное (приоритет —
// высокая ставка как актуальная). Можно изменить.
// =====================================================================

import { createClient } from '@supabase/supabase-js';
import { readFileSync, existsSync } from 'fs';

['env.local', '.env.local', '.env.admin'].forEach(f => {
    try {
        if (!existsSync(f)) return;
        readFileSync(f, 'utf-8').split('\n').forEach(line => {
            const m = line.match(/^([A-Z_]+)=(.+)$/);
            if (m) process.env[m[1]] = m[2].trim();
        });
    } catch { /* ignore */ }
});

const sb = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

// Use already extracted DOCX table — re-extract if missing
import { execSync } from 'child_process';
import { mkdirSync, copyFileSync } from 'fs';

const docxPath = 'Ставки педагогов.docx';
const tmpDir = process.env.TEMP || process.env.TMPDIR || '/tmp';
const extractDir = `${tmpDir}/docx-rates-extract`;

try {
    mkdirSync(extractDir, { recursive: true });
    execSync(`unzip -o -q "${docxPath}" -d "${extractDir}"`, { stdio: 'pipe' });
} catch (err) {
    console.error('Failed to extract DOCX:', err.message);
    process.exit(1);
}

const xml = readFileSync(`${extractDir}/word/document.xml`, 'utf-8');
const rowsRaw = [...xml.matchAll(/<w:tr[^>]*>([\s\S]*?)<\/w:tr>/g)].map(rm => {
    const cells = [...rm[1].matchAll(/<w:tc[^>]*>([\s\S]*?)<\/w:tc>/g)].map(cm => {
        const texts = [...cm[1].matchAll(/<w:t[^>]*>([^<]*)<\/w:t>/g)].map(m => m[1]);
        return texts.join('').trim();
    });
    return cells;
});

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

const ALIASES = {
    'Матвеева (Дечева) Валерия Александровна': 'Матвеева Валерия',
    'Тронина Ольга': 'Тронина',
    'Карпова Татьяна Николаевна': 'Карпова',
};

const canonName = (s) => {
    const parts = (s || '').replace(/\s+/g, ' ').trim().split(' ');
    return parts.slice(0, 2).join(' ');
};

// Parse rate value like "400" or "400/450/800" — take max
const parseRate = (s) => {
    if (!s) return null;
    const nums = String(s).split('/').map(n => parseInt(n.trim(), 10)).filter(n => !isNaN(n));
    if (nums.length === 0) return null;
    return Math.max(...nums);
};

const { data: teachers } = await sb.from('teachers').select('id, name');
const byName = new Map();
teachers.forEach(t => {
    byName.set(t.name, t);
    const short = canonName(t.name);
    if (!byName.has(short)) byName.set(short, t);
});

let updated = 0;
const skipped = [];

for (const row of rowsRaw.slice(1)) {
    const docName = row[COL.name];
    if (!docName) continue;
    const aliased = ALIASES[docName] || docName;
    const teacher = byName.get(aliased) || byName.get(canonName(aliased));
    if (!teacher) {
        skipped.push(docName);
        continue;
    }

    const patch = {
        teacher_id: teacher.id,
        rate_sonastroyka: parseRate(row[COL.sonastroyka]),
        rate_individual: parseRate(row[COL.individual]),
        rate_diagnostika: parseRate(row[COL.diagnostika]),
        rate_podgotovka: parseRate(row[COL.podgotovka]),
        rate_prodlenka: parseRate(row[COL.prodlenka]),
        rate_kruzhki: parseRate(row[COL.kruzhki]),
        rate_stazhirovka: parseRate(row[COL.stazhirovka]),
        updated_at: new Date().toISOString(),
    };

    const hasAny = ['rate_sonastroyka', 'rate_individual', 'rate_diagnostika',
                    'rate_podgotovka', 'rate_prodlenka', 'rate_kruzhki', 'rate_stazhirovka']
                    .some(k => patch[k] !== null);
    if (!hasAny) continue;

    const { error } = await sb.from('teacher_rates').upsert(patch, { onConflict: 'teacher_id' });
    if (error) {
        console.error(`  ❌ ${teacher.name}: ${error.message}`);
    } else {
        const filled = Object.entries(patch)
            .filter(([k, v]) => k.startsWith('rate_') && v !== null)
            .map(([k, v]) => `${k.replace('rate_', '')}=${v}`)
            .join(', ');
        console.log(`  ✅ ${teacher.name.padEnd(34)} ${filled}`);
        updated++;
    }
}

console.log('\n' + '='.repeat(60));
console.log(`Updated category rates for ${updated} teachers`);
if (skipped.length > 0) console.log(`Skipped (not in DB): ${skipped.length} — ${skipped.join(', ')}`);
