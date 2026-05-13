import React, { useState, useMemo } from 'react';
import { useSchedule } from '../context/ScheduleContext';
import { SUBJECTS, GRADES, AVAILABILITY_PRESETS } from '../data/mockData';
import { Trash2, UserPlus, BookOpen, Pencil, Plus, X } from 'lucide-react';
import TeacherWorkloadCard from '../components/Teachers/TeacherWorkloadCard';
import RoleFilterTabs, { filterByRole } from '../components/RoleFilterTabs';

const TeachersPage = () => {
    const { teachers, addTeacher, removeTeacher, updateTeacher } = useSchedule();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [roleFilter, setRoleFilter] = useState('all');

    const filteredTeachers = useMemo(
        () => filterByRole(teachers, roleFilter),
        [teachers, roleFilter]
    );

    // Form State
    const [name, setName] = useState('');
    const [subject, setSubject] = useState(SUBJECTS[0]);
    const [grades, setGrades] = useState([GRADES[1]]);
    const [workSchedule, setWorkSchedule] = useState({
        startDate: '',
        endDate: '',
        slots: []
    });

    const resetForm = () => {
        setName('');
        setSubject(SUBJECTS[0]);
        setGrades([GRADES[1]]);
        setWorkSchedule({
            startDate: '',
            endDate: '',
            slots: []
        });
        setEditingId(null);
    };

    const handleEdit = (teacher) => {
        setEditingId(teacher.id);
        setName(teacher.name);
        setSubject(teacher.subject);
        setGrades(teacher.grades || []);
        setWorkSchedule(teacher.workSchedule || {
            startDate: '',
            endDate: '',
            slots: []
        });
        setIsModalOpen(true);
    };

    const handleDelete = (id) => {
        if (confirm('Вы уверены, что хотите удалить этого учителя?')) {
            removeTeacher(id);
        }
    };

    const handleSave = () => {
        if (!name) return;

        const teacherData = {
            name,
            subject,
            grades,
            workSchedule
        };

        if (editingId) {
            updateTeacher({ ...teacherData, id: editingId });
        } else {
            addTeacher(teacherData);
        }

        setIsModalOpen(false);
        resetForm();
    };

    const toggleGrade = (grade) => {
        if (grades.includes(grade)) {
            setGrades(grades.filter(g => g !== grade));
        } else {
            setGrades([...grades, grade]);
        }
    };

    const addTimeSlot = (preset = null) => {
        const newSlot = preset ? { ...preset } : { start: '09:00', end: '09:45' };
        setWorkSchedule(prev => ({
            ...prev,
            slots: [...prev.slots, { ...newSlot, id: Date.now() + Math.random() }]
        }));
    };

    const removeTimeSlot = (slotId) => {
        setWorkSchedule(prev => ({
            ...prev,
            slots: prev.slots.filter(s => s.id !== slotId)
        }));
    };

    const updateTimeSlot = (slotId, field, value) => {
        setWorkSchedule(prev => ({
            ...prev,
            slots: prev.slots.map(s => s.id === slotId ? { ...s, [field]: value } : s)
        }));
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        resetForm();
    };

    const isTutorTeacher = (t) => t?.subject === 'Тьютор';

    return (
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '12px' }}>
                <div>
                    <h1 style={{ margin: 0, fontSize: '1.8rem', letterSpacing: '-0.02em' }}>Учительский состав</h1>
                    <p style={{ margin: '4px 0 0', color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>
                        Всего: <strong style={{ color: 'var(--color-primary-deep)' }}>{teachers.length}</strong> педагогов
                    </p>
                </div>
                <button className="btn btn-primary" onClick={() => setIsModalOpen(true)}>
                    <UserPlus size={18} />
                    Добавить учителя
                </button>
            </div>

            <RoleFilterTabs
                value={roleFilter}
                onChange={setRoleFilter}
                counts={{
                    all: teachers.length,
                    teachers: filterByRole(teachers, 'teachers').length,
                    tutors: filterByRole(teachers, 'tutors').length,
                }}
            />

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.25rem' }}>
                {filteredTeachers.map(teacher => {
                    const tutor = isTutorTeacher(teacher);
                    return (
                        <div
                            key={teacher.id}
                            className="card teacher-card"
                            style={{
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '0.6rem',
                                position: 'relative',
                                overflow: 'hidden',
                                padding: '1.25rem'
                            }}
                        >
                            {/* Top accent bar */}
                            <div style={{
                                position: 'absolute',
                                top: 0, left: 0, right: 0,
                                height: '4px',
                                background: tutor
                                    ? 'linear-gradient(90deg, var(--color-sage) 0%, var(--color-moss) 100%)'
                                    : 'linear-gradient(90deg, var(--color-moss) 0%, var(--color-forest) 100%)'
                            }} />

                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px', marginTop: '4px' }}>
                                <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flex: 1, minWidth: 0 }}>
                                    {/* Avatar circle */}
                                    <div style={{
                                        flexShrink: 0,
                                        width: '44px', height: '44px',
                                        borderRadius: '50%',
                                        background: tutor
                                            ? 'linear-gradient(135deg, var(--color-sage) 0%, var(--color-moss) 100%)'
                                            : 'linear-gradient(135deg, var(--color-moss) 0%, var(--color-forest) 100%)',
                                        color: '#fff',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        fontSize: '0.95rem',
                                        fontWeight: 700,
                                        letterSpacing: '0.02em',
                                        boxShadow: 'var(--shadow-sm)'
                                    }}>
                                        {teacher.name.split(' ').map(n => n[0]).filter(Boolean).slice(0, 2).join('')}
                                    </div>
                                    <h3 style={{
                                        margin: 0,
                                        fontSize: '1.05rem',
                                        fontWeight: 700,
                                        color: 'var(--color-primary-deep)',
                                        letterSpacing: '-0.01em',
                                        lineHeight: 1.25,
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis'
                                    }}>
                                        {teacher.name}
                                    </h3>
                                </div>
                                <div style={{ display: 'flex', gap: '2px', flexShrink: 0 }}>
                                    <button
                                        className="icon-btn"
                                        onClick={() => handleEdit(teacher)}
                                        style={{ width: '32px', height: '32px' }}
                                        title="Редактировать"
                                    >
                                        <Pencil size={16} />
                                    </button>
                                    <button
                                        className="icon-btn"
                                        onClick={() => handleDelete(teacher.id)}
                                        style={{ width: '32px', height: '32px', color: 'var(--color-danger)' }}
                                        title="Удалить"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>

                            <div style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '6px',
                                padding: '4px 10px',
                                borderRadius: 'var(--radius-pill)',
                                backgroundColor: tutor ? 'var(--color-moss-tint)' : 'var(--color-bg-tint)',
                                color: tutor ? 'var(--color-primary)' : 'var(--color-text-muted)',
                                border: '1px solid var(--color-border)',
                                fontSize: '0.78rem',
                                fontWeight: 600,
                                width: 'fit-content'
                            }}>
                                <BookOpen size={13} />
                                <span>{teacher.subject}</span>
                            </div>

                            <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap', marginTop: '2px' }}>
                                {teacher.grades.map(g => (
                                    <span key={g} className="badge badge-neutral" style={{ fontSize: '0.7rem' }}>
                                        {g}
                                    </span>
                                ))}
                            </div>

                            {/* Workload Display */}
                            <div style={{ marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid var(--color-divider)' }}>
                                <TeacherWorkloadCard teacherId={teacher.id} showDetails={false} />
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Add Teacher Modal */}
            {isModalOpen && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1000,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    backdropFilter: 'blur(4px)'
                }}>
                    <div className="card" style={{ width: '600px', maxWidth: '95%', maxHeight: '90vh', overflowY: 'auto' }}>
                        <h2 style={{ marginTop: 0 }}>{editingId ? 'Редактировать учителя' : 'Новый учитель'}</h2>

                        <div style={{ marginBottom: '1rem' }}>
                            <label className="label">ФИО</label>
                            <input
                                className="input-field"
                                placeholder="Сидоров Иван Петрович"
                                value={name}
                                onChange={e => setName(e.target.value)}
                            />
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                            <div>
                                <label className="label">Предмет</label>
                                <select className="input-field" value={subject} onChange={e => setSubject(e.target.value)}>
                                    {SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="label">Классы</label>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem', maxHeight: '100px', overflowY: 'auto' }}>
                                    {GRADES.map(grade => (
                                        <label key={grade} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.9rem' }}>
                                            <input
                                                type="checkbox"
                                                checked={grades.includes(grade)}
                                                onChange={() => toggleGrade(grade)}
                                            />
                                            {grade}
                                        </label>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: '1rem', marginBottom: '1rem' }}>
                            <h3 style={{ fontSize: '1.1rem', marginBottom: '0.5rem' }}>Рабочий график</h3>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                                <div>
                                    <label className="label">Действует с</label>
                                    <input type="date" className="input-field"
                                        value={workSchedule.startDate}
                                        onChange={e => setWorkSchedule({ ...workSchedule, startDate: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="label">Действует по</label>
                                    <input type="date" className="input-field"
                                        value={workSchedule.endDate}
                                        onChange={e => setWorkSchedule({ ...workSchedule, endDate: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div style={{ marginBottom: '0.5rem' }}>
                                <label className="label">Временные слоты (Уроки)</label>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.5rem' }}>
                                    {AVAILABILITY_PRESETS.map((preset, idx) => (
                                        <button key={idx} className="btn btn-secondary" style={{ fontSize: '0.8rem', padding: '4px 8px' }}
                                            onClick={() => addTimeSlot(preset)}>
                                            + {preset.label.split(' ')[0]} {preset.label.split('(')[1].replace(')', '')}
                                        </button>
                                    ))}
                                    <button className="btn btn-secondary" style={{ fontSize: '0.8rem', padding: '4px 8px' }}
                                        onClick={() => addTimeSlot()}>
                                        + Свой слот
                                    </button>
                                </div>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                    {workSchedule.slots.map((slot, index) => (
                                        <div key={slot.id} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                            <span style={{ fontSize: '0.9rem', width: '20px' }}>{index + 1}.</span>
                                            <input type="time" className="input-field" style={{ width: '100px' }}
                                                value={slot.start}
                                                onChange={e => updateTimeSlot(slot.id, 'start', e.target.value)}
                                            />
                                            <span>-</span>
                                            <input type="time" className="input-field" style={{ width: '100px' }}
                                                value={slot.end}
                                                onChange={e => updateTimeSlot(slot.id, 'end', e.target.value)}
                                            />
                                            <button onClick={() => removeTimeSlot(slot.id)} style={{ color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer' }}>
                                                <X size={18} />
                                            </button>
                                        </div>
                                    ))}
                                    {workSchedule.slots.length === 0 && (
                                        <div style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', fontStyle: 'italic' }}>
                                            Слоты не заданы (считается доступным весь рабочий день?)
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
                            <button className="btn btn-secondary" onClick={handleCloseModal}>Отмена</button>
                            <button className="btn btn-primary" onClick={handleSave} disabled={!name || grades.length === 0}>{editingId ? 'Сохранить' : 'Добавить'}</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default TeachersPage;
