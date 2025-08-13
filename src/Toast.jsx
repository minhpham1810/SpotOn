import React, { useEffect } from 'react';

const Toast = ({ message, type = 'success', duration = 3000, onClose, style }) => {
    useEffect(() => {
        const timer = setTimeout(() => {
            onClose();
        }, duration);

        return () => clearTimeout(timer);
    }, [duration, onClose]);

    const baseClasses = `
        fixed opacity-0 transform translate-y-full transition-all duration-300
        bg-black/90 text-white px-6 py-3.5 rounded-full flex items-center justify-center
        backdrop-blur-md shadow-[0_8px_32px_rgba(0,0,0,0.3)] min-w-[200px] max-w-[400px]
        pointer-events-auto hover:shadow-[0_12px_48px_rgba(0,0,0,0.4)]
        hover:-translate-y-1 active:translate-y-0
        md:w-auto w-[90%] z-50
    `;

    const showClasses = 'opacity-100 translate-y-0';

    const typeClasses = {
        success: 'border-2 border-primary/40 hover:border-primary/60 before:bg-primary/5',
        error: 'border-2 border-red-500/40 hover:border-red-500/60 before:bg-red-500/5'
    };

    const iconClasses = {
        success: 'text-primary transition-transform duration-300 group-hover:scale-110',
        error: 'text-red-500 transition-transform duration-300 group-hover:scale-110'
    };

    return (
        <div
            className={`
                ${baseClasses}
                ${showClasses}
                ${typeClasses[type]}
                group
                relative overflow-hidden
                before:content-[''] before:absolute before:inset-0
                before:opacity-0 before:transition-opacity before:duration-300
                hover:before:opacity-100
                animate-[slideInUp_0.3s_ease-out]
            `}
            style={style}
            role="alert"
            aria-live="polite"
        >
            <div className="flex items-center gap-3 text-[0.95rem] font-medium md:text-base relative z-10">
                {type === 'success' && (
                    <span 
                        className={`flex items-center justify-center w-5 h-5 text-lg ${iconClasses[type]}`}
                        role="img" 
                        aria-label="success"
                    >
                        ✓
                    </span>
                )}
                {type === 'error' && (
                    <span 
                        className={`flex items-center justify-center w-5 h-5 text-lg ${iconClasses[type]}`}
                        role="img" 
                        aria-label="error"
                    >
                        ✕
                    </span>
                )}
                {message}
            </div>
        </div>
    );
};

// ToastContainer component
export const ToastContainer = ({ children }) => {
    return (
        <div className="fixed inset-x-0 bottom-0 p-5 flex flex-col items-center gap-3 pointer-events-none z-50">
            {children}
            <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent pointer-events-none" />
        </div>
    );
};

export default Toast;