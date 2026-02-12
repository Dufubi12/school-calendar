import React, { useState, useMemo } from 'react';
import { SUBJECTS, GRADES, AVAILABILITY_PRESETS } from '../../data/mockData';
import { useSchedule } from '../../context/ScheduleContext'; // Access live data
import { X, UserX, UserCheck, Calendar, AlertCircle, CheckCircle2, Info } from 'lucide-react';
import { format } from 'date-fns';
import { getAvailableTeachers } from '../../utils/scheduleUtils';

const SubstitutionModal = ({ date, isOpen, onClose, onSave, initialData }) => {
    if (!isOpen) return null;

    const { events, teachers, timeSlots } = useSchedule();

    // Form State
    const [absentTeacherId, setAbsentTeacherId] = useState('');
    const [selectedSubject, setSelectedSubject] = useState('');
    const [selectedGrade, setSelectedGrade] = useState('');
    const [selectedLesson, setSelectedLesson] = useState(1);
    const [startTime, setStartTime] = useState('');
    const [endTime, setEndTime] = useState('');

    // Initialize/Update state when initialData changes
    React.useEffect(() => {
        if (isOpen && initialData) {
            setAbsentTeacherId(initialData.teacherId || '');
            setSelectedSubject(initialData.subject || '');
            setSelectedGrade(initialData.grade || '');
            setSelectedLesson(initialData.lessonNumber || 1);
            setStartTime(initialData.startTime || '');
            setEndTime(initialData.endTime || '');
        } else if (isOpen && !initialData) {
            // Reset if opened empty
            setAbsentTeacherId('');
            setSelectedSubject('');
            setSelectedGrade('');
            setSelectedLesson(1);
            setStartTime('');
            setEndTime('');
        }
    }, [isOpen, initialData]);

    // Selection State
    const [selectedSubstituteId, setSelectedSubstituteId] = useState('');

    // 1. Auto-fill subject/grade if teacher is selected
    const handleAbsentTeacherChange = (id) => {
        setAbsentTeacherId(id);
        const teacher = teachers.find(t => t.id === parseInt(id));
        if (teacher) {
            setSelectedSubject(teacher.subject);
            setSelectedGrade(teacher.grades[0]);
        }
    };

    // 2. Filter & Analyze Candidates using improved utility
    const candidates = useMemo(() => {
        if (!absentTeacherId) return [];

        const dateKey = format(date, 'yyyy-MM-dd');

        // Create time slot object for checking
        const timeSlot = {
            date: dateKey,
            startTime: startTime || AVAILABILITY_PRESETS[selectedLesson - 1]?.start || '08:30',
            endTime: endTime || AVAILABILITY_PRESETS[selectedLesson - 1]?.end || '09:15',
            lessonNumber: parseInt(selectedLesson)
        };

        // Get available teachers using utility function
        const availableTeachers = getAvailableTeachers(
            timeSlot,
            teachers.filter(t => t.id !== parseInt(absentTeacherId)), // Exclude absent teacher
            timeSlots,
            selectedSubject || null
        );

        // Filter by grade if selected
        const filteredTeachers = selectedGrade
            ? availableTeachers.filter(t => t.grades && t.grades.includes(selectedGrade))
            : availableTeachers;

        // Transform to match current component structure
        const mapped = filteredTeachers.map(teacher => {
            const dayEvents = events.filter(e => e.teacherId === teacher.id && e.date === dateKey);

            return {
                ...teacher,
                workload: dayEvents.length,
                workloadDetails: dayEvents.map(e => e.lessonNumber).sort((a, b) => a - b).join(', '),
                isBusy: teacher.hasConflict,
                busyReason: teacher.conflicts && teacher.conflicts.length > 0
                    ? `${teacher.conflicts[0].subject || 'Урок'} (${teacher.conflicts[0].startTime}-${teacher.conflicts[0].endTime})`
                    : null
            };
        });

        // Sort: Free teachers first, then by workload
        return mapped.sort((a, b) => {
            if (a.isBusy === b.isBusy) {
                return a.workload - b.workload;
            }
            return a.isBusy ? 1 : -1;
        });
    }, [absentTeacherId, selectedSubject, selectedGrade, selectedLesson, startTime, endTime, date, events, teachers, timeSlots]);

    const handleSave = () => {
        if (onSave && date && absentTeacherId && selectedSubstituteId) {
            const subTeacher = teachers.find(t => t.id === parseInt(selectedSubstituteId));
            onSave({
                date: format(date, 'yyyy-MM-dd'),
                absentTeacherId: parseInt(absentTeacherId),
                substituteTeacherId: parseInt(selectedSubstituteId),
                lessonNumber: parseInt(selectedLesson),
                subject: selectedSubject,
                grade: selectedGrade,
                startTime,
                endTime,
                // Helper text for display
                details: `${subTeacher?.name} • ${selectedSubject}`
            });
            // Reset
            setAbsentTeacherId('');
            setSelectedSubstituteId('');
            onClose();
        }
    };

    return (
        <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1000,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            backdropFilter: 'blur(4px)'
        }}>
            <div className="card" style={{ width: '700px', maxWidth: '95%', maxHeight: '90vh', overflowY: 'auto' }}>

                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid var(--color-border)', paddingBottom: '1rem' }}>
                    <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Calendar className="text-blue-600" size={24} />
                        Замена на {date?.toLocaleDateString()}
                    </h2>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                        <X size={24} color="var(--color-text-muted)" />
                    </button>
                </div>

                {/* Form: Absent Teacher & Params */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
                    <div>
                        <label className="label">Отсутствующий учитель</label>
                        <select
                            className="input-field"
                            value={absentTeacherId}
                            onChange={(e) => handleAbsentTeacherChange(e.target.value)}
                        >
                            <option value="">Выберите...</option>
                            {teachers.map(t => (
                                <option key={t.id} value={t.id}>{t.name}</option>
                            ))}
                        </select>
                    </div>

                    {absentTeacherId && (
                        <div>
                            <label className="label">Урок №</label>
                            <select className="input-field" value={selectedLesson} onChange={e => {
                                const val = e.target.value;
                                setSelectedLesson(val);
                                // Auto-update time if using presets
                                const preset = AVAILABILITY_PRESETS[val - 1];
                                if (preset) {
                                    setStartTime(preset.start);
                                    setEndTime(preset.end);
                                }
                            }}>
                                {[1, 2, 3, 4, 5, 6, 7, 8].map(l => <option key={l} value={l}>{l}</option>)}
                            </select>
                            {startTime && endTime && (
                                <div style={{ fontSize: '0.8rem', marginTop: '0.5rem', color: '#666' }}>
                                    Время: <b>{startTime} - {endTime}</b>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {absentTeacherId && (
                    <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', padding: '1rem', backgroundColor: '#f8fafc', borderRadius: '0.5rem', border: '1px solid var(--color-border)' }}>
                        <div style={{ flex: 1 }}>
                            <label className="label">Предмет</label>
                            <select className="input-field" value={selectedSubject} onChange={e => setSelectedSubject(e.target.value)}>
                                {SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                        </div>
                        <div style={{ flex: 1 }}>
                            <label className="label">Классы</label>
                            <select className="input-field" value={selectedGrade} onChange={e => setSelectedGrade(e.target.value)}>
                                {GRADES.map(g => <option key={g} value={g}>{g}</option>)}
                            </select>
                        </div>
                    </div>
                )}

                {/* Step 2: Candidates List */}
                {absentTeacherId && (
                    <div style={{ marginBottom: '2rem' }}>
                        <h3 style={{ fontSize: '1rem', marginBottom: '0.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span>Кандидаты на замену ({candidates.length})</span>
                            <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', fontWeight: 'normal' }}>
                                {selectedSubject ? `Предмет: "${selectedSubject}"` : 'Все предметы'}
                            </span>
                        </h3>

                        {/* Info hint */}
                        {candidates.filter(t => !t.isBusy).length > 0 && (
                            <div style={{
                                padding: '0.75rem',
                                backgroundColor: '#f0fdf4',
                                border: '1px solid #bbf7d0',
                                borderRadius: '6px',
                                marginBottom: '0.75rem',
                                fontSize: '0.875rem',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem',
                                color: '#15803d'
                            }}>
                                <Info size={16} />
                                <span>
                                    🟢 Свободно: {candidates.filter(t => !t.isBusy).length} учителей
                                    {candidates.filter(t => t.isBusy).length > 0 && ` | 🔴 Заняты: ${candidates.filter(t => t.isBusy).length}`}
                                </span>
                            </div>
                        )}

                        <div style={{ maxHeight: '350px', overflowY: 'auto', border: '1px solid var(--color-border)', borderRadius: 'var(--radius)' }}>
                            {candidates.length === 0 ? (
                                <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>
                                    <UserX size={48} style={{ margin: '0 auto 1rem', opacity: 0.3 }} />
                                    <p>Нет учителей с таким предметом и классами.</p>
                                </div>
                            ) : (
                                candidates.map(t => {
                                    let loadColor = '#22c55e'; // Green
                                    if (t.workload >= 3 && t.workload <= 4) loadColor = '#eab308';
                                    if (t.workload >= 5) loadColor = '#ef4444';

                                    const isSelected = selectedSubstituteId === t.id;

                                    return (
                                        <div
                                            key={t.id}
                                            onClick={() => setSelectedSubstituteId(t.id)}
                                            style={{
                                                padding: '1rem',
                                                borderBottom: '1px solid var(--color-border)',
                                                cursor: 'pointer',
                                                backgroundColor: isSelected ? '#dbeafe' : (t.isBusy ? '#fef2f2' : '#f0fdf4'),
                                                borderLeft: isSelected ? '4px solid #3b82f6' : (t.isBusy ? '4px solid #ef4444' : '4px solid #10b981'),
                                                display: 'flex',
                                                justifyContent: 'space-between',
                                                alignItems: 'center',
                                                transition: 'all 0.2s',
                                                position: 'relative'
                                            }}
                                            onMouseEnter={(e) => {
                                                if (!isSelected) {
                                                    e.currentTarget.style.backgroundColor = t.isBusy ? '#fee2e2' : '#dcfce7';
                                                }
                                            }}
                                            onMouseLeave={(e) => {
                                                if (!isSelected) {
                                                    e.currentTarget.style.backgroundColor = t.isBusy ? '#fef2f2' : '#f0fdf4';
                                                }
                                            }}
                                        >
                                            {/* Status Icon */}
                                            <div style={{
                                                width: '48px',
                                                height: '48px',
                                                borderRadius: '50%',
                                                backgroundColor: t.isBusy ? '#fee2e2' : '#dcfce7',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                marginRight: '1rem',
                                                flexShrink: 0,
                                                border: `2px solid ${t.isBusy ? '#fecaca' : '#bbf7d0'}`
                                            }}>
                                                {t.isBusy ? (
                                                    <UserX size={24} color="#ef4444" />
                                                ) : (
                                                    <UserCheck size={24} color="#10b981" />
                                                )}
                                            </div>

                                            <div style={{ flex: 1 }}>
                                                <div style={{
                                                    fontWeight: '600',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '0.5rem',
                                                    marginBottom: '0.25rem'
                                                }}>
                                                    {t.name}
                                                    {t.isBusy ? (
                                                        <span style={{ fontSize: '1rem' }}>🔴</span>
                                                    ) : (
                                                        <span style={{ fontSize: '1rem' }}>🟢</span>
                                                    )}
                                                </div>

                                                {t.isBusy && (
                                                    <div style={{
                                                        fontSize: '0.75rem',
                                                        color: '#dc2626',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: '4px',
                                                        backgroundColor: '#fee2e2',
                                                        padding: '4px 8px',
                                                        borderRadius: '4px',
                                                        marginBottom: '0.5rem',
                                                        width: 'fit-content'
                                                    }}>
                                                        <AlertCircle size={12} />
                                                        <span>ЗАНЯТ: {t.busyReason}</span>
                                                    </div>
                                                )}

                                                <div style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
                                                    Нагрузка: <span style={{ color: loadColor, fontWeight: 'bold' }}>{t.workload} ур.</span>
                                                    {t.workload > 0 && ` (уроки: ${t.workloadDetails})`}
                                                </div>

                                                {/* Workload bar */}
                                                <div style={{
                                                    marginTop: '0.5rem',
                                                    height: '4px',
                                                    backgroundColor: '#e5e7eb',
                                                    borderRadius: '2px',
                                                    overflow: 'hidden'
                                                }}>
                                                    <div style={{
                                                        width: `${Math.min((t.workload / 8) * 100, 100)}%`,
                                                        height: '100%',
                                                        backgroundColor: loadColor,
                                                        transition: 'width 0.3s'
                                                    }} />
                                                </div>
                                            </div>

                                            <div style={{ marginLeft: '1rem' }}>
                                                {isSelected && (
                                                    <CheckCircle2 size={28} color="#3b82f6" />
                                                )}
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>
                )}

                {/* Warning if busy teacher selected */}
                {selectedSubstituteId && candidates.find(t => t.id === selectedSubstituteId)?.isBusy && (
                    <div style={{
                        padding: '1rem',
                        backgroundColor: '#fef2f2',
                        border: '1px solid #fecaca',
                        borderRadius: '6px',
                        marginBottom: '1rem',
                        display: 'flex',
                        alignItems: 'start',
                        gap: '0.75rem'
                    }}>
                        <AlertCircle size={20} color="#ef4444" style={{ flexShrink: 0, marginTop: '2px' }} />
                        <div style={{ fontSize: '0.875rem', color: '#991b1b' }}>
                            <strong>Внимание!</strong> Выбранный учитель занят в это время.
                            <br />Это создаст конфликт в расписании. Рекомендуется выбрать свободного учителя.
                        </div>
                    </div>
                )}

                {/* Footer */}
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', borderTop: '1px solid var(--color-border)', paddingTop: '1rem' }}>
                    <button className="btn btn-secondary" onClick={onClose}>
                        Отмена
                    </button>
                    <button
                        className="btn btn-primary"
                        onClick={handleSave}
                        disabled={!absentTeacherId || !selectedSubstituteId}
                        title={!selectedSubstituteId ? "Выберите учителя для замены" : ""}
                        style={{
                            backgroundColor: selectedSubstituteId && candidates.find(t => t.id === selectedSubstituteId)?.isBusy
                                ? '#f59e0b'
                                : undefined
                        }}
                    >
                        {selectedSubstituteId && candidates.find(t => t.id === selectedSubstituteId)?.isBusy
                            ? '⚠️ Сохранить (с конфликтом)'
                            : 'Сохранить замену'}
                    </button>
                </div>

            </div>
        </div>
    );
};

export default SubstitutionModal;
