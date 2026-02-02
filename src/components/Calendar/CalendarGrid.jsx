import React, { useMemo } from 'react';
import { isSameMonth, isToday, format } from 'date-fns';
import { getCalendarDays, formatWeekDay } from '../../utils/dateUtils';
import { ru } from 'date-fns/locale';

const CalendarGrid = ({ currentDate, onDayClick, substitutions = [] }) => {
    const days = useMemo(() => getCalendarDays(currentDate), [currentDate]);

    // Week days header (Mon-Sun)
    // Take first 7 days of the generated interval which starts on Monday
    const weekDays = days.slice(0, 7);

    return (
        <div className="calendar-grid" style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(7, 1fr)',
            gap: '1px',
            backgroundColor: '#ddd', // Grid lines color
            border: '1px solid #ddd'
        }}>
            {/* Weekday Headers */}
            {weekDays.map((day) => (
                <div key={day.toString()} style={{
                    backgroundColor: '#f9fafb',
                    padding: '0.5rem',
                    textAlign: 'center',
                    fontWeight: 'bold',
                    fontSize: '0.875rem'
                }}>
                    {formatWeekDay(day)}
                </div>
            ))}

            {/* Days */}
            {days.map((day) => {
                const isCurrentMonth = isSameMonth(day, currentDate);
                const isDayToday = isToday(day);
                const dateKey = format(day, 'yyyy-MM-dd');
                // Filter events for this day
                const dayEvents = substitutions.filter(s => s.date === dateKey); // 'substitutions' prop is passed as 'events' from parent

                return (
                    <div
                        key={day.toString()}
                        onClick={() => onDayClick && onDayClick(day)}
                        style={{
                            backgroundColor: 'white',
                            minHeight: '120px',
                            padding: '0.5rem',
                            opacity: isCurrentMonth ? 1 : 0.5,
                            position: 'relative',
                            backgroundColor: isDayToday ? '#eff6ff' : 'white',
                            cursor: 'pointer',
                            transition: 'background-color 0.2s',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '4px'
                        }}
                        onMouseEnter={(e) => {
                            if (!isDayToday) e.currentTarget.style.backgroundColor = '#f3f4f6';
                        }}
                        onMouseLeave={(e) => {
                            if (!isDayToday) e.currentTarget.style.backgroundColor = 'white';
                        }}
                    >
                        <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            marginBottom: '0.25rem'
                        }}>
                            <span style={{
                                fontWeight: isDayToday ? 'bold' : 'normal',
                                color: isDayToday ? '#2563eb' : 'inherit',
                                backgroundColor: isDayToday ? '#dbeafe' : 'transparent',
                                borderRadius: '50%',
                                width: '1.5rem',
                                height: '1.5rem',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '0.875rem'
                            }}>
                                {format(day, 'd')}
                            </span>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', overflow: 'hidden' }}>
                            {dayEvents.slice(0, 3).map(event => (
                                <div key={event.id} style={{
                                    fontSize: '0.7rem',
                                    backgroundColor: event.type === 'substitution' ? '#fee2e2' : '#dbeafe',
                                    color: event.type === 'substitution' ? '#991b1b' : '#1e40af',
                                    padding: '2px 4px',
                                    borderRadius: '4px',
                                    whiteSpace: 'nowrap',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis'
                                }}>
                                    {event.type === 'substitution' ? 'З:' : ''} {event.details || event.subject}
                                </div>
                            ))}
                            {dayEvents.length > 3 && (
                                <div style={{ fontSize: '0.7rem', color: '#64748b', textAlign: 'center' }}>
                                    еще {dayEvents.length - 3}...
                                </div>
                            )}
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

export default CalendarGrid;
