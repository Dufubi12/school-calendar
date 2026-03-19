import React, { useState, useMemo } from 'react';
import { useSchedule } from '../context/ScheduleContext';
import { REAL_SCHEDULE } from '../data/mockData';
import { UserCheck } from 'lucide-react';

const WEEKDAYS = ['Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница'];
const WEEKDAY_SHORT = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт'];

const TeacherSchedulePage = () => {
    const { teachers, bellSchedule } = useSchedule();
    const [selectedTeacherId, setSelectedTeacherId] = useState('');

    const selectedTeacher = teachers.find(t => t.id === Number(selectedTeacherId));

    // Строим недельное расписание учителя из REAL_SCHEDULE
    // Структура: { "09:00-09:45": { "Понедельник": [{subject, grade}], ... }, ... }
    const weeklySchedule = useMemo(() => {
        if (!selectedTeacher) return {};

        const lastName = selectedTeacher.name.split(' ')[0];
        const schedule = {};

        Object.entries(REAL_SCHEDULE).forEach(([className, days]) => {
            Object.entries(days).forEach(([dayName, lessons]) => {
                if (!WEEKDAYS.includes(dayName)) return;

                lessons.forEach(lesson => {
                    if (lesson.teacher === lastName) {
                        if (!schedule[lesson.time]) {
                            schedule[lesson.time] = {};
                        }
                        if (!schedule[lesson.time][dayName]) {
                            schedule[lesson.time][dayName] = [];
                        }
                        schedule[lesson.time][dayName].push({
                            subject: lesson.subject,
                            grade: className
                        });
                    }
                });
            });
        });

        return schedule;
    }, [selectedTeacher]);

    // Сортируем временные слоты по порядку из расписания звонков
    const timeSlots = useMemo(() => {
        const bellTimes = bellSchedule.map(b => `${b.startTime}-${b.endTime}`);
        const scheduleTimes = Object.keys(weeklySchedule);
        const allTimes = [...new Set([...bellTimes, ...scheduleTimes])];
        return allTimes.filter(t => scheduleTimes.includes(t));
    }, [weeklySchedule, bellSchedule]);

    // Получаем лейбл из расписания звонков (например "1 урок")
    const getBellLabel = (timeStr) => {
        const [start] = timeStr.split('-');
        const bell = bellSchedule.find(b => b.startTime === start);
        return bell ? bell.label : '';
    };

    // Считаем общее количество уроков в неделю
    const totalLessons = useMemo(() => {
        let count = 0;
        Object.values(weeklySchedule).forEach(days => {
            Object.values(days).forEach(lessons => {
                count += lessons.length;
            });
        });
        return count;
    }, [weeklySchedule]);

    return (
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
            <div style={{ marginBottom: '1.5rem' }}>
                <h1 style={{ margin: 0, fontSize: '1.8rem' }}>
                    Расписание учителя
                </h1>
            </div>

            {/* Выбор учителя */}
            <div className="card" style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                <UserCheck size={20} />
                <label htmlFor="teacher-select" style={{ fontWeight: 500 }}>
                    Выберите учителя:
                </label>
                <select
                    id="teacher-select"
                    value={selectedTeacherId}
                    onChange={(e) => setSelectedTeacherId(e.target.value)}
                    style={{
                        padding: '8px 12px', borderRadius: '8px',
                        border: '2px solid #e5e7eb', fontSize: '14px',
                        fontWeight: '500', cursor: 'pointer', backgroundColor: '#fff',
                        minWidth: '250px'
                    }}
                >
                    <option value="">-- Выберите --</option>
                    {teachers.map(t => (
                        <option key={t.id} value={t.id}>
                            {t.name} ({t.subject})
                        </option>
                    ))}
                </select>

                {selectedTeacher && (
                    <span style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>
                        Уроков в неделю: <strong>{totalLessons}</strong>
                    </span>
                )}
            </div>

            {/* Таблица расписания */}
            {selectedTeacher && timeSlots.length > 0 ? (
                <div className="card" style={{ overflowX: 'auto', padding: '0' }}>
                    <table style={{
                        width: '100%', borderCollapse: 'collapse',
                        fontSize: '0.9rem'
                    }}>
                        <thead>
                            <tr style={{ backgroundColor: '#f8fafc' }}>
                                <th style={{
                                    padding: '12px', textAlign: 'left',
                                    borderBottom: '2px solid #e2e8f0', minWidth: '120px'
                                }}>
                                    Время
                                </th>
                                {WEEKDAYS.map((day, i) => (
                                    <th key={day} style={{
                                        padding: '12px', textAlign: 'center',
                                        borderBottom: '2px solid #e2e8f0', minWidth: '150px'
                                    }}>
                                        {WEEKDAY_SHORT[i]}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {timeSlots.map(time => (
                                <tr key={time}>
                                    <td style={{
                                        padding: '10px 12px',
                                        borderBottom: '1px solid #e2e8f0',
                                        fontWeight: 500, whiteSpace: 'nowrap',
                                        backgroundColor: '#f8fafc'
                                    }}>
                                        <div>{getBellLabel(time)}</div>
                                        <div style={{
                                            fontSize: '0.8rem',
                                            color: 'var(--color-text-muted)'
                                        }}>
                                            {time}
                                        </div>
                                    </td>
                                    {WEEKDAYS.map(day => {
                                        const lessons = weeklySchedule[time]?.[day] || [];
                                        return (
                                            <td key={day} style={{
                                                padding: '8px 12px',
                                                borderBottom: '1px solid #e2e8f0',
                                                textAlign: 'center',
                                                backgroundColor: lessons.length > 0 ? '#f0fdf4' : 'transparent'
                                            }}>
                                                {lessons.map((l, i) => (
                                                    <div key={i} style={{
                                                        padding: '4px 8px',
                                                        borderRadius: '6px',
                                                        backgroundColor: lessons.length > 1 ? '#dbeafe' : 'transparent',
                                                        marginBottom: i < lessons.length - 1 ? '4px' : 0
                                                    }}>
                                                        <div style={{ fontWeight: 500 }}>{l.subject}</div>
                                                        <div style={{
                                                            fontSize: '0.8rem',
                                                            color: 'var(--color-text-muted)'
                                                        }}>
                                                            {l.grade}
                                                        </div>
                                                    </div>
                                                ))}
                                            </td>
                                        );
                                    })}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            ) : selectedTeacher ? (
                <div className="card" style={{ textAlign: 'center', padding: '3rem', color: 'var(--color-text-muted)' }}>
                    У этого учителя нет уроков в расписании
                </div>
            ) : (
                <div className="card" style={{ textAlign: 'center', padding: '3rem', color: 'var(--color-text-muted)' }}>
                    Выберите учителя, чтобы увидеть расписание
                </div>
            )}
        </div>
    );
};

export default TeacherSchedulePage;
