import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { formatMonthYear } from '../../utils/dateUtils';

const CalendarHeader = ({ currentDate, onPrevMonth, onNextMonth }) => {
    return (
        <div className="calendar-header" style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '1rem',
            padding: '0.5rem'
        }}>
            <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 'bold' }}>
                {formatMonthYear(currentDate)}
            </h2>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                    onClick={onPrevMonth}
                    style={{
                        padding: '0.5rem',
                        cursor: 'pointer',
                        background: 'none',
                        border: '1px solid #ddd',
                        borderRadius: '4px',
                        display: 'flex',
                        alignItems: 'center'
                    }}
                    title="Предыдущий месяц"
                >
                    <ChevronLeft size={20} />
                </button>
                <button
                    onClick={onNextMonth}
                    style={{
                        padding: '0.5rem',
                        cursor: 'pointer',
                        background: 'none',
                        border: '1px solid #ddd',
                        borderRadius: '4px',
                        display: 'flex',
                        alignItems: 'center'
                    }}
                    title="Следующий месяц"
                >
                    <ChevronRight size={20} />
                </button>
            </div>
        </div>
    );
};

export default CalendarHeader;
