import React, { useState } from 'react';
import { useSchedule } from '../context/ScheduleContext';
import { BarChart3, DollarSign, BookOpen, Calendar, ChevronDown, ChevronRight } from 'lucide-react';

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

const StatsPage = () => {
    const { teachers, getTeacherSalaryInfo, getTeacherWorkload } = useSchedule();

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

    const totalSalary = teacherStats.reduce((sum, ts) => sum + (ts.salaryInfo?.monthlySalary || 0), 0);
    const totalLessons = teacherStats.reduce((sum, ts) => sum + (ts.workload?.totalSlots || 0), 0);
    const teachersWithLessons = teacherStats.filter(ts => (ts.workload?.totalSlots || 0) > 0).length;

    // Teachers with multiple rates
    const teachersWithRates = teacherStats.filter(ts => ts.salaryInfo?.hasMultipleRates);

    return (
        <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
                <BarChart3 size={28} color="#3b82f6" />
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

            {/* Общая сводка (карточки) */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: '1rem',
                marginBottom: '1.5rem'
            }}>
                <div style={{
                    padding: '1rem',
                    backgroundColor: '#ecfdf5',
                    borderRadius: '12px',
                    border: '2px solid #6ee7b7'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                        <DollarSign size={18} color="#059669" />
                        <span style={{ fontSize: '0.8rem', color: '#065f46', fontWeight: '600' }}>Фонд ЗП</span>
                    </div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#065f46' }}>
                        {formatCurrency(totalSalary)}
                    </div>
                </div>
                <div style={{
                    padding: '1rem',
                    backgroundColor: '#f0f9ff',
                    borderRadius: '12px',
                    border: '2px solid #bfdbfe'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                        <BookOpen size={18} color="#3b82f6" />
                        <span style={{ fontSize: '0.8rem', color: '#1e40af', fontWeight: '600' }}>Уроков</span>
                    </div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#1e40af' }}>
                        {totalLessons}
                    </div>
                </div>
                <div style={{
                    padding: '1rem',
                    backgroundColor: '#f5f3ff',
                    borderRadius: '12px',
                    border: '2px solid #e9d5ff'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                        <BarChart3 size={18} color="#7c3aed" />
                        <span style={{ fontSize: '0.8rem', color: '#5b21b6', fontWeight: '600' }}>Работают</span>
                    </div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#5b21b6' }}>
                        {teachersWithLessons} / {teachers.length}
                    </div>
                </div>
            </div>

            {/* Разбивка по ставкам — раскрывающаяся секция */}
            {teachersWithRates.length > 0 && (
                <CollapsibleSection
                    title="Разбивка по ставкам"
                    icon={<DollarSign size={20} color="#7c3aed" />}
                    badge={`${teachersWithRates.length} учит.`}
                    defaultOpen={false}
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
                                <div>
                                    <span style={{ fontWeight: '600', fontSize: '1rem' }}>{teacher.name}</span>
                                    <span style={{ fontSize: '0.8rem', color: '#64748b', marginLeft: '0.5rem' }}>{teacher.subject}</span>
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

            {/* Сводка по всем учителям — раскрывающаяся секция */}
            <CollapsibleSection
                title="Сводка по всем учителям"
                icon={<BookOpen size={20} color="#3b82f6" />}
                badge={`${teachers.length} учит.`}
                defaultOpen={false}
            >
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: '2fr 1.5fr 1fr 1fr 1.2fr',
                    gap: '0',
                    fontSize: '0.8rem'
                }}>
                    <div style={{ padding: '0.5rem', fontWeight: '600', color: '#64748b', backgroundColor: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>Учитель</div>
                    <div style={{ padding: '0.5rem', fontWeight: '600', color: '#64748b', backgroundColor: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>Предмет</div>
                    <div style={{ padding: '0.5rem', fontWeight: '600', color: '#64748b', backgroundColor: '#f8fafc', borderBottom: '2px solid #e2e8f0', textAlign: 'center' }}>Уроков</div>
                    <div style={{ padding: '0.5rem', fontWeight: '600', color: '#64748b', backgroundColor: '#f8fafc', borderBottom: '2px solid #e2e8f0', textAlign: 'center' }}>Ставка</div>
                    <div style={{ padding: '0.5rem', fontWeight: '600', color: '#64748b', backgroundColor: '#f8fafc', borderBottom: '2px solid #e2e8f0', textAlign: 'right' }}>Зарплата</div>

                    {teacherStats.map(({ teacher, salaryInfo, workload }, idx) => (
                        <React.Fragment key={teacher.id}>
                            <div style={{ padding: '0.5rem', fontWeight: '500', borderBottom: '1px solid #f1f5f9', backgroundColor: idx % 2 === 0 ? '#fff' : '#fafbfc' }}>
                                {teacher.name}
                            </div>
                            <div style={{ padding: '0.5rem', color: '#64748b', borderBottom: '1px solid #f1f5f9', backgroundColor: idx % 2 === 0 ? '#fff' : '#fafbfc' }}>
                                {teacher.subject}
                            </div>
                            <div style={{ padding: '0.5rem', textAlign: 'center', fontWeight: '600', color: '#1e40af', borderBottom: '1px solid #f1f5f9', backgroundColor: idx % 2 === 0 ? '#fff' : '#fafbfc' }}>
                                {workload?.totalSlots || 0}
                            </div>
                            <div style={{ padding: '0.5rem', textAlign: 'center', fontSize: '0.75rem', borderBottom: '1px solid #f1f5f9', backgroundColor: idx % 2 === 0 ? '#fff' : '#fafbfc' }}>
                                {salaryInfo?.hasMultipleRates ? (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
                                        {teacher.rates.map(r => (
                                            <span key={r.id} style={{ color: '#5b21b6' }}>{r.name}: {r.rate}</span>
                                        ))}
                                    </div>
                                ) : (
                                    <span>{teacher.lessonRate ? `${teacher.lessonRate}` : '—'}</span>
                                )}
                            </div>
                            <div style={{ padding: '0.5rem', textAlign: 'right', fontWeight: 'bold', color: '#065f46', borderBottom: '1px solid #f1f5f9', backgroundColor: idx % 2 === 0 ? '#fff' : '#fafbfc' }}>
                                {salaryInfo ? formatCurrency(salaryInfo.monthlySalary) : '—'}
                            </div>
                        </React.Fragment>
                    ))}

                    {/* Footer total */}
                    <div style={{ padding: '0.5rem', fontWeight: 'bold', backgroundColor: '#f0fdf4', borderTop: '2px solid #6ee7b7' }}>Итого</div>
                    <div style={{ padding: '0.5rem', backgroundColor: '#f0fdf4', borderTop: '2px solid #6ee7b7' }}></div>
                    <div style={{ padding: '0.5rem', textAlign: 'center', fontWeight: 'bold', color: '#1e40af', backgroundColor: '#f0fdf4', borderTop: '2px solid #6ee7b7' }}>{totalLessons}</div>
                    <div style={{ padding: '0.5rem', backgroundColor: '#f0fdf4', borderTop: '2px solid #6ee7b7' }}></div>
                    <div style={{ padding: '0.5rem', textAlign: 'right', fontWeight: 'bold', color: '#065f46', backgroundColor: '#f0fdf4', borderTop: '2px solid #6ee7b7' }}>{formatCurrency(totalSalary)}</div>
                </div>
            </CollapsibleSection>
        </div>
    );
};

export default StatsPage;
