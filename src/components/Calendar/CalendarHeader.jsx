import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { formatMonthYear } from '../../utils/dateUtils';

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

const CalendarHeader = ({ currentDate, onPrevMonth, onNextMonth }) => {
    return (
        <div className="calendar-header" style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '1.25rem',
            padding: '0.25rem 0.5rem'
        }}>
            <h2 style={{
                margin: 0,
                fontSize: '1.75rem',
                fontWeight: 700,
                letterSpacing: '-0.02em',
                color: 'var(--color-primary-deep)',
                textTransform: 'capitalize'
            }}>
                {formatMonthYear(currentDate)}
            </h2>
            <div style={{ display: 'flex', gap: '8px' }}>
                <button
                    onClick={onPrevMonth}
                    style={navBtn}
                    title="Предыдущий месяц"
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
                    onClick={onNextMonth}
                    style={navBtn}
                    title="Следующий месяц"
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
