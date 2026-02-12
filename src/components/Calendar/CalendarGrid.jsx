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

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', overflow: 'hidden', flex: 1 }}>
                            {dayEvents.slice(0, 3).map(event => {
                                // Определяем стиль в зависимости от типа события
                                const isSubstitution = event.type === 'substitution';
                                const isLesson = event.type === 'lesson';
                                const isClub = event.type === 'club';

                                let bgColor = '#dbeafe';
                                let textColor = '#1e40af';
                                let borderColor = '#93c5fd';
                                let icon = '📖';

                                if (isSubstitution) {
                                    bgColor = '#fef2f2';
                                    textColor = '#991b1b';
                                    borderColor = '#fecaca';
                                    icon = '🔄';
                                } else if (isLesson) {
                                    bgColor = '#f0fdf4';
                                    textColor = '#15803d';
                                    borderColor = '#bbf7d0';
                                    icon = '✓';
                                } else if (isClub) {
                                    bgColor = '#faf5ff';
                                    textColor = '#6b21a8';
                                    borderColor = '#e9d5ff';
                                    icon = '🎯';
                                }

                                return (
                                    <div key={event.id} style={{
                                        fontSize: '0.7rem',
                                        backgroundColor: bgColor,
                                        color: textColor,
                                        padding: '3px 6px',
                                        borderRadius: '4px',
                                        borderLeft: `3px solid ${borderColor}`,
                                        whiteSpace: 'nowrap',
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '4px',
                                        transition: 'transform 0.1s'
                                    }}
                                    onMouseEnter={(e) => {
                                        e.currentTarget.style.transform = 'scale(1.02)';
                                        e.currentTarget.style.zIndex = '10';
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.transform = 'scale(1)';
                                        e.currentTarget.style.zIndex = '1';
                                    }}
                                    title={`${event.subject || ''}\n${event.startTime ? `${event.startTime} - ${event.endTime}` : ''}\n${event.details || ''}`}
                                    >
                                        <span style={{ fontSize: '0.65rem' }}>{icon}</span>
                                        <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                            {event.startTime && <span style={{ fontWeight: 'bold', marginRight: '4px' }}>{event.startTime}</span>}
                                            {event.subject || event.details}
                                        </span>
                                    </div>
                                );
                            })}
                            {dayEvents.length > 3 && (
                                <div style={{
                                    fontSize: '0.7rem',
                                    color: '#64748b',
                                    textAlign: 'center',
                                    padding: '2px',
                                    backgroundColor: '#f1f5f9',
                                    borderRadius: '3px',
                                    fontWeight: '500'
                                }}>
                                    +{dayEvents.length - 3} еще
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
