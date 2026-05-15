// =====================================================================
// Доп. оплата педагогов: работа с расписанием + методическая работа
// =====================================================================
//
// Структура хранения в localStorage:
//
// {
//   "version": 1,
//   "rates": {                  // ставки по умолчанию (admin может менять)
//     "scheduleNS": 375,        // расписание Начальной школы / цикл
//     "scheduleSS": 500,        // расписание Средней школы / цикл
//     "lessonAssembly": 125,    // сборка урока / штука
//     "otherHourly": 250        // другое / час
//   },
//   "ratesPerTeacher": {        // индивидуальные ставки (опционально)
//     "<teacherId>": {
//        "scheduleNS"?: number,
//        "scheduleSS"?: number,
//        "lessonAssembly"?: number,
//        "otherHourly"?: number
//      }
//   },
//   "entries": {                // ежемесячные данные педагогов
//     "<teacherId>": {
//       "<YYYY-MM>": {
//         "scheduleCycles"?: number,
//         "lessonAssemblyCount"?: number,
//         "otherHours"?: number,
//         "note"?: string
//       }
//     }
//   }
// }

export const STORAGE_KEY = 'school_calendar_extra_pay_v1';
export const DATA_VERSION = 1;

export const DEFAULT_RATES = Object.freeze({
    scheduleNS: 375,
    scheduleSS: 500,
    lessonAssembly: 125,
    otherHourly: 250,
});

// Привязки: какие педагоги ответственны за работу с расписанием
export const SCHEDULE_OWNER = Object.freeze({
    NS: 'Кис Мария',          // Начальная школа
    SS: 'Арсентьева Елизавета',// Средняя школа
});

export function getCurrentPeriod() {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

const emptyStore = () => ({
    version: DATA_VERSION,
    rates: { ...DEFAULT_RATES },
    ratesPerTeacher: {},
    entries: {},
});

export function loadStore() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return emptyStore();
        const parsed = JSON.parse(raw);
        if (parsed.version !== DATA_VERSION) return emptyStore();
        return {
            ...emptyStore(),
            ...parsed,
            rates: { ...DEFAULT_RATES, ...(parsed.rates || {}) },
            ratesPerTeacher: parsed.ratesPerTeacher || {},
            entries: parsed.entries || {},
        };
    } catch {
        return emptyStore();
    }
}

export function saveStore(store) {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
    } catch (err) {
        console.error('Failed to save extra pay store', err);
    }
}

export function getEntry(store, teacherId, period) {
    const tid = String(teacherId);
    return store.entries?.[tid]?.[period] || {};
}

export function setEntry(store, teacherId, period, patch) {
    const tid = String(teacherId);
    const next = { ...store };
    next.entries = { ...(next.entries || {}) };
    const teacherEntries = { ...(next.entries[tid] || {}) };
    teacherEntries[period] = { ...(teacherEntries[period] || {}), ...patch };
    // Cleanup: remove zero/empty values
    Object.keys(teacherEntries[period]).forEach(k => {
        const v = teacherEntries[period][k];
        if (v === '' || v === undefined || v === null || v === 0) {
            delete teacherEntries[period][k];
        }
    });
    if (Object.keys(teacherEntries[period]).length === 0) {
        delete teacherEntries[period];
    }
    if (Object.keys(teacherEntries).length === 0) {
        delete next.entries[tid];
    } else {
        next.entries[tid] = teacherEntries;
    }
    return next;
}

export function getRate(store, teacherId, key) {
    const tid = String(teacherId);
    const perTeacher = store.ratesPerTeacher?.[tid]?.[key];
    if (perTeacher !== undefined && perTeacher !== null && perTeacher !== '') {
        return Number(perTeacher);
    }
    return Number(store.rates?.[key] ?? DEFAULT_RATES[key]);
}

export function setTeacherRate(store, teacherId, key, value) {
    const tid = String(teacherId);
    const next = { ...store };
    next.ratesPerTeacher = { ...(next.ratesPerTeacher || {}) };
    const teacherRates = { ...(next.ratesPerTeacher[tid] || {}) };
    if (value === '' || value === undefined || value === null) {
        delete teacherRates[key];
    } else {
        teacherRates[key] = Number(value);
    }
    if (Object.keys(teacherRates).length === 0) {
        delete next.ratesPerTeacher[tid];
    } else {
        next.ratesPerTeacher[tid] = teacherRates;
    }
    return next;
}

export function setDefaultRate(store, key, value) {
    return {
        ...store,
        rates: { ...store.rates, [key]: Number(value) },
    };
}

// Compute extra pay total for a teacher in a single period
export function computeForPeriod(store, teacherId, period, teacherName) {
    const e = getEntry(store, teacherId, period);
    const cycles = Number(e.scheduleCycles || 0);
    const assembly = Number(e.lessonAssemblyCount || 0);
    const hours = Number(e.otherHours || 0);

    const isNS = teacherName === SCHEDULE_OWNER.NS;
    const isSS = teacherName === SCHEDULE_OWNER.SS;

    let scheduleKey = null;
    if (isNS) scheduleKey = 'scheduleNS';
    else if (isSS) scheduleKey = 'scheduleSS';

    const scheduleRate = scheduleKey ? getRate(store, teacherId, scheduleKey) : 0;
    const schedulePay = scheduleKey ? cycles * scheduleRate : 0;

    const assemblyRate = getRate(store, teacherId, 'lessonAssembly');
    const assemblyPay = assembly * assemblyRate;

    const hourlyRate = getRate(store, teacherId, 'otherHourly');
    const hourlyPay = hours * hourlyRate;

    return {
        cycles,
        assembly,
        hours,
        scheduleRate,
        schedulePay,
        assemblyRate,
        assemblyPay,
        hourlyRate,
        hourlyPay,
        total: schedulePay + assemblyPay + hourlyPay,
    };
}

// Sum across all periods in [from..to] (inclusive). Periods are 'YYYY-MM'.
export function computeForRange(store, teacherId, fromPeriod, toPeriod, teacherName) {
    const tid = String(teacherId);
    const entries = store.entries?.[tid] || {};
    let totalCycles = 0, totalAssembly = 0, totalHours = 0, total = 0;
    Object.keys(entries).forEach(period => {
        if (period < fromPeriod || period > toPeriod) return;
        const r = computeForPeriod(store, teacherId, period, teacherName);
        totalCycles += r.cycles;
        totalAssembly += r.assembly;
        totalHours += r.hours;
        total += r.total;
    });
    return { totalCycles, totalAssembly, totalHours, total };
}
