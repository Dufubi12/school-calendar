import React, { useState, useMemo } from 'react';
import { SUBJECTS, GRADES, AVAILABILITY_PRESETS } from '../../data/mockData';
import { useSchedule } from '../../context/ScheduleContext'; // Access live data
import { X, UserX, UserCheck, Calendar, AlertCircle, CheckCircle2 } from 'lucide-react';
import { format } from 'date-fns';

const SubstitutionModal = ({ date, isOpen, onClose, onSave, initialData }) => {
    if (!isOpen) return null;

    const { events, teachers } = useSchedule();

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

    // 2. Filter & Analyze Candidates
    const candidates = useMemo(() => {
        if (!absentTeacherId) return [];

        const dateKey = format(date, 'yyyy-MM-dd');

        return teachers.filter(teacher => {
            // Exclude the absent teacher
            if (teacher.id === parseInt(absentTeacherId)) return false;

            // Filter by Qualification (Subject & Grade)
            const subjectMatch = selectedSubject ? teacher.subject === selectedSubject : true;

            // Allow seeing all teachers of the subject, even if grade doesn't match perfectly? 
            // User requested "Show all who teach Russian". So we mainly filter by Subject.
            // Let's keep Grade filter as well but maybe make it optional in future. For now strict.
            const gradeMatch = selectedGrade ? teacher.grades.includes(selectedGrade) : true;

            return subjectMatch && gradeMatch;
        }).map(teacher => {
            // Analyze Status for EACH candidate
            const dayEvents = events.filter(e => e.teacherId === teacher.id && e.date === dateKey);

            // Check exact collision OR Time Overlap
            // const collision = dayEvents.find(e => e.lessonNumber === parseInt(selectedLesson)); // Old logic

            let collision = null;

            if (startTime && endTime) {
                // Time-based overlap check
                collision = dayEvents.find(e => {
                    if (!e.startTime || !e.endTime) return e.lessonNumber === parseInt(selectedLesson); // Fallback

                    // Overlap: (StartA < EndB) && (EndA > StartB)
                    return (e.startTime < endTime) && (e.endTime > startTime);
                });
            } else {
                // Fallback to lesson number if no time set
                collision = dayEvents.find(e => e.lessonNumber === parseInt(selectedLesson));
            }

            return {
                ...teacher,
                workload: dayEvents.length,
                workloadDetails: dayEvents.map(e => e.lessonNumber).sort((a, b) => a - b).join(', '),
                isBusy: !!collision,
                busyReason: collision ? `${collision.subject} (${collision.startTime}-${collision.endTime})` : null
            };
        });
    }, [absentTeacherId, selectedSubject, selectedGrade, selectedLesson, startTime, endTime, date, events]);

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
                        <h3 style={{ fontSize: '1rem', marginBottom: '0.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span>Кандидаты на замену ({candidates.length})</span>
                            <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', fontWeight: 'normal' }}>
                                Показаны учителя предмета "{selectedSubject}"
                            </span>
                        </h3>

                        <div style={{ maxHeight: '300px', overflowY: 'auto', border: '1px solid var(--color-border)', borderRadius: 'var(--radius)' }}>
                            {candidates.length === 0 ? (
                                <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>
                                    Нет учителей с таким предметом и классами.
                                </div>
                            ) : (
                                candidates.map(t => {
                                    let loadColor = '#22c55e'; // Green
                                    if (t.workload >= 3 && t.workload <= 4) loadColor = '#eab308';
                                    if (t.workload >= 5) loadColor = '#ef4444';

                                    return (
                                        <div
                                            key={t.id}
                                            onClick={() => setSelectedSubstituteId(t.id)}
                                            style={{
                                                padding: '0.75rem',
                                                borderBottom: '1px solid var(--color-border)',
                                                cursor: 'pointer',
                                                backgroundColor: selectedSubstituteId === t.id ? '#eff6ff' : (t.isBusy ? '#fff1f2' : 'white'),
                                                display: 'flex',
                                                justifyContent: 'space-between',
                                                alignItems: 'center',
                                                opacity: t.isBusy ? 0.9 : 1
                                            }}
                                        >
                                            <div style={{ flex: 1 }}>
                                                <div style={{ fontWeight: '600', display: 'flex', alignItems: 'center', gap: '0.5rem', color: t.isBusy ? '#881337' : 'inherit' }}>
                                                    {t.name}
                                                    {t.isBusy && (
                                                        <span style={{ fontSize: '0.75rem', color: '#dc2626', display: 'flex', alignItems: 'center', gap: '4px', backgroundColor: '#fee2e2', padding: '2px 6px', borderRadius: '4px' }}>
                                                            <AlertCircle size={12} /> ЗАНЯТ: {t.busyReason}
                                                        </span>
                                                    )}
                                                </div>
                                                <div style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', marginTop: '2px' }}>
                                                    Нагрузка: <span style={{ color: loadColor, fontWeight: 'bold' }}>{t.workload} ур.</span>
                                                    {t.workload > 0 && ` (${t.workloadDetails})`}
                                                </div>
                                            </div>

                                            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                                {selectedSubstituteId === t.id ? (
                                                    <CheckCircle2 size={24} color="var(--color-primary)" />
                                                ) : (
                                                    <div style={{ width: '24px' }}></div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })
                            )}
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
                    >
                        Сохранить замену
                    </button>
                </div>

            </div>
        </div>
    );
};

export default SubstitutionModal;
