import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import Toast, { ToastContainer, ToastType } from '../Toast';

interface ToastItem {
  id: string;
  message: string;
  type: ToastType;
  duration: number;
  createdAt: number;
}

interface ToastContextValue {
  showToast: (message: string, type?: ToastType, duration?: number) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export const ToastProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [toasts, setToasts] = useState<ToastItem[]>([]);

    const showToast = useCallback((message: string, type: ToastType = 'success', duration = 3000) => {
        const id = Math.random().toString(36).substring(7);
        setToasts(prev => [...prev, { id, message, type, duration, createdAt: Date.now() }]);
    }, []);

    const removeToast = useCallback((id: string) => {
        setToasts(prev => prev.filter(toast => toast.id !== id));
    }, []);

    const sortedToasts = [...toasts].sort((a, b) => a.createdAt - b.createdAt);

    return (
        <ToastContext.Provider value={{ showToast }}>
            {children}
            <ToastContainer>
                {sortedToasts.map((toast, index) => (
                    <Toast
                        key={toast.id}
                        message={toast.message}
                        type={toast.type}
                        duration={toast.duration}
                        onClose={() => removeToast(toast.id)}
                        style={{
                            bottom: `${(index * 70) + 20}px`
                        }}
                    />
                ))}
            </ToastContainer>
        </ToastContext.Provider>
    );
};

export const useToast = (): ToastContextValue => {
    const context = useContext(ToastContext);
    if (!context) {
        throw new Error('useToast must be used within a ToastProvider');
    }
    return context;
};

export default ToastContext;
