import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Sprout, Mail, Lock } from 'lucide-react';

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
                    setInfo('Готово! Проверьте почту — пришло письмо для подтверждения.');
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
            padding: '2rem',
            background: `
                radial-gradient(900px 600px at 10% -10%, rgba(123, 144, 76, 0.18), transparent 60%),
                radial-gradient(700px 500px at 110% 110%, rgba(39, 59, 9, 0.12), transparent 65%),
                var(--color-bg-app)
            `,
            position: 'relative',
            overflow: 'hidden'
        }}>
            {/* Decorative leaf-like shapes */}
            <div aria-hidden style={{
                position: 'absolute',
                top: '-80px', right: '-80px',
                width: '320px', height: '320px',
                borderRadius: '50%',
                background: 'radial-gradient(circle at 30% 30%, rgba(123, 144, 76, 0.22), transparent 70%)',
                filter: 'blur(10px)'
            }} />
            <div aria-hidden style={{
                position: 'absolute',
                bottom: '-100px', left: '-60px',
                width: '280px', height: '280px',
                borderRadius: '50%',
                background: 'radial-gradient(circle at 70% 70%, rgba(88, 100, 29, 0.18), transparent 70%)',
                filter: 'blur(12px)'
            }} />

            <div style={{
                width: '100%',
                maxWidth: '440px',
                backgroundColor: 'var(--color-bg-card)',
                borderRadius: 'var(--radius-xl)',
                boxShadow: 'var(--shadow-xl)',
                padding: '2.5rem',
                position: 'relative',
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
                        <Sprout size={26} color="#fff" strokeWidth={2.2} />
                    </div>
                    <h1 style={{ margin: 0, fontSize: '1.55rem', color: 'var(--color-primary-deep)', letterSpacing: '-0.02em' }}>
                        School Calendar
                    </h1>
                </div>
                <p style={{ margin: '0 0 1.75rem', color: 'var(--color-text-muted)', fontSize: '0.92rem', textAlign: 'center' }}>
                    {mode === 'signin' ? 'Войдите в свой аккаунт' : 'Создайте новый аккаунт'}
                </p>

                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    <div>
                        <label className="label" htmlFor="login-email">Email</label>
                        <div style={{ position: 'relative' }}>
                            <Mail size={16} style={{
                                position: 'absolute', left: '12px', top: '50%',
                                transform: 'translateY(-50%)',
                                color: 'var(--color-text-subtle)',
                                pointerEvents: 'none'
                            }} />
                            <input
                                id="login-email"
                                type="email"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="you@example.com"
                                autoComplete="email"
                                style={{ paddingLeft: '38px' }}
                            />
                        </div>
                    </div>

                    <div>
                        <label className="label" htmlFor="login-pwd">Пароль</label>
                        <div style={{ position: 'relative' }}>
                            <Lock size={16} style={{
                                position: 'absolute', left: '12px', top: '50%',
                                transform: 'translateY(-50%)',
                                color: 'var(--color-text-subtle)',
                                pointerEvents: 'none'
                            }} />
                            <input
                                id="login-pwd"
                                type="password"
                                required
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="минимум 6 символов"
                                autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
                                minLength={6}
                                style={{ paddingLeft: '38px' }}
                            />
                        </div>
                    </div>

                    {error && (
                        <div style={{
                            padding: '10px 12px',
                            borderRadius: 'var(--radius)',
                            backgroundColor: 'var(--color-danger-bg)',
                            color: 'var(--color-danger)',
                            border: '1px solid var(--color-danger-border)',
                            fontSize: '0.85rem'
                        }}>
                            {error}
                        </div>
                    )}
                    {info && (
                        <div style={{
                            padding: '10px 12px',
                            borderRadius: 'var(--radius)',
                            backgroundColor: 'var(--color-success-bg)',
                            color: 'var(--color-success)',
                            border: '1px solid var(--color-success-border)',
                            fontSize: '0.85rem'
                        }}>
                            {info}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={busy}
                        className="btn btn-primary"
                        style={{
                            padding: '12px',
                            fontSize: '0.95rem',
                            marginTop: '6px'
                        }}
                    >
                        {busy ? 'Подождите…' : (mode === 'signin' ? 'Войти' : 'Зарегистрироваться')}
                    </button>
                </form>

                <div style={{ marginTop: '1.25rem', textAlign: 'center', fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
                    {mode === 'signin' ? (
                        <>
                            Нет аккаунта?{' '}
                            <button
                                onClick={() => { setMode('signup'); setError(null); setInfo(null); }}
                                style={{
                                    background: 'none', border: 'none',
                                    color: 'var(--color-primary)',
                                    cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem'
                                }}
                            >
                                Зарегистрироваться
                            </button>
                        </>
                    ) : (
                        <>
                            Уже есть аккаунт?{' '}
                            <button
                                onClick={() => { setMode('signin'); setError(null); setInfo(null); }}
                                style={{
                                    background: 'none', border: 'none',
                                    color: 'var(--color-primary)',
                                    cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem'
                                }}
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
