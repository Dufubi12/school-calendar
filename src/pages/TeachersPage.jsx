import React, { useState } from 'react';
import { useSchedule } from '../context/ScheduleContext';
import { SUBJECTS, GRADES, AVAILABILITY_PRESETS } from '../data/mockData';
import { Trash2, UserPlus, BookOpen, Pencil, Plus, X, DollarSign } from 'lucide-react';
import TeacherWorkloadCard from '../components/Teachers/TeacherWorkloadCard';
import TeacherSalaryModal from '../components/Teachers/TeacherSalaryModal';

const TeachersPage = () => {
    const { teachers, addTeacher, removeTeacher, updateTeacher } = useSchedule();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [isSalaryModalOpen, setIsSalaryModalOpen] = useState(false);
    const [selectedTeacher, setSelectedTeacher] = useState(null);

    // Form State
    const [name, setName] = useState('');
    const [subject, setSubject] = useState(SUBJECTS[0]);
    const [grades, setGrades] = useState([GRADES[1]]);
    const [lessonRate, setLessonRate] = useState('');
    const [workSchedule, setWorkSchedule] = useState({
        startDate: '',
        endDate: '',
        slots: []
    });

    const resetForm = () => {
        setName('');
        setSubject(SUBJECTS[0]);
        setGrades([GRADES[1]]);
        setLessonRate('');
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
        setLessonRate(teacher.lessonRate || '');
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
            lessonRate: lessonRate ? Number(lessonRate) : 0,
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

    return (
        <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <h1 style={{ margin: 0, fontSize: '1.8rem' }}>Учительский состав</h1>
                <button className="btn btn-primary" onClick={() => setIsModalOpen(true)}>
                    <UserPlus size={20} />
                    Добавить учителя
                </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.5rem' }}>
                {teachers.map(teacher => (
                    <div key={teacher.id} className="card" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                            <h3 style={{ margin: 0, fontSize: '1.2rem' }}>{teacher.name}</h3>
                            <div style={{ display: 'flex' }}>
                                <button
                                    onClick={() => handleEdit(teacher)}
                                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)', padding: '4px' }}
                                    title="Редактировать"
                                >
                                    <Pencil size={18} />
                                </button>
                                <button
                                    onClick={() => handleDelete(teacher.id)}
                                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', padding: '4px' }}
                                    title="Удалить"
                                >
                                    <Trash2 size={18} />
                                </button>
                            </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--color-text-muted)' }}>
                            <BookOpen size={16} />
                            <span>{teacher.subject}</span>
                        </div>

                        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.5rem' }}>
                            {teacher.grades.map(g => (
                                <span key={g} style={{
                                    fontSize: '0.75rem',
                                    backgroundColor: '#f1f5f9',
                                    padding: '2px 8px',
                                    borderRadius: '12px',
                                    border: '1px solid var(--color-border)'
                                }}>
                                    {g}
                                </span>
                            ))}
                        </div>

                        {/* Workload Display */}
                        <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--color-border)' }}>
                            <TeacherWorkloadCard teacherId={teacher.id} showDetails={false} />
                        </div>

                        {/* Salary Button */}
                        <button
                            className="btn btn-secondary"
                            onClick={() => {
                                setSelectedTeacher(teacher);
                                setIsSalaryModalOpen(true);
                            }}
                            style={{
                                marginTop: '1rem',
                                width: '100%',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '0.5rem'
                            }}
                        >
                            <DollarSign size={18} />
                            Посмотреть зарплату
                        </button>
                    </div>
                ))}
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
                                <label className="label">Ставка за урок (₽)</label>
                                <input
                                    className="input-field"
                                    type="number"
                                    min="0"
                                    step="100"
                                    placeholder="1000"
                                    value={lessonRate}
                                    onChange={e => setLessonRate(e.target.value)}
                                />
                            </div>
                        </div>

                        <div style={{ marginBottom: '1rem' }}>
                            <label className="label">Классы</label>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
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

            {/* Salary Modal */}
            <TeacherSalaryModal
                teacher={selectedTeacher}
                isOpen={isSalaryModalOpen}
                onClose={() => {
                    setIsSalaryModalOpen(false);
                    setSelectedTeacher(null);
                }}
                onEdit={handleEdit}
            />
        </div>
    );
};

export default TeachersPage;
