import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { formatMonthYear, formatWeekRange } from '../../utils/dateUtils';

const navBtn = {
    padding: '8px 10px',
    cursor: 'pointer',
    background: 'var(--color-bg-card)',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius)',
    display: 'flex',
    alignItems: 'center',
    color: 'var(--color-text-main)',
    transition: 'all var(--duration-fast) var(--ease-out)',
    boxShadow: 'var(--shadow-xs)'
};

const segmentBtn = (active) => ({
    padding: '6px 12px',
    cursor: 'pointer',
    background: active ? 'var(--color-primary)' : 'var(--color-bg-card)',
    color: active ? '#fff' : 'var(--color-text-main)',
    border: '1px solid',
    borderColor: active ? 'var(--color-primary)' : 'var(--color-border)',
    borderRadius: 'var(--radius)',
    fontSize: '0.82rem',
    fontWeight: 600,
    transition: 'all var(--duration-fast) var(--ease-out)'
});

const CalendarHeader = ({
    currentDate,
    onPrev,
    onNext,
    onToday,
    viewKind = 'month',
    onViewKindChange,
}) => {
    const title = viewKind === 'week' ? formatWeekRange(currentDate) : formatMonthYear(currentDate);
    return (
        <div className="calendar-header" style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '1.25rem',
            padding: '0.25rem 0.5rem',
            gap: '12px',
            flexWrap: 'wrap'
        }}>
            <h2 style={{
                margin: 0,
                fontSize: viewKind === 'week' ? '1.4rem' : '1.75rem',
                fontWeight: 700,
                letterSpacing: '-0.02em',
                color: 'var(--color-primary-deep)',
                textTransform: 'capitalize'
            }}>
                {title}
            </h2>

            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                {/* View kind switch */}
                {onViewKindChange && (
                    <div style={{ display: 'inline-flex', gap: '2px', marginRight: '4px' }}>
                        <button
                            onClick={() => onViewKindChange('month')}
                            style={segmentBtn(viewKind === 'month')}
                            title="Месяц"
                        >
                            Месяц
                        </button>
                        <button
                            onClick={() => onViewKindChange('week')}
                            style={segmentBtn(viewKind === 'week')}
                            title="Неделя"
                        >
                            Неделя
                        </button>
                    </div>
                )}

                {onToday && (
                    <button
                        onClick={onToday}
                        style={{ ...navBtn, padding: '6px 12px', fontSize: '0.82rem', fontWeight: 600 }}
                        title="Сегодня"
                    >
                        Сегодня
                    </button>
                )}
                <button
                    onClick={onPrev}
                    style={navBtn}
                    title={viewKind === 'week' ? 'Предыдущая неделя' : 'Предыдущий месяц'}
                    onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = 'var(--color-primary)';
                        e.currentTarget.style.color = 'var(--color-primary)';
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = 'var(--color-border)';
                        e.currentTarget.style.color = 'var(--color-text-main)';
                    }}
                >
                    <ChevronLeft size={18} />
                </button>
                <button
                    onClick={onNext}
                    style={navBtn}
                    title={viewKind === 'week' ? 'Следующая неделя' : 'Следующий месяц'}
                    onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = 'var(--color-primary)';
                        e.currentTarget.style.color = 'var(--color-primary)';
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = 'var(--color-border)';
                        e.currentTarget.style.color = 'var(--color-text-main)';
                    }}
                >
                    <ChevronRight size={18} />
                </button>
            </div>
        </div>
    );
};

export default CalendarHeader;
