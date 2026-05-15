// =====================================================================
// Применяет SQL миграцию из db/05_extra_pay.sql к Supabase
// через service_role key.
// =====================================================================

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

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    console.error('❌ Missing env vars');
    process.exit(1);
}

const sql = readFileSync(join(ROOT, 'db', '05_extra_pay.sql'), 'utf-8');

// Use raw SQL via the REST RPC endpoint — Supabase has /rest/v1/rpc but no
// generic "execute SQL" RPC. Use the management API instead via PostgREST?
// Simpler: use postgres-meta endpoint or just direct PG. We'll use pg client.

// Try direct fetch to PostgREST? No — RLS-bound. Use pg via node-postgres?
// Easiest: use Supabase JS with rpc('execute_sql') if you have one, otherwise instruct user.

// Use direct HTTP to project's /pg/ admin endpoint? Not exposed.
// Fall back to splitting statements and running through admin API? No SQL exec.

// Best option: use the @supabase/postgrest-js or pg directly with DATABASE_URL.
// Without DATABASE_URL we can't. So we print instructions instead.

console.log('Apply this SQL manually in Supabase Dashboard:');
console.log('  https://app.supabase.com  →  SQL Editor  →  New query');
console.log('  Paste contents of db/05_extra_pay.sql  →  Run');
console.log('');
console.log('SQL preview:');
console.log('---------------------------------------------------');
console.log(sql.split('\n').slice(0, 30).join('\n'));
console.log('... (' + sql.split('\n').length + ' lines total)');
