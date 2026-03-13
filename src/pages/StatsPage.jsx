import React, { useState } from 'react';
import { useSchedule } from '../context/ScheduleContext';
import { BarChart3, DollarSign, BookOpen, Calendar, ChevronDown, ChevronRight, Pencil, Plus, Trash2, X, Check, Save } from 'lucide-react';

const CollapsibleSection = ({ title, icon, defaultOpen = false, badge, children }) => {
    const [isOpen, setIsOpen] = useState(defaultOpen);

    return (
        <div style={{
            marginBottom: '1rem',
            backgroundColor: '#fff',
            borderRadius: '12px',
            border: '1px solid #e2e8f0',
            boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
            overflow: 'hidden'
        }}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    padding: '1rem 1.25rem',
                    border: 'none',
                    backgroundColor: isOpen ? '#f8fafc' : '#fff',
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'background-color 0.15s'
                }}
            >
                {isOpen ? <ChevronDown size={20} color="#64748b" /> : <ChevronRight size={20} color="#64748b" />}
                {icon}
                <span style={{ flex: 1, fontSize: '1.1rem', fontWeight: '600', color: '#1e293b' }}>
                    {title}
                </span>
                {badge && (
                    <span style={{
                        fontSize: '0.8rem',
                        fontWeight: '600',
                        padding: '0.25rem 0.75rem',
                        borderRadius: '20px',
                        backgroundColor: '#ecfdf5',
                        color: '#065f46',
                        border: '1px solid #6ee7b7'
                    }}>
                        {badge}
                    </span>
                )}
            </button>
            {isOpen && (
                <div style={{ padding: '0 1.25rem 1.25rem' }}>
                    {children}
                </div>
            )}
        </div>
    );
};

// ====== Модалка редактирования ставок ======
const RateEditModal = ({ teacher, isOpen, onClose, onSave }) => {
    const [lessonRate, setLessonRate] = useState(teacher?.lessonRate || 0);
    const [rates, setRates] = useState(() => {
        if (teacher?.rates && teacher.rates.length > 0) {
            return teacher.rates.map(r => ({ ...r }));
        }
        return [];
    });
    const [useMultipleRates, setUseMultipleRates] = useState(
        teacher?.rates && teacher.rates.length > 0
    );

    if (!isOpen || !teacher) return null;

    const addRate = () => {
        setRates(prev => [...prev, {
            id: `rate-${Date.now()}`,
            name: '',
            rate: 0
        }]);
    };

    const removeRate = (idx) => {
        setRates(prev => prev.filter((_, i) => i !== idx));
    };

    const updateRate = (idx, field, value) => {
        setRates(prev => prev.map((r, i) => i === idx ? { ...r, [field]: value } : r));
    };

    const handleSave = () => {
        if (useMultipleRates) {
            const validRates = rates.filter(r => r.name.trim() && r.rate > 0);
            onSave({
                ...teacher,
                lessonRate: 0,
                rates: validRates
            });
        } else {
            onSave({
                ...teacher,
                lessonRate: Number(lessonRate) || 0,
                rates: []
            });
        }
        onClose();
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="card" onClick={e => e.stopPropagation()} style={{
                width: '520px', maxWidth: '95vw', padding: 0
            }}>
                {/* Header */}
                <div style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--color-border)'
                }}>
                    <div>
                        <h3 style={{ margin: 0, fontSize: '1.05rem' }}>Ставка: {teacher.name}</h3>
                        <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>{teacher.subject}</span>
                    </div>
                    <button onClick={onClose} className="icon-btn"><X size={20} /></button>
                </div>

                {/* Body */}
                <div style={{ padding: '1.25rem 1.5rem' }}>
                    {/* Toggle: single vs multiple */}
                    <div style={{
                        display: 'flex', gap: '8px', marginBottom: '1.25rem',
                        padding: '4px', background: '#f1f5f9', borderRadius: '8px'
                    }}>
                        <button
                            onClick={() => setUseMultipleRates(false)}
                            style={{
                                flex: 1, padding: '8px', border: 'none', borderRadius: '6px',
                                fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer',
                                background: !useMultipleRates ? 'white' : 'transparent',
                                color: !useMultipleRates ? '#1e293b' : '#64748b',
                                boxShadow: !useMultipleRates ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
                            }}
                        >
                            Одна ставка
                        </button>
                        <button
                            onClick={() => {
                                setUseMultipleRates(true);
                                if (rates.length === 0) {
                                    setRates([
                                        { id: `rate-${Date.now()}-1`, name: 'Классы', rate: lessonRate || 700 },
                                    ]);
                                }
                            }}
                            style={{
                                flex: 1, padding: '8px', border: 'none', borderRadius: '6px',
                                fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer',
                                background: useMultipleRates ? 'white' : 'transparent',
                                color: useMultipleRates ? '#1e293b' : '#64748b',
                                boxShadow: useMultipleRates ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
                            }}
                        >
                            Несколько ставок
                        </button>
                    </div>

                    {!useMultipleRates ? (
                        /* Single rate */
                        <div>
                            <label className="label">Ставка за урок (руб.)</label>
                            <input
                                type="number"
                                className="input-field"
                                value={lessonRate}
                                onChange={e => setLessonRate(e.target.value)}
                                min="0"
                                step="10"
                                style={{ maxWidth: '200px' }}
                            />
                        </div>
                    ) : (
                        /* Multiple rates */
                        <div>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                                <label className="label" style={{ margin: 0 }}>Типы ставок</label>
                                <button
                                    className="btn btn-secondary"
                                    onClick={addRate}
                                    style={{ fontSize: '0.8rem', padding: '4px 12px' }}
                                >
                                    <Plus size={14} /> Добавить
                                </button>
                            </div>

                            {rates.length === 0 && (
                                <div style={{ textAlign: 'center', color: '#94a3b8', padding: '1rem', fontSize: '0.85rem' }}>
                                    Нажмите "Добавить" чтобы создать тип ставки
                                </div>
                            )}

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                {rates.map((r, idx) => (
                                    <div key={r.id || idx} style={{
                                        display: 'flex', gap: '8px', alignItems: 'center',
                                        padding: '10px 12px', background: '#f8fafc',
                                        borderRadius: '8px', border: '1px solid #e2e8f0'
                                    }}>
                                        <input
                                            type="text"
                                            className="input-field"
                                            placeholder="Название (Классы, Сонастройка...)"
                                            value={r.name}
                                            onChange={e => updateRate(idx, 'name', e.target.value)}
                                            style={{ flex: 1 }}
                                        />
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                            <input
                                                type="number"
                                                className="input-field"
                                                placeholder="0"
                                                value={r.rate}
                                                onChange={e => updateRate(idx, 'rate', Number(e.target.value))}
                                                min="0"
                                                step="10"
                                                style={{ width: '100px', textAlign: 'right' }}
                                            />
                                            <span style={{ fontSize: '0.8rem', color: '#64748b', whiteSpace: 'nowrap' }}>руб.</span>
                                        </div>
                                        <button
                                            className="icon-btn"
                                            onClick={() => removeRate(idx)}
                                            style={{ width: '30px', height: '30px', color: '#ef4444', flexShrink: 0 }}
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                ))}
                            </div>

                            {rates.length > 0 && (
                                <div style={{
                                    marginTop: '12px', padding: '8px 12px',
                                    background: '#fffbeb', borderRadius: '6px',
                                    fontSize: '0.78rem', color: '#92400e', lineHeight: 1.5
                                }}>
                                    Уроки автоматически распределяются по типам ставок:
                                    предметы с "Сонастройка" в названии привязываются к ставке "Сонастройка",
                                    остальные — к первой ставке (обычно "Классы").
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div style={{
                    display: 'flex', gap: '8px', padding: '1rem 1.5rem',
                    borderTop: '1px solid var(--color-border)', justifyContent: 'flex-end'
                }}>
                    <button className="btn btn-secondary" onClick={onClose}>Отмена</button>
                    <button className="btn btn-primary" onClick={handleSave}>
                        <Save size={16} /> Сохранить
                    </button>
                </div>
            </div>
        </div>
    );
};

// ====== Основная страница ======
const StatsPage = () => {
    const { teachers, updateTeacher, getTeacherSalaryInfo, getTeacherWorkload } = useSchedule();
    const [editingTeacher, setEditingTeacher] = useState(null);

    const [periodType, setPeriodType] = useState('month');
    const [startDate, setStartDate] = useState(() => {
        const now = new Date();
        return new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    });
    const [endDate, setEndDate] = useState(() => {
        const now = new Date();
        return new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
    });

    const setCurrentMonth = () => {
        const now = new Date();
        setStartDate(new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]);
        setEndDate(new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0]);
    };

    const setFullYear = () => {
        setStartDate('2025-09-01');
        setEndDate('2026-06-30');
    };

    let calcStart = startDate ? new Date(startDate) : null;
    let calcEnd = endDate ? new Date(endDate) : null;

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('ru-RU', {
            style: 'currency',
            currency: 'RUB',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(amount);
    };

    // Gather stats for all teachers
    const teacherStats = teachers.map(teacher => {
        const salaryInfo = getTeacherSalaryInfo(teacher.id, calcStart, calcEnd);
        const workload = getTeacherWorkload(teacher.id, calcStart, calcEnd);
        return { teacher, salaryInfo, workload };
    });

    // Sort: teachers with lessons first, then by name
    const sortedStats = [...teacherStats].sort((a, b) => {
        const aLessons = a.workload?.totalSlots || 0;
        const bLessons = b.workload?.totalSlots || 0;
        if (aLessons > 0 && bLessons === 0) return -1;
        if (aLessons === 0 && bLessons > 0) return 1;
        return a.teacher.name.localeCompare(b.teacher.name, 'ru');
    });

    const totalSalary = teacherStats.reduce((sum, ts) => sum + (ts.salaryInfo?.monthlySalary || 0), 0);
    const totalLessons = teacherStats.reduce((sum, ts) => sum + (ts.workload?.totalSlots || 0), 0);
    const teachersWithLessons = teacherStats.filter(ts => (ts.workload?.totalSlots || 0) > 0).length;
    const teachersWithRates = teacherStats.filter(ts => ts.salaryInfo?.hasMultipleRates);

    const handleSaveRate = (updatedTeacher) => {
        updateTeacher(updatedTeacher);
    };

    const getRateDisplay = (teacher) => {
        if (teacher.rates && teacher.rates.length > 0) {
            return teacher.rates.map(r => `${r.name}: ${r.rate}`).join(', ');
        }
        if (teacher.lessonRate) return `${teacher.lessonRate} руб.`;
        return null;
    };

    return (
        <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
                <BarChart3 size={28} color="var(--color-primary)" />
                <h1 style={{ margin: 0, fontSize: '1.8rem' }}>Статистика и зарплаты</h1>
            </div>

            {/* Выбор периода */}
            <div style={{
                marginBottom: '1.5rem',
                padding: '1rem',
                backgroundColor: '#f8fafc',
                borderRadius: '8px',
                border: '1px solid #e2e8f0'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                    <Calendar size={18} color="#64748b" />
                    <label style={{ fontSize: '0.875rem', fontWeight: '600', color: '#1e293b' }}>
                        Период расчета
                    </label>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem', flexWrap: 'wrap' }}>
                    <button
                        className={`btn ${periodType === 'month' ? 'btn-primary' : 'btn-secondary'}`}
                        onClick={() => { setPeriodType('month'); setCurrentMonth(); }}
                        style={{ fontSize: '0.85rem', padding: '0.4rem 0.75rem' }}
                    >
                        Текущий месяц
                    </button>
                    <button
                        className={`btn ${periodType === 'year' ? 'btn-primary' : 'btn-secondary'}`}
                        onClick={() => { setPeriodType('year'); setFullYear(); }}
                        style={{ fontSize: '0.85rem', padding: '0.4rem 0.75rem' }}
                    >
                        Учебный год
                    </button>
                    <button
                        className={`btn ${periodType === 'custom' ? 'btn-primary' : 'btn-secondary'}`}
                        onClick={() => setPeriodType('custom')}
                        style={{ fontSize: '0.85rem', padding: '0.4rem 0.75rem' }}
                    >
                        Произвольный
                    </button>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', maxWidth: '400px' }}>
                    <div>
                        <label style={{ fontSize: '0.75rem', color: '#64748b', display: 'block', marginBottom: '0.25rem' }}>С</label>
                        <input type="date" className="input-field" value={startDate} onChange={e => setStartDate(e.target.value)} />
                    </div>
                    <div>
                        <label style={{ fontSize: '0.75rem', color: '#64748b', display: 'block', marginBottom: '0.25rem' }}>По</label>
                        <input type="date" className="input-field" value={endDate} onChange={e => setEndDate(e.target.value)} />
                    </div>
                </div>
            </div>

            {/* Общая сводка */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: '1rem',
                marginBottom: '1.5rem'
            }}>
                <div style={{ padding: '1rem', backgroundColor: '#ecfdf5', borderRadius: '12px', border: '2px solid #6ee7b7' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                        <DollarSign size={18} color="#059669" />
                        <span style={{ fontSize: '0.8rem', color: '#065f46', fontWeight: '600' }}>Фонд ЗП</span>
                    </div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#065f46' }}>
                        {formatCurrency(totalSalary)}
                    </div>
                </div>
                <div style={{ padding: '1rem', backgroundColor: '#f0f9ff', borderRadius: '12px', border: '2px solid #bfdbfe' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                        <BookOpen size={18} color="#3b82f6" />
                        <span style={{ fontSize: '0.8rem', color: '#1e40af', fontWeight: '600' }}>Уроков</span>
                    </div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#1e40af' }}>
                        {totalLessons}
                    </div>
                </div>
                <div style={{ padding: '1rem', backgroundColor: '#f5f3ff', borderRadius: '12px', border: '2px solid #e9d5ff' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                        <BarChart3 size={18} color="#7c3aed" />
                        <span style={{ fontSize: '0.8rem', color: '#5b21b6', fontWeight: '600' }}>Работают</span>
                    </div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#5b21b6' }}>
                        {teachersWithLessons} / {teachers.length}
                    </div>
                </div>
            </div>

            {/* Разбивка по ставкам */}
            {teachersWithRates.length > 0 && (
                <CollapsibleSection
                    title="Разбивка по ставкам"
                    icon={<DollarSign size={20} color="#7c3aed" />}
                    badge={`${teachersWithRates.length} учит.`}
                    defaultOpen={true}
                >
                    {teachersWithRates.map(({ teacher, salaryInfo }) => (
                        <div key={teacher.id} style={{
                            marginBottom: '0.75rem',
                            padding: '1rem',
                            backgroundColor: '#fafbfc',
                            borderRadius: '8px',
                            border: '1px solid #f1f5f9'
                        }}>
                            <div style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                marginBottom: '0.75rem'
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <span style={{ fontWeight: '600', fontSize: '1rem' }}>{teacher.name}</span>
                                    <span style={{ fontSize: '0.8rem', color: '#64748b' }}>{teacher.subject}</span>
                                    <button
                                        className="icon-btn"
                                        style={{ width: '28px', height: '28px' }}
                                        onClick={() => setEditingTeacher(teacher)}
                                        title="Редактировать ставки"
                                    >
                                        <Pencil size={13} />
                                    </button>
                                </div>
                                <span style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#065f46' }}>
                                    {formatCurrency(salaryInfo.monthlySalary)}
                                </span>
                            </div>

                            <div style={{
                                display: 'grid',
                                gridTemplateColumns: '2fr 1fr 1fr 1fr',
                                gap: '0.5rem',
                                fontSize: '0.8rem'
                            }}>
                                <div style={{ fontWeight: '600', color: '#64748b', padding: '0.35rem', borderBottom: '2px solid #e2e8f0' }}>Тип ставки</div>
                                <div style={{ fontWeight: '600', color: '#64748b', padding: '0.35rem', borderBottom: '2px solid #e2e8f0', textAlign: 'center' }}>Ставка</div>
                                <div style={{ fontWeight: '600', color: '#64748b', padding: '0.35rem', borderBottom: '2px solid #e2e8f0', textAlign: 'center' }}>Уроков</div>
                                <div style={{ fontWeight: '600', color: '#64748b', padding: '0.35rem', borderBottom: '2px solid #e2e8f0', textAlign: 'right' }}>Сумма</div>

                                {salaryInfo.breakdown.map((item, idx) => (
                                    <React.Fragment key={idx}>
                                        <div style={{ padding: '0.35rem', borderBottom: '1px solid #f1f5f9' }}>
                                            <span style={{
                                                display: 'inline-block', width: '8px', height: '8px',
                                                borderRadius: '50%',
                                                backgroundColor: item.slotCount > 0 ? '#10b981' : '#d1d5db',
                                                marginRight: '0.5rem'
                                            }}></span>
                                            {item.rateName}
                                        </div>
                                        <div style={{ padding: '0.35rem', textAlign: 'center', color: '#5b21b6', fontWeight: '600', borderBottom: '1px solid #f1f5f9' }}>
                                            {formatCurrency(item.rateAmount)}
                                        </div>
                                        <div style={{ padding: '0.35rem', textAlign: 'center', color: item.slotCount > 0 ? '#1e40af' : '#94a3b8', fontWeight: '600', borderBottom: '1px solid #f1f5f9' }}>
                                            {item.slotCount}
                                        </div>
                                        <div style={{ padding: '0.35rem', textAlign: 'right', fontWeight: 'bold', color: item.subtotal > 0 ? '#166534' : '#94a3b8', borderBottom: '1px solid #f1f5f9' }}>
                                            {formatCurrency(item.subtotal)}
                                        </div>
                                    </React.Fragment>
                                ))}
                            </div>
                        </div>
                    ))}
                </CollapsibleSection>
            )}

            {/* Сводка по всем учителям */}
            <CollapsibleSection
                title="Сводка по всем учителям"
                icon={<BookOpen size={20} color="#3b82f6" />}
                badge={`${teachers.length} учит.`}
                defaultOpen={true}
            >
                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                        <thead>
                            <tr style={{ background: '#f8fafc' }}>
                                <th style={thStyle}>Учитель</th>
                                <th style={thStyle}>Предмет</th>
                                <th style={{ ...thStyle, textAlign: 'center' }}>Уроков</th>
                                <th style={{ ...thStyle, textAlign: 'center' }}>Ставка</th>
                                <th style={{ ...thStyle, textAlign: 'right' }}>Зарплата</th>
                                <th style={{ ...thStyle, textAlign: 'center', width: '50px' }}></th>
                            </tr>
                        </thead>
                        <tbody>
                            {sortedStats.map(({ teacher, salaryInfo, workload }, idx) => {
                                const lessons = workload?.totalSlots || 0;
                                const rateStr = getRateDisplay(teacher);
                                const salary = salaryInfo?.monthlySalary || 0;
                                const bg = idx % 2 === 0 ? '#fff' : '#fafbfc';

                                return (
                                    <tr key={teacher.id} style={{ background: bg }}>
                                        <td style={{ ...tdStyle, fontWeight: 500 }}>{teacher.name}</td>
                                        <td style={{ ...tdStyle, color: '#64748b', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                            {teacher.subject}
                                        </td>
                                        <td style={{ ...tdStyle, textAlign: 'center', fontWeight: 600, color: lessons > 0 ? '#1e40af' : '#cbd5e1' }}>
                                            {lessons}
                                        </td>
                                        <td style={{ ...tdStyle, textAlign: 'center' }}>
                                            {rateStr ? (
                                                <span style={{
                                                    fontSize: '0.75rem',
                                                    padding: '2px 8px',
                                                    background: '#f0fdf4',
                                                    borderRadius: '10px',
                                                    color: '#166534',
                                                    fontWeight: 600
                                                }}>
                                                    {rateStr}
                                                </span>
                                            ) : (
                                                <span style={{ color: '#cbd5e1' }}>-</span>
                                            )}
                                        </td>
                                        <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 'bold', color: salary > 0 ? '#065f46' : '#cbd5e1' }}>
                                            {salary > 0 ? formatCurrency(salary) : '-'}
                                        </td>
                                        <td style={{ ...tdStyle, textAlign: 'center' }}>
                                            <button
                                                className="icon-btn"
                                                style={{ width: '28px', height: '28px' }}
                                                onClick={() => setEditingTeacher(teacher)}
                                                title="Настроить ставку"
                                            >
                                                <Pencil size={13} />
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                        <tfoot>
                            <tr style={{ background: '#f0fdf4', borderTop: '2px solid #6ee7b7' }}>
                                <td style={{ ...tdStyle, fontWeight: 'bold' }}>Итого</td>
                                <td style={tdStyle}></td>
                                <td style={{ ...tdStyle, textAlign: 'center', fontWeight: 'bold', color: '#1e40af' }}>{totalLessons}</td>
                                <td style={tdStyle}></td>
                                <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 'bold', color: '#065f46' }}>{formatCurrency(totalSalary)}</td>
                                <td style={tdStyle}></td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
            </CollapsibleSection>

            {/* Rate edit modal */}
            <RateEditModal
                key={editingTeacher?.id || 'none'}
                teacher={editingTeacher}
                isOpen={!!editingTeacher}
                onClose={() => setEditingTeacher(null)}
                onSave={handleSaveRate}
            />
        </div>
    );
};

const thStyle = {
    padding: '0.5rem 0.6rem',
    fontWeight: 600,
    color: '#64748b',
    borderBottom: '2px solid #e2e8f0',
    textAlign: 'left',
    fontSize: '0.78rem'
};

const tdStyle = {
    padding: '0.45rem 0.6rem',
    borderBottom: '1px solid #f1f5f9'
};

export default StatsPage;
