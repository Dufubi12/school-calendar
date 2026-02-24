import React, { useState } from 'react';
import { SUBJECTS, GRADES, AVAILABILITY_PRESETS } from '../../data/mockData';
import { useSchedule } from '../../context/ScheduleContext';
import { X } from 'lucide-react';
import { format } from 'date-fns';

const LessonModal = ({ date, isOpen, onClose, onSave }) => {
    const { teachers, events } = useSchedule();

    const [teacherId, setTeacherId] = useState('');
    const [selectedSubject, setSelectedSubject] = useState('');
    const [selectedGrade, setSelectedGrade] = useState('');
    const [selectedLesson, setSelectedLesson] = useState(1);
    const [startTime, setStartTime] = useState('');
    const [endTime, setEndTime] = useState('');

    if (!isOpen) return null;

    // Helpers
    const getLessonTime = (lessonNum) => {
        const index = lessonNum - 1;
        if (index >= 0 && index < AVAILABILITY_PRESETS.length) {
            return AVAILABILITY_PRESETS[index];
        }
        return null;
    };

    const isTeacherWorking = (teacher, checkDate, lessonNum) => {
        if (!teacher.workSchedule) return { working: true };
        const { startDate, endDate, slots } = teacher.workSchedule;
        const checkDateStr = format(checkDate, 'yyyy-MM-dd');

        if (startDate && checkDateStr < startDate) return { working: false, reason: 'График еще не начался' };
        if (endDate && checkDateStr > endDate) return { working: false, reason: 'График уже закончился' };

        if (slots && slots.length > 0) {
            const lessonTime = getLessonTime(lessonNum);
            if (!lessonTime) return { working: true };
            const isCovered = slots.some(slot =>
                slot.start <= lessonTime.start && slot.end >= lessonTime.end
            );
            if (!isCovered) return { working: false, reason: 'Не рабочее время' };
        }
        return { working: true };
    };

    const hasConflict = (tId, checkDate, lessonNum) => {
        const checkDateStr = format(checkDate, 'yyyy-MM-dd');
        return events.some(ev =>
            ev.date === checkDateStr &&
            ev.teacherId === parseInt(tId) &&
            ev.lessonNumber === parseInt(lessonNum)
        );
    };

    const getAvailableSlots = (tId) => {
        const teacher = teachers.find(t => t.id === parseInt(tId));
        if (!teacher) return [];

        const slots = [1, 2, 3, 4, 5, 6, 7, 8];
        return slots.map(num => {
            const workCheck = isTeacherWorking(teacher, date, num);
            const conflict = hasConflict(tId, date, num);
            const time = getLessonTime(num);
            return {
                num,
                time: time ? time.start : '?',
                available: workCheck.working && !conflict,
                reason: !workCheck.working ? workCheck.reason : (conflict ? 'Занят' : '')
            };
        });
    };

    const handleTeacherChange = (id) => {
        setTeacherId(id);
        const teacher = teachers.find(t => t.id === parseInt(id));
        if (teacher) {
            setSelectedSubject(teacher.subject);
            setSelectedGrade(teacher.grades[0]);

            // Auto-select first available slot
            const slots = getAvailableSlots(id);
            const firstAvailable = slots.find(s => s.available);
            if (firstAvailable) {
                setSelectedLesson(firstAvailable.num);
                const time = getLessonTime(firstAvailable.num);
                if (time) {
                    setStartTime(time.start);
                    setEndTime(time.end);
                }
            }
        }
    };

    const handleLessonChange = (lessonNum) => {
        setSelectedLesson(lessonNum);
        const time = getLessonTime(lessonNum);
        if (time) {
            setStartTime(time.start);
            setEndTime(time.end);
        }
    };

    const handleSave = () => {
        if (onSave && date && teacherId) {
            const teacher = teachers.find(t => t.id === parseInt(teacherId));
            const slots = getAvailableSlots(teacherId);
            const currentSlot = slots.find(s => s.num === parseInt(selectedLesson));

            if (currentSlot && !currentSlot.available) {
                if (!confirm(`ВНИМАНИЕ: ${currentSlot.reason}. Всё равно добавить?`)) return;
            }

            onSave({
                id: Date.now(),
                date: format(date, 'yyyy-MM-dd'),
                teacherId: parseInt(teacherId),
                subject: selectedSubject,
                grade: selectedGrade,
                lessonNumber: parseInt(selectedLesson),
                startTime,
                endTime,
                details: `${teacher?.name} • ${selectedSubject}`,
                type: 'lesson'
            });
            onClose();
        }
    };

    const availableSlots = teacherId ? getAvailableSlots(teacherId) : [];

    return (
        <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1100,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            backdropFilter: 'blur(4px)'
        }}>
            <div className="card" style={{ width: '500px', maxWidth: '90%' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                    <h2 style={{ margin: 0 }}>Новый урок {date?.toLocaleDateString()}</h2>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={24} /></button>
                </div>

                {/* 1. Select Teacher First */}
                <div style={{ marginBottom: '1rem' }}>
                    <label className="label">Учитель</label>
                    <select className="input-field" value={teacherId} onChange={e => handleTeacherChange(e.target.value)}>
                        <option value="">Выберите учителя...</option>
                        {teachers.map(t => (
                            <option key={t.id} value={t.id}>{t.name}</option>
                        ))}
                    </select>
                </div>

                {/* 2. Select Time (Dependent on Teacher) */}
                {teacherId && (
                    <div style={{ marginBottom: '1rem', padding: '0.5rem', backgroundColor: '#f8fafc', borderRadius: '8px' }}>
                        <label className="label">Доступное время</label>
                        <select className="input-field" value={selectedLesson} onChange={e => handleLessonChange(e.target.value)}>
                            {availableSlots.map(slot => (
                                <option key={slot.num} value={slot.num} style={{ color: slot.available ? 'inherit' : '#ef4444' }}>
                                    {slot.num} ({slot.time}) {slot.available ? '' : `— ${slot.reason}`}
                                </option>
                            ))}
                        </select>

                        <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                            <div style={{ flex: 1 }}>
                                <label className="label" style={{ fontSize: '0.8rem' }}>Начало</label>
                                <input
                                    type="time"
                                    className="input-field"
                                    value={startTime}
                                    onChange={e => setStartTime(e.target.value)}
                                />
                            </div>
                            <div style={{ flex: 1 }}>
                                <label className="label" style={{ fontSize: '0.8rem' }}>Конец</label>
                                <input
                                    type="time"
                                    className="input-field"
                                    value={endTime}
                                    onChange={e => setEndTime(e.target.value)}
                                />
                            </div>
                        </div>
                    </div>
                )}

                {teacherId && (
                    <>
                        <div style={{ marginBottom: '1rem' }}>
                            <label className="label">Предмет</label>
                            <input
                                className="input-field"
                                value={selectedSubject}
                                readOnly
                                style={{ backgroundColor: '#f3f4f6', cursor: 'not-allowed' }}
                            />
                        </div>
                        <div style={{ marginBottom: '1.5rem' }}>
                            <label className="label">Класс</label>
                            <select className="input-field" value={selectedGrade} onChange={e => setSelectedGrade(e.target.value)}>
                                {GRADES.map(g => <option key={g} value={g}>{g}</option>)}
                            </select>
                        </div>
                    </>
                )}

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
                    <button className="btn btn-secondary" onClick={onClose}>Отмена</button>
                    <button className="btn btn-primary" onClick={handleSave} disabled={!teacherId}>Добавить урок</button>
                </div>
            </div>
        </div>
    );
};

export default LessonModal;
