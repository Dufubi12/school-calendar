import React from 'react';
import { useSchedule } from '../../context/ScheduleContext';
import { getWorkloadLevel } from '../../utils/scheduleUtils';
import './TeacherWorkload.css';

const TeacherWorkloadCard = ({ teacherId, showDetails = false }) => {
    const { getTeacherWorkload, teachers } = useSchedule();

    const teacher = teachers.find(t => t.id === teacherId);
    if (!teacher) return null;

    const workload = getTeacherWorkload(teacherId);
    const level = getWorkloadLevel(workload.workloadPercentage);

    const daysOfWeek = [
        { key: 'monday', label: 'Пн' },
        { key: 'tuesday', label: 'Вт' },
        { key: 'wednesday', label: 'Ср' },
        { key: 'thursday', label: 'Чт' },
        { key: 'friday', label: 'Пт' },
        { key: 'saturday', label: 'Сб' },
        { key: 'sunday', label: 'Вс' }
    ];

    const maxLessonsPerDay = Math.max(...Object.values(workload.slotsByDay), 1);

    return (
        <div className="teacher-workload-card">
            {!showDetails ? (
                // Compact view
                <div className="workload-compact">
                    <div className="workload-compact__info">
                        <span className="workload-compact__percentage" style={{ color: level.color }}>
                            {level.emoji} {workload.workloadPercentage}%
                        </span>
                        <span className="workload-compact__label">{level.label}</span>
                    </div>
                    <div className="workload-compact__bar">
                        <div
                            className="workload-bar__fill"
                            style={{
                                width: `${workload.workloadPercentage}%`,
                                backgroundColor: level.color
                            }}
                        />
                    </div>
                </div>
            ) : (
                // Detailed view
                <div className="workload-detailed">
                    <div className="workload-detailed__header">
                        <h4>{teacher.name}</h4>
                        <div className="workload-badge" style={{ backgroundColor: level.color }}>
                            {level.emoji} {workload.workloadPercentage}%
                        </div>
                    </div>

                    <div className="workload-detailed__stats">
                        <div className="stat-box">
                            <div className="stat-box__value">{workload.totalSlots}</div>
                            <div className="stat-box__label">Всего уроков</div>
                        </div>
                        <div className="stat-box">
                            <div className="stat-box__value">{workload.averagePerDay.toFixed(1)}</div>
                            <div className="stat-box__label">В среднем/день</div>
                        </div>
                        <div className="stat-box">
                            <div className="stat-box__value" style={{ color: level.color }}>
                                {level.label}
                            </div>
                            <div className="stat-box__label">Статус</div>
                        </div>
                    </div>

                    <div className="workload-detailed__progress">
                        <div className="progress-label">
                            <span>Загруженность</span>
                            <span>{workload.workloadPercentage}%</span>
                        </div>
                        <div className="progress-bar">
                            <div
                                className="progress-bar__fill"
                                style={{
                                    width: `${workload.workloadPercentage}%`,
                                    backgroundColor: level.color
                                }}
                            />
                        </div>
                    </div>

                    <div className="workload-detailed__chart">
                        <h5>Распределение по дням</h5>
                        <div className="day-chart">
                            {daysOfWeek.map(day => (
                                <div key={day.key} className="day-chart__item">
                                    <div className="day-chart__bar-container">
                                        <div
                                            className="day-chart__bar"
                                            style={{
                                                height: `${(workload.slotsByDay[day.key] / maxLessonsPerDay) * 100}%`,
                                                backgroundColor: level.color
                                            }}
                                        >
                                            {workload.slotsByDay[day.key] > 0 && (
                                                <span className="day-chart__value">
                                                    {workload.slotsByDay[day.key]}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    <div className="day-chart__label">{day.label}</div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default TeacherWorkloadCard;
