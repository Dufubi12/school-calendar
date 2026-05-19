import { supabase } from './supabase';

// =====================================================================
// TEACHER RATES (per-lesson payment) — includes category rates
// Returns: { teacherId: { base, sonastroyka, individual, diagnostika, podgotovka, prodlenka, kruzhki, stazhirovka } }
// Each category rate is `null` if not set — caller should fall back to base.
// =====================================================================
export async function loadTeacherRates() {
    try {
        const { data, error } = await supabase
            .from('teacher_rates')
            .select('teacher_id, rate, rate_sonastroyka, rate_individual, rate_diagnostika, rate_podgotovka, rate_prodlenka, rate_kruzhki, rate_stazhirovka');
        if (error) {
            console.error('Failed to load teacher rates:', error);
            return {};
        }
        const map = {};
        (data || []).forEach(r => {
            map[r.teacher_id] = {
                base: r.rate ?? null,
                sonastroyka: r.rate_sonastroyka ?? null,
                individual: r.rate_individual ?? null,
                diagnostika: r.rate_diagnostika ?? null,
                podgotovka: r.rate_podgotovka ?? null,
                prodlenka: r.rate_prodlenka ?? null,
                kruzhki: r.rate_kruzhki ?? null,
                stazhirovka: r.rate_stazhirovka ?? null,
            };
        });
        return map;
    } catch (err) {
        console.error('loadTeacherRates error:', err);
        return {};
    }
}

// Returns rate for a given lesson type for a teacher.
// type: 'Групповой' | 'Индивидуальный' | 'ОГЭ' | 'ЕГЭ' | 'Тьюторский' |
//       'Сонастройка' | 'Диагностика' | 'Подготовка к школе' | 'Продлёнка' | 'Кружки' | 'Стажировка'
export function rateForLessonType(teacherRates, teacherId, type, defaultRate) {
    const r = teacherRates[teacherId];
    if (!r) return defaultRate;
    const baseOrDefault = r.base ?? defaultRate;
    switch (type) {
        case 'Сонастройка':       return r.sonastroyka ?? baseOrDefault;
        case 'Индивидуальный':
        case 'ОГЭ':
        case 'ЕГЭ':              return r.individual ?? baseOrDefault;
        case 'Диагностика':       return r.diagnostika ?? baseOrDefault;
        case 'Подготовка к школе':return r.podgotovka ?? baseOrDefault;
        case 'Продлёнка':
        case 'Продленка':         return r.prodlenka ?? baseOrDefault;
        case 'Кружки':            return r.kruzhki ?? baseOrDefault;
        case 'Стажировка':        return r.stazhirovka ?? baseOrDefault;
        case 'Тьюторский':
        case 'Групповой':
        default:                  return baseOrDefault;
    }
}

// Save base rate without overwriting category-specific rates
export async function saveTeacherRate(teacherId, rate) {
    const { error } = await supabase
        .from('teacher_rates')
        .upsert(
            { teacher_id: teacherId, rate, updated_at: new Date().toISOString() },
            { onConflict: 'teacher_id' }
        );
    if (error) throw error;
}

// Save one category rate (or null to clear it)
export async function saveCategoryRate(teacherId, categoryKey, value) {
    // categoryKey: 'rate_sonastroyka' | 'rate_individual' | ...
    const patch = { teacher_id: teacherId, updated_at: new Date().toISOString() };
    patch[categoryKey] = value;
    const { error } = await supabase
        .from('teacher_rates')
        .upsert(patch, { onConflict: 'teacher_id' });
    if (error) throw error;
}

// =====================================================================
// HOMEWORK CHECKS
// =====================================================================
export async function loadHomeworkChecks() {
    try {
        const { data, error } = await supabase.from('homework_checks').select('teacher_id, check_date, count');
        if (error) {
            console.error('Failed to load homework checks:', error);
            return {};
        }
        // Convert flat list to nested: { teacherId: { date: count } }
        const result = {};
        (data || []).forEach(row => {
            const tid = String(row.teacher_id);
            if (!result[tid]) result[tid] = {};
            result[tid][row.check_date] = row.count;
        });
        return result;
    } catch (err) {
        console.error('loadHomeworkChecks error:', err);
        return {};
    }
}

export async function saveHomeworkCheck(teacherId, checkDate, count) {
    if (!count || count <= 0) {
        const { error } = await supabase
            .from('homework_checks')
            .delete()
            .eq('teacher_id', teacherId)
            .eq('check_date', checkDate);
        if (error) throw error;
    } else {
        const { error } = await supabase
            .from('homework_checks')
            .upsert({
                teacher_id: teacherId,
                check_date: checkDate,
                count,
                updated_at: new Date().toISOString()
            });
        if (error) throw error;
    }
}

// =====================================================================
// HOMEWORK RATES (per-teacher rate for ДЗ)
// =====================================================================
export async function loadHomeworkRates() {
    try {
        const { data, error } = await supabase.from('homework_rates').select('teacher_id, rate');
        if (error) {
            console.error('Failed to load homework rates:', error);
            return {};
        }
        const map = {};
        (data || []).forEach(r => { map[r.teacher_id] = r.rate; });
        return map;
    } catch (err) {
        console.error('loadHomeworkRates error:', err);
        return {};
    }
}

export async function saveHomeworkRate(teacherId, rate) {
    if (!rate || rate <= 0) {
        const { error } = await supabase.from('homework_rates').delete().eq('teacher_id', teacherId);
        if (error) throw error;
    } else {
        const { error } = await supabase
            .from('homework_rates')
            .upsert({ teacher_id: teacherId, rate, updated_at: new Date().toISOString() });
        if (error) throw error;
    }
}

// =====================================================================
// LESSON TYPES (admin marks each lesson with type)
// =====================================================================
export async function loadLessonTypes() {
    try {
        const { data, error } = await supabase.from('lesson_types').select('class_name, day_name, time_slot, teacher_last_name, type');
        if (error) {
            console.error('Failed to load lesson types:', error);
            return {};
        }
        // Return as { "[class]_[day]_[time]_[teacher]": "type" }
        const map = {};
        (data || []).forEach(row => {
            const key = `${row.class_name}_${row.day_name}_${row.time_slot}_${row.teacher_last_name}`;
            map[key] = row.type;
        });
        return map;
    } catch (err) {
        console.error('loadLessonTypes error:', err);
        return {};
    }
}

export async function saveLessonType(className, dayName, timeSlot, teacherLastName, type) {
    if (!type || type === 'Групповой') {
        // Default — delete instead of storing
        const { error } = await supabase
            .from('lesson_types')
            .delete()
            .match({ class_name: className, day_name: dayName, time_slot: timeSlot, teacher_last_name: teacherLastName });
        if (error) throw error;
    } else {
        const { error } = await supabase
            .from('lesson_types')
            .upsert({
                class_name: className,
                day_name: dayName,
                time_slot: timeSlot,
                teacher_last_name: teacherLastName,
                type,
                updated_at: new Date().toISOString()
            }, { onConflict: 'class_name,day_name,time_slot,teacher_last_name' });
        if (error) throw error;
    }
}

// =====================================================================
// AVAILABILITY (teacher marks free/busy slots)
// =====================================================================
export async function loadAvailability() {
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

        const { data, error } = await supabase.from('availability').select('teacher_id, day_name, time_slot, status');
        clearTimeout(timeoutId);

        if (error) {
            console.error('Failed to load availability:', error);
            return {}; // Return empty on error instead of throwing
        }

        // Return as { teacherId: { dayName: { timeSlot: 'free'|'busy' } } }
        const result = {};
        (data || []).forEach(row => {
            const tid = String(row.teacher_id);
            if (!result[tid]) result[tid] = {};
            if (!result[tid][row.day_name]) result[tid][row.day_name] = {};
            result[tid][row.day_name][row.time_slot] = row.status;
        });
        return result;
    } catch (err) {
        console.error('loadAvailability error:', err);
        return {}; // Return empty on timeout or other errors
    }
}

export async function saveAvailability(teacherId, dayName, timeSlot, status) {
    if (!status) {
        const { error } = await supabase
            .from('availability')
            .delete()
            .match({ teacher_id: teacherId, day_name: dayName, time_slot: timeSlot });
        if (error) throw error;
    } else {
        const { error } = await supabase
            .from('availability')
            .upsert({
                teacher_id: teacherId,
                day_name: dayName,
                time_slot: timeSlot,
                status,
                updated_at: new Date().toISOString()
            }, { onConflict: 'teacher_id,day_name,time_slot' });
        if (error) throw error;
    }
}

// =====================================================================
// INVITATIONS
// =====================================================================
export async function loadInvitations() {
    try {
        const { data, error } = await supabase
            .from('invitations')
            .select('*')
            .order('created_at', { ascending: false });
        if (error) {
            console.error('Failed to load invitations:', error);
            return [];
        }
        // Map snake_case to the shape the UI expects (camelCase-ish)
        return (data || []).map(row => ({
            id: row.id,
            teacherId: row.teacher_id,
            teacherName: row.teacher_name,
            date: row.invite_date,
            time: row.time_slot,
            subject: row.subject,
            grade: row.grade,
            note: row.note,
            studentName: row.student_name || null,
            lessonKind: row.lesson_kind || null,
            recurrencePattern: row.recurrence_pattern || 'once',
            recurrenceEndDate: row.recurrence_end_date || null,
            status: row.status,
            createdAt: row.created_at,
            respondedAt: row.responded_at,
        }));
    } catch (err) {
        console.error('loadInvitations error:', err);
        return [];
    }
}

export async function createInvitation({ teacherId, teacherName, date, time, subject, grade, note, studentName, lessonKind, recurrencePattern, recurrenceEndDate }) {
    const { data, error } = await supabase
        .from('invitations')
        .insert({
            teacher_id: teacherId,
            teacher_name: teacherName,
            invite_date: date,
            time_slot: time,
            subject,
            grade,
            note: note || null,
            student_name: studentName || null,
            lesson_kind: lessonKind || null,
            recurrence_pattern: recurrencePattern || 'once',
            recurrence_end_date: recurrencePattern && recurrencePattern !== 'once' ? recurrenceEndDate : null,
            status: 'pending',
        })
        .select()
        .single();
    if (error) throw error;
    return data;
}

export async function respondToInvitation(id, status) {
    const { error } = await supabase
        .from('invitations')
        .update({ status, responded_at: new Date().toISOString() })
        .eq('id', id);
    if (error) throw error;

    // On accept — auto-block the slot in individual_slots (single_date busy)
    // for each occurrence of the invitation, so it shows up as grey-zone
    // everywhere (calendar, my-slots, IZ page).
    if (status !== 'accepted') return;
    try {
        const { data: inv } = await supabase
            .from('invitations')
            .select('teacher_id, invite_date, time_slot, recurrence_pattern, recurrence_end_date')
            .eq('id', id)
            .maybeSingle();
        if (!inv) return;

        const occurrences = [];
        const pattern = inv.recurrence_pattern || 'once';
        if (pattern === 'once' || !inv.recurrence_end_date) {
            occurrences.push(inv.invite_date);
        } else {
            const stepDays = pattern === 'biweekly' ? 14 : 7;
            const start = new Date(inv.invite_date + 'T00:00:00');
            const end = new Date(inv.recurrence_end_date + 'T00:00:00');
            const cur = new Date(start);
            let i = 0;
            while (cur <= end && i < 520) {
                const y = cur.getFullYear();
                const m = String(cur.getMonth() + 1).padStart(2, '0');
                const d = String(cur.getDate()).padStart(2, '0');
                occurrences.push(`${y}-${m}-${d}`);
                cur.setDate(cur.getDate() + stepDays);
                i++;
            }
        }

        // Best-effort: ignore individual failures so a partial accept
        // still completes (the invitation itself is already accepted).
        await Promise.all(
            occurrences.map(date =>
                createSingleIndividualSlot({
                    teacherId: inv.teacher_id,
                    date,
                    timeSlot: inv.time_slot,
                    status: 'busy',
                    byAdmin: true, // auto-block from accepted invitation skips moderation
                }).catch(err => {
                    console.warn('[respondToInvitation] auto-block slot failed for', date, err?.message);
                })
            )
        );
    } catch (err) {
        console.warn('[respondToInvitation] auto-block setup failed:', err?.message);
    }
}

export async function deleteInvitation(id) {
    const { error } = await supabase.from('invitations').delete().eq('id', id);
    if (error) throw error;
}

// =====================================================================
// INDIVIDUAL SLOTS (ИЗ) — recurring weekly OR single-date slots
// Returns: {
//   teacherLastName: {
//     teacherId,
//     name,
//     description,
//     slots: { day: { time: 'free'|'busy' } }  // recurring weekly
//     singleEvents: [ { id, single_date, time_slot, status } ]   // one-off
//   }
// }
// =====================================================================
// Given a slotsByTeacher entry (output of loadIndividualSlots) + date,
// return active recurring slot status for (day, time) on that date.
// Honors effective_from / effective_to versioning.
// Returns 'busy' | 'free' | null
export function getSlotStatusForDate(teacherEntry, day, timeSlot, dateStr) {
    if (!teacherEntry || !teacherEntry.recurringVersions) return null;
    const candidates = teacherEntry.recurringVersions.filter(v =>
        v.day === day && v.time_slot === timeSlot
    );
    for (const v of candidates) {
        if (v.effective_from && dateStr < v.effective_from) continue;
        if (v.effective_to && dateStr > v.effective_to) continue;
        return v.status;
    }
    return null;
}

// Count distinct teachers whose IZ slots were updated within the last `hours` hours.
// Used by Layout to render the admin's "recent changes" badge on /individual-slots.
export async function countRecentIzChanges(hours = 24) {
    const since = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
    const { data, error } = await supabase
        .from('individual_slots')
        .select('teacher_id, updated_at')
        .gte('updated_at', since);
    if (error) {
        console.warn('[countRecentIzChanges] failed:', error.message);
        return 0;
    }
    const teacherIds = new Set((data || []).map(r => r.teacher_id));
    return teacherIds.size;
}

export async function loadIndividualSlots(teachers = []) {
    try {
        const [slotsRes, descRes] = await Promise.all([
            supabase.from('individual_slots').select('id, teacher_id, day, time_slot, status, single_date, approval_status, approval_note, approved_at, effective_from, effective_to'),
            supabase.from('individual_slot_descriptions').select('teacher_id, description'),
        ]);
        const result = {};
        const teacherById = new Map(teachers.map(t => [t.id, t]));
        const descByTeacher = {};
        (descRes.data || []).forEach(d => { descByTeacher[d.teacher_id] = d.description; });

        const ensureEntry = (teacher_id) => {
            const t = teacherById.get(teacher_id);
            const lastName = t ? t.name.split(' ')[0] : String(teacher_id);
            if (!result[lastName]) {
                result[lastName] = {
                    teacherId: teacher_id,
                    name: t ? t.name : lastName,
                    description: descByTeacher[teacher_id] || '',
                    slots: {},          // { day: { time: status } } — current active version
                    slotMeta: {},       // { day: { time: { id, approval_status, effective_from, effective_to } } }
                    recurringVersions: [], // all versions: { id, day, time_slot, status, approval_status, effective_from, effective_to }
                    singleEvents: [],
                };
            }
            return result[lastName];
        };

        const today = (() => {
            const d = new Date();
            return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        })();
        const isActiveOnDate = (row, dateStr) => {
            if (row.effective_from && dateStr < row.effective_from) return false;
            if (row.effective_to && dateStr > row.effective_to) return false;
            return true;
        };

        (slotsRes.data || []).forEach(row => {
            const entry = ensureEntry(row.teacher_id);
            if (row.single_date) {
                entry.singleEvents.push({
                    id: row.id,
                    single_date: row.single_date,
                    time_slot: row.time_slot,
                    status: row.status,
                    approval_status: row.approval_status || 'approved',
                    approval_note: row.approval_note || null,
                });
            } else {
                entry.recurringVersions.push({
                    id: row.id,
                    day: row.day,
                    time_slot: row.time_slot,
                    status: row.status,
                    approval_status: row.approval_status || 'approved',
                    approval_note: row.approval_note || null,
                    effective_from: row.effective_from || null,
                    effective_to: row.effective_to || null,
                });
                // For UI: pick the version active TODAY (so cells show current value)
                if (isActiveOnDate(row, today)) {
                    if (!entry.slots[row.day]) entry.slots[row.day] = {};
                    if (!entry.slotMeta[row.day]) entry.slotMeta[row.day] = {};
                    entry.slots[row.day][row.time_slot] = row.status;
                    entry.slotMeta[row.day][row.time_slot] = {
                        id: row.id,
                        approval_status: row.approval_status || 'approved',
                        approval_note: row.approval_note || null,
                        effective_from: row.effective_from || null,
                        effective_to: row.effective_to || null,
                    };
                }
            }
        });

        // Teachers with description but no slots
        (descRes.data || []).forEach(d => {
            ensureEntry(d.teacher_id);
        });

        return result;
    } catch (err) {
        console.error('loadIndividualSlots error:', err);
        return {};
    }
}

// Save / clear a recurring slot with VERSIONING.
// On change: close current open version (effective_to = yesterday) and insert
// a new open version (effective_from = today, effective_to = null).
// On delete: just close the current open version — keep history.
// `byAdmin=true` marks the new version as already approved.
export async function saveIndividualSlot(teacherId, day, timeSlot, status, byAdmin = false) {
    const now = new Date();
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`;

    // Find current OPEN version (effective_to IS NULL) for this slot
    const { data: openRows, error: selErr } = await supabase
        .from('individual_slots')
        .select('id, status, effective_from')
        .eq('teacher_id', teacherId)
        .eq('day', day)
        .eq('time_slot', timeSlot)
        .is('single_date', null)
        .is('effective_to', null);
    if (selErr) throw selErr;
    const openVersion = (openRows && openRows[0]) || null;

    // === Delete (status=null) ===
    if (status === null || status === undefined) {
        if (openVersion) {
            // If this version started today and has no history before it — safe to hard delete
            // (avoids creating phantom 1-day records when teacher toggles ON then OFF quickly)
            if (openVersion.effective_from === todayStr) {
                const { error } = await supabase
                    .from('individual_slots')
                    .delete()
                    .eq('id', openVersion.id);
                if (error) throw error;
            } else {
                // Close it: keep history, mark effective_to = yesterday
                const { error } = await supabase
                    .from('individual_slots')
                    .update({
                        effective_to: yesterdayStr,
                        updated_at: new Date().toISOString(),
                    })
                    .eq('id', openVersion.id);
                if (error) throw error;
            }
        }
        return;
    }

    const approval_status = byAdmin ? 'approved' : 'pending';

    // No open version yet — just insert new open version
    if (!openVersion) {
        const { error } = await supabase
            .from('individual_slots')
            .insert({
                teacher_id: teacherId,
                day,
                time_slot: timeSlot,
                status,
                single_date: null,
                approval_status,
                approved_at: byAdmin ? new Date().toISOString() : null,
                effective_from: todayStr,
                effective_to: null,
            });
        if (error) throw error;
        return;
    }

    // Same status as current open version — refresh approval only (admin re-approve etc.)
    if (openVersion.status === status) {
        const { error } = await supabase
            .from('individual_slots')
            .update({
                approval_status,
                approval_note: null,
                approved_at: byAdmin ? new Date().toISOString() : null,
                updated_at: new Date().toISOString(),
            })
            .eq('id', openVersion.id);
        if (error) throw error;
        return;
    }

    // Status changed — version it
    // If the open version also started today, just overwrite it in place
    // (avoids 1-day phantom version when toggling within the same day)
    if (openVersion.effective_from === todayStr) {
        const { error } = await supabase
            .from('individual_slots')
            .update({
                status,
                approval_status,
                approval_note: null,
                approved_at: byAdmin ? new Date().toISOString() : null,
                updated_at: new Date().toISOString(),
            })
            .eq('id', openVersion.id);
        if (error) throw error;
        return;
    }

    // Close old version
    const { error: closeErr } = await supabase
        .from('individual_slots')
        .update({
            effective_to: yesterdayStr,
            updated_at: new Date().toISOString(),
        })
        .eq('id', openVersion.id);
    if (closeErr) throw closeErr;

    // Open new version with new status starting today
    const { error: insErr } = await supabase
        .from('individual_slots')
        .insert({
            teacher_id: teacherId,
            day,
            time_slot: timeSlot,
            status,
            single_date: null,
            approval_status,
            approved_at: byAdmin ? new Date().toISOString() : null,
            effective_from: todayStr,
            effective_to: null,
        });
    if (insErr) throw insErr;
}

// Create a single-date one-off event
export async function createSingleIndividualSlot({ teacherId, date, timeSlot, status = 'busy', byAdmin = false }) {
    const dow = ['вс', 'пн', 'вт', 'ср', 'чт', 'пт', 'сб'][new Date(date + 'T00:00:00').getDay()];
    const approval_status = byAdmin ? 'approved' : 'pending';
    const { data, error } = await supabase
        .from('individual_slots')
        .insert({
            teacher_id: teacherId,
            day: dow,
            time_slot: timeSlot,
            status,
            single_date: date,
            approval_status,
            approved_at: byAdmin ? new Date().toISOString() : null,
            effective_from: date,
            effective_to: date,
        })
        .select()
        .single();
    if (error) throw error;
    return data;
}

// Create a recurring slot with arbitrary day/time (used by "+ свой слот")
// Uses the same select → update-or-insert pattern as saveIndividualSlot
export async function createRecurringIndividualSlot({ teacherId, day, timeSlot, status = 'busy', byAdmin = false }) {
    return saveIndividualSlot(teacherId, day, timeSlot, status, byAdmin);
}

// Admin approves or rejects an IZ slot
export async function setIzSlotApproval(slotId, status, note = null) {
    if (!['approved', 'rejected'].includes(status)) throw new Error('Invalid approval status');
    const { error } = await supabase
        .from('individual_slots')
        .update({
            approval_status: status,
            approval_note: note,
            approved_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
        })
        .eq('id', slotId);
    if (error) throw error;
}

// Count pending IZ slots (for admin nav badge)
export async function countPendingIzSlots() {
    const { count, error } = await supabase
        .from('individual_slots')
        .select('id', { count: 'exact', head: true })
        .eq('approval_status', 'pending');
    if (error) {
        console.warn('[countPendingIzSlots] failed:', error.message);
        return 0;
    }
    return count || 0;
}

// Count recent admin decisions on a teacher's IZ slots (for teacher nav badge)
export async function countRecentIzDecisions(teacherId, hours = 24) {
    if (!teacherId) return 0;
    const since = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
    const { count, error } = await supabase
        .from('individual_slots')
        .select('id', { count: 'exact', head: true })
        .eq('teacher_id', teacherId)
        .in('approval_status', ['approved', 'rejected'])
        .gte('approved_at', since);
    if (error) {
        console.warn('[countRecentIzDecisions] failed:', error.message);
        return 0;
    }
    return count || 0;
}

// Delete a single event by id
export async function deleteIndividualSlot(id) {
    const { error } = await supabase
        .from('individual_slots')
        .delete()
        .eq('id', id);
    if (error) throw error;
}

// =====================================================================
// TEACHERS / LESSONS / BELL SCHEDULE — currently still loaded from mockData,
// but we expose Supabase loaders for future migration.
// =====================================================================
export async function loadTeachersFromDb() {
    const { data, error } = await supabase.from('teachers').select('*').order('id');
    if (error) throw error;
    return data || [];
}

export async function loadLessonsFromDb() {
    const { data, error } = await supabase.from('lessons').select('*');
    if (error) throw error;
    return data || [];
}

export async function loadBellScheduleFromDb() {
    const { data, error } = await supabase.from('bell_schedule').select('*').order('lesson_number');
    if (error) throw error;
    return (data || []).map(b => ({
        lessonNumber: b.lesson_number,
        startTime: b.start_time,
        endTime: b.end_time,
        label: b.label,
    }));
}
