import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Calendar } from 'lucide-react';

const LoginPage = () => {
    const { signIn, signUp } = useAuth();
    const [mode, setMode] = useState('signin'); // 'signin' | 'signup'
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState(null);
    const [info, setInfo] = useState(null);
    const [busy, setBusy] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);
        setInfo(null);
        if (password.length < 6) {
            setError('Пароль должен быть минимум 6 символов');
            return;
        }
        setBusy(true);
        try {
            if (mode === 'signin') {
                const { error } = await signIn(email.trim().toLowerCase(), password);
                if (error) setError(translateError(error.message));
            } else {
                const { data, error } = await signUp(email.trim().toLowerCase(), password);
                if (error) {
                    setError(translateError(error.message));
                } else if (data?.user && !data.session) {
                    setInfo('Готово! Проверь почту — пришло письмо для подтверждения.');
                } else {
                    setInfo('Аккаунт создан. Сейчас войдём…');
                }
            }
        } finally {
            setBusy(false);
        }
    };

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
                maxWidth: '420px',
                backgroundColor: '#fff',
                borderRadius: '16px',
                boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
                padding: '2.5rem'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                    <Calendar size={32} color="#2563eb" />
                    <h1 style={{ margin: 0, fontSize: '1.6rem', color: '#1e293b' }}>School Calendar</h1>
                </div>
                <p style={{ margin: '0 0 1.5rem', color: '#64748b', fontSize: '0.95rem', textAlign: 'center' }}>
                    {mode === 'signin' ? 'Войдите в аккаунт' : 'Создайте аккаунт'}
                </p>

                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <label style={{ fontSize: '0.85rem', color: '#475569' }}>
                        Email
                        <input
                            type="email"
                            required
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="you@example.com"
                            autoComplete="email"
                            style={{
                                width: '100%', marginTop: '4px',
                                padding: '10px 12px', borderRadius: '8px',
                                border: '1px solid #e2e8f0', fontSize: '1rem',
                                boxSizing: 'border-box'
                            }}
                        />
                    </label>
                    <label style={{ fontSize: '0.85rem', color: '#475569' }}>
                        Пароль
                        <input
                            type="password"
                            required
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="минимум 6 символов"
                            autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
                            minLength={6}
                            style={{
                                width: '100%', marginTop: '4px',
                                padding: '10px 12px', borderRadius: '8px',
                                border: '1px solid #e2e8f0', fontSize: '1rem',
                                boxSizing: 'border-box'
                            }}
                        />
                    </label>

                    {error && (
                        <div style={{
                            padding: '10px 12px', borderRadius: '8px',
                            backgroundColor: '#fee2e2', color: '#991b1b',
                            fontSize: '0.85rem'
                        }}>
                            {error}
                        </div>
                    )}
                    {info && (
                        <div style={{
                            padding: '10px 12px', borderRadius: '8px',
                            backgroundColor: '#dbeafe', color: '#1e40af',
                            fontSize: '0.85rem'
                        }}>
                            {info}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={busy}
                        style={{
                            padding: '12px', borderRadius: '10px',
                            border: 'none',
                            backgroundColor: busy ? '#94a3b8' : '#2563eb',
                            color: '#fff', fontSize: '1rem', fontWeight: 600,
                            cursor: busy ? 'wait' : 'pointer',
                            marginTop: '4px'
                        }}
                    >
                        {busy ? 'Подождите…' : (mode === 'signin' ? 'Войти' : 'Зарегистрироваться')}
                    </button>
                </form>

                <div style={{ marginTop: '1rem', textAlign: 'center', fontSize: '0.85rem', color: '#64748b' }}>
                    {mode === 'signin' ? (
                        <>
                            Нет аккаунта?{' '}
                            <button
                                onClick={() => { setMode('signup'); setError(null); setInfo(null); }}
                                style={{ background: 'none', border: 'none', color: '#2563eb', cursor: 'pointer', fontWeight: 600 }}
                            >
                                Зарегистрироваться
                            </button>
                        </>
                    ) : (
                        <>
                            Уже есть аккаунт?{' '}
                            <button
                                onClick={() => { setMode('signin'); setError(null); setInfo(null); }}
                                style={{ background: 'none', border: 'none', color: '#2563eb', cursor: 'pointer', fontWeight: 600 }}
                            >
                                Войти
                            </button>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

function translateError(msg) {
    if (!msg) return 'Ошибка';
    const m = msg.toLowerCase();
    if (m.includes('invalid login credentials')) return 'Неверный email или пароль';
    if (m.includes('email not confirmed')) return 'Email не подтверждён — проверь почту';
    if (m.includes('user already registered')) return 'Пользователь с таким email уже зарегистрирован';
    if (m.includes('password should be at least')) return 'Пароль слишком короткий';
    if (m.includes('rate limit')) return 'Слишком много попыток, подожди немного';
    return msg;
}

export default LoginPage;
