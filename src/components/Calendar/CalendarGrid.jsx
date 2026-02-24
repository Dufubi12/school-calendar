import React, { useMemo } from 'react';
import { isSameMonth, isToday, format } from 'date-fns';
import { getCalendarDays, formatWeekDay } from '../../utils/dateUtils';
import { useSchedule } from '../../context/ScheduleContext';
import { ru } from 'date-fns/locale';

const CalendarGrid = ({ currentDate, onDayClick, substitutions = [], selectedClass = 'all' }) => {
    const { teachers } = useSchedule();
    const days = useMemo(() => getCalendarDays(currentDate), [currentDate]);

    // Resolve a partial teacher name (last name) to full name
    const resolveFullName = (partialName) => {
        if (!partialName || partialName === 'Не назначен' || partialName.includes(' ')) return partialName;
        const match = teachers.find(t => t.name.split(' ')[0] === partialName);
        return match ? match.name : partialName;
    };

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
                // Filter events for this day (and by class if selected)
                const allDayEvents = substitutions.filter(s => s.date === dateKey);
                const dayEvents = selectedClass === 'all'
                    ? allDayEvents
                    : allDayEvents.filter(e => (e.className || e.grade) === selectedClass);

                return (
                    <div
                        key={day.toString()}
                        onClick={() => onDayClick && onDayClick(day)}
                        style={{
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

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', overflow: 'hidden', flex: 1 }}>
                            {selectedClass !== 'all' ? (
                                /* SPECIFIC CLASS MODE: show time + subject + teacher */
                                <>
                                    {dayEvents.slice(0, 5).map(event => {
                                        const isSubstitution = event.type === 'substitution';
                                        const isClub = event.type === 'club';
                                        const bgColor = isSubstitution ? '#fef2f2' : isClub ? '#faf5ff' : '#f0fdf4';
                                        const textColor = isSubstitution ? '#991b1b' : isClub ? '#6b21a8' : '#15803d';
                                        const borderColor = isSubstitution ? '#fecaca' : isClub ? '#e9d5ff' : '#bbf7d0';
                                        const icon = isSubstitution ? '🔄' : isClub ? '🎯' : '✓';
                                        const time = event.startTime || (event.time ? event.time.split('-')[0] : '');
                                        const teacher = resolveFullName(event.teacher || '');

                                        return (
                                            <div key={event.id} style={{
                                                fontSize: '0.68rem', backgroundColor: bgColor, color: textColor,
                                                padding: '2px 5px', borderRadius: '4px', borderLeft: `3px solid ${borderColor}`,
                                                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                                                display: 'flex', alignItems: 'center', gap: '3px',
                                            }}
                                            title={`${event.subject || ''}\n${event.time || (event.startTime ? `${event.startTime}-${event.endTime}` : '')}\n${teacher}`}
                                            >
                                                <span style={{ fontSize: '0.6rem' }}>{icon}</span>
                                                {time && <span style={{ fontWeight: 'bold', fontSize: '0.65rem' }}>{time}</span>}
                                                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                    {event.subject}{teacher && <span style={{ opacity: 0.7 }}> ({teacher})</span>}
                                                </span>
                                            </div>
                                        );
                                    })}
                                    {dayEvents.length > 5 && (
                                        <div style={{ fontSize: '0.65rem', color: '#64748b', textAlign: 'center', padding: '2px', backgroundColor: '#f1f5f9', borderRadius: '3px', fontWeight: '500' }}>
                                            +{dayEvents.length - 5} еще
                                        </div>
                                    )}
                                </>
                            ) : (
                                /* ALL CLASSES MODE: compact class summaries */
                                (() => {
                                    const grouped = {};
                                    dayEvents.forEach(event => {
                                        const cls = event.className || event.grade || 'Другое';
                                        if (!grouped[cls]) grouped[cls] = { total: 0, subs: 0 };
                                        grouped[cls].total++;
                                        if (event.type === 'substitution') grouped[cls].subs++;
                                    });
                                    const classNames = Object.keys(grouped).sort();
                                    const maxShow = 5;

                                    return (
                                        <>
                                            {classNames.slice(0, maxShow).map(cls => (
                                                <div key={cls} style={{
                                                    fontSize: '0.65rem', padding: '2px 5px', borderRadius: '3px',
                                                    backgroundColor: grouped[cls].subs > 0 ? '#fef2f2' : '#f0fdf4',
                                                    color: grouped[cls].subs > 0 ? '#991b1b' : '#15803d',
                                                    borderLeft: `3px solid ${grouped[cls].subs > 0 ? '#fecaca' : '#bbf7d0'}`,
                                                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                                                    fontWeight: '500'
                                                }}>
                                                    {cls} — {grouped[cls].total} ур.
                                                    {grouped[cls].subs > 0 && <span style={{ marginLeft: '4px' }}>🔄{grouped[cls].subs}</span>}
                                                </div>
                                            ))}
                                            {classNames.length > maxShow && (
                                                <div style={{ fontSize: '0.65rem', color: '#64748b', textAlign: 'center', padding: '2px', backgroundColor: '#f1f5f9', borderRadius: '3px', fontWeight: '500' }}>
                                                    +{classNames.length - maxShow} классов
                                                </div>
                                            )}
                                            {classNames.length === 0 && null}
                                        </>
                                    );
                                })()
                            )}
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

export default CalendarGrid;
