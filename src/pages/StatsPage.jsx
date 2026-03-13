import React, { useState } from 'react';
import { useSchedule } from '../context/ScheduleContext';
import { BarChart3, DollarSign, BookOpen, Calendar } from 'lucide-react';

const StatsPage = () => {
    const { teachers, getTeacherSalaryInfo, getTeacherWorkload } = useSchedule();

    const [periodType, setPeriodType] = useState('all');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');

    // Set current month
    const setCurrentMonth = () => {
        const now = new Date();
        const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
        const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        setStartDate(firstDay.toISOString().split('T')[0]);
        setEndDate(lastDay.toISOString().split('T')[0]);
    };

    let calcStart = null;
    let calcEnd = null;
    if (periodType === 'month' || periodType === 'custom') {
        calcStart = startDate ? new Date(startDate) : null;
        calcEnd = endDate ? new Date(endDate) : null;
    }

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

    // Teachers with multiple rates
    const teachersWithRates = teacherStats.filter(ts => ts.salaryInfo?.hasMultipleRates);

    return (
        <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '2rem' }}>
                <BarChart3 size={28} color="#3b82f6" />
                <h1 style={{ margin: 0, fontSize: '1.8rem' }}>Статистика и зарплаты</h1>
            </div>

            {/* Выбор периода */}
            <div style={{
                marginBottom: '2rem',
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
                <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem' }}>
                    <button
                        className={`btn ${periodType === 'all' ? 'btn-primary' : 'btn-secondary'}`}
                        onClick={() => setPeriodType('all')}
                        style={{ fontSize: '0.875rem', padding: '0.5rem 1rem' }}
                    >
                        Все время
                    </button>
                    <button
                        className={`btn ${periodType === 'month' ? 'btn-primary' : 'btn-secondary'}`}
                        onClick={() => { setPeriodType('month'); setCurrentMonth(); }}
                        style={{ fontSize: '0.875rem', padding: '0.5rem 1rem' }}
                    >
                        Текущий месяц
                    </button>
                    <button
                        className={`btn ${periodType === 'custom' ? 'btn-primary' : 'btn-secondary'}`}
                        onClick={() => setPeriodType('custom')}
                        style={{ fontSize: '0.875rem', padding: '0.5rem 1rem' }}
                    >
                        Произвольный период
                    </button>
                </div>
                {(periodType === 'month' || periodType === 'custom') && (
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
                )}
            </div>

            {/* Общая сводка */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: '1rem',
                marginBottom: '2rem'
            }}>
                <div style={{
                    padding: '1.25rem',
                    backgroundColor: '#ecfdf5',
                    borderRadius: '12px',
                    border: '2px solid #6ee7b7'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                        <DollarSign size={20} color="#059669" />
                        <span style={{ fontSize: '0.875rem', color: '#065f46', fontWeight: '600' }}>Общий фонд ЗП</span>
                    </div>
                    <div style={{ fontSize: '1.75rem', fontWeight: 'bold', color: '#065f46' }}>
                        {formatCurrency(totalSalary)}
                    </div>
                </div>
                <div style={{
                    padding: '1.25rem',
                    backgroundColor: '#f0f9ff',
                    borderRadius: '12px',
                    border: '2px solid #bfdbfe'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                        <BookOpen size={20} color="#3b82f6" />
                        <span style={{ fontSize: '0.875rem', color: '#1e40af', fontWeight: '600' }}>Всего уроков</span>
                    </div>
                    <div style={{ fontSize: '1.75rem', fontWeight: 'bold', color: '#1e40af' }}>
                        {totalLessons}
                    </div>
                </div>
                <div style={{
                    padding: '1.25rem',
                    backgroundColor: '#f5f3ff',
                    borderRadius: '12px',
                    border: '2px solid #e9d5ff'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                        <BarChart3 size={20} color="#7c3aed" />
                        <span style={{ fontSize: '0.875rem', color: '#5b21b6', fontWeight: '600' }}>Учителей</span>
                    </div>
                    <div style={{ fontSize: '1.75rem', fontWeight: 'bold', color: '#5b21b6' }}>
                        {teachers.length}
                    </div>
                </div>
            </div>

            {/* Разбивка по ставкам — учителя с несколькими ставками */}
            {teachersWithRates.length > 0 && (
                <div style={{ marginBottom: '2rem' }}>
                    <h2 style={{ fontSize: '1.3rem', marginBottom: '1rem', color: '#1e293b' }}>
                        Разбивка по ставкам
                    </h2>
                    {teachersWithRates.map(({ teacher, salaryInfo }) => (
                        <div key={teacher.id} style={{
                            marginBottom: '1rem',
                            padding: '1.25rem',
                            backgroundColor: '#fff',
                            borderRadius: '12px',
                            border: '1px solid #e2e8f0',
                            boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
                        }}>
                            <div style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                marginBottom: '1rem'
                            }}>
                                <div>
                                    <h3 style={{ margin: 0, fontSize: '1.1rem' }}>{teacher.name}</h3>
                                    <span style={{ fontSize: '0.85rem', color: '#64748b' }}>{teacher.subject}</span>
                                </div>
                                <div style={{
                                    fontSize: '1.5rem',
                                    fontWeight: 'bold',
                                    color: '#065f46'
                                }}>
                                    {formatCurrency(salaryInfo.monthlySalary)}
                                </div>
                            </div>

                            {/* Ставки — таблица */}
                            <div style={{
                                display: 'grid',
                                gridTemplateColumns: '2fr 1fr 1fr 1fr',
                                gap: '0.5rem',
                                fontSize: '0.85rem'
                            }}>
                                {/* Заголовок */}
                                <div style={{ fontWeight: '600', color: '#64748b', padding: '0.5rem', borderBottom: '2px solid #e2e8f0' }}>
                                    Тип ставки
                                </div>
                                <div style={{ fontWeight: '600', color: '#64748b', padding: '0.5rem', borderBottom: '2px solid #e2e8f0', textAlign: 'center' }}>
                                    Ставка
                                </div>
                                <div style={{ fontWeight: '600', color: '#64748b', padding: '0.5rem', borderBottom: '2px solid #e2e8f0', textAlign: 'center' }}>
                                    Уроков
                                </div>
                                <div style={{ fontWeight: '600', color: '#64748b', padding: '0.5rem', borderBottom: '2px solid #e2e8f0', textAlign: 'right' }}>
                                    Сумма
                                </div>

                                {/* Строки */}
                                {salaryInfo.breakdown.map((item, idx) => (
                                    <React.Fragment key={idx}>
                                        <div style={{
                                            padding: '0.5rem',
                                            fontWeight: '500',
                                            color: '#1e293b',
                                            borderBottom: '1px solid #f1f5f9'
                                        }}>
                                            <span style={{
                                                display: 'inline-block',
                                                width: '8px',
                                                height: '8px',
                                                borderRadius: '50%',
                                                backgroundColor: item.slotCount > 0 ? '#10b981' : '#d1d5db',
                                                marginRight: '0.5rem'
                                            }}></span>
                                            {item.rateName}
                                        </div>
                                        <div style={{
                                            padding: '0.5rem',
                                            textAlign: 'center',
                                            color: '#5b21b6',
                                            fontWeight: '600',
                                            borderBottom: '1px solid #f1f5f9'
                                        }}>
                                            {formatCurrency(item.rateAmount)}
                                        </div>
                                        <div style={{
                                            padding: '0.5rem',
                                            textAlign: 'center',
                                            color: item.slotCount > 0 ? '#1e40af' : '#94a3b8',
                                            fontWeight: '600',
                                            borderBottom: '1px solid #f1f5f9'
                                        }}>
                                            {item.slotCount}
                                        </div>
                                        <div style={{
                                            padding: '0.5rem',
                                            textAlign: 'right',
                                            fontWeight: 'bold',
                                            color: item.subtotal > 0 ? '#166534' : '#94a3b8',
                                            borderBottom: '1px solid #f1f5f9'
                                        }}>
                                            {formatCurrency(item.subtotal)}
                                        </div>
                                    </React.Fragment>
                                ))}

                                {/* Итого */}
                                <div style={{ padding: '0.75rem 0.5rem', fontWeight: 'bold', color: '#1e293b', borderTop: '2px solid #e2e8f0' }}>
                                    Итого
                                </div>
                                <div style={{ padding: '0.75rem 0.5rem', borderTop: '2px solid #e2e8f0' }}></div>
                                <div style={{ padding: '0.75rem 0.5rem', textAlign: 'center', fontWeight: 'bold', color: '#1e40af', borderTop: '2px solid #e2e8f0' }}>
                                    {salaryInfo.totalLessons}
                                </div>
                                <div style={{ padding: '0.75rem 0.5rem', textAlign: 'right', fontWeight: 'bold', color: '#065f46', fontSize: '1rem', borderTop: '2px solid #e2e8f0' }}>
                                    {formatCurrency(salaryInfo.monthlySalary)}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Сводная таблица по всем учителям */}
            <div>
                <h2 style={{ fontSize: '1.3rem', marginBottom: '1rem', color: '#1e293b' }}>
                    Сводка по всем учителям
                </h2>
                <div style={{
                    backgroundColor: '#fff',
                    borderRadius: '12px',
                    border: '1px solid #e2e8f0',
                    overflow: 'hidden'
                }}>
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: '2fr 1.5fr 1fr 1fr 1.2fr',
                        gap: '0',
                        fontSize: '0.85rem'
                    }}>
                        {/* Header */}
                        <div style={{ padding: '0.75rem 1rem', fontWeight: '600', color: '#64748b', backgroundColor: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>Учитель</div>
                        <div style={{ padding: '0.75rem 1rem', fontWeight: '600', color: '#64748b', backgroundColor: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>Предмет</div>
                        <div style={{ padding: '0.75rem 1rem', fontWeight: '600', color: '#64748b', backgroundColor: '#f8fafc', borderBottom: '2px solid #e2e8f0', textAlign: 'center' }}>Уроков</div>
                        <div style={{ padding: '0.75rem 1rem', fontWeight: '600', color: '#64748b', backgroundColor: '#f8fafc', borderBottom: '2px solid #e2e8f0', textAlign: 'center' }}>Ставка</div>
                        <div style={{ padding: '0.75rem 1rem', fontWeight: '600', color: '#64748b', backgroundColor: '#f8fafc', borderBottom: '2px solid #e2e8f0', textAlign: 'right' }}>Зарплата</div>

                        {/* Rows */}
                        {teacherStats.map(({ teacher, salaryInfo, workload }, idx) => (
                            <React.Fragment key={teacher.id}>
                                <div style={{ padding: '0.75rem 1rem', fontWeight: '500', borderBottom: '1px solid #f1f5f9', backgroundColor: idx % 2 === 0 ? '#fff' : '#fafbfc' }}>
                                    {teacher.name}
                                </div>
                                <div style={{ padding: '0.75rem 1rem', color: '#64748b', borderBottom: '1px solid #f1f5f9', backgroundColor: idx % 2 === 0 ? '#fff' : '#fafbfc' }}>
                                    {teacher.subject}
                                </div>
                                <div style={{ padding: '0.75rem 1rem', textAlign: 'center', fontWeight: '600', color: '#1e40af', borderBottom: '1px solid #f1f5f9', backgroundColor: idx % 2 === 0 ? '#fff' : '#fafbfc' }}>
                                    {workload?.totalSlots || 0}
                                </div>
                                <div style={{ padding: '0.75rem 1rem', textAlign: 'center', fontSize: '0.8rem', borderBottom: '1px solid #f1f5f9', backgroundColor: idx % 2 === 0 ? '#fff' : '#fafbfc' }}>
                                    {salaryInfo?.hasMultipleRates ? (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                            {teacher.rates.map(r => (
                                                <span key={r.id} style={{ color: '#5b21b6' }}>{r.name}: {r.rate}₽</span>
                                            ))}
                                        </div>
                                    ) : (
                                        <span>{teacher.lessonRate ? formatCurrency(teacher.lessonRate) : '—'}</span>
                                    )}
                                </div>
                                <div style={{ padding: '0.75rem 1rem', textAlign: 'right', fontWeight: 'bold', color: '#065f46', borderBottom: '1px solid #f1f5f9', backgroundColor: idx % 2 === 0 ? '#fff' : '#fafbfc' }}>
                                    {salaryInfo ? formatCurrency(salaryInfo.monthlySalary) : '—'}
                                </div>
                            </React.Fragment>
                        ))}

                        {/* Footer total */}
                        <div style={{ padding: '0.75rem 1rem', fontWeight: 'bold', backgroundColor: '#f0fdf4', borderTop: '2px solid #6ee7b7' }}>
                            Итого
                        </div>
                        <div style={{ padding: '0.75rem 1rem', backgroundColor: '#f0fdf4', borderTop: '2px solid #6ee7b7' }}></div>
                        <div style={{ padding: '0.75rem 1rem', textAlign: 'center', fontWeight: 'bold', color: '#1e40af', backgroundColor: '#f0fdf4', borderTop: '2px solid #6ee7b7' }}>
                            {totalLessons}
                        </div>
                        <div style={{ padding: '0.75rem 1rem', backgroundColor: '#f0fdf4', borderTop: '2px solid #6ee7b7' }}></div>
                        <div style={{ padding: '0.75rem 1rem', textAlign: 'right', fontWeight: 'bold', fontSize: '1rem', color: '#065f46', backgroundColor: '#f0fdf4', borderTop: '2px solid #6ee7b7' }}>
                            {formatCurrency(totalSalary)}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default StatsPage;
