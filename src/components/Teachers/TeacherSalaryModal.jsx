import React, { useState, useEffect } from 'react';
import { X, DollarSign, Clock, BookOpen, TrendingUp, Edit, Calendar } from 'lucide-react';
import { useSchedule } from '../../context/ScheduleContext';

const TeacherSalaryModal = ({ teacher, isOpen, onClose, onEdit }) => {
    const { getTeacherSalaryInfo, getTeacherWorkload } = useSchedule();

    // Period selection state
    const [periodType, setPeriodType] = useState('all'); // 'all', 'month', 'custom'
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');

    // Set current month as default when switching to 'month' mode
    useEffect(() => {
        if (periodType === 'month' && !startDate) {
            const now = new Date();
            const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
            const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
            setStartDate(firstDay.toISOString().split('T')[0]);
            setEndDate(lastDay.toISOString().split('T')[0]);
        }
    }, [periodType]);

    if (!isOpen || !teacher) return null;

    // Calculate dates based on period type
    let calculationStartDate = null;
    let calculationEndDate = null;

    if (periodType === 'month' || periodType === 'custom') {
        calculationStartDate = startDate ? new Date(startDate) : null;
        calculationEndDate = endDate ? new Date(endDate) : null;
    }

    const hasRates = teacher.rates && teacher.rates.length > 0;
    const salaryInfo = (teacher.lessonRate || hasRates)
        ? getTeacherSalaryInfo(teacher.id, calculationStartDate, calculationEndDate)
        : null;
    const workload = getTeacherWorkload(teacher.id, calculationStartDate, calculationEndDate);

    // Расчет общих часов (предполагаем 45 минут на урок)
    const totalHours = workload.totalSlots * 0.75; // 45 мин = 0.75 часов

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('ru-RU', {
            style: 'currency',
            currency: 'RUB',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(amount);
    };

    const daysOfWeek = [
        { key: 'monday', label: 'Понедельник', short: 'Пн' },
        { key: 'tuesday', label: 'Вторник', short: 'Вт' },
        { key: 'wednesday', label: 'Среда', short: 'Ср' },
        { key: 'thursday', label: 'Четверг', short: 'Чт' },
        { key: 'friday', label: 'Пятница', short: 'Пт' },
        { key: 'saturday', label: 'Суббота', short: 'Сб' },
        { key: 'sunday', label: 'Воскресенье', short: 'Вс' }
    ];

    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backdropFilter: 'blur(4px)'
        }}>
            <div className="card" style={{
                width: '700px',
                maxWidth: '95%',
                maxHeight: '90vh',
                overflowY: 'auto'
            }}>
                {/* Заголовок */}
                <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '1.5rem',
                    paddingBottom: '1rem',
                    borderBottom: '2px solid var(--color-border)'
                }}>
                    <div>
                        <h2 style={{ margin: 0, marginBottom: '0.25rem' }}>{teacher.name}</h2>
                        <p style={{ margin: 0, color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>
                            {teacher.subject}
                        </p>
                    </div>
                    <button onClick={onClose} className="icon-btn">
                        <X size={24} />
                    </button>
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
                            onClick={() => setPeriodType('month')}
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
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                            <div>
                                <label style={{ fontSize: '0.75rem', color: '#64748b', display: 'block', marginBottom: '0.25rem' }}>
                                    С
                                </label>
                                <input
                                    type="date"
                                    className="input-field"
                                    value={startDate}
                                    onChange={(e) => setStartDate(e.target.value)}
                                    style={{ fontSize: '0.875rem' }}
                                />
                            </div>
                            <div>
                                <label style={{ fontSize: '0.75rem', color: '#64748b', display: 'block', marginBottom: '0.25rem' }}>
                                    По
                                </label>
                                <input
                                    type="date"
                                    className="input-field"
                                    value={endDate}
                                    onChange={(e) => setEndDate(e.target.value)}
                                    style={{ fontSize: '0.875rem' }}
                                />
                            </div>
                        </div>
                    )}

                    {periodType !== 'all' && startDate && endDate && (
                        <div style={{
                            marginTop: '0.75rem',
                            padding: '0.5rem',
                            backgroundColor: '#e0f2fe',
                            borderRadius: '4px',
                            fontSize: '0.75rem',
                            color: '#0369a1',
                            textAlign: 'center'
                        }}>
                            Расчет за период: {new Date(startDate).toLocaleDateString('ru-RU')} — {new Date(endDate).toLocaleDateString('ru-RU')}
                        </div>
                    )}
                </div>

                {/* Основная информация */}
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(2, 1fr)',
                    gap: '1rem',
                    marginBottom: '1.5rem'
                }}>
                    {/* Количество уроков */}
                    <div style={{
                        padding: '1.25rem',
                        backgroundColor: '#f0f9ff',
                        borderRadius: '12px',
                        border: '2px solid #bfdbfe'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                            <BookOpen size={20} color="#3b82f6" />
                            <span style={{ fontSize: '0.875rem', color: '#1e40af', fontWeight: '600' }}>
                                Количество уроков
                            </span>
                        </div>
                        <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#1e40af' }}>
                            {workload.totalSlots}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.25rem' }}>
                            В среднем {workload.averagePerDay.toFixed(1)} урока/день
                        </div>
                    </div>

                    {/* Общее количество часов */}
                    <div style={{
                        padding: '1.25rem',
                        backgroundColor: '#fef3c7',
                        borderRadius: '12px',
                        border: '2px solid #fde68a'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                            <Clock size={20} color="#d97706" />
                            <span style={{ fontSize: '0.875rem', color: '#92400e', fontWeight: '600' }}>
                                Общее время
                            </span>
                        </div>
                        <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#92400e' }}>
                            {totalHours.toFixed(1)} ч
                        </div>
                        <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.25rem' }}>
                            45 минут на урок
                        </div>
                    </div>
                </div>

                {/* Информация о зарплате */}
                {salaryInfo ? (
                    <>
                        {/* Для множественных ставок — разбивка */}
                        {salaryInfo.hasMultipleRates ? (
                            <>
                                {/* Общая сумма */}
                                <div style={{
                                    padding: '1.25rem',
                                    backgroundColor: '#ecfdf5',
                                    borderRadius: '12px',
                                    border: '2px solid #6ee7b7',
                                    marginBottom: '1rem'
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                                        <DollarSign size={20} color="#059669" />
                                        <span style={{ fontSize: '0.875rem', color: '#065f46', fontWeight: '600' }}>
                                            Общая сумма
                                        </span>
                                    </div>
                                    <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#065f46' }}>
                                        {formatCurrency(salaryInfo.monthlySalary)}
                                    </div>
                                    <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.25rem' }}>
                                        {formatCurrency(salaryInfo.weeklySalary)} в неделю
                                    </div>
                                </div>

                                {/* Разбивка по ставкам */}
                                <div style={{ marginBottom: '1.5rem' }}>
                                    <h3 style={{ fontSize: '1rem', marginBottom: '0.75rem', color: '#1e293b' }}>
                                        Разбивка по ставкам
                                    </h3>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                        {salaryInfo.breakdown.map((item, idx) => (
                                            <div key={idx} style={{
                                                display: 'flex',
                                                justifyContent: 'space-between',
                                                alignItems: 'center',
                                                padding: '0.75rem 1rem',
                                                backgroundColor: item.slotCount > 0 ? '#f0fdf4' : '#f8fafc',
                                                borderRadius: '8px',
                                                border: item.slotCount > 0 ? '1px solid #bbf7d0' : '1px solid #e2e8f0'
                                            }}>
                                                <div>
                                                    <div style={{ fontWeight: '600', fontSize: '0.9rem', color: '#1e293b' }}>
                                                        {item.rateName}
                                                    </div>
                                                    <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                                                        {item.slotCount} уроков × {formatCurrency(item.rateAmount)}
                                                    </div>
                                                </div>
                                                <div style={{
                                                    fontWeight: 'bold',
                                                    fontSize: '1.1rem',
                                                    color: item.slotCount > 0 ? '#166534' : '#94a3b8'
                                                }}>
                                                    {formatCurrency(item.subtotal)}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Формула расчета */}
                                <div style={{
                                    padding: '1rem',
                                    backgroundColor: '#f1f5f9',
                                    borderRadius: '8px',
                                    marginBottom: '1.5rem',
                                    fontSize: '0.875rem',
                                    color: '#475569'
                                }}>
                                    <strong>Расчет:</strong>{' '}
                                    {salaryInfo.breakdown
                                        .filter(b => b.slotCount > 0)
                                        .map(b => `${b.slotCount} × ${formatCurrency(b.rateAmount)} (${b.rateName})`)
                                        .join(' + ')
                                    } = {formatCurrency(salaryInfo.monthlySalary)}
                                    {periodType === 'all' && (
                                        <div style={{ marginTop: '0.5rem', fontSize: '0.75rem', color: '#94a3b8' }}>
                                            (за все время работы)
                                        </div>
                                    )}
                                </div>

                                {/* Список ставок */}
                                <div style={{
                                    padding: '0.75rem 1rem',
                                    backgroundColor: '#f5f3ff',
                                    borderRadius: '8px',
                                    marginBottom: '1.5rem'
                                }}>
                                    <div style={{ fontSize: '0.75rem', color: '#5b21b6', fontWeight: '600', marginBottom: '0.5rem' }}>
                                        Ставки учителя:
                                    </div>
                                    <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                                        {salaryInfo.rates.map(r => (
                                            <span key={r.id} style={{
                                                fontSize: '0.85rem',
                                                backgroundColor: '#ede9fe',
                                                color: '#5b21b6',
                                                padding: '4px 10px',
                                                borderRadius: '12px',
                                                fontWeight: '500'
                                            }}>
                                                {r.name}: {formatCurrency(r.rate)}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            </>
                        ) : (
                            <>
                                {/* Ставка и общая сумма (единая ставка) */}
                                <div style={{
                                    display: 'grid',
                                    gridTemplateColumns: 'repeat(2, 1fr)',
                                    gap: '1rem',
                                    marginBottom: '1.5rem'
                                }}>
                                    <div style={{
                                        padding: '1.25rem',
                                        backgroundColor: '#f5f3ff',
                                        borderRadius: '12px',
                                        border: '2px solid #e9d5ff'
                                    }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                                            <TrendingUp size={20} color="#7c3aed" />
                                            <span style={{ fontSize: '0.875rem', color: '#5b21b6', fontWeight: '600' }}>
                                                Ставка за урок
                                            </span>
                                        </div>
                                        <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#5b21b6' }}>
                                            {formatCurrency(salaryInfo.lessonRate)}
                                        </div>
                                    </div>

                                    <div style={{
                                        padding: '1.25rem',
                                        backgroundColor: '#ecfdf5',
                                        borderRadius: '12px',
                                        border: '2px solid #6ee7b7'
                                    }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                                            <DollarSign size={20} color="#059669" />
                                            <span style={{ fontSize: '0.875rem', color: '#065f46', fontWeight: '600' }}>
                                                Общая сумма
                                            </span>
                                        </div>
                                        <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#065f46' }}>
                                            {formatCurrency(salaryInfo.monthlySalary)}
                                        </div>
                                        <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.25rem' }}>
                                            {formatCurrency(salaryInfo.weeklySalary)} в неделю
                                        </div>
                                    </div>
                                </div>

                                {/* Формула расчета */}
                                <div style={{
                                    padding: '1rem',
                                    backgroundColor: '#f1f5f9',
                                    borderRadius: '8px',
                                    marginBottom: '1.5rem',
                                    fontSize: '0.875rem',
                                    color: '#475569'
                                }}>
                                    <strong>Расчет:</strong> {workload.totalSlots} уроков × {formatCurrency(salaryInfo.lessonRate)} = {formatCurrency(salaryInfo.monthlySalary)}
                                    {periodType === 'all' && (
                                        <div style={{ marginTop: '0.5rem', fontSize: '0.75rem', color: '#94a3b8' }}>
                                            (за все время работы)
                                        </div>
                                    )}
                                </div>
                            </>
                        )}
                    </>
                ) : (
                    <div style={{
                        padding: '1.5rem',
                        backgroundColor: '#fef2f2',
                        borderRadius: '12px',
                        border: '2px solid #fecaca',
                        marginBottom: '1.5rem',
                        textAlign: 'center'
                    }}>
                        <p style={{ margin: 0, color: '#991b1b', fontWeight: '600' }}>
                            Ставка за урок не установлена
                        </p>
                        <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.875rem', color: '#64748b' }}>
                            Отредактируйте учителя и укажите ставку для расчета зарплаты
                        </p>
                    </div>
                )}

                {/* Распределение по дням недели */}
                <div style={{ marginBottom: '1.5rem' }}>
                    <h3 style={{ fontSize: '1rem', marginBottom: '1rem', color: '#1e293b' }}>
                        Распределение уроков по дням
                    </h3>
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(7, 1fr)',
                        gap: '0.5rem'
                    }}>
                        {daysOfWeek.map(day => {
                            const count = workload.slotsByDay[day.key] || 0;
                            const hasLessons = count > 0;
                            return (
                                <div
                                    key={day.key}
                                    style={{
                                        padding: '0.75rem 0.5rem',
                                        backgroundColor: hasLessons ? '#dbeafe' : '#f1f5f9',
                                        borderRadius: '8px',
                                        textAlign: 'center',
                                        border: hasLessons ? '2px solid #3b82f6' : '1px solid #e2e8f0'
                                    }}
                                >
                                    <div style={{
                                        fontSize: '0.75rem',
                                        color: '#64748b',
                                        marginBottom: '0.25rem'
                                    }}>
                                        {day.short}
                                    </div>
                                    <div style={{
                                        fontSize: '1.25rem',
                                        fontWeight: 'bold',
                                        color: hasLessons ? '#1e40af' : '#94a3b8'
                                    }}>
                                        {count}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Футер */}
                <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    paddingTop: '1rem',
                    borderTop: '1px solid var(--color-border)'
                }}>
                    {onEdit && (
                        <button
                            className="btn btn-secondary"
                            onClick={() => {
                                onEdit(teacher);
                                onClose();
                            }}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem'
                            }}
                        >
                            <Edit size={18} />
                            Редактировать учителя
                        </button>
                    )}
                    <button className="btn btn-primary" onClick={onClose}>
                        Закрыть
                    </button>
                </div>
            </div>
        </div>
    );
};

export default TeacherSalaryModal;
