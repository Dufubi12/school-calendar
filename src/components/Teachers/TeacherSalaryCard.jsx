import React from 'react';
import { useSchedule } from '../../context/ScheduleContext';

const TeacherSalaryCard = ({ teacherId }) => {
    const { getTeacherSalaryInfo, teachers } = useSchedule();

    const teacher = teachers.find(t => t.id === teacherId);
    const hasRates = teacher && teacher.rates && teacher.rates.length > 0;
    if (!teacher || (!teacher.lessonRate && !hasRates)) return null;

    const salaryInfo = getTeacherSalaryInfo(teacherId);
    if (!salaryInfo) return null;

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('ru-RU', {
            style: 'currency',
            currency: 'RUB',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(amount);
    };

    return (
        <div style={{
            padding: '1rem',
            backgroundColor: '#f8fafc',
            borderRadius: '8px',
            border: '1px solid var(--color-border)'
        }}>
            <div style={{ marginBottom: '0.75rem' }}>
                <div style={{
                    fontSize: '0.75rem',
                    color: 'var(--color-text-muted)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    marginBottom: '0.25rem'
                }}>
                    Общая зарплата
                </div>
                <div style={{
                    fontSize: '1.5rem',
                    fontWeight: 'bold',
                    color: '#10b981'
                }}>
                    {formatCurrency(salaryInfo.monthlySalary)}
                </div>
            </div>

            <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '0.75rem',
                paddingTop: '0.75rem',
                borderTop: '1px solid var(--color-border)'
            }}>
                <div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                        В неделю
                    </div>
                    <div style={{ fontSize: '1rem', fontWeight: '600' }}>
                        {formatCurrency(salaryInfo.weeklySalary)}
                    </div>
                </div>
                <div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                        Уроков/неделю
                    </div>
                    <div style={{ fontSize: '1rem', fontWeight: '600' }}>
                        {salaryInfo.weeklyLessons}
                    </div>
                </div>
            </div>

            <div style={{
                marginTop: '0.75rem',
                paddingTop: '0.75rem',
                borderTop: '1px solid var(--color-border)',
                fontSize: '0.75rem',
                color: 'var(--color-text-muted)'
            }}>
                {salaryInfo.hasMultipleRates ? (
                    <div>
                        {salaryInfo.rates.map(r => (
                            <span key={r.id} style={{ marginRight: '0.75rem' }}>
                                {r.name}: {formatCurrency(r.rate)}
                            </span>
                        ))}
                        • Всего уроков: {salaryInfo.totalLessons}
                    </div>
                ) : (
                    <>Ставка: {formatCurrency(salaryInfo.lessonRate)}/урок • Всего уроков: {salaryInfo.totalLessons}</>
                )}
            </div>
        </div>
    );
};

export default TeacherSalaryCard;
