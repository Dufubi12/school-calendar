import React, { useState, useMemo } from 'react';
import { useSchedule } from '../context/ScheduleContext';
import './ScheduleOptimizationPage.css';

const ScheduleOptimizationPage = () => {
    const { teachers, getSlotsForDate } = useSchedule();
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
    const [selectedTeacher, setSelectedTeacher] = useState('all');

    // Analyze schedule for the selected date
    const scheduleAnalysis = useMemo(() => {
        const date = new Date(selectedDate);
        const slots = getSlotsForDate(date);

        // Group slots by teacher
        const teacherSchedules = {};

        teachers.forEach(teacher => {
            const teacherSlots = slots.filter(slot =>
                slot.teacherId === teacher.id ||
                (slot.teacherName && slot.teacherName.includes(teacher.name.split(' ')[0]))
            ).sort((a, b) => a.lessonNumber - b.lessonNumber);

            if (teacherSlots.length > 0) {
                teacherSchedules[teacher.id] = {
                    teacher,
                    slots: teacherSlots,
                    gaps: findGaps(teacherSlots),
                    conflicts: findConflicts(teacherSlots, slots),
                    totalLessons: teacherSlots.length
                };
            }
        });

        return teacherSchedules;
    }, [selectedDate, teachers, getSlotsForDate]);

    // Find gaps in teacher's schedule (empty lesson numbers between lessons)
    const findGaps = (teacherSlots) => {
        const gaps = [];
        for (let i = 0; i < teacherSlots.length - 1; i++) {
            const currentLesson = teacherSlots[i].lessonNumber;
            const nextLesson = teacherSlots[i + 1].lessonNumber;

            if (nextLesson - currentLesson > 1) {
                gaps.push({
                    startLesson: currentLesson,
                    endLesson: nextLesson,
                    gapSize: nextLesson - currentLesson - 1,
                    afterSubject: teacherSlots[i].subject,
                    beforeSubject: teacherSlots[i + 1].subject
                });
            }
        }
        return gaps;
    };

    // Find potential conflicts (same teacher at same time in different classes)
    const findConflicts = (teacherSlots, allSlots) => {
        const conflicts = [];
        teacherSlots.forEach(slot => {
            const sameTimeSlots = allSlots.filter(s =>
                s.id !== slot.id &&
                s.lessonNumber === slot.lessonNumber &&
                (s.teacherId === slot.teacherId ||
                    (s.teacherName && slot.teacherName &&
                        s.teacherName.includes(slot.teacherName.split(' ')[0])))
            );

            if (sameTimeSlots.length > 0) {
                conflicts.push({
                    lessonNumber: slot.lessonNumber,
                    time: `${slot.startTime}-${slot.endTime}`,
                    classes: [slot.grade, ...sameTimeSlots.map(s => s.grade)]
                });
            }
        });
        return conflicts;
    };

    // Get optimization suggestions
    const getOptimizationSuggestions = () => {
        const suggestions = [];

        Object.values(scheduleAnalysis).forEach(({ teacher, gaps, conflicts, slots }) => {
            // Suggest filling gaps
            gaps.forEach(gap => {
                suggestions.push({
                    type: 'gap',
                    severity: gap.gapSize > 2 ? 'high' : 'medium',
                    teacher: teacher.name,
                    description: `Окно ${gap.gapSize} ${gap.gapSize === 1 ? 'урок' : 'уроков'} между ${gap.startLesson} и ${gap.endLesson} уроками`,
                    suggestion: `Переставить уроки, чтобы убрать окно`,
                    details: `После "${gap.afterSubject}" и перед "${gap.beforeSubject}"`
                });
            });

            // Warn about conflicts
            conflicts.forEach(conflict => {
                suggestions.push({
                    type: 'conflict',
                    severity: 'critical',
                    teacher: teacher.name,
                    description: `Конфликт на ${conflict.lessonNumber} уроке (${conflict.time})`,
                    suggestion: `Учитель не может вести одновременно в классах: ${conflict.classes.join(', ')}`,
                    details: `Нужна замена или перенос урока`
                });
            });

            // Suggest workload balancing
            if (slots.length > 6) {
                suggestions.push({
                    type: 'overload',
                    severity: 'medium',
                    teacher: teacher.name,
                    description: `Большая нагрузка: ${slots.length} уроков в день`,
                    suggestion: `Рассмотреть перераспределение на другие дни`,
                    details: 'Для снижения усталости учителя'
                });
            }
        });

        return suggestions.sort((a, b) => {
            const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
            return severityOrder[a.severity] - severityOrder[b.severity];
        });
    };

    const suggestions = getOptimizationSuggestions();

    // Filter by selected teacher
    const filteredSchedules = selectedTeacher === 'all'
        ? Object.values(scheduleAnalysis)
        : Object.values(scheduleAnalysis).filter(s => s.teacher.id === parseInt(selectedTeacher));

    const filteredSuggestions = selectedTeacher === 'all'
        ? suggestions
        : suggestions.filter(s => {
            const teacher = teachers.find(t => t.id === parseInt(selectedTeacher));
            return teacher && s.teacher === teacher.name;
        });

    // Calculate statistics
    const stats = {
        totalTeachers: Object.keys(scheduleAnalysis).length,
        teachersWithGaps: Object.values(scheduleAnalysis).filter(s => s.gaps.length > 0).length,
        totalGaps: Object.values(scheduleAnalysis).reduce((sum, s) => sum + s.gaps.length, 0),
        totalConflicts: Object.values(scheduleAnalysis).reduce((sum, s) => sum + s.conflicts.length, 0)
    };

    return (
        <div className="optimization-page">
            <div className="optimization-header">
                <h1>🔧 Оптимизация расписания</h1>
                <p className="optimization-subtitle">
                    Анализ и предложения по улучшению расписания
                </p>
            </div>

            {/* Filters */}
            <div className="optimization-filters">
                <div className="filter-group">
                    <label>
                        📅 Дата:
                        <input
                            type="date"
                            value={selectedDate}
                            onChange={(e) => setSelectedDate(e.target.value)}
                        />
                    </label>
                </div>

                <div className="filter-group">
                    <label>
                        👤 Учитель:
                        <select
                            value={selectedTeacher}
                            onChange={(e) => setSelectedTeacher(e.target.value)}
                        >
                            <option value="all">Все учителя</option>
                            {teachers.map(teacher => (
                                <option key={teacher.id} value={teacher.id}>
                                    {teacher.name}
                                </option>
                            ))}
                        </select>
                    </label>
                </div>
            </div>

            {/* Statistics Cards */}
            <div className="stats-cards">
                <div className="stat-card">
                    <div className="stat-icon">👥</div>
                    <div className="stat-value">{stats.totalTeachers}</div>
                    <div className="stat-label">Учителей работает</div>
                </div>
                <div className="stat-card stat-card--warning">
                    <div className="stat-icon">⏸️</div>
                    <div className="stat-value">{stats.totalGaps}</div>
                    <div className="stat-label">Окон в расписании</div>
                </div>
                <div className="stat-card stat-card--danger">
                    <div className="stat-icon">⚠️</div>
                    <div className="stat-value">{stats.totalConflicts}</div>
                    <div className="stat-label">Конфликтов</div>
                </div>
                <div className="stat-card stat-card--info">
                    <div className="stat-icon">📋</div>
                    <div className="stat-value">{filteredSuggestions.length}</div>
                    <div className="stat-label">Рекомендаций</div>
                </div>
            </div>

            {/* Suggestions */}
            <div className="suggestions-section">
                <h2>💡 Рекомендации по оптимизации</h2>
                {filteredSuggestions.length === 0 ? (
                    <div className="empty-state">
                        <div className="empty-icon">✅</div>
                        <h3>Отличное расписание!</h3>
                        <p>Проблем не обнаружено</p>
                    </div>
                ) : (
                    <div className="suggestions-list">
                        {filteredSuggestions.map((suggestion, index) => (
                            <div key={index} className={`suggestion-card suggestion-card--${suggestion.severity}`}>
                                <div className="suggestion-header">
                                    <div className="suggestion-type">
                                        {suggestion.type === 'conflict' && '⚠️ Конфликт'}
                                        {suggestion.type === 'gap' && '⏸️ Окно'}
                                        {suggestion.type === 'overload' && '📚 Перегрузка'}
                                    </div>
                                    <div className={`suggestion-severity severity--${suggestion.severity}`}>
                                        {suggestion.severity === 'critical' && 'Критично'}
                                        {suggestion.severity === 'high' && 'Высокий'}
                                        {suggestion.severity === 'medium' && 'Средний'}
                                        {suggestion.severity === 'low' && 'Низкий'}
                                    </div>
                                </div>
                                <div className="suggestion-teacher">{suggestion.teacher}</div>
                                <div className="suggestion-description">{suggestion.description}</div>
                                <div className="suggestion-action">
                                    <strong>→ {suggestion.suggestion}</strong>
                                </div>
                                {suggestion.details && (
                                    <div className="suggestion-details">{suggestion.details}</div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Teacher Schedules */}
            <div className="schedules-section">
                <h2>📊 Расписания учителей</h2>
                {filteredSchedules.length === 0 ? (
                    <div className="empty-state">
                        <p>Нет уроков на выбранную дату</p>
                    </div>
                ) : (
                    <div className="schedules-grid">
                        {filteredSchedules.map(({ teacher, slots, gaps, conflicts }) => (
                            <div key={teacher.id} className="teacher-schedule-card">
                                <div className="teacher-card-header">
                                    <h3>{teacher.name}</h3>
                                    <span className="teacher-subject">{teacher.subject}</span>
                                </div>

                                <div className="teacher-stats">
                                    <div className="stat-item">
                                        <span className="stat-label">Уроков:</span>
                                        <span className="stat-value">{slots.length}</span>
                                    </div>
                                    <div className="stat-item">
                                        <span className="stat-label">Окон:</span>
                                        <span className={`stat-value ${gaps.length > 0 ? 'text-warning' : 'text-success'}`}>
                                            {gaps.length}
                                        </span>
                                    </div>
                                    <div className="stat-item">
                                        <span className="stat-label">Конфликтов:</span>
                                        <span className={`stat-value ${conflicts.length > 0 ? 'text-danger' : 'text-success'}`}>
                                            {conflicts.length}
                                        </span>
                                    </div>
                                </div>

                                <div className="lesson-timeline">
                                    {slots.map((slot, index) => (
                                        <React.Fragment key={slot.id}>
                                            <div className="timeline-item">
                                                <div className="timeline-number">{slot.lessonNumber}</div>
                                                <div className="timeline-content">
                                                    <div className="timeline-time">{slot.startTime}-{slot.endTime}</div>
                                                    <div className="timeline-subject">{slot.subject}</div>
                                                    <div className="timeline-class">{slot.grade}</div>
                                                </div>
                                            </div>
                                            {index < slots.length - 1 && slots[index + 1].lessonNumber - slot.lessonNumber > 1 && (
                                                <div className="timeline-gap">
                                                    ⏸️ Окно ({slots[index + 1].lessonNumber - slot.lessonNumber - 1} урок)
                                                </div>
                                            )}
                                        </React.Fragment>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default ScheduleOptimizationPage;
