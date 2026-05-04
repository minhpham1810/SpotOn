import React, { useEffect } from 'react';

const Toast = ({ message, type = 'success', duration = 3000, onClose, style }) => {
    useEffect(() => {
        const timer = setTimeout(() => {
            onClose();
        }, duration);

        return () => clearTimeout(timer);
    }, [duration, onClose]);

    const baseClasses = `
        opacity-0 transform translate-y-2 transition-all duration-300
        bg-[#0D0C0E]/95 text-white px-5 py-3.5 flex items-center
        backdrop-blur-md shadow-[0_4px_24px_rgba(0,0,0,0.4)] min-w-[220px] max-w-[360px]
        pointer-events-auto border border-white/[0.06]
        w-auto z-50
    `;

    const showClasses = 'opacity-100 translate-y-0 pointer-events-auto';

    const iconClasses = {
        success: 'text-primary transition-transform duration-300 group-hover:scale-110',
        error: 'text-red-500 transition-transform duration-300 group-hover:scale-110'
    };

    const leftBarColor = type === 'success' ? '#1DB954' : '#ef4444';

    return (
        <div
            className={`
                ${baseClasses}
                ${showClasses}
                group
                relative overflow-hidden
                rounded-lg
                animate-slideUp
            `}
            style={{
                ...style,
                borderLeft: `3px solid ${leftBarColor}`,
                fontFamily: 'DM Sans, sans-serif',
                letterSpacing: '0.01em',
            }}
            role="alert"
            aria-live="polite"
        >
            <div className="flex items-center gap-3 text-sm font-medium relative z-10">
                {type === 'success' && (
                    <span className={`flex-shrink-0 ${iconClasses[type]}`} role="img" aria-label="success">✓</span>
                )}
                {type === 'error' && (
                    <span className={`flex-shrink-0 ${iconClasses[type]}`} role="img" aria-label="error">✕</span>
                )}
                {message}
            </div>
        </div>
    );
};

// ToastContainer component
export const ToastContainer = ({ children }) => {
    return (
        <div className="fixed bottom-6 right-6 flex flex-col gap-2.5 pointer-events-none z-50 items-end">
            {children}
        </div>
    );
};

export default Toast;