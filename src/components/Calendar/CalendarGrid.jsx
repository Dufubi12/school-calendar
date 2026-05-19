import React, { useMemo } from 'react';
import { isSameMonth, isToday, format } from 'date-fns';
import { getCalendarDays, formatWeekDay } from '../../utils/dateUtils';
import { useSchedule } from '../../context/ScheduleContext';

const CalendarGrid = ({ currentDate, onDayClick, substitutions = [], selectedClass = 'all', selectedTeacher = 'all', allowedTeacherLastNames = null }) => {
    const { teachers } = useSchedule();
    const days = useMemo(() => getCalendarDays(currentDate), [currentDate]);

    const resolveFullName = (partialName) => {
        if (!partialName || partialName === 'Не назначен' || partialName.includes(' ')) return partialName;
        const match = teachers.find(t => t.name.split(' ')[0] === partialName);
        return match ? match.name : partialName;
    };

    const weekDays = days.slice(0, 7);
    const isWeekend = (day) => {
        const dow = day.getDay();
        return dow === 0 || dow === 6;
    };

    return (
        <div className="calendar-grid" style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(7, 1fr)',
            gap: '1px',
            backgroundColor: 'var(--color-border)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-md)',
            overflow: 'hidden',
            boxShadow: 'var(--shadow-sm)'
        }}>
            {/* Weekday Headers */}
            {weekDays.map((day) => {
                const weekend = isWeekend(day);
                return (
                    <div key={day.toString()} style={{
                        backgroundColor: weekend ? 'var(--color-bg-tint)' : 'var(--color-bg-elev)',
                        padding: '10px',
                        textAlign: 'center',
                        fontWeight: 700,
                        fontSize: '0.78rem',
                        textTransform: 'uppercase',
                        letterSpacing: '0.06em',
                        color: weekend ? 'var(--color-olive)' : 'var(--color-text-muted)',
                        borderBottom: '1px solid var(--color-border)'
                    }}>
                        {formatWeekDay(day)}
                    </div>
                );
            })}

            {/* Days */}
            {days.map((day) => {
                const isCurrentMonth = isSameMonth(day, currentDate);
                const isDayToday = isToday(day);
                const weekend = isWeekend(day);
                const dateKey = format(day, 'yyyy-MM-dd');

                const allDayEvents = substitutions.filter(s => s.date === dateKey);
                const classFiltered = selectedClass === 'all'
                    ? allDayEvents
                    : allDayEvents.filter(e => (e.className || e.grade) === selectedClass);
                const teacherFiltered = selectedTeacher === 'all'
                    ? classFiltered
                    : classFiltered.filter(e => e.teacher === selectedTeacher || (e.teacherName && e.teacherName === selectedTeacher));
                const dayEvents = allowedTeacherLastNames
                    ? teacherFiltered.filter(e => {
                        const ln = e.teacher || (e.teacherName ? e.teacherName.split(' ')[0] : null);
                        return ln && allowedTeacherLastNames.includes(ln);
                    })
                    : teacherFiltered;

                const baseBg = isDayToday
                    ? 'linear-gradient(180deg, rgba(123, 144, 76, 0.10) 0%, var(--color-bg-card) 100%)'
                    : weekend
                        ? 'var(--color-bg-tint)'
                        : 'var(--color-bg-card)';

                return (
                    <div
                        key={day.toString()}
                        onClick={() => onDayClick && onDayClick(day)}
                        style={{
                            minHeight: '130px',
                            padding: '8px',
                            opacity: isCurrentMonth ? 1 : 0.45,
                            position: 'relative',
                            background: baseBg,
                            cursor: 'pointer',
                            transition: 'background-color var(--duration-fast) var(--ease-out), transform var(--duration-fast) var(--ease-out)',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '4px'
                        }}
                        onMouseEnter={(e) => {
                            if (!isDayToday) e.currentTarget.style.background = 'var(--color-moss-tint)';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.background = baseBg;
                        }}
                    >
                        <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            marginBottom: '4px'
                        }}>
                            <span style={{
                                fontWeight: isDayToday ? 700 : 500,
                                color: isDayToday ? '#fff' : (weekend ? 'var(--color-olive)' : 'var(--color-text-main)'),
                                background: isDayToday ? 'var(--color-primary)' : 'transparent',
                                borderRadius: '50%',
                                width: '26px',
                                height: '26px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '0.82rem',
                                boxShadow: isDayToday ? 'var(--shadow-sm)' : 'none',
                                transition: 'all var(--duration-fast) var(--ease-out)'
                            }}>
                                {format(day, 'd')}
                            </span>
                            {dayEvents.length > 0 && (
                                <span style={{
                                    fontSize: '0.65rem',
                                    color: 'var(--color-text-subtle)',
                                    fontWeight: 600
                                }}>
                                    {dayEvents.length}
                                </span>
                            )}
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', overflow: 'hidden', flex: 1 }}>
                            {(selectedClass !== 'all' || selectedTeacher !== 'all') ? (
                                <>
                                    {dayEvents.slice(0, 5).map(event => {
                                        const isSubstitution = event.type === 'substitution';
                                        const isClub = event.type === 'club';
                                        const isPending = event.type === 'pending-invitation';
                                        const isIndividual = event.type === 'individual';
                                        const bgColor = isPending
                                            ? 'var(--color-warning-bg)'
                                            : isIndividual
                                                ? '#fef3c7'
                                                : isSubstitution
                                                    ? 'var(--color-danger-bg)'
                                                    : isClub ? '#F3EAFB' : 'var(--color-success-bg)';
                                        const textColor = isPending
                                            ? 'var(--color-warning)'
                                            : isIndividual
                                                ? '#92400e'
                                                : isSubstitution
                                                    ? 'var(--color-danger)'
                                                    : isClub ? '#6b21a8' : 'var(--color-success)';
                                        const borderColor = isPending
                                            ? 'var(--color-warning-border)'
                                            : isIndividual
                                                ? '#fde68a'
                                                : isSubstitution
                                                    ? 'var(--color-danger-border)'
                                                    : isClub ? '#D6BBE6' : 'var(--color-success-border)';
                                        const icon = isPending ? '⏳' : isIndividual ? '👤' : isSubstitution ? '🔄' : isClub ? '🎯' : '✓';
                                        const time = event.startTime || (event.time ? event.time.split('-')[0] : '');
                                        const teacher = resolveFullName(event.teacher || '');

                                        return (
                                            <div key={event.id} style={{
                                                fontSize: '0.68rem',
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
                                                gap: '3px',
                                                fontWeight: 500
                                            }}
                                                title={`${event.subject || ''}\n${event.time || (event.startTime ? `${event.startTime}-${event.endTime}` : '')}\n${teacher}`}
                                            >
                                                <span style={{ fontSize: '0.6rem' }}>{icon}</span>
                                                {time && <span style={{ fontWeight: 700, fontSize: '0.65rem' }}>{time}</span>}
                                                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                    {selectedTeacher !== 'all' && (event.className || event.grade) && <span style={{ fontWeight: 700 }}>{event.className || event.grade} </span>}
                                                    {event.subject}{selectedTeacher === 'all' && teacher && <span style={{ opacity: 0.7 }}> ({teacher})</span>}
                                                </span>
                                            </div>
                                        );
                                    })}
                                    {dayEvents.length > 5 && (
                                        <div style={{
                                            fontSize: '0.65rem',
                                            color: 'var(--color-text-muted)',
                                            textAlign: 'center',
                                            padding: '3px',
                                            backgroundColor: 'var(--color-bg-tint)',
                                            borderRadius: 'var(--radius-sm)',
                                            fontWeight: 600
                                        }}>
                                            +{dayEvents.length - 5} ещё
                                        </div>
                                    )}
                                </>
                            ) : (
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
                                            {classNames.slice(0, maxShow).map(cls => {
                                                const hasSubs = grouped[cls].subs > 0;
                                                return (
                                                    <div key={cls} style={{
                                                        fontSize: '0.68rem',
                                                        padding: '3px 6px',
                                                        borderRadius: 'var(--radius-sm)',
                                                        backgroundColor: hasSubs ? 'var(--color-danger-bg)' : 'var(--color-success-bg)',
                                                        color: hasSubs ? 'var(--color-danger)' : 'var(--color-success)',
                                                        borderLeft: `3px solid ${hasSubs ? 'var(--color-danger-border)' : 'var(--color-success-border)'}`,
                                                        whiteSpace: 'nowrap',
                                                        overflow: 'hidden',
                                                        textOverflow: 'ellipsis',
                                                        fontWeight: 500
                                                    }}>
                                                        <strong>{cls}</strong> — {grouped[cls].total} ур.
                                                        {hasSubs && <span style={{ marginLeft: '4px' }}>🔄{grouped[cls].subs}</span>}
                                                    </div>
                                                );
                                            })}
                                            {classNames.length > maxShow && (
                                                <div style={{
                                                    fontSize: '0.65rem',
                                                    color: 'var(--color-text-muted)',
                                                    textAlign: 'center',
                                                    padding: '3px',
                                                    backgroundColor: 'var(--color-bg-tint)',
                                                    borderRadius: 'var(--radius-sm)',
                                                    fontWeight: 600
                                                }}>
                                                    +{classNames.length - maxShow} классов
                                                </div>
                                            )}
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
