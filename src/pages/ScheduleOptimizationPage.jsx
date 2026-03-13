import React, { useState, useMemo } from 'react';
import { useSchedule } from '../context/ScheduleContext';
import './ScheduleOptimizationPage.css';

const ScheduleOptimizationPage = () => {
    const { teachers, getSlotsForDate, updateTimeSlot, assignTeacherToSlot, addTimeSlot, removeTimeSlot, bellSchedule } = useSchedule();
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
    const [selectedTeacher, setSelectedTeacher] = useState('all');
    const [swapSlot, setSwapSlot] = useState(null); // slot being edited
    const [swapMode, setSwapMode] = useState('replace'); // 'replace' | 'swap' | 'remove'

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
                const gaps = findGaps(teacherSlots);

                // Enrich gaps with fill suggestions
                const enrichedGaps = gaps.map(gap => {
                    const suggestions = [];
                    // For each missing lesson number in the gap
                    for (let ln = gap.startLesson + 1; ln < gap.endLesson; ln++) {
                        // Find which classes have lessons at this number (busy classes)
                        const busyClasses = new Set(
                            slots.filter(s => s.lessonNumber === ln).map(s => s.grade)
                        );
                        // Find all classes this teacher already teaches (get class list)
                        const teacherClasses = new Set(teacherSlots.map(s => s.grade));
                        // Suggest classes this teacher teaches that DON'T have a lesson at this time
                        teacherClasses.forEach(cls => {
                            if (!busyClasses.has(cls)) {
                                // This class has no lesson at this slot - teacher could fill it
                                const teacherSubjects = teacher.subject.split(',').map(s => s.trim());
                                teacherSubjects.forEach(subj => {
                                    if (subj) {
                                        suggestions.push({
                                            lessonNumber: ln,
                                            grade: cls,
                                            subject: subj,
                                            teacherId: teacher.id,
                                            teacherName: teacher.name,
                                        });
                                    }
                                });
                            }
                        });
                        // Also find any free class (no lesson at this time) that teacher doesn't already teach
                        const allClasses = new Set(slots.map(s => s.grade));
                        allClasses.forEach(cls => {
                            if (!busyClasses.has(cls) && !teacherClasses.has(cls)) {
                                const teacherSubjects = teacher.subject.split(',').map(s => s.trim());
                                teacherSubjects.forEach(subj => {
                                    if (subj) {
                                        suggestions.push({
                                            lessonNumber: ln,
                                            grade: cls,
                                            subject: subj,
                                            teacherId: teacher.id,
                                            teacherName: teacher.name,
                                        });
                                    }
                                });
                            }
                        });
                    }
                    return { ...gap, suggestions: suggestions.slice(0, 6) };
                });

                teacherSchedules[teacher.id] = {
                    teacher,
                    slots: teacherSlots,
                    gaps: enrichedGaps,
                    conflicts: findConflicts(teacherSlots, slots),
                    totalLessons: teacherSlots.length
                };
            }
        });

        return { teacherSchedules, allSlots: slots };
    }, [selectedDate, teachers, getSlotsForDate]);

    // Get optimization suggestions
    const getOptimizationSuggestions = () => {
        const suggestions = [];

        Object.values(scheduleAnalysis.teacherSchedules).forEach(({ teacher, gaps, conflicts, slots }) => {
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
        ? Object.values(scheduleAnalysis.teacherSchedules)
        : Object.values(scheduleAnalysis.teacherSchedules).filter(s => s.teacher.id === parseInt(selectedTeacher));

    const filteredSuggestions = selectedTeacher === 'all'
        ? suggestions
        : suggestions.filter(s => {
            const teacher = teachers.find(t => t.id === parseInt(selectedTeacher));
            return teacher && s.teacher === teacher.name;
        });

    // === SWAP/REPLACE HANDLERS ===

    // Get available teachers for a specific lesson number (not busy at that time)
    const getAvailableTeachersForLesson = (lessonNumber) => {
        const allSlots = scheduleAnalysis.allSlots;
        const busyTeacherIds = new Set(
            allSlots.filter(s => s.lessonNumber === lessonNumber).map(s => s.teacherId).filter(Boolean)
        );
        return teachers.filter(t => !busyTeacherIds.has(t.id));
    };

    // Get all lessons from other classes at the same lesson number
    const getOtherClassLessons = (slot) => {
        const allSlots = scheduleAnalysis.allSlots;
        return allSlots.filter(s =>
            s.lessonNumber === slot.lessonNumber &&
            s.grade !== slot.grade &&
            s.id !== slot.id
        );
    };

    // Get classes that have NO lesson at this lesson number (free classes)
    const getFreeClassesAtLesson = (lessonNumber) => {
        const allSlots = scheduleAnalysis.allSlots;
        const allClassesInSchedule = new Set(allSlots.map(s => s.grade));
        const busyClasses = new Set(
            allSlots.filter(s => s.lessonNumber === lessonNumber).map(s => s.grade)
        );
        return [...allClassesInSchedule].filter(cls => !busyClasses.has(cls)).sort();
    };

    // Handler: Replace teacher for a slot
    const handleReplaceTeacher = (slot, newTeacherId) => {
        assignTeacherToSlot(slot.id, newTeacherId, slot.subject);
        setSwapSlot(null);
    };

    // Handler: Swap two lessons between classes
    const handleSwapLessons = (slotA, slotB) => {
        // Swap subjects, teachers, grades between two slots
        updateTimeSlot({
            id: slotA.id,
            subject: slotB.subject,
            teacherId: slotB.teacherId,
            teacherName: slotB.teacherName,
            grade: slotA.grade // keep class the same — we're moving the lesson content
        });
        updateTimeSlot({
            id: slotB.id,
            subject: slotA.subject,
            teacherId: slotA.teacherId,
            teacherName: slotA.teacherName,
            grade: slotB.grade
        });
        setSwapSlot(null);
    };

    // Handler: Move a lesson from another class to this slot (steal)
    const handleStealLesson = (targetSlot, sourceSlot) => {
        // Put source lesson content into target slot
        updateTimeSlot({
            id: targetSlot.id,
            subject: sourceSlot.subject,
            teacherId: sourceSlot.teacherId,
            teacherName: sourceSlot.teacherName,
        });
        // Clear the source slot (make it a gap)
        removeTimeSlot(sourceSlot.id);
        setSwapSlot(null);
    };

    // Handler: Remove/cancel a lesson
    const handleRemoveLesson = (slot) => {
        removeTimeSlot(slot.id);
        setSwapSlot(null);
    };

    // Handler: Assign a free class to fill a gap
    const handleFillWithNewLesson = (slot, grade, teacherId, subject) => {
        const bell = bellSchedule.find(b => b.lessonNumber === slot.lessonNumber);
        addTimeSlot({
            id: Date.now(),
            date: slot.date,
            startTime: bell ? bell.startTime : slot.startTime,
            endTime: bell ? bell.endTime : slot.endTime,
            subject: subject,
            teacherId: teacherId,
            teacherName: teachers.find(t => t.id === teacherId)?.name || '',
            grade: grade,
            lessonNumber: slot.lessonNumber,
            type: 'regular',
        });
        setSwapSlot(null);
    };

    // Calculate statistics
    const stats = {
        totalTeachers: Object.keys(scheduleAnalysis.teacherSchedules).length,
        teachersWithGaps: Object.values(scheduleAnalysis.teacherSchedules).filter(s => s.gaps.length > 0).length,
        totalGaps: Object.values(scheduleAnalysis.teacherSchedules).reduce((sum, s) => sum + s.gaps.length, 0),
        totalConflicts: Object.values(scheduleAnalysis.teacherSchedules).reduce((sum, s) => sum + s.conflicts.length, 0)
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
                                    {slots.map((slot, index) => {
                                        // Find gap after this slot
                                        const gapAfter = index < slots.length - 1 && slots[index + 1].lessonNumber - slot.lessonNumber > 1
                                            ? gaps.find(g => g.startLesson === slot.lessonNumber)
                                            : null;

                                        return (
                                        <React.Fragment key={slot.id}>
                                            <div
                                                className="timeline-item timeline-item--clickable"
                                                onClick={() => { setSwapSlot(slot); setSwapMode('replace'); }}
                                                title="Нажмите для замены/переноса урока"
                                            >
                                                <div className="timeline-number">{slot.lessonNumber}</div>
                                                <div className="timeline-content">
                                                    <div className="timeline-time">{slot.startTime}-{slot.endTime}</div>
                                                    <div className="timeline-subject">{slot.subject}</div>
                                                    <div className="timeline-class">{slot.grade}</div>
                                                </div>
                                                <div className="timeline-edit-icon">✏️</div>
                                            </div>
                                            {gapAfter && (
                                                <div className="timeline-gap-expanded">
                                                    <div className="timeline-gap-header">
                                                        ⏸️ Окно ({gapAfter.gapSize} {gapAfter.gapSize === 1 ? 'урок' : 'урока'})
                                                    </div>
                                                    {gapAfter.suggestions && gapAfter.suggestions.length > 0 ? (
                                                        <div className="timeline-gap-suggestions">
                                                            <div className="gap-suggest-title">Варианты заполнения:</div>
                                                            {gapAfter.suggestions.map((s, idx) => (
                                                                <div key={idx} className="gap-suggest-item">
                                                                    <span className="gap-suggest-lesson">Ур. {s.lessonNumber}</span>
                                                                    <span className="gap-suggest-class">{s.grade}</span>
                                                                    <span className="gap-suggest-subject">{s.subject}</span>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    ) : (
                                                        <div className="timeline-gap-no-options">
                                                            Нет свободных классов для заполнения
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </React.Fragment>
                                        );
                                    })}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* === SWAP/REPLACE MODAL === */}
            {swapSlot && (
                <div className="swap-modal-overlay" onClick={() => setSwapSlot(null)}>
                    <div className="swap-modal" onClick={(e) => e.stopPropagation()}>
                        <div className="swap-modal__header">
                            <h2>Замена / Перенос урока</h2>
                            <button className="swap-modal__close" onClick={() => setSwapSlot(null)}>×</button>
                        </div>

                        {/* Current lesson info */}
                        <div className="swap-modal__current">
                            <div className="swap-current-info">
                                <div className="swap-current-badge">{swapSlot.lessonNumber} урок</div>
                                <div className="swap-current-details">
                                    <strong>{swapSlot.subject}</strong>
                                    <span>{swapSlot.grade}</span>
                                    <span>{swapSlot.startTime}-{swapSlot.endTime}</span>
                                    <span>{swapSlot.teacherName || teachers.find(t => t.id === swapSlot.teacherId)?.name || 'Не назначен'}</span>
                                </div>
                            </div>
                        </div>

                        {/* Mode tabs */}
                        <div className="swap-modal__tabs">
                            <button
                                className={`swap-tab ${swapMode === 'replace' ? 'swap-tab--active' : ''}`}
                                onClick={() => setSwapMode('replace')}
                            >
                                👤 Заменить учителя
                            </button>
                            <button
                                className={`swap-tab ${swapMode === 'swap' ? 'swap-tab--active' : ''}`}
                                onClick={() => setSwapMode('swap')}
                            >
                                🔄 Поменять с другим классом
                            </button>
                            <button
                                className={`swap-tab ${swapMode === 'remove' ? 'swap-tab--active' : ''}`}
                                onClick={() => setSwapMode('remove')}
                            >
                                🗑️ Убрать урок
                            </button>
                        </div>

                        <div className="swap-modal__body">
                            {/* MODE: Replace teacher */}
                            {swapMode === 'replace' && (() => {
                                const available = getAvailableTeachersForLesson(swapSlot.lessonNumber);
                                return (
                                    <div className="swap-teacher-list">
                                        <p className="swap-section-hint">Выберите нового учителя (свободны на {swapSlot.lessonNumber} уроке):</p>
                                        {available.length === 0 ? (
                                            <div className="swap-empty">Нет свободных учителей на этот урок</div>
                                        ) : (
                                            available.map(t => (
                                                <button
                                                    key={t.id}
                                                    className={`swap-teacher-btn ${t.id === swapSlot.teacherId ? 'swap-teacher-btn--current' : ''}`}
                                                    onClick={() => handleReplaceTeacher(swapSlot, t.id)}
                                                    disabled={t.id === swapSlot.teacherId}
                                                >
                                                    <span className="swap-teacher-name">{t.name}</span>
                                                    <span className="swap-teacher-subj">{t.subject}</span>
                                                    {t.id === swapSlot.teacherId && <span className="swap-badge-current">текущий</span>}
                                                </button>
                                            ))
                                        )}
                                    </div>
                                );
                            })()}

                            {/* MODE: Swap with another class */}
                            {swapMode === 'swap' && (() => {
                                const otherLessons = getOtherClassLessons(swapSlot);
                                const freeClasses = getFreeClassesAtLesson(swapSlot.lessonNumber);
                                return (
                                    <div className="swap-classes-section">
                                        {/* Swap with existing lesson */}
                                        <div className="swap-subsection">
                                            <h4>🔄 Поменять местами с уроком другого класса:</h4>
                                            <p className="swap-section-hint">
                                                Урок из выбранного класса переходит в {swapSlot.grade}, а урок из {swapSlot.grade} переходит туда
                                            </p>
                                            {otherLessons.length === 0 ? (
                                                <div className="swap-empty">Нет других уроков на этом слоте</div>
                                            ) : (
                                                <div className="swap-lesson-grid">
                                                    {otherLessons.map(other => (
                                                        <button
                                                            key={other.id}
                                                            className="swap-lesson-btn"
                                                            onClick={() => handleSwapLessons(swapSlot, other)}
                                                        >
                                                            <div className="swap-lesson-class">{other.grade}</div>
                                                            <div className="swap-lesson-info">
                                                                <strong>{other.subject}</strong>
                                                                <span>{other.teacherName || teachers.find(t => t.id === other.teacherId)?.name || '?'}</span>
                                                            </div>
                                                            <div className="swap-lesson-arrow">⇄</div>
                                                        </button>
                                                    ))}
                                                </div>
                                            )}
                                        </div>

                                        {/* Steal lesson from another class */}
                                        <div className="swap-subsection">
                                            <h4>📥 Забрать урок из другого класса:</h4>
                                            <p className="swap-section-hint">
                                                Урок другого класса переместится в {swapSlot.grade}, а у того класса появится окно
                                            </p>
                                            {otherLessons.length === 0 ? (
                                                <div className="swap-empty">Нет уроков для переноса</div>
                                            ) : (
                                                <div className="swap-lesson-grid">
                                                    {otherLessons.map(other => (
                                                        <button
                                                            key={`steal-${other.id}`}
                                                            className="swap-lesson-btn swap-lesson-btn--steal"
                                                            onClick={() => handleStealLesson(swapSlot, other)}
                                                        >
                                                            <div className="swap-lesson-class">{other.grade}</div>
                                                            <div className="swap-lesson-info">
                                                                <strong>{other.subject}</strong>
                                                                <span>{other.teacherName || teachers.find(t => t.id === other.teacherId)?.name || '?'}</span>
                                                            </div>
                                                            <div className="swap-lesson-arrow">→ {swapSlot.grade}</div>
                                                        </button>
                                                    ))}
                                                </div>
                                            )}
                                        </div>

                                        {/* Free classes - add lesson there */}
                                        {freeClasses.length > 0 && (
                                            <div className="swap-subsection">
                                                <h4>📋 Свободные классы на {swapSlot.lessonNumber} уроке:</h4>
                                                <div className="swap-free-classes">
                                                    {freeClasses.map(cls => (
                                                        <span key={cls} className="swap-free-badge">{cls}</span>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                );
                            })()}

                            {/* MODE: Remove lesson */}
                            {swapMode === 'remove' && (
                                <div className="swap-remove-section">
                                    <div className="swap-remove-warning">
                                        <div className="swap-remove-icon">⚠️</div>
                                        <p>Вы собираетесь убрать урок:</p>
                                        <div className="swap-remove-details">
                                            <strong>{swapSlot.subject}</strong> — {swapSlot.grade}, {swapSlot.lessonNumber} урок
                                            <br />
                                            Учитель: {swapSlot.teacherName || teachers.find(t => t.id === swapSlot.teacherId)?.name || 'Не назначен'}
                                        </div>
                                        <p className="swap-remove-hint">У класса {swapSlot.grade} появится окно на {swapSlot.lessonNumber} уроке</p>
                                    </div>
                                    <button
                                        className="swap-remove-btn"
                                        onClick={() => handleRemoveLesson(swapSlot)}
                                    >
                                        🗑️ Убрать урок
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ScheduleOptimizationPage;
