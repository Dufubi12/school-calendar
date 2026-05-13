import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { GraduationCap, LogOut } from 'lucide-react';

const TeacherLinkPage = () => {
    const { signOut, linkTeacher, currentUser } = useAuth();
    const [teachers, setTeachers] = useState([]);
    const [linkedIds, setLinkedIds] = useState(new Set());
    const [selectedId, setSelectedId] = useState('');
    const [loading, setLoading] = useState(true);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        let mounted = true;
        (async () => {
            const [{ data: tList, error: tErr }, { data: profiles }] = await Promise.all([
                supabase.from('teachers').select('id, name, subject').order('name'),
                supabase.from('profiles').select('teacher_id').not('teacher_id', 'is', null),
            ]);
            if (!mounted) return;
            if (tErr) {
                setError('Не удалось загрузить список педагогов');
            } else {
                setTeachers(tList || []);
                setLinkedIds(new Set((profiles || []).map(p => p.teacher_id)));
            }
            setLoading(false);
        })();
        return () => { mounted = false; };
    }, []);

    const handleLink = async () => {
        if (!selectedId) return;
        setBusy(true);
        setError(null);
        const teacher = teachers.find(t => t.id === Number(selectedId));
        const { error } = await linkTeacher(Number(selectedId), teacher?.name);
        setBusy(false);
        if (error) setError(error.message || 'Ошибка');
    };

    const available = teachers.filter(t => !linkedIds.has(t.id));

    return (
        <div style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#f8fafc',
            padding: '2rem'
        }}>
            <div style={{
                width: '100%',
                maxWidth: '480px',
                backgroundColor: '#fff',
                borderRadius: '16px',
                boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
                padding: '2.5rem'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                    <GraduationCap size={28} color="#2563eb" />
                    <h1 style={{ margin: 0, fontSize: '1.4rem' }}>Выберите себя</h1>
                </div>
                <p style={{ margin: '0 0 1rem', color: '#64748b', fontSize: '0.9rem', textAlign: 'center' }}>
                    Аккаунт <strong>{currentUser?.email}</strong> ещё не привязан к педагогу.
                    Выберите себя из списка — это нужно сделать только один раз.
                </p>

                {loading ? (
                    <p style={{ textAlign: 'center', color: '#64748b' }}>Загрузка…</p>
                ) : (
                    <>
                        <select
                            value={selectedId}
                            onChange={(e) => setSelectedId(e.target.value)}
                            style={{
                                width: '100%', padding: '12px', borderRadius: '8px',
                                border: '2px solid #e5e7eb', fontSize: '1rem',
                                marginBottom: '12px', cursor: 'pointer', backgroundColor: '#fff'
                            }}
                        >
                            <option value="">— Выберите педагога —</option>
                            {available.map(t => (
                                <option key={t.id} value={t.id}>{t.name}{t.subject ? ` — ${t.subject}` : ''}</option>
                            ))}
                        </select>

                        {available.length === 0 && (
                            <div style={{
                                padding: '10px 12px', borderRadius: '8px',
                                backgroundColor: '#fef3c7', color: '#92400e',
                                fontSize: '0.85rem', marginBottom: '12px'
                            }}>
                                Все педагоги уже привязаны к аккаунтам. Свяжись с методистом.
                            </div>
                        )}

                        {error && (
                            <div style={{
                                padding: '10px 12px', borderRadius: '8px',
                                backgroundColor: '#fee2e2', color: '#991b1b',
                                fontSize: '0.85rem', marginBottom: '12px'
                            }}>
                                {error}
                            </div>
                        )}

                        <button
                            onClick={handleLink}
                            disabled={!selectedId || busy}
                            style={{
                                width: '100%', padding: '12px', borderRadius: '10px',
                                border: 'none',
                                backgroundColor: (!selectedId || busy) ? '#cbd5e1' : '#2563eb',
                                color: '#fff', fontSize: '1rem', fontWeight: 600,
                                cursor: (!selectedId || busy) ? 'not-allowed' : 'pointer'
                            }}
                        >
                            {busy ? 'Сохраняем…' : 'Подтвердить'}
                        </button>
                    </>
                )}

                <button
                    onClick={signOut}
                    style={{
                        width: '100%', marginTop: '12px',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                        padding: '8px', borderRadius: '8px',
                        border: '1px solid #e2e8f0', backgroundColor: '#fff',
                        color: '#64748b', fontSize: '0.85rem', cursor: 'pointer'
                    }}
                >
                    <LogOut size={14} /> Выйти
                </button>
            </div>
        </div>
    );
};

export default TeacherLinkPage;
