import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { Check, X, AlertCircle, Info } from 'lucide-react';

const ToastContext = createContext(null);

export const useToast = () => {
    const ctx = useContext(ToastContext);
    if (!ctx) throw new Error('useToast must be used within ToastProvider');
    return ctx;
};

let nextId = 1;
const DEFAULT_DURATION = 5000;

export const ToastProvider = ({ children }) => {
    const [toasts, setToasts] = useState([]);

    const dismiss = useCallback((id) => {
        setToasts(list => list.filter(t => t.id !== id));
    }, []);

    const push = useCallback((toast) => {
        const id = nextId++;
        const item = {
            id,
            kind: toast.kind || 'info', // info | success | warning | error
            title: toast.title || '',
            message: toast.message || '',
            duration: toast.duration ?? DEFAULT_DURATION,
        };
        setToasts(list => [...list, item]);
        if (item.duration > 0) {
            setTimeout(() => dismiss(id), item.duration);
        }
        return id;
    }, [dismiss]);

    // Convenience helpers
    const info = useCallback((msg, opts = {}) => push({ ...opts, kind: 'info', message: msg }), [push]);
    const success = useCallback((msg, opts = {}) => push({ ...opts, kind: 'success', message: msg }), [push]);
    const warning = useCallback((msg, opts = {}) => push({ ...opts, kind: 'warning', message: msg }), [push]);
    const error = useCallback((msg, opts = {}) => push({ ...opts, kind: 'error', message: msg }), [push]);

    return (
        <ToastContext.Provider value={{ push, dismiss, info, success, warning, error }}>
            {children}
            <ToastContainer toasts={toasts} onDismiss={dismiss} />
        </ToastContext.Provider>
    );
};

const kindStyles = {
    info: { bg: '#eff6ff', border: '#bfdbfe', text: '#1e3a8a', Icon: Info },
    success: { bg: '#f0fdf4', border: '#bbf7d0', text: '#166534', Icon: Check },
    warning: { bg: '#fffbeb', border: '#fde68a', text: '#92400e', Icon: AlertCircle },
    error: { bg: '#fef2f2', border: '#fecaca', text: '#991b1b', Icon: X },
};

const ToastContainer = ({ toasts, onDismiss }) => {
    return (
        <div
            aria-live="polite"
            style={{
                position: 'fixed',
                top: '70px',
                right: '20px',
                zIndex: 9999,
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
                pointerEvents: 'none',
                maxWidth: 'calc(100vw - 40px)',
                width: '380px',
            }}
        >
            {toasts.map(t => {
                const s = kindStyles[t.kind] || kindStyles.info;
                const Icon = s.Icon;
                return (
                    <div
                        key={t.id}
                        role="status"
                        style={{
                            pointerEvents: 'auto',
                            backgroundColor: s.bg,
                            color: s.text,
                            border: `1px solid ${s.border}`,
                            borderRadius: '8px',
                            padding: '12px 14px',
                            boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                            display: 'flex',
                            alignItems: 'flex-start',
                            gap: '10px',
                            animation: 'toastIn 200ms ease-out',
                        }}
                    >
                        <Icon size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                            {t.title && (
                                <div style={{ fontWeight: 700, fontSize: '0.88rem', marginBottom: '2px' }}>
                                    {t.title}
                                </div>
                            )}
                            <div style={{ fontSize: '0.84rem', lineHeight: 1.35, wordWrap: 'break-word' }}>
                                {t.message}
                            </div>
                        </div>
                        <button
                            onClick={() => onDismiss(t.id)}
                            style={{
                                background: 'none',
                                border: 'none',
                                cursor: 'pointer',
                                color: 'inherit',
                                opacity: 0.6,
                                padding: 0,
                                display: 'inline-flex',
                                alignItems: 'center',
                            }}
                            aria-label="Закрыть"
                        >
                            <X size={14} />
                        </button>
                    </div>
                );
            })}
            <style>{`
                @keyframes toastIn {
                    from { opacity: 0; transform: translateX(20px); }
                    to { opacity: 1; transform: translateX(0); }
                }
            `}</style>
        </div>
    );
};
