import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { GraduationCap, LogOut, Sprout } from 'lucide-react';

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
            padding: '2rem',
            background: `
                radial-gradient(900px 600px at 10% -10%, rgba(142, 182, 155, 0.30), transparent 60%),
                radial-gradient(700px 500px at 110% 110%, rgba(35, 83, 71, 0.18), transparent 65%),
                var(--color-bg-app)
            `
        }}>
            <div style={{
                width: '100%',
                maxWidth: '500px',
                backgroundColor: 'var(--color-bg-card)',
                borderRadius: 'var(--radius-xl)',
                boxShadow: 'var(--shadow-xl)',
                padding: '2.5rem',
                border: '1px solid var(--color-border)',
                animation: 'modalIn 400ms var(--ease-out)'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', marginBottom: '8px' }}>
                    <div style={{
                        width: '48px',
                        height: '48px',
                        borderRadius: 'var(--radius-md)',
                        background: 'linear-gradient(135deg, var(--color-moss) 0%, var(--color-forest) 100%)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: 'var(--shadow-md)'
                    }}>
                        <GraduationCap size={26} color="#fff" strokeWidth={2.2} />
                    </div>
                    <h1 style={{ margin: 0, fontSize: '1.4rem', color: 'var(--color-primary-deep)', letterSpacing: '-0.01em' }}>
                        Выберите себя
                    </h1>
                </div>
                <p style={{ margin: '0 0 1.5rem', color: 'var(--color-text-muted)', fontSize: '0.9rem', textAlign: 'center', lineHeight: 1.5 }}>
                    Аккаунт <strong style={{ color: 'var(--color-text-main)' }}>{currentUser?.email}</strong> ещё не привязан к педагогу.
                    Выберите себя из списка — это нужно сделать только один раз.
                </p>

                {loading ? (
                    <p style={{ textAlign: 'center', color: 'var(--color-text-muted)' }}>Загрузка…</p>
                ) : (
                    <>
                        <select
                            value={selectedId}
                            onChange={(e) => setSelectedId(e.target.value)}
                            style={{ marginBottom: '12px', cursor: 'pointer', padding: '12px' }}
                        >
                            <option value="">— Выберите педагога —</option>
                            {available.map(t => (
                                <option key={t.id} value={t.id}>{t.name}{t.subject ? ` — ${t.subject}` : ''}</option>
                            ))}
                        </select>

                        {available.length === 0 && (
                            <div style={{
                                padding: '10px 12px',
                                borderRadius: 'var(--radius)',
                                backgroundColor: 'var(--color-warning-bg)',
                                color: 'var(--color-warning)',
                                border: '1px solid var(--color-warning-border)',
                                fontSize: '0.85rem',
                                marginBottom: '12px'
                            }}>
                                Все педагоги уже привязаны к аккаунтам. Свяжитесь с методистом.
                            </div>
                        )}

                        {error && (
                            <div style={{
                                padding: '10px 12px',
                                borderRadius: 'var(--radius)',
                                backgroundColor: 'var(--color-danger-bg)',
                                color: 'var(--color-danger)',
                                border: '1px solid var(--color-danger-border)',
                                fontSize: '0.85rem',
                                marginBottom: '12px'
                            }}>
                                {error}
                            </div>
                        )}

                        <button
                            onClick={handleLink}
                            disabled={!selectedId || busy}
                            className="btn btn-primary"
                            style={{ width: '100%', padding: '12px', fontSize: '0.95rem' }}
                        >
                            {busy ? 'Сохраняем…' : 'Подтвердить'}
                        </button>
                    </>
                )}

                <button
                    onClick={signOut}
                    className="btn btn-secondary"
                    style={{ width: '100%', marginTop: '12px', padding: '10px' }}
                >
                    <LogOut size={14} /> Выйти
                </button>
            </div>
        </div>
    );
};

export default TeacherLinkPage;
