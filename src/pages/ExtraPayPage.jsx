import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSchedule } from '../context/ScheduleContext';
import { Wallet, BookOpen, Wrench, Clock, Save } from 'lucide-react';
import {
    DEFAULT_RATES,
    SCHEDULE_OWNER,
    loadStore,
    saveStore,
    getEntry,
    setEntry,
    getRate,
    setTeacherRate,
    setDefaultRate,
    getCurrentPeriod,
    computeForPeriod,
} from '../lib/extraPay';

const monthName = (period) => {
    const [y, m] = period.split('-').map(Number);
    return new Date(y, m - 1, 1).toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' });
};

const ExtraPayPage = () => {
    const { teachers } = useSchedule();
    const { isAdmin, isTeacher, currentUser } = useAuth();

    const [store, setStore] = useState(() => loadStore());
    const [period, setPeriod] = useState(getCurrentPeriod());

    const currentTeacherId = isTeacher ? currentUser?.teacherId : null;
    const currentTeacher = useMemo(
        () => teachers.find(t => t.id === currentTeacherId),
        [teachers, currentTeacherId]
    );

    const persist = useCallback((next) => {
        setStore(next);
        saveStore(next);
    }, []);

    // === Teacher view ===
    if (isTeacher && currentTeacher) {
        const entry = getEntry(store, currentTeacher.id, period);
        const result = computeForPeriod(store, currentTeacher.id, period, currentTeacher.name);

        const isNS = currentTeacher.name === SCHEDULE_OWNER.NS;
        const isSS = currentTeacher.name === SCHEDULE_OWNER.SS;
        const scheduleVisible = isNS || isSS;

        const updateField = (field, value) => {
            const next = setEntry(store, currentTeacher.id, period, { [field]: Number(value) || 0 });
            persist(next);
        };

        const updateMyRate = (key, value) => {
            const next = setTeacherRate(store, currentTeacher.id, key, value);
            persist(next);
        };

        const myCustomRates = store.ratesPerTeacher?.[String(currentTeacher.id)] || {};

        return (
            <div style={{ maxWidth: '900px', margin: '0 auto' }}>
                <Header isAdmin={false} />
                <PeriodPicker period={period} onChange={setPeriod} />

                <Section
                    icon={<Wrench size={20} />}
                    title="Методическая работа — сборка урока"
                    hint={`Текущая ставка: ${result.assemblyRate} ₽ за урок · по умолчанию ${store.rates.lessonAssembly} ₽`}
                >
                    <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
                        <div>
                            <label className="label">Количество уроков</label>
                            <input
                                type="number"
                                min="0"
                                step="1"
                                value={entry.lessonAssemblyCount || ''}
                                onChange={(e) => updateField('lessonAssemblyCount', e.target.value)}
                                style={{ width: '120px' }}
                            />
                        </div>
                        <RateField
                            label="Моя ставка (₽/урок)"
                            value={myCustomRates.lessonAssembly ?? ''}
                            placeholder={String(store.rates.lessonAssembly)}
                            onChange={(v) => updateMyRate('lessonAssembly', v)}
                        />
                        <ResultPill label="Сумма" value={`${result.assemblyPay.toLocaleString()} ₽`} />
                    </div>
                </Section>

                <Section
                    icon={<Clock size={20} />}
                    title="Методическая работа — другое"
                    hint={`Текущая ставка: ${result.hourlyRate} ₽ за час · по умолчанию ${store.rates.otherHourly} ₽`}
                >
                    <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
                        <div>
                            <label className="label">Количество часов</label>
                            <input
                                type="number"
                                min="0"
                                step="0.5"
                                value={entry.otherHours || ''}
                                onChange={(e) => updateField('otherHours', e.target.value)}
                                style={{ width: '120px' }}
                            />
                        </div>
                        <RateField
                            label="Моя ставка (₽/час)"
                            value={myCustomRates.otherHourly ?? ''}
                            placeholder={String(store.rates.otherHourly)}
                            onChange={(v) => updateMyRate('otherHourly', v)}
                        />
                        <ResultPill label="Сумма" value={`${result.hourlyPay.toLocaleString()} ₽`} />
                    </div>
                </Section>

                {scheduleVisible && (() => {
                    const rateKey = isNS ? 'scheduleNS' : 'scheduleSS';
                    return (
                        <Section
                            icon={<BookOpen size={20} />}
                            title={isNS ? 'Работа с расписанием — Начальная школа' : 'Работа с расписанием — Средняя школа'}
                            hint={`Текущая ставка: ${result.scheduleRate} ₽ за цикл · по умолчанию ${store.rates[rateKey]} ₽`}
                        >
                            <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
                                <div>
                                    <label className="label">Количество циклов</label>
                                    <input
                                        type="number"
                                        min="0"
                                        step="1"
                                        value={entry.scheduleCycles || ''}
                                        onChange={(e) => updateField('scheduleCycles', e.target.value)}
                                        style={{ width: '120px' }}
                                    />
                                </div>
                                <RateField
                                    label="Моя ставка (₽/цикл)"
                                    value={myCustomRates[rateKey] ?? ''}
                                    placeholder={String(store.rates[rateKey])}
                                    onChange={(v) => updateMyRate(rateKey, v)}
                                />
                                <ResultPill label="Сумма" value={`${result.schedulePay.toLocaleString()} ₽`} />
                            </div>
                        </Section>
                    );
                })()}

                <TotalCard total={result.total} period={period} />
            </div>
        );
    }

    // === Admin view ===
    if (!isAdmin) {
        return <div className="card" style={{ padding: '2rem', textAlign: 'center' }}>Нет доступа</div>;
    }

    // Compute rows for all teachers + filter only those with data or who can have schedule work
    const rows = useMemo(() => {
        return teachers.map(t => {
            const r = computeForPeriod(store, t.id, period, t.name);
            const isNS = t.name === SCHEDULE_OWNER.NS;
            const isSS = t.name === SCHEDULE_OWNER.SS;
            return { teacher: t, result: r, isNS, isSS };
        });
    }, [teachers, store, period]);

    const onlyWithData = rows.filter(r => r.result.total > 0 || r.isNS || r.isSS);

    const updateAdminField = (teacherId, field, value) => {
        const next = setEntry(store, teacherId, period, { [field]: Number(value) || 0 });
        persist(next);
    };

    const updateRate = (teacherId, key, value) => {
        const next = setTeacherRate(store, teacherId, key, value);
        persist(next);
    };

    const updateDefaultRate = (key, value) => {
        const next = setDefaultRate(store, key, value);
        persist(next);
    };

    return (
        <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
            <Header isAdmin />
            <PeriodPicker period={period} onChange={setPeriod} />

            {/* Default rates control */}
            <div className="card" style={{ padding: '1rem', marginBottom: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                    <Wallet size={18} color="var(--color-primary)" />
                    <h3 style={{ margin: 0, fontSize: '1rem' }}>Ставки по умолчанию</h3>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
                    <RateInput label="Сборка урока (за шт.)" value={store.rates.lessonAssembly} onChange={(v) => updateDefaultRate('lessonAssembly', v)} />
                    <RateInput label="Другое (за час)" value={store.rates.otherHourly} onChange={(v) => updateDefaultRate('otherHourly', v)} />
                    <RateInput label="Расписание НШ (за цикл)" value={store.rates.scheduleNS} onChange={(v) => updateDefaultRate('scheduleNS', v)} />
                    <RateInput label="Расписание СШ (за цикл)" value={store.rates.scheduleSS} onChange={(v) => updateDefaultRate('scheduleSS', v)} />
                </div>
                <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginTop: '8px', marginBottom: 0 }}>
                    Чтобы установить индивидуальную ставку — впишите её в таблице ниже в колонке «Ставка».
                </p>
            </div>

            {/* Table */}
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' }}>
                        <thead style={{ backgroundColor: 'var(--color-bg-tint)' }}>
                            <tr>
                                <th style={th}>Педагог</th>
                                <th style={th}>Сборка урока (шт.)</th>
                                <th style={th}>Другое (часов)</th>
                                <th style={th}>Расписание (циклов)</th>
                                <th style={{ ...th, textAlign: 'right' }}>Итого</th>
                            </tr>
                        </thead>
                        <tbody>
                            {onlyWithData.map(({ teacher, result, isNS, isSS }) => (
                                <tr key={teacher.id} style={{ borderBottom: '1px solid var(--color-divider)' }}>
                                    <td style={td}>
                                        <div style={{ fontWeight: 600, color: 'var(--color-primary-deep)' }}>{teacher.name}</div>
                                        <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                                            {isNS ? 'Методист НШ · 375₽/цикл' : isSS ? 'Методист СШ · 500₽/цикл' : teacher.subject}
                                        </div>
                                    </td>
                                    <td style={td}>
                                        <input
                                            type="number"
                                            min="0" step="1"
                                            value={result.assembly || ''}
                                            onChange={(e) => updateAdminField(teacher.id, 'lessonAssemblyCount', e.target.value)}
                                            style={{ width: '80px' }}
                                        />
                                    </td>
                                    <td style={td}>
                                        <input
                                            type="number"
                                            min="0" step="0.5"
                                            value={result.hours || ''}
                                            onChange={(e) => updateAdminField(teacher.id, 'otherHours', e.target.value)}
                                            style={{ width: '80px' }}
                                        />
                                    </td>
                                    <td style={td}>
                                        {(isNS || isSS) ? (
                                            <input
                                                type="number"
                                                min="0" step="1"
                                                value={result.cycles || ''}
                                                onChange={(e) => updateAdminField(teacher.id, 'scheduleCycles', e.target.value)}
                                                style={{ width: '80px' }}
                                            />
                                        ) : (<span style={{ color: 'var(--color-text-subtle)' }}>—</span>)}
                                    </td>
                                    <td style={{ ...td, textAlign: 'right', fontWeight: 700, color: 'var(--color-success)' }}>
                                        {result.total.toLocaleString()} ₽
                                    </td>
                                </tr>
                            ))}
                            {onlyWithData.length === 0 && (
                                <tr><td style={td} colSpan={5}>
                                    <div style={{ textAlign: 'center', color: 'var(--color-text-muted)', padding: '12px' }}>
                                        Нет данных за {monthName(period)}
                                    </div>
                                </td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Per-teacher rates control (optional override) */}
            <div className="card" style={{ marginTop: '1rem', padding: '1rem' }}>
                <h3 style={{ margin: '0 0 10px', fontSize: '1rem' }}>Индивидуальные ставки</h3>
                <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginTop: 0 }}>
                    Если у конкретного педагога ставка отличается — задайте здесь. Пустое значение = использовать ставку по умолчанию.
                </p>
                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                        <thead style={{ backgroundColor: 'var(--color-bg-tint)' }}>
                            <tr>
                                <th style={th}>Педагог</th>
                                <th style={th}>Сборка урока</th>
                                <th style={th}>Другое (час)</th>
                                <th style={th}>Расписание</th>
                            </tr>
                        </thead>
                        <tbody>
                            {teachers.map(t => {
                                const tid = String(t.id);
                                const r = store.ratesPerTeacher?.[tid] || {};
                                const isNS = t.name === SCHEDULE_OWNER.NS;
                                const isSS = t.name === SCHEDULE_OWNER.SS;
                                return (
                                    <tr key={t.id} style={{ borderBottom: '1px solid var(--color-divider)' }}>
                                        <td style={td}>{t.name}</td>
                                        <td style={td}>
                                            <input
                                                type="number" min="0" step="1"
                                                placeholder={String(store.rates.lessonAssembly)}
                                                value={r.lessonAssembly ?? ''}
                                                onChange={(e) => updateRate(t.id, 'lessonAssembly', e.target.value)}
                                                style={{ width: '90px' }}
                                            />
                                        </td>
                                        <td style={td}>
                                            <input
                                                type="number" min="0" step="1"
                                                placeholder={String(store.rates.otherHourly)}
                                                value={r.otherHourly ?? ''}
                                                onChange={(e) => updateRate(t.id, 'otherHourly', e.target.value)}
                                                style={{ width: '90px' }}
                                            />
                                        </td>
                                        <td style={td}>
                                            {(isNS || isSS) ? (
                                                <input
                                                    type="number" min="0" step="1"
                                                    placeholder={String(store.rates[isNS ? 'scheduleNS' : 'scheduleSS'])}
                                                    value={r[isNS ? 'scheduleNS' : 'scheduleSS'] ?? ''}
                                                    onChange={(e) => updateRate(t.id, isNS ? 'scheduleNS' : 'scheduleSS', e.target.value)}
                                                    style={{ width: '90px' }}
                                                />
                                            ) : (<span style={{ color: 'var(--color-text-subtle)' }}>—</span>)}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

// ===== Sub-components =====
const th = { padding: '10px 14px', textAlign: 'left', fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-text-muted)' };
const td = { padding: '10px 14px', color: 'var(--color-text-main)', verticalAlign: 'middle' };

const Header = ({ isAdmin }) => (
    <div style={{ marginBottom: '1rem' }}>
        <h1 style={{ margin: 0, fontSize: '1.7rem', display: 'flex', alignItems: 'center', gap: '0.5rem', letterSpacing: '-0.02em' }}>
            <Wallet size={26} /> {isAdmin ? 'Доп. оплата педагогов' : 'Моя доп. оплата'}
        </h1>
        <p style={{ margin: '0.4rem 0 0', color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>
            {isAdmin
                ? 'Расчёт за работу с расписанием и методическую работу. Можно вводить за педагога или вместе с ним.'
                : 'Зафиксируйте проделанную работу за месяц — сумма посчитается автоматически.'}
        </p>
    </div>
);

const PeriodPicker = ({ period, onChange }) => (
    <div className="card" style={{
        padding: '12px 16px', marginBottom: '1rem',
        display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap'
    }}>
        <label htmlFor="period-input" style={{ fontWeight: 600, color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>
            📅 Период:
        </label>
        <input
            id="period-input"
            type="month"
            value={period}
            onChange={(e) => onChange(e.target.value)}
            style={{ width: 'auto', padding: '7px 12px', fontWeight: 500 }}
        />
        <span style={{ marginLeft: 'auto', color: 'var(--color-text-muted)', fontSize: '0.85rem', textTransform: 'capitalize' }}>
            {monthName(period)}
        </span>
    </div>
);

const Section = ({ icon, title, hint, children }) => (
    <div className="card" style={{ padding: '16px 18px', marginBottom: '0.85rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
            <div style={{
                width: '34px', height: '34px',
                borderRadius: '10px',
                background: 'linear-gradient(135deg, var(--color-moss) 0%, var(--color-forest) 100%)',
                color: '#fff',
                display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
                {icon}
            </div>
            <div>
                <h3 style={{ margin: 0, fontSize: '1rem', color: 'var(--color-primary-deep)' }}>{title}</h3>
                <p style={{ margin: '2px 0 0', color: 'var(--color-text-muted)', fontSize: '0.78rem' }}>{hint}</p>
            </div>
        </div>
        {children}
    </div>
);

const ResultPill = ({ label, value }) => (
    <div style={{
        padding: '8px 14px',
        borderRadius: 'var(--radius)',
        backgroundColor: 'var(--color-success-bg)',
        border: '1px solid var(--color-success-border)',
        color: 'var(--color-success)',
        fontWeight: 700,
        fontSize: '0.95rem',
        display: 'inline-flex', flexDirection: 'column', gap: '2px'
    }}>
        <span style={{ fontSize: '0.7rem', fontWeight: 600, opacity: 0.8 }}>{label}</span>
        {value}
    </div>
);

const TotalCard = ({ total, period }) => (
    <div style={{
        marginTop: '1.25rem',
        padding: '20px 24px',
        borderRadius: 'var(--radius-md)',
        background: 'linear-gradient(135deg, var(--color-moss) 0%, var(--color-forest) 100%)',
        color: '#fff',
        boxShadow: 'var(--shadow-md)',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px'
    }}>
        <div>
            <div style={{ fontSize: '0.8rem', opacity: 0.8, textTransform: 'capitalize' }}>{monthName(period)}</div>
            <div style={{ fontSize: '1.1rem', fontWeight: 600 }}>Итого за период:</div>
        </div>
        <div style={{ fontSize: '2rem', fontWeight: 800, letterSpacing: '-0.02em' }}>
            {total.toLocaleString()} ₽
        </div>
    </div>
);

const RateInput = ({ label, value, onChange }) => (
    <div>
        <label className="label" style={{ fontSize: '0.78rem' }}>{label}</label>
        <input
            type="number" min="0" step="5"
            value={value}
            onChange={(e) => onChange(e.target.value)}
        />
    </div>
);

// Editable rate field used inside Section in teacher view
const RateField = ({ label, value, placeholder, onChange }) => {
    const isCustom = value !== '' && value !== null && value !== undefined;
    return (
        <div>
            <label className="label" style={{ fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                {label}
                {isCustom && (
                    <span style={{
                        fontSize: '0.65rem',
                        padding: '1px 6px',
                        borderRadius: 'var(--radius-pill)',
                        backgroundColor: 'var(--color-moss-tint)',
                        color: 'var(--color-primary-deep)',
                        fontWeight: 600
                    }}>своя</span>
                )}
            </label>
            <input
                type="number" min="0" step="5"
                value={value}
                placeholder={placeholder}
                onChange={(e) => onChange(e.target.value)}
                style={{
                    width: '110px',
                    borderColor: isCustom ? 'var(--color-primary)' : 'var(--color-border)',
                    backgroundColor: isCustom ? 'var(--color-bg-tint)' : 'var(--color-bg-card)'
                }}
                title={isCustom ? 'Своя ставка задана. Очистите поле, чтобы использовать ставку по умолчанию.' : `По умолчанию: ${placeholder} ₽. Введите свою — будет использоваться она.`}
            />
        </div>
    );
};

export default ExtraPayPage;
