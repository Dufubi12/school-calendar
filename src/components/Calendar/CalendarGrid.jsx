import React, { useMemo } from 'react';
import { isSameMonth, isToday, format, isWeekend, getDay } from 'date-fns';
import { getCalendarDays, formatWeekDay } from '../../utils/dateUtils';

const CalendarGrid = ({ currentDate, onDayClick, substitutions = [] }) => {
    const days = useMemo(() => getCalendarDays(currentDate), [currentDate]);
    const weekDays = days.slice(0, 7);

    return (
        <div className="cal-grid">
            {/* Weekday Headers */}
            {weekDays.map((day) => {
                const dayNum = getDay(day);
                const isWE = dayNum === 0 || dayNum === 6;
                return (
                    <div key={day.toString()} className={`cal-weekday ${isWE ? 'cal-weekday--weekend' : ''}`}>
                        {formatWeekDay(day)}
                    </div>
                );
            })}

            {/* Days */}
            {days.map((day) => {
                const isCurrentMonth = isSameMonth(day, currentDate);
                const isDayToday = isToday(day);
                const isWE = isWeekend(day);
                const dateKey = format(day, 'yyyy-MM-dd');
                const dayEvents = substitutions.filter(s => s.date === dateKey);

                const lessonCount = dayEvents.filter(e => e.type === 'lesson').length;
                const subCount = dayEvents.filter(e => e.type === 'substitution').length;
                const clubCount = dayEvents.filter(e => e.type === 'club').length;

                let cellClass = 'cal-day';
                if (!isCurrentMonth) cellClass += ' cal-day--other';
                if (isDayToday) cellClass += ' cal-day--today';
                if (isWE) cellClass += ' cal-day--weekend';

                return (
                    <div
                        key={day.toString()}
                        className={cellClass}
                        onClick={() => onDayClick && onDayClick(day)}
                    >
                        <div className="cal-day-header">
                            <span className={`cal-day-num ${isDayToday ? 'cal-day-num--today' : ''}`}>
                                {format(day, 'd')}
                            </span>
                            {isCurrentMonth && dayEvents.length > 0 && (
                                <div className="cal-day-badges">
                                    {lessonCount > 0 && (
                                        <span className="cal-badge cal-badge--lesson">{lessonCount}</span>
                                    )}
                                    {subCount > 0 && (
                                        <span className="cal-badge cal-badge--sub">{subCount}</span>
                                    )}
                                    {clubCount > 0 && (
                                        <span className="cal-badge cal-badge--club">{clubCount}</span>
                                    )}
                                </div>
                            )}
                        </div>

                        <div className="cal-day-events">
                            {dayEvents.slice(0, 4).map(event => {
                                let typeClass = 'cal-event--lesson';
                                if (event.type === 'substitution') {
                                    typeClass = 'cal-event--sub';
                                } else if (event.type === 'club') {
                                    typeClass = 'cal-event--club';
                                }

                                return (
                                    <div
                                        key={event.id}
                                        className={`cal-event ${typeClass}`}
                                        title={[event.subject, event.time, event.teacher, event.className].filter(Boolean).join('\n')}
                                    >
                                        {event.startTime && <span className="cal-event-time">{event.startTime}</span>}
                                        <span className="cal-event-text">
                                            {event.className && <strong>{event.className}</strong>}
                                            {' '}{event.subject || event.details}
                                        </span>
                                    </div>
                                );
                            })}
                            {dayEvents.length > 4 && (
                                <div className="cal-event-more">
                                    +{dayEvents.length - 4}
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
