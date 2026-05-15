// =====================================================================
// Доп. оплата педагогов — API слой поверх Supabase
// Эта же структура данных что и lib/extraPay.js (для совместимости с UI):
//   { rates, ratesPerTeacher, entries }
// =====================================================================

import { supabase } from './supabase';

export const DEFAULT_RATES = Object.freeze({
    scheduleNS: 375,
    scheduleSS: 500,
    lessonAssembly: 125,
    otherHourly: 250,
});

// Mapping camelCase (UI) ↔ snake_case (DB)
const RATE_KEYS_DB = {
    scheduleNS: 'schedule_ns',
    scheduleSS: 'schedule_ss',
    lessonAssembly: 'lesson_assembly',
    otherHourly: 'other_hourly',
};

const ENTRY_KEYS_DB = {
    scheduleCycles: 'schedule_cycles',
    lessonAssemblyCount: 'lesson_assembly_count',
    otherHours: 'other_hours',
    note: 'note',
};

const dbRateToObj = (row) => ({
    scheduleNS: row.schedule_ns ?? null,
    scheduleSS: row.schedule_ss ?? null,
    lessonAssembly: row.lesson_assembly ?? null,
    otherHourly: row.other_hourly ?? null,
});

const dbEntryToObj = (row) => {
    const out = {};
    if (row.schedule_cycles > 0) out.scheduleCycles = row.schedule_cycles;
    if (row.lesson_assembly_count > 0) out.lessonAssemblyCount = row.lesson_assembly_count;
    if (Number(row.other_hours) > 0) out.otherHours = Number(row.other_hours);
    if (row.note) out.note = row.note;
    return out;
};

// =====================================================================
// FETCH: load full store from DB
// =====================================================================
export async function fetchStore() {
    const store = {
        rates: { ...DEFAULT_RATES },
        ratesPerTeacher: {},
        entries: {},
    };

    try {
        // 1. Defaults
        const { data: defaults, error: dErr } = await supabase
            .from('extra_pay_defaults')
            .select('schedule_ns, schedule_ss, lesson_assembly, other_hourly')
            .eq('id', 1)
            .maybeSingle();
        if (!dErr && defaults) {
            store.rates = {
                scheduleNS: defaults.schedule_ns,
                scheduleSS: defaults.schedule_ss,
                lessonAssembly: defaults.lesson_assembly,
                otherHourly: defaults.other_hourly,
            };
        }

        // 2. Per-teacher overrides
        const { data: rates, error: rErr } = await supabase
            .from('extra_pay_rates')
            .select('teacher_id, schedule_ns, schedule_ss, lesson_assembly, other_hourly');
        if (!rErr && rates) {
            rates.forEach(row => {
                const obj = dbRateToObj(row);
                // Remove null fields so getRate falls back to default
                Object.keys(obj).forEach(k => obj[k] === null && delete obj[k]);
                if (Object.keys(obj).length > 0) {
                    store.ratesPerTeacher[String(row.teacher_id)] = obj;
                }
            });
        }

        // 3. Entries
        const { data: entries, error: eErr } = await supabase
            .from('extra_pay_entries')
            .select('teacher_id, period, schedule_cycles, lesson_assembly_count, other_hours, note');
        if (!eErr && entries) {
            entries.forEach(row => {
                const tid = String(row.teacher_id);
                const obj = dbEntryToObj(row);
                if (Object.keys(obj).length === 0) return;
                if (!store.entries[tid]) store.entries[tid] = {};
                store.entries[tid][row.period] = obj;
            });
        }
    } catch (err) {
        console.error('[ExtraPay] fetchStore failed:', err);
    }

    return store;
}

// =====================================================================
// SAVE: entry (upsert with cleanup-on-zero)
// =====================================================================
export async function saveEntry(teacherId, period, fullEntry) {
    const cycles = Number(fullEntry.scheduleCycles || 0);
    const assembly = Number(fullEntry.lessonAssemblyCount || 0);
    const hours = Number(fullEntry.otherHours || 0);
    const note = fullEntry.note || null;

    // If all zero — delete row
    if (cycles === 0 && assembly === 0 && hours === 0 && !note) {
        const { error } = await supabase
            .from('extra_pay_entries')
            .delete()
            .eq('teacher_id', teacherId)
            .eq('period', period);
        if (error) console.error('[ExtraPay] delete entry error:', error);
        return;
    }

    const { error } = await supabase
        .from('extra_pay_entries')
        .upsert({
            teacher_id: teacherId,
            period,
            schedule_cycles: cycles,
            lesson_assembly_count: assembly,
            other_hours: hours,
            note,
            updated_at: new Date().toISOString(),
        }, { onConflict: 'teacher_id,period' });
    if (error) console.error('[ExtraPay] upsert entry error:', error);
}

// =====================================================================
// SAVE: per-teacher rate (upsert sparse fields)
// =====================================================================
export async function saveTeacherRate(teacherId, fullRates) {
    const dbRow = {
        teacher_id: teacherId,
        schedule_ns: fullRates.scheduleNS ?? null,
        schedule_ss: fullRates.scheduleSS ?? null,
        lesson_assembly: fullRates.lessonAssembly ?? null,
        other_hourly: fullRates.otherHourly ?? null,
        updated_at: new Date().toISOString(),
    };

    // If all null — delete row
    const allNull = Object.values(dbRow).every(v => v === null || v === teacherId || typeof v === 'string');
    const onlyNullValues = !dbRow.schedule_ns && !dbRow.schedule_ss && !dbRow.lesson_assembly && !dbRow.other_hourly;

    if (onlyNullValues) {
        const { error } = await supabase
            .from('extra_pay_rates')
            .delete()
            .eq('teacher_id', teacherId);
        if (error) console.error('[ExtraPay] delete rate error:', error);
        return;
    }

    const { error } = await supabase
        .from('extra_pay_rates')
        .upsert(dbRow, { onConflict: 'teacher_id' });
    if (error) console.error('[ExtraPay] upsert rate error:', error);
}

// =====================================================================
// SAVE: defaults (admin only via RLS)
// =====================================================================
export async function saveDefaultRates(rates) {
    const { error } = await supabase
        .from('extra_pay_defaults')
        .update({
            schedule_ns: rates.scheduleNS,
            schedule_ss: rates.scheduleSS,
            lesson_assembly: rates.lessonAssembly,
            other_hourly: rates.otherHourly,
            updated_at: new Date().toISOString(),
        })
        .eq('id', 1);
    if (error) console.error('[ExtraPay] save defaults error:', error);
}
